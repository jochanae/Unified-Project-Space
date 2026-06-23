import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushPayload } from "https://esm.sh/@block65/webcrypto-web-push@1.0.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  icon?: string;
  image?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    // ── Auth check: require admin role OR internal service-role call ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === supabaseServiceKey;

    if (!isServiceRole) {
      // Verify JWT and check admin role
      const userSb = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userSb.auth.getClaims(token);
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const adminSb = createClient(supabaseUrl, supabaseServiceKey);
      const { data: isAdmin } = await adminSb.rpc('has_role', {
        _user_id: claimsData.claims.sub,
        _role: 'admin',
      });

      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    console.log('Sending push notification:', JSON.stringify({ title: payload.title, body: payload.body }));

    const userIds = payload.user_ids || (payload.user_id ? [payload.user_id] : []);

    let subscriptions;
    if (userIds.length === 0) {
      const { data, error } = await supabase.from('push_subscriptions').select('*');
      if (error) throw error;
      subscriptions = data;
    } else {
      const { data, error } = await supabase.from('push_subscriptions').select('*').in('user_id', userIds);
      if (error) throw error;
      subscriptions = data;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const vapid = {
      subject: 'mailto:support@mycompani.com',
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    };

    const notificationPayload: Record<string, unknown> = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      tag: payload.tag || 'notification',
      data: { url: payload.url || '/', ...(payload.data || {}) },
    };

    // Include image for rich notifications if provided
    if (payload.image) {
      notificationPayload.image = payload.image;
    }

    const notificationData = JSON.stringify(notificationPayload);

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const pushPayload = await buildPushPayload(
          {
            data: notificationData,
            options: { ttl: 86400 },
          },
          pushSubscription,
          vapid,
        );

        const response = await fetch(sub.endpoint, pushPayload as RequestInit);

        if (response.ok || response.status === 201) {
          sent++;
          console.log(`Push sent to subscription ${sub.id}`);
        } else if (response.status === 410 || response.status === 404) {
          console.log(`Removing expired subscription ${sub.id}`);
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
          failed++;
        } else {
          const responseText = await response.text();
          console.error(`Push failed for ${sub.id}: ${response.status} ${responseText}`);
          failed++;
        }
      } catch (err) {
        console.error(`Error sending push to ${sub.id}:`, err);
        failed++;
      }
    }

    console.log(`Push notifications: ${sent} sent, ${failed} failed`);

    return new Response(
      JSON.stringify({ success: true, sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
