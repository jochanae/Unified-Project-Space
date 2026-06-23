import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildPushPayload } from "npm:@block65/webcrypto-web-push@1.0.2";

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
  tag?: string;
  url?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    console.log('Sending push notification:', JSON.stringify({ title: payload.title, body: payload.body }));

    // Get user IDs to notify
    const userIds = payload.user_ids || (payload.user_id ? [payload.user_id] : []);
    
    if (userIds.length === 0) {
      throw new Error('No user IDs provided');
    }

    // Get push subscriptions for users
    const { data: subscriptions, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw subError;
    }

    console.log(`Found ${subscriptions?.length || 0} subscriptions`);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapid = {
      subject: 'mailto:support@coinsbloom.com',
      publicKey: vapidPublicKey,
      privateKey: vapidPrivateKey,
    };

    const notificationData = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/favicon.ico',
      tag: payload.tag || 'notification',
      data: { url: payload.url || '/' }
    });

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        // Build the subscription object for webcrypto-web-push
        const pushSubscription = {
          endpoint: sub.endpoint,
          expirationTime: null,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        // Build the signed & encrypted push payload
        const pushPayload = await buildPushPayload(
          {
            data: notificationData,
            options: { ttl: 86400 },
          },
          pushSubscription,
          vapid
        );

        // Send the push message
        const response = await fetch(sub.endpoint, pushPayload);

        if (response.ok || response.status === 201) {
          sent++;
          console.log(`Push sent to subscription ${sub.id}`);
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired, delete it
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
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in send-push-notification:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
