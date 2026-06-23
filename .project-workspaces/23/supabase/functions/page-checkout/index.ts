import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { decryptSecret } from "../_shared/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

interface CheckoutRequest {
  page_id: string;
  block_id: string;
  // Inline product details (from the published page block)
  name: string;
  description?: string;
  image_url?: string;
  amount_cents: number;
  currency?: string;
  mode?: "payment" | "subscription";
  recurring_interval?: "month" | "year" | null;
  // Optional context
  customer_email?: string;
  success_url?: string;
  cancel_url?: string;
  coupon_code?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (await req.json()) as CheckoutRequest;

    if (!body.page_id || !body.block_id || !body.name || !body.amount_cents) {
      return json({ error: "page_id, block_id, name, and amount_cents are required" }, 400);
    }
    if (body.amount_cents < 50) {
      return json({ error: "Amount must be at least 50 cents" }, 400);
    }

    // Look up page → org_id (and verify page is published)
    const { data: page, error: pageErr } = await adminClient
      .from("pages")
      .select("id, org_id, is_published, title")
      .eq("id", body.page_id)
      .maybeSingle();
    if (pageErr || !page) return json({ error: "Page not found" }, 404);
    if (!page.is_published) return json({ error: "Page is not published" }, 403);
    const orgId = page.org_id as string;

    // Load org's Stripe credentials
    const { data: account } = await adminClient
      .from("payment_accounts")
      .select("id, encrypted_secret_key, is_active")
      .eq("org_id", orgId)
      .eq("provider", "stripe")
      .maybeSingle();

    if (!account || !account.is_active) {
      return json({ error: "This page's owner has not connected a payment account yet." }, 402);
    }

    const secretKey = await decryptSecret(account.encrypted_secret_key);
    const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });

    const currency = (body.currency ?? "usd").toLowerCase();
    const mode = body.mode === "subscription" ? "subscription" : "payment";

    // Look up cached product/price for this block
    const { data: cached } = await adminClient
      .from("page_products")
      .select("id, stripe_product_id, stripe_price_id, name, description, image_url, amount_cents, currency, mode, recurring_interval")
      .eq("page_id", body.page_id)
      .eq("block_id", body.block_id)
      .maybeSingle();

    let priceId = cached?.stripe_price_id ?? null;
    let productId = cached?.stripe_product_id ?? null;
    let pageProductId = cached?.id ?? null;

    // Decide if cached price is still valid (no field changed)
    const cacheValid =
      cached &&
      cached.stripe_price_id &&
      cached.amount_cents === body.amount_cents &&
      cached.currency === currency &&
      cached.mode === mode &&
      (cached.recurring_interval ?? null) === (body.recurring_interval ?? null) &&
      cached.name === body.name;

    if (!cacheValid) {
      // Create or reuse product
      if (!productId) {
        const product = await stripe.products.create({
          name: body.name,
          description: body.description || undefined,
          images: body.image_url ? [body.image_url] : undefined,
        });
        productId = product.id;
      } else {
        // Update product metadata if it already exists
        await stripe.products.update(productId, {
          name: body.name,
          description: body.description || undefined,
          images: body.image_url ? [body.image_url] : undefined,
        });
      }

      // Create new price (Stripe prices are immutable, so we always make a new one)
      const priceParams: Stripe.PriceCreateParams = {
        product: productId,
        unit_amount: body.amount_cents,
        currency,
      };
      if (mode === "subscription" && body.recurring_interval) {
        priceParams.recurring = { interval: body.recurring_interval };
      }
      const price = await stripe.prices.create(priceParams);
      priceId = price.id;

      // Upsert cache row
      const cacheRow = {
        org_id: orgId,
        page_id: body.page_id,
        block_id: body.block_id,
        provider: "stripe",
        stripe_product_id: productId,
        stripe_price_id: priceId,
        name: body.name,
        description: body.description ?? null,
        image_url: body.image_url ?? null,
        amount_cents: body.amount_cents,
        currency,
        mode,
        recurring_interval: body.recurring_interval ?? null,
      };

      if (pageProductId) {
        await adminClient.from("page_products").update(cacheRow).eq("id", pageProductId);
      } else {
        const { data: inserted } = await adminClient
          .from("page_products")
          .insert(cacheRow)
          .select("id")
          .single();
        pageProductId = inserted?.id ?? null;
      }
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const successUrl =
      body.success_url ||
      `${origin}${origin.includes("?") ? "&" : "?"}checkout=success`;
    const cancelUrl =
      body.cancel_url ||
      `${origin}${origin.includes("?") ? "&" : "?"}checkout=canceled`;

    // Resolve coupon if provided
    let stripeCouponId: string | null = null;
    let appliedCouponDbId: string | null = null;
    let discountAmountCents = 0;
    if (body.coupon_code) {
      const code = body.coupon_code.trim().toUpperCase();
      const { data: coupon } = await adminClient
        .from("coupons")
        .select("id, discount_type, discount_value, currency, max_redemptions, redeemed_count, expires_at, is_active")
        .eq("org_id", orgId)
        .eq("code", code)
        .maybeSingle();
      if (coupon && coupon.is_active &&
          (!coupon.expires_at || new Date(coupon.expires_at) > new Date()) &&
          (!coupon.max_redemptions || coupon.redeemed_count < coupon.max_redemptions)) {
        const stripeCoupon = await stripe.coupons.create(
          coupon.discount_type === "percent"
            ? { percent_off: coupon.discount_value, duration: "once", name: code }
            : { amount_off: coupon.discount_value, currency: coupon.currency || currency, duration: "once", name: code }
        );
        stripeCouponId = stripeCoupon.id;
        appliedCouponDbId = coupon.id;
        discountAmountCents =
          coupon.discount_type === "percent"
            ? Math.round((body.amount_cents * coupon.discount_value) / 100)
            : Math.min(coupon.discount_value, body.amount_cents);
      }
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId!, quantity: 1 }],
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: body.customer_email || undefined,
      discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
      metadata: {
        page_id: body.page_id,
        block_id: body.block_id,
        org_id: orgId,
        coupon_id: appliedCouponDbId ?? "",
      },
    });

    await adminClient.from("checkout_sessions").insert({
      org_id: orgId,
      page_id: body.page_id,
      page_product_id: pageProductId,
      stripe_session_id: session.id,
      amount_cents: body.amount_cents,
      currency,
      customer_email: body.customer_email ?? null,
      status: "pending",
      coupon_id: appliedCouponDbId,
      discount_amount_cents: discountAmountCents,
    });

    return json({ url: session.url, session_id: session.id, discount_applied: discountAmountCents > 0 });
  } catch (e) {
    console.error("page-checkout error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
