// Resend webhook receiver. Updates lead_followups engagement based on
// delivered / bounced / complained / opened / clicked events.
//
// Resend signs webhooks via Svix headers. We verify with RESEND_WEBHOOK_SECRET
// when present; otherwise we accept and rely on the obscurity of the URL
// (the user can add the secret later in Lovable Cloud).
//
// Lookup strategy: we set `tags: [{ name: 'tracking_id', value: <uuid> }]`
// on every send so we can correlate webhook events back to the row.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { Webhook } from 'https://esm.sh/svix@1.40.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, svix-id, svix-signature, svix-timestamp',
};

interface ResendEvent {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[] | string;
    tags?: Array<{ name: string; value: string }>;
    bounce?: { message?: string };
  };
}

function findTrackingId(evt: ResendEvent): string | null {
  const tags = evt.data?.tags ?? [];
  const tag = tags.find((t) => t.name === 'tracking_id');
  return tag?.value || null;
}

const TYPE_MAP: Record<string, 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained'> = {
  'email.delivered': 'delivered',
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.complained': 'complained',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  // Read raw body so we can verify signature before parsing
  const rawBody = await req.text();

  let payload: ResendEvent;
  const webhookSecret = Deno.env.get('RESEND_WEBHOOK_SECRET');

  if (webhookSecret) {
    // Strict mode: require valid Svix signature
    const svixId = req.headers.get('svix-id');
    const svixSignature = req.headers.get('svix-signature');
    const svixTimestamp = req.headers.get('svix-timestamp');
    if (!svixId || !svixSignature || !svixTimestamp) {
      return new Response(JSON.stringify({ error: 'missing signature headers' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    try {
      const wh = new Webhook(webhookSecret);
      payload = wh.verify(rawBody, {
        'svix-id': svixId,
        'svix-signature': svixSignature,
        'svix-timestamp': svixTimestamp,
      }) as ResendEvent;
    } catch (e) {
      console.error('resend-webhook signature verification failed', e);
      return new Response(JSON.stringify({ error: 'invalid signature' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    // Fallback: no secret configured. Log a warning so the operator notices.
    console.warn('resend-webhook: RESEND_WEBHOOK_SECRET not set — accepting unverified payloads.');
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: 'invalid json' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }

  const eventType = TYPE_MAP[payload.type ?? ''];
  if (!eventType) {
    return new Response(JSON.stringify({ ignored: payload.type }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const trackingId = findTrackingId(payload);
  if (!trackingId) {
    return new Response(JSON.stringify({ ignored: 'no tracking_id' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: row } = await supabase
      .from('lead_followups')
      .select('id, org_id, opened_at, open_count, clicked_at, click_count, engagement_status')
      .eq('tracking_id', trackingId)
      .maybeSingle();

    if (!row) {
      return new Response(JSON.stringify({ ignored: 'unknown tracking_id' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase.from('lead_followup_events').insert({
      followup_id: row.id,
      org_id: row.org_id,
      event_type: eventType,
      source: 'webhook',
    });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {};

    if (eventType === 'delivered') {
      update.delivered_at = now;
      if (row.engagement_status === 'sent') update.engagement_status = 'delivered';
    } else if (eventType === 'opened') {
      update.opened_at = row.opened_at ?? now;
      update.open_count = (row.open_count ?? 0) + 1;
      if (!['clicked', 'bounced', 'complained'].includes(row.engagement_status)) {
        update.engagement_status = 'opened';
      }
    } else if (eventType === 'clicked') {
      update.clicked_at = row.clicked_at ?? now;
      update.click_count = (row.click_count ?? 0) + 1;
      if (!['bounced', 'complained'].includes(row.engagement_status)) {
        update.engagement_status = 'clicked';
      }
    } else if (eventType === 'bounced') {
      update.bounced_at = now;
      update.engagement_status = 'bounced';
    } else if (eventType === 'complained') {
      update.complained_at = now;
      update.engagement_status = 'complained';
    }

    if (Object.keys(update).length) {
      await supabase.from('lead_followups').update(update).eq('id', row.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('resend-webhook error', e);
    return new Response(JSON.stringify({ error: 'internal' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
