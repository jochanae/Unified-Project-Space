import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header — returning unsubscribed");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      logStep("Auth failed or no email — returning unsubscribed", { error: userError?.message });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check local subscriptions table first (handles manual/admin subscriptions)
    const { data: localSub } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('plan', ['premium', 'admin'])
      .limit(1)
      .maybeSingle();

    if (localSub && !localSub.stripe_subscription_id) {
      // Manual/admin subscription — trust the DB
      logStep("Found local premium subscription (no Stripe)", { plan: localSub.plan });
      return new Response(JSON.stringify({
        subscribed: true,
        product_id: null,
        price_id: null,
        subscription_end: localSub.current_period_end,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check Stripe for paid subscriptions
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let priceId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      // Handle current_period_end as either Unix timestamp (number) or ISO string
      const periodEnd = subscription.current_period_end;
      try {
        if (typeof periodEnd === 'number') {
          subscriptionEnd = new Date(periodEnd * 1000).toISOString();
        } else if (typeof periodEnd === 'string') {
          subscriptionEnd = new Date(periodEnd).toISOString();
        } else {
          logStep("Unexpected period_end type", { type: typeof periodEnd, value: periodEnd });
          subscriptionEnd = null;
        }
      } catch (e) {
        logStep("Failed to parse period_end", { periodEnd, error: String(e) });
        subscriptionEnd = null;
      }
      productId = subscription.items.data[0].price.product as string;
      priceId = subscription.items.data[0].price.id;
      logStep("Active subscription found", { subscriptionId: subscription.id, productId, priceId, subscriptionEnd });

      // Sync active Stripe subscription back to the database
      const { error: upsertError } = await supabaseClient
        .from('subscriptions')
        .upsert({
          user_id: user.id,
          plan: 'premium',
          status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          current_period_start: subscription.current_period_start
            ? new Date(typeof subscription.current_period_start === 'number'
                ? subscription.current_period_start * 1000
                : subscription.current_period_start).toISOString()
            : null,
          current_period_end: subscriptionEnd,
          cancel_at_period_end: subscription.cancel_at_period_end || false,
        }, { onConflict: 'user_id' });

      if (upsertError) {
        logStep("Failed to sync subscription to DB", { error: upsertError.message });
      } else {
        logStep("Synced subscription to DB");
      }
    } else {
      logStep("No active subscription found");

      // If no active Stripe sub, mark any existing DB record as inactive
      if (localSub?.stripe_subscription_id) {
        await supabaseClient
          .from('subscriptions')
          .update({ status: 'canceled', plan: 'free' })
          .eq('user_id', user.id)
          .eq('status', 'active')
          .not('stripe_subscription_id', 'is', null);
        logStep("Marked stale DB subscription as canceled");
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      price_id: priceId,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
