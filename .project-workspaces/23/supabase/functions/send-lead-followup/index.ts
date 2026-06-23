// MarQ Lead Follow-up sender.
// Routes through Lovable's send-transactional-email so emails go from
// the verified `notify.intoiq.app` domain instead of onboarding@resend.dev,
// and logs every send to the lead_followups audit table.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { buildPixelUrl, rewriteLinksInText } from '../_shared/followup-tracking.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { to, subject, message, lead_notification_id } = await req.json() as {
      to?: string; subject?: string; message?: string; lead_notification_id?: string;
    };

    if (!to || !subject || !message) {
      return new Response(JSON.stringify({ error: 'to, subject, message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Resolve sender display name + org for logging
    const { data: profile } = await supabase
      .from('users')
      .select('display_name, email, org_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (!profile?.org_id) {
      return new Response(JSON.stringify({ error: 'No organization for user' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const senderName = profile?.display_name || 'IntoIQ';

    // Insert the lead_followups row FIRST so we have a tracking_id to bind
    // the open pixel + click redirects to. Logging-best-effort, but if this
    // fails we still try to send (without tracking).
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let trackingId: string | null = null;
    let followupId: string | null = null;
    {
      const { data: inserted, error: insErr } = await serviceClient
        .from('lead_followups')
        .insert({
          org_id: profile.org_id,
          lead_notification_id: lead_notification_id ?? null,
          sent_by: userData.user.id,
          recipient_email: to,
          subject,
          body: message,
        })
        .select('id, tracking_id')
        .single();
      if (insErr) {
        console.warn('lead_followups insert failed', insErr);
      } else {
        followupId = inserted.id;
        trackingId = inserted.tracking_id as string;
      }
    }

    const trackedMessage = trackingId ? rewriteLinksInText(message, trackingId) : message;
    const trackingPixelUrl = trackingId ? buildPixelUrl(trackingId) : undefined;

    // Send via Lovable's transactional email pipeline (queued, retry-safe,
    // routed through the verified notify.intoiq.app domain).
    const idempotencyKey = `quinn-followup-${followupId || lead_notification_id || crypto.randomUUID()}-${Date.now()}`;
    const { data: sendData, error: sendError } = await supabase.functions.invoke(
      'send-transactional-email',
      {
        body: {
          templateName: 'quinn-followup',
          recipientEmail: to,
          idempotencyKey,
          templateData: {
            subject,
            message: trackedMessage,
            senderName,
            trackingPixelUrl,
          },
          // Resend tags so the webhook can correlate engagement events
          // back to this row.
          tags: trackingId ? [{ name: 'tracking_id', value: trackingId }] : undefined,
        },
      }
    );

    if (sendError) {
      return new Response(JSON.stringify({ error: 'Send failed', details: sendError.message }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, queued: true, send: sendData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
