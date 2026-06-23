// Send SMS via Twilio through the Lovable connector gateway.
// Validates that the contact has explicitly granted SMS consent and has
// not since unsubscribed. Logs every send to lead_followups with channel='sms'.
//
// Body: { to?: string, contact_id?: string, message: string,
//         lead_notification_id?: string, source?: string, scheduled_by?: string }
// One of `to` (E.164) or `contact_id` is required.
//
// When invoked by a user JWT (manual send), enforces RLS via the user.
// When invoked server-to-server (cron / processor), the caller must pass
// the service role key in Authorization.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/twilio';
const STOP_FOOTER = '\nReply STOP to opt out.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const twilioKey = Deno.env.get('TWILIO_API_KEY');

    if (!lovableKey || !twilioKey) {
      return json({ error: 'Twilio is not connected. Link the Twilio connector first.' }, 503);
    }

    // Service client for writes (bypasses RLS for logging).
    const svc = createClient(supabaseUrl, serviceKey);

    // Resolve org + sender. If Authorization is the service key, body must
    // include org_id + scheduled_by.
    const body = await req.json() as {
      to?: string; contact_id?: string; message?: string;
      lead_notification_id?: string; source?: string;
      org_id?: string; scheduled_by?: string;
    };

    if (!body.message || body.message.length > 1500) {
      return json({ error: 'message is required (<=1500 chars)' }, 400);
    }

    let orgId = body.org_id;
    let senderId = body.scheduled_by ?? null;

    const isServiceCall = authHeader === `Bearer ${serviceKey}`;
    if (!isServiceCall) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: u } = await userClient.auth.getUser();
      if (!u?.user) return json({ error: 'Unauthorized' }, 401);
      const { data: profile } = await svc
        .from('users').select('org_id').eq('id', u.user.id).maybeSingle();
      if (!profile?.org_id) return json({ error: 'No organization' }, 400);
      orgId = profile.org_id;
      senderId = u.user.id;
    }

    if (!orgId) return json({ error: 'org_id required' }, 400);

    // Resolve contact + consent.
    let phone = body.to ?? null;
    let contactId: string | null = body.contact_id ?? null;

    if (contactId) {
      const { data: c } = await svc
        .from('contacts')
        .select('id, phone, sms_consent_at, sms_unsubscribed_at, org_id')
        .eq('id', contactId).maybeSingle();
      if (!c || c.org_id !== orgId) return json({ error: 'Contact not found' }, 404);
      if (!c.phone) return json({ error: 'Contact has no phone number' }, 400);
      if (!c.sms_consent_at) return json({ error: 'Contact has not opted in to SMS' }, 403);
      if (c.sms_unsubscribed_at) return json({ error: 'Contact has unsubscribed from SMS' }, 410);
      phone = c.phone;
    } else if (phone) {
      // Look up by phone within the org to confirm consent.
      const { data: c } = await svc
        .from('contacts')
        .select('id, sms_consent_at, sms_unsubscribed_at')
        .eq('org_id', orgId).eq('phone', phone).maybeSingle();
      if (!c) return json({ error: 'No contact with that phone in this org' }, 404);
      if (!c.sms_consent_at) return json({ error: 'Contact has not opted in to SMS' }, 403);
      if (c.sms_unsubscribed_at) return json({ error: 'Contact has unsubscribed from SMS' }, 410);
      contactId = c.id;
    } else {
      return json({ error: 'to or contact_id required' }, 400);
    }

    // Resolve org from_phone.
    const { data: org } = await svc
      .from('organizations').select('from_phone').eq('id', orgId).maybeSingle();
    if (!org?.from_phone) {
      return json({ error: 'Organization has no SMS sender phone configured' }, 400);
    }

    // Compose body (append STOP footer once).
    const text = body.message.includes('STOP') ? body.message : body.message + STOP_FOOTER;

    // Send via Twilio gateway.
    const twResp = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'X-Connection-Api-Key': twilioKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: phone!,
        From: org.from_phone,
        Body: text,
      }),
    });

    const twData = await twResp.json().catch(() => ({}));
    if (!twResp.ok) {
      console.error('Twilio send failed', twResp.status, twData);
      return json({ error: 'Twilio send failed', status: twResp.status, details: twData }, 502);
    }

    // Log to lead_followups.
    await svc.from('lead_followups').insert({
      org_id: orgId,
      lead_notification_id: body.lead_notification_id ?? null,
      sent_by: senderId,
      recipient_email: null,
      recipient_phone: phone,
      subject: null,
      body: text,
      channel: 'sms',
      source: body.source ?? 'manual',
      delivered_at: new Date().toISOString(),
    });

    return json({ success: true, sid: twData.sid });
  } catch (e) {
    console.error('send-sms error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
