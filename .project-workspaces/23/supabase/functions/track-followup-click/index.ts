// Public click-tracker endpoint. Logs the click + bumps engagement_status,
// then 302-redirects to the original URL. Always redirects — never errors
// to the recipient — even if logging fails.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip + '|intoiq-followup');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function safeRedirectUrl(raw: string | null): string {
  if (!raw) return 'https://intoiq.app';
  try {
    const u = new URL(raw);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString();
  } catch { /* noop */ }
  return 'https://intoiq.app';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const trackingId = url.searchParams.get('t');
  const target = safeRedirectUrl(url.searchParams.get('u'));
  const ua = req.headers.get('user-agent');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

  if (trackingId) {
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: row } = await supabase
        .from('lead_followups')
        .select('id, org_id, clicked_at, click_count, engagement_status')
        .eq('tracking_id', trackingId)
        .maybeSingle();

      if (row) {
        const ipHash = await hashIp(ip);
        await supabase.from('lead_followup_events').insert({
          followup_id: row.id,
          org_id: row.org_id,
          event_type: 'clicked',
          url: target,
          user_agent: ua,
          ip_hash: ipHash,
          source: 'redirect',
        });

        await supabase
          .from('lead_followups')
          .update({
            clicked_at: row.clicked_at ?? new Date().toISOString(),
            click_count: (row.click_count ?? 0) + 1,
            engagement_status:
              row.engagement_status === 'bounced' || row.engagement_status === 'complained'
                ? row.engagement_status
                : 'clicked',
          })
          .eq('id', row.id);
      }
    } catch (e) {
      console.warn('track-followup-click error', e);
    }
  }

  return new Response(null, { status: 302, headers: { Location: target } });
});
