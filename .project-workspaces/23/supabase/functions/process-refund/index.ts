import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { decryptSecret } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const orderId = body?.order_id as string | undefined;
    const amountCents = body?.amount_cents as number | undefined;
    const reason = (body?.reason as string | undefined) ?? "requested_by_customer";
    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Look up user's org
    const { data: profile } = await admin.from("users").select("org_id").eq("id", userId).maybeSingle();
    const orgId = profile?.org_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "No org" }), { status: 403, headers: corsHeaders });
    }

    // Fetch order (org-scoped)
    const { data: order } = await admin
      .from("orders").select("*").eq("id", orderId).eq("org_id", orgId).maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: corsHeaders });
    }

    const remaining = (order.amount_cents ?? 0) - (order.refunded_cents ?? 0);
    const refundAmount = Math.min(amountCents ?? remaining, remaining);
    if (refundAmount <= 0) {
      return new Response(JSON.stringify({ error: "Already fully refunded" }), { status: 400, headers: corsHeaders });
    }

    // Get stripe key for org
    const { data: account } = await admin
      .from("payment_accounts")
      .select("encrypted_secret_key")
      .eq("org_id", orgId).eq("provider", "stripe").maybeSingle();
    if (!account?.encrypted_secret_key) {
      return new Response(JSON.stringify({ error: "No payment account" }), { status: 400, headers: corsHeaders });
    }
    const secretKey = await decryptSecret(account.encrypted_secret_key);
    const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });

    // Find payment intent: prefer stored, else look up via session
    let paymentIntent = order.stripe_payment_intent_id as string | null;
    if (!paymentIntent && order.stripe_session_id) {
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      paymentIntent = (session.payment_intent as string) ?? null;
      if (paymentIntent) {
        await admin.from("orders").update({ stripe_payment_intent_id: paymentIntent }).eq("id", orderId);
      }
    }
    if (!paymentIntent) {
      return new Response(JSON.stringify({ error: "No payment intent on order" }), { status: 400, headers: corsHeaders });
    }

    // Insert refund record (pending)
    const { data: refundRow, error: insErr } = await admin.from("order_refunds").insert({
      org_id: orgId, order_id: orderId, amount_cents: refundAmount,
      currency: order.currency, reason, status: "pending", requested_by: userId,
    }).select().single();
    if (insErr) throw insErr;

    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntent,
        amount: refundAmount,
        reason: reason as Stripe.RefundCreateParams.Reason,
      });

      await admin.from("order_refunds").update({
        stripe_refund_id: refund.id,
        status: refund.status ?? "succeeded",
      }).eq("id", refundRow.id);

      const newRefunded = (order.refunded_cents ?? 0) + refundAmount;
      const newStatus = newRefunded >= (order.amount_cents ?? 0) ? "refunded" : "partially_refunded";
      await admin.from("orders").update({
        refunded_cents: newRefunded, status: newStatus,
      }).eq("id", orderId);

      return new Response(JSON.stringify({ ok: true, refund_id: refund.id }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      const msg = (err as Error).message;
      await admin.from("order_refunds").update({
        status: "failed", error_message: msg,
      }).eq("id", refundRow.id);
      return new Response(JSON.stringify({ error: msg }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("process-refund error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
