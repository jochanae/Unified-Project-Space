import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { encryptSecret, decryptSecret, maskKey } from "../_shared/crypto.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    // User-scoped client (for auth.getUser + reading their own org_id via RLS)
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    // Resolve user's org_id
    const { data: profile, error: profileErr } = await userClient
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .maybeSingle();
    if (profileErr || !profile?.org_id) return json({ error: "Org not found" }, 403);
    const orgId = profile.org_id as string;

    // Service-role client for writing to payment_accounts (RLS forces this path)
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json();
    const action = body.action;

    // -------------------------------------------------------------- GET STATUS
    if (action === "status") {
      const { data: account } = await adminClient
        .from("payment_accounts")
        .select("id, provider, publishable_key, account_label, is_active, last_verified_at, verification_status, encrypted_secret_key, created_at")
        .eq("org_id", orgId)
        .eq("provider", "stripe")
        .maybeSingle();

      if (!account) return json({ connected: false });

      let masked = "";
      try {
        const decrypted = await decryptSecret(account.encrypted_secret_key);
        masked = maskKey(decrypted);
      } catch {
        masked = "••••";
      }

      return json({
        connected: true,
        id: account.id,
        provider: account.provider,
        publishable_key: account.publishable_key,
        account_label: account.account_label,
        is_active: account.is_active,
        last_verified_at: account.last_verified_at,
        verification_status: account.verification_status,
        masked_secret_key: masked,
        created_at: account.created_at,
      });
    }

    // ----------------------------------------------------------- CONNECT (UPSERT)
    if (action === "connect") {
      const secretKey: string = (body.secret_key ?? "").trim();
      const publishableKey: string | null = body.publishable_key?.trim() || null;
      const accountLabel: string | null = body.account_label?.trim() || null;

      if (!secretKey || (!secretKey.startsWith("sk_live_") && !secretKey.startsWith("sk_test_") && !secretKey.startsWith("rk_"))) {
        return json({ error: "Invalid Stripe secret key. Must start with sk_live_, sk_test_, or rk_." }, 400);
      }

      // Verify the key actually works against Stripe
      const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });
      let stripeAccountId = "";
      try {
        const account = await stripe.accounts.retrieve();
        stripeAccountId = account.id;
      } catch (e) {
        return json({ error: `Stripe rejected the key: ${(e as Error).message}` }, 400);
      }

      const encrypted = await encryptSecret(secretKey);

      // Upsert (one account per org+provider)
      const { data: existing } = await adminClient
        .from("payment_accounts")
        .select("id")
        .eq("org_id", orgId)
        .eq("provider", "stripe")
        .maybeSingle();

      const payload = {
        org_id: orgId,
        provider: "stripe",
        encrypted_secret_key: encrypted,
        publishable_key: publishableKey,
        account_label: accountLabel || stripeAccountId,
        is_active: true,
        last_verified_at: new Date().toISOString(),
        verification_status: "verified",
        created_by: user.id,
      };

      if (existing?.id) {
        const { error } = await adminClient
          .from("payment_accounts")
          .update(payload)
          .eq("id", existing.id);
        if (error) return json({ error: error.message }, 500);
      } else {
        const { error } = await adminClient.from("payment_accounts").insert(payload);
        if (error) return json({ error: error.message }, 500);
      }

      return json({
        success: true,
        verified: true,
        stripe_account_id: stripeAccountId,
        masked_secret_key: maskKey(secretKey),
      });
    }

    // ---------------------------------------------------------------- VERIFY
    if (action === "verify") {
      const { data: account } = await adminClient
        .from("payment_accounts")
        .select("id, encrypted_secret_key")
        .eq("org_id", orgId)
        .eq("provider", "stripe")
        .maybeSingle();
      if (!account) return json({ error: "No payment account configured" }, 404);

      const secret = await decryptSecret(account.encrypted_secret_key);
      const stripe = new Stripe(secret, { apiVersion: "2025-08-27.basil" });
      try {
        const acc = await stripe.accounts.retrieve();
        await adminClient
          .from("payment_accounts")
          .update({
            last_verified_at: new Date().toISOString(),
            verification_status: "verified",
          })
          .eq("id", account.id);
        return json({ success: true, stripe_account_id: acc.id });
      } catch (e) {
        await adminClient
          .from("payment_accounts")
          .update({ verification_status: "failed" })
          .eq("id", account.id);
        return json({ error: (e as Error).message }, 400);
      }
    }

    // ------------------------------------------------------------- DISCONNECT
    if (action === "disconnect") {
      const { error } = await adminClient
        .from("payment_accounts")
        .delete()
        .eq("org_id", orgId)
        .eq("provider", "stripe");
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ----------------------------------------------------------- SAVE WEBHOOK SECRET
    if (action === "save-webhook-secret") {
      const secret: string = (body.webhook_secret ?? "").trim();
      if (!secret.startsWith("whsec_")) {
        return json({ error: "Webhook secret must start with whsec_" }, 400);
      }
      const encrypted = await encryptSecret(secret);
      const { error } = await adminClient
        .from("payment_accounts")
        .update({ webhook_secret_encrypted: encrypted })
        .eq("org_id", orgId)
        .eq("provider", "stripe");
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // ----------------------------------------------------------- REVENUE SUMMARY
    if (action === "revenue-summary") {
      const { data: sessions } = await adminClient
        .from("checkout_sessions")
        .select("id, status, amount_cents, discount_amount_cents, currency, customer_email, completed_at, created_at, page_id, stripe_session_id")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(100);
      const completed = (sessions || []).filter((s) => s.status === "completed");
      const totalRevenue = completed.reduce((sum, s) => sum + (s.amount_cents || 0), 0);
      const totalOrders = completed.length;
      const last30 = completed.filter(
        (s) => s.completed_at && new Date(s.completed_at).getTime() > Date.now() - 30 * 86400000
      );
      const revenue30d = last30.reduce((sum, s) => sum + (s.amount_cents || 0), 0);
      return json({
        total_revenue_cents: totalRevenue,
        total_orders: totalOrders,
        revenue_30d_cents: revenue30d,
        orders_30d: last30.length,
        recent: (sessions || []).slice(0, 20),
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("payment-account error:", e);
    return json({ error: (e as Error).message }, 500);
  }
});
