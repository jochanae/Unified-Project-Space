/**
 * stripe-webhook — Supabase Edge Function
 *
 * Listens for Stripe events and keeps user_roles + subscriptions in sync.
 *
 * Deploy:
 *   supabase functions deploy stripe-webhook
 *
 * Required secrets (set once via Supabase dashboard → Edge Functions → Secrets):
 *   STRIPE_SECRET_KEY              sk_live_...  (or sk_test_... for testing)
 *   STRIPE_WEBHOOK_SECRET          whsec_...    (from Stripe dashboard → Webhooks)
 *   STRIPE_MINISTER_MONTHLY_PRICE_ID      price_...
 *   STRIPE_MINISTER_ANNUAL_PRICE_ID       price_...
 *   STRIPE_CHURCH_PARTNER_MONTHLY_PRICE_ID price_...
 *   STRIPE_CHURCH_PARTNER_ANNUAL_PRICE_ID  price_...
 *
 * Automatically available in all Supabase Edge Functions (no secrets needed):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  ← used here to bypass RLS when writing roles
 *
 * Stripe events handled:
 *   checkout.session.completed        → assign role after successful payment
 *   customer.subscription.updated     → handle plan changes and status changes
 *   customer.subscription.deleted     → downgrade to free on cancellation
 *   invoice.payment_failed            → mark subscription past_due
 *
 * How client_reference_id works:
 *   The pricing page appends ?client_reference_id=USER_UUID to every Stripe
 *   payment link. Stripe passes this back in checkout.session.completed so we
 *   know which Supabase user to assign the role to without any email matching.
 *   Users must be signed in before clicking a paid plan CTA — the pricing page
 *   enforces this by redirecting to /auth if no session exists.
 */

import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") ?? "", {
  apiVersion: "2024-04-10",
  httpClient: Stripe.createFetchHttpClient(),
});

// Service role client — bypasses RLS, safe only in server-side functions.
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

// Maps Stripe price IDs → SanctumIQ role names.
// Populated from secrets at runtime.
function buildPriceMap(): Record<string, "minister" | "church_partner"> {
  const map: Record<string, "minister" | "church_partner"> = {};
  const ids = {
    minister: [
      Deno.env.get("STRIPE_MINISTER_MONTHLY_PRICE_ID"),
      Deno.env.get("STRIPE_MINISTER_ANNUAL_PRICE_ID"),
    ],
    church_partner: [
      Deno.env.get("STRIPE_CHURCH_PARTNER_MONTHLY_PRICE_ID"),
      Deno.env.get("STRIPE_CHURCH_PARTNER_ANNUAL_PRICE_ID"),
    ],
  } as const;

  for (const [role, priceIds] of Object.entries(ids)) {
    for (const id of priceIds) {
      if (id) map[id] = role as "minister" | "church_partner";
    }
  }
  return map;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!signature || !webhookSecret) {
    console.error("Missing stripe-signature or STRIPE_WEBHOOK_SECRET");
    return new Response("Unauthorized", { status: 401 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err}`, { status: 400 });
  }

  console.log(`Processing Stripe event: ${event.type}`);

  // Log event receipt (best-effort; don't fail the webhook on log errors).
  await supabase.from("webhook_events").upsert(
    {
      source: "stripe",
      stripe_event_id: event.id,
      event_type: event.type,
      status: "received",
      metadata: { livemode: event.livemode, api_version: event.api_version },
      received_at: new Date().toISOString(),
    },
    { onConflict: "stripe_event_id" },
  );

  let processError: unknown = null;
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    processError = err;
    console.error(`Error processing ${event.type}:`, err);
  }

  // Mark processing result.
  await supabase
    .from("webhook_events")
    .update({
      status: processError ? "failed" : "processed",
      error_message: processError ? String(processError) : null,
      processed_at: new Date().toISOString(),
    })
    .eq("stripe_event_id", event.id);

  if (processError) {
    return new Response(`Processing error: ${processError}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});

/* ─────────────────────────────────────────────────────────────
   EVENT HANDLERS
   ───────────────────────────────────────────────────────────── */

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // client_reference_id = user's Supabase UUID, set by the pricing page CTA.
  const userId = session.client_reference_id;
  if (!userId) {
    console.error("checkout.session.completed missing client_reference_id — cannot assign role");
    return;
  }

  // Fetch the full subscription to get the price ID and billing interval.
  if (!session.subscription) {
    console.log("One-time payment (no subscription) — skipping role assignment");
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

  await upsertSubscriptionAndRole(userId, subscription, session.customer as string);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  // Find the user by stripe_customer_id.
  const userId = await findUserIdByCustomer(subscription.customer as string);
  if (!userId) {
    console.error(`No user found for Stripe customer ${subscription.customer}`);
    return;
  }

  if (subscription.status === "active" || subscription.status === "trialing") {
    await upsertSubscriptionAndRole(userId, subscription, subscription.customer as string);
  } else if (["canceled", "unpaid", "paused"].includes(subscription.status)) {
    await downgradeToFree(userId, subscription);
  } else {
    // past_due — keep access but update status so account page can show warning
    await updateSubscriptionStatus(userId, subscription.status);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = await findUserIdByCustomer(subscription.customer as string);
  if (!userId) return;
  await downgradeToFree(userId, subscription);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const userId = await findUserIdByCustomer(subscription.customer as string);
  if (!userId) return;
  await updateSubscriptionStatus(userId, "past_due");
}

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */

async function upsertSubscriptionAndRole(
  userId: string,
  subscription: Stripe.Subscription,
  customerId: string,
) {
  const priceMap = buildPriceMap();
  const priceId = subscription.items.data[0]?.price?.id ?? "";
  const role = priceMap[priceId];

  if (!role) {
    console.error(`Unknown price ID: ${priceId}. Check STRIPE_*_PRICE_ID secrets.`);
    return;
  }

  const billingInterval = subscription.items.data[0]?.price?.recurring?.interval ?? "month";
  const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

  // 1. Upsert subscriptions row
  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier: role,
      billing_interval: billingInterval,
      status: subscription.status,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (subError) {
    console.error("Error upserting subscription:", subError);
    throw subError;
  }

  // 2. Clear any existing paid roles, then assign the new one.
  // Keeping 'free' and 'admin' untouched.
  await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .in("role", ["minister", "church_partner", "partner"]);

  const { error: roleError } = await supabase.from("user_roles").insert({ user_id: userId, role });

  if (roleError && roleError.code !== "23505") {
    // 23505 = unique_violation (role already exists — safe to ignore)
    console.error("Error inserting role:", roleError);
    throw roleError;
  }

  console.log(`✓ Assigned role '${role}' to user ${userId}`);
}

async function downgradeToFree(userId: string, subscription: Stripe.Subscription) {
  // Update subscription record
  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: subscription.id,
      tier: "free",
      status: subscription.status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  // Remove paid roles
  await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .in("role", ["minister", "church_partner", "partner"]);

  // Ensure free role exists (it should from signup trigger, but be safe)
  await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role: "free" }, { onConflict: "user_id,role" });

  console.log(`✓ Downgraded user ${userId} to free`);
}

async function updateSubscriptionStatus(userId: string, status: string) {
  await supabase
    .from("subscriptions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  console.log(`✓ Updated subscription status to '${status}' for user ${userId}`);
}

async function findUserIdByCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  return data?.user_id ?? null;
}
