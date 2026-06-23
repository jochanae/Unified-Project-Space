// Cron-driven processor that picks up due scheduled follow-ups and routes
// them through send-transactional-email (notify.intoiq.app), then logs to
// lead_followups for unified history.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { buildPixelUrl, rewriteLinksInText } from '../_shared/followup-tracking.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ATTEMPTS = 5;
const BATCH = 25;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: due, error } = await supabase
    .from('scheduled_followups')
    .select('*')
    .eq('status', 'pending')
    .lte('send_at', new Date().toISOString())
    .order('send_at', { ascending: true })
    .limit(BATCH);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const row of due ?? []) {
    try {
      const channel = (row as any).channel ?? 'email';

      if (channel === 'sms') {
        // Route to send-sms which validates consent and logs to lead_followups.
        const resp = await fetch(`${supabaseUrl}/functions/v1/send-sms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            to: (row as any).recipient_phone ?? null,
            message: row.body,
            lead_notification_id: row.lead_notification_id,
            org_id: row.org_id,
            scheduled_by: row.scheduled_by,
            source: row.source ?? 'scheduled',
          }),
        });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok) throw new Error(result?.error || `SMS send failed (${resp.status})`);

        await supabase
          .from('scheduled_followups')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            attempts: (row.attempts ?? 0) + 1,
            last_error: null,
          })
          .eq('id', row.id);
        sent++;
        continue;
      }

      // Resolve sender display name for the template
      const { data: senderProfile } = await supabase
        .from('users')
        .select('display_name')
        .eq('id', row.scheduled_by)
        .maybeSingle();
      const senderName = senderProfile?.display_name || 'IntoIQ';

      // Pre-create the lead_followups row to get a tracking_id we can bind
      // the open pixel + click redirects to.
      let trackingId: string | null = null;
      let followupId: string | null = null;
      const { data: inserted, error: insErr } = await supabase
        .from('lead_followups')
        .insert({
          org_id: row.org_id,
          lead_notification_id: row.lead_notification_id,
          sent_by: row.scheduled_by,
          recipient_email: row.recipient_email,
          subject: row.subject,
          body: row.body,
          source: row.source ?? 'manual',
        })
        .select('id, tracking_id')
        .single();
      if (insErr) {
        console.warn('lead_followups pre-insert failed', insErr);
      } else {
        followupId = inserted.id;
        trackingId = inserted.tracking_id as string;
      }

      const trackedMessage = trackingId ? rewriteLinksInText(row.body, trackingId) : row.body;
      const trackingPixelUrl = trackingId ? buildPixelUrl(trackingId) : undefined;

      const idempotencyKey = `scheduled-followup-${row.id}`;
      const { error: sendErr } = await supabase.functions.invoke(
        'send-transactional-email',
        {
          body: {
            templateName: 'quinn-followup',
            recipientEmail: row.recipient_email,
            idempotencyKey,
            templateData: {
              subject: row.subject,
              message: trackedMessage,
              senderName,
              trackingPixelUrl,
            },
            tags: trackingId ? [{ name: 'tracking_id', value: trackingId }] : undefined,
          },
        }
      );

      if (sendErr) {
        if (followupId) {
          await supabase.from('lead_followups').delete().eq('id', followupId);
        }
        throw new Error(sendErr.message);
      }

      // Mark scheduled row as sent
      await supabase
        .from('scheduled_followups')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          attempts: (row.attempts ?? 0) + 1,
          last_error: null,
        })
        .eq('id', row.id);

      sent++;
    } catch (e) {
      const attempts = (row.attempts ?? 0) + 1;
      const finalStatus = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
      await supabase
        .from('scheduled_followups')
        .update({
          attempts,
          status: finalStatus,
          last_error: e instanceof Error ? e.message.slice(0, 1000) : String(e),
        })
        .eq('id', row.id);
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ processed: due?.length ?? 0, sent, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
