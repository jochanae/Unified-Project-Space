// Public open-pixel endpoint. Returns a 1x1 transparent GIF and best-effort
// records the open in lead_followup_events + bumps lead_followups.opened_at.
//
// Public on purpose: email clients fetch this server-side (or from the
// recipient's device) without auth headers. We rate-limit gracefully by
// just no-op'ing if the tracking_id is unknown.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// 1x1 transparent GIF
const PIXEL = Uint8Array.from([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00,
  0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0x21, 0xf9, 0x04, 0x01, 0x00,
  0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
  0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b,
]);

const pixelHeaders = {
  ...corsHeaders,
  'Content-Type': 'image/gif',
  'Content-Length': String(PIXEL.byteLength),
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  'Pragma': 'no-cache',
};

async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const data = new TextEncoder().encode(ip + '|intoiq-followup');
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Always return the pixel — record async, never block delivery.
  const url = new URL(req.url);
  const trackingId = url.searchParams.get('t');
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
        .select('id, org_id, opened_at, open_count, engagement_status')
        .eq('tracking_id', trackingId)
        .maybeSingle();

      if (row) {
        const ipHash = await hashIp(ip);
        await supabase.from('lead_followup_events').insert({
          followup_id: row.id,
          org_id: row.org_id,
          event_type: 'opened',
          user_agent: ua,
          ip_hash: ipHash,
          source: 'pixel',
        });

        await supabase
          .from('lead_followups')
          .update({
            opened_at: row.opened_at ?? new Date().toISOString(),
            open_count: (row.open_count ?? 0) + 1,
            // Don't downgrade clicked → opened
            engagement_status:
              row.engagement_status === 'clicked' ||
              row.engagement_status === 'bounced' ||
              row.engagement_status === 'complained'
                ? row.engagement_status
                : 'opened',
          })
          .eq('id', row.id);
      }
    } catch (e) {
      console.warn('track-followup-open error', e);
    }
  }

  return new Response(PIXEL, { headers: pixelHeaders, status: 200 });
});
