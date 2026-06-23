import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: "free",
        product_id: null,
        subscription_end: null,
        error: "not_authenticated"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      logStep("Authorization header present but token missing");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: "free",
        product_id: null,
        subscription_end: null,
        error: "session_expired"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // verify_jwt=true already validates the token. Decode claims locally to avoid getUser()
    // (which can fail in stateless function contexts with "Auth session missing!").
    const parts = token.split('.');
    const payload = (() => {
      try {
        if (parts.length !== 3) return null;
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        return JSON.parse(atob(padded));
      } catch {
        return null;
      }
    })();

    const userId = typeof payload?.sub === 'string' ? payload.sub : null;
    const email = typeof payload?.email === 'string' ? payload.email : null;

    if (!userId || !email) {
      logStep("Auth failed or session expired", { error: "missing_sub_or_email" });
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: "free",
        product_id: null,
        subscription_end: null,
        error: "session_expired"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const user = { id: userId, email };
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check local subscriptions table first (admin-granted premium overrides)
    const { data: localSub } = await supabaseClient
      .from("subscriptions")
      .select("plan, status, stripe_subscription_id, granted_by")
      .eq("user_id", user.id)
      .maybeSingle();

    if (localSub && localSub.plan === "premium" && localSub.status === "active" && !localSub.stripe_subscription_id) {
      logStep("Local admin-granted premium found", { grantedBy: localSub.granted_by });
      return new Response(JSON.stringify({
        subscribed: true,
        tier: "premium",
        product_id: "admin_granted",
        subscription_end: null,
        is_admin_granted: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user is an admin - admins get free premium access
    const { data: adminCheck } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (adminCheck) {
      logStep("Admin user detected, granting free premium access", { role: adminCheck.role });
      return new Response(JSON.stringify({
        subscribed: true,
        tier: "premium",
        product_id: "admin_free",
        subscription_end: null,
        is_admin: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user is a linked professional - professionals get comped premium access
    const { data: professionalCheck } = await supabaseClient
      .from("professionals")
      .select("id, name, partner_id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (professionalCheck) {
      logStep("Linked professional detected, granting comped premium access", { 
        professionalId: professionalCheck.id,
        name: professionalCheck.name,
        partnerId: professionalCheck.partner_id
      });
      return new Response(JSON.stringify({
        subscribed: true,
        tier: "premium",
        product_id: "professional_comped",
        subscription_end: null,
        is_professional: true,
        professional_id: professionalCheck.id,
        partner_id: professionalCheck.partner_id
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { 
      apiVersion: "2025-08-27.basil",
      timeout: 8000, // 8 second timeout
    });
    
    let customers;
    try {
      customers = await stripe.customers.list({ email: user.email, limit: 1 });
    } catch (stripeError) {
      logStep("Stripe customer lookup failed, defaulting to free tier", { error: String(stripeError) });
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: "free",
        product_id: null,
        subscription_end: null,
        error: "stripe_timeout"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    if (customers.data.length === 0) {
      logStep("No customer found, user is on free tier");
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: "free",
        product_id: null,
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    let subscriptions;
    try {
      subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });
    } catch (stripeError) {
      logStep("Stripe subscription lookup failed, defaulting to free tier", { error: String(stripeError) });
      return new Response(JSON.stringify({ 
        subscribed: false,
        tier: "free",
        product_id: null,
        subscription_end: null,
        error: "stripe_timeout"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let tier = "free";

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      // In Stripe API 2025-08-27.basil, current_period_end moved to subscription item level
      const subscriptionItem = subscription.items.data[0];
      const periodEnd = (subscription as any).current_period_end ?? subscriptionItem.current_period_end;
      if (periodEnd && typeof periodEnd === 'number') {
        subscriptionEnd = new Date(periodEnd * 1000).toISOString();
      }
      productId = subscriptionItem.price.product;
      
      // Map product IDs to tiers
      if (productId === "prod_TNeDfC3O0W1QmL") {
        tier = "premium";
      } else if (productId === "prod_TNeGh2St7VFJ16") {
        tier = "family";
      }
      
      logStep("Active subscription found", { subscriptionId: subscription.id, tier, endDate: subscriptionEnd });
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      tier,
      product_id: productId,
      subscription_end: subscriptionEnd
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
