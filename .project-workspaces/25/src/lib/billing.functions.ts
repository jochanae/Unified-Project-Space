import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const STRIPE_API = "https://api.stripe.com/v1";

/**
 * Cancel the user's active subscription at period end.
 * Returns the updated cancel_at_period_end + current_period_end from Stripe.
 */
export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return { ok: false, error: "Could not load subscription." };
    if (!sub?.stripe_subscription_id) {
      return { ok: false, error: "No active subscription found." };
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { ok: false, error: "Billing is not configured." };

    const res = await fetch(`${STRIPE_API}/subscriptions/${sub.stripe_subscription_id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ cancel_at_period_end: "true" }).toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Stripe cancel failed:", res.status, text);
      return { ok: false, error: `Stripe error (${res.status}).` };
    }

    return { ok: true };
  });

/**
 * Resume a subscription that was set to cancel at period end.
 */
export const resumeSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return { ok: false, error: "No subscription found." };
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { ok: false, error: "Billing is not configured." };

    const res = await fetch(`${STRIPE_API}/subscriptions/${sub.stripe_subscription_id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ cancel_at_period_end: "false" }).toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Stripe resume failed:", res.status, text);
      return { ok: false, error: `Stripe error (${res.status}).` };
    }

    return { ok: true };
  });

/**
 * Fetch live cancel_at_period_end flag from Stripe (since our DB doesn't store it).
 */
export const getStripeSubscriptionMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) return { cancelAtPeriodEnd: false };

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { cancelAtPeriodEnd: false };

    const res = await fetch(`${STRIPE_API}/subscriptions/${sub.stripe_subscription_id}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!res.ok) return { cancelAtPeriodEnd: false };
    const data = (await res.json()) as { cancel_at_period_end?: boolean };
    return { cancelAtPeriodEnd: Boolean(data.cancel_at_period_end) };
  });

/**
 * Pull live subscription state from Stripe and sync into the local DB.
 * Useful when a webhook was missed or the user wants to force a refresh.
 */
export const refreshSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return { ok: false, error: "No subscription on file." };
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) return { ok: false, error: "Billing is not configured." };

    const res = await fetch(`${STRIPE_API}/subscriptions/${sub.stripe_subscription_id}`, {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });
    if (!res.ok) {
      return { ok: false, error: `Stripe error (${res.status}).` };
    }
    const s = (await res.json()) as {
      status: string;
      current_period_end: number;
      cancel_at_period_end: boolean;
      items: { data: Array<{ price: { id: string; recurring?: { interval?: string } } }> };
    };

    const priceId = s.items?.data?.[0]?.price?.id ?? null;
    const interval = s.items?.data?.[0]?.price?.recurring?.interval ?? null;
    const periodEnd = s.current_period_end
      ? new Date(s.current_period_end * 1000).toISOString()
      : null;

    const { error: upErr } = await supabase
      .from("subscriptions")
      .update({
        status: s.status,
        billing_interval: interval,
        current_period_end: periodEnd,
        stripe_price_id: priceId,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (upErr) return { ok: false, error: "Could not save refreshed state." };
    return { ok: true, cancelAtPeriodEnd: s.cancel_at_period_end };
  });
