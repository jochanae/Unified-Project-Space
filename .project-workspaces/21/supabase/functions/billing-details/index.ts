import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (s: string, d?: any) => console.log(`[BILLING-DETAILS] ${s}${d ? ` - ${JSON.stringify(d)}` : ''}`);

const toIso = (v: any): string | null => {
  try {
    if (typeof v === 'number') return new Date(v * 1000).toISOString();
    if (typeof v === 'string') return new Date(v).toISOString();
  } catch { /* noop */ }
  return null;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Auth failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401,
      });
    }
    const user = userData.user;
    log("Authed", { userId: user.id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      return new Response(JSON.stringify({
        hasCustomer: false, subscription: null, upcomingInvoice: null, auditLog: [],
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    const customerId = customers.data[0].id;
    const subs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 1 });
    let subscription: any = null;
    let upcomingInvoice: any = null;

    if (subs.data.length > 0) {
      const sub = subs.data[0];
      const item = sub.items.data[0];
      subscription = {
        id: sub.id,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end,
        current_period_end: toIso(sub.current_period_end),
        current_period_start: toIso(sub.current_period_start),
        canceled_at: toIso((sub as any).canceled_at),
        amount: item?.price?.unit_amount ?? null,
        currency: item?.price?.currency ?? 'usd',
        interval: item?.price?.recurring?.interval ?? null,
      };

      // Upcoming invoice (only if subscription is active and not fully canceled)
      if (sub.status === 'active' || sub.status === 'trialing') {
        try {
          const inv = await (stripe.invoices as any).retrieveUpcoming({ customer: customerId });
          upcomingInvoice = {
            amount_due: inv.amount_due,
            currency: inv.currency,
            next_payment_attempt: toIso(inv.next_payment_attempt) || toIso(inv.period_end),
            period_start: toIso(inv.period_start),
            period_end: toIso(inv.period_end),
          };
        } catch (e) {
          log("No upcoming invoice", { err: String(e) });
        }
      }

      // Detect cancel / resume state change vs last audit entry
      const { data: lastAudit } = await supabase
        .from('notifications')
        .select('metadata, created_at')
        .eq('user_id', user.id)
        .eq('type', 'subscription_audit')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastCancelFlag = (lastAudit?.metadata as any)?.cancel_at_period_end ?? null;
      const currentCancelFlag = sub.cancel_at_period_end;

      // Initial seed OR state change → log it
      if (lastCancelFlag === null || lastCancelFlag !== currentCancelFlag) {
        const action = currentCancelFlag ? 'canceled' : (lastCancelFlag === true ? 'resumed' : 'active');
        const message = action === 'canceled'
          ? `Subscription canceled — access continues until ${subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'period end'}`
          : action === 'resumed'
            ? 'Subscription resumed — auto-renew is back on'
            : 'Subscription is active';

        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'subscription_audit',
          message,
          metadata: {
            action,
            cancel_at_period_end: currentCancelFlag,
            subscription_id: sub.id,
            period_end: subscription.current_period_end,
            seeded: lastCancelFlag === null,
          },
          read: true, // audit entries shouldn't show as unread alerts
        });
        log("Audit entry written", { action });
      }
    }

    // Fetch audit log
    const { data: auditLog } = await supabase
      .from('notifications')
      .select('id, message, metadata, created_at')
      .eq('user_id', user.id)
      .eq('type', 'subscription_audit')
      .order('created_at', { ascending: false })
      .limit(50);

    return new Response(JSON.stringify({
      hasCustomer: true,
      subscription,
      upcomingInvoice,
      auditLog: auditLog ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
