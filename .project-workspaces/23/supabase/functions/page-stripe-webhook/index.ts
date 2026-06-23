import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { decryptSecret } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const orgId = url.searchParams.get("org_id");
  if (!orgId) {
    return new Response("Missing org_id query param", { status: 400, headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature", { status: 400, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Look up org's payment account (need both secret + webhook secret)
    const { data: account } = await admin
      .from("payment_accounts")
      .select("encrypted_secret_key, webhook_secret_encrypted")
      .eq("org_id", orgId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (!account?.encrypted_secret_key || !account?.webhook_secret_encrypted) {
      return new Response("No payment account or webhook secret configured", {
        status: 404,
        headers: corsHeaders,
      });
    }

    const secretKey = await decryptSecret(account.encrypted_secret_key);
    const webhookSecret = await decryptSecret(account.webhook_secret_encrypted);
    const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });

    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", (err as Error).message);
      return new Response(`Webhook Error: ${(err as Error).message}`, {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const updatePayload: Record<string, unknown> = {
        status: "completed",
        completed_at: new Date().toISOString(),
        customer_email:
          session.customer_details?.email || session.customer_email || null,
        amount_cents: session.amount_total ?? null,
        currency: session.currency ?? null,
      };
      await admin
        .from("checkout_sessions")
        .update(updatePayload)
        .eq("stripe_session_id", session.id);

      // Stamp payment_intent on the corresponding order so refunds can find it later
      if (session.payment_intent) {
        await admin
          .from("orders")
          .update({ stripe_payment_intent_id: session.payment_intent as string })
          .eq("stripe_session_id", session.id);
      }

      // Record affiliate purchase conversion if the contact has an affiliate_id
      const customerEmail = session.customer_details?.email || session.customer_email;
      if (customerEmail && session.amount_total && session.amount_total > 0) {
        const { data: contact } = await admin
          .from("contacts")
          .select("id, affiliate_id")
          .eq("org_id", orgId)
          .eq("email", customerEmail.toLowerCase())
          .maybeSingle();

        if (contact?.affiliate_id) {
          const { data: aff } = await admin
            .from("funnel_affiliates")
            .select("commission_type, commission_value")
            .eq("id", contact.affiliate_id)
            .maybeSingle();

          if (aff) {
            const commission = aff.commission_type === "percentage"
              ? Math.round(session.amount_total * (aff.commission_value / 100))
              : aff.commission_value;

            // Fetch the order id we just created (trigger runs async so use session id)
            const { data: order } = await admin
              .from("orders")
              .select("id")
              .eq("stripe_session_id", session.id)
              .maybeSingle();

            await admin.from("affiliate_conversions").insert({
              org_id: orgId,
              affiliate_id: contact.affiliate_id,
              contact_id: contact.id,
              order_id: order?.id ?? null,
              event_type: "purchase",
              amount_cents: session.amount_total,
              commission_cents: commission,
            });
          }
        }
      }

      // Increment coupon redemption if used
      const couponId = session.metadata?.coupon_id;
      if (couponId) {
        const { data: coupon } = await admin
          .from("coupons")
          .select("redeemed_count")
          .eq("id", couponId)
          .maybeSingle();
        if (coupon) {
          await admin
            .from("coupons")
            .update({ redeemed_count: (coupon.redeemed_count ?? 0) + 1 })
            .eq("id", couponId);
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      await admin
        .from("checkout_sessions")
        .update({ status: "expired" })
        .eq("stripe_session_id", session.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("page-stripe-webhook error:", err);
    return new Response("Webhook handler failed", { status: 500, headers: corsHeaders });
  }
});
