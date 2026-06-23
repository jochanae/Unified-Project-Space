import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ success: false, reason: "unauthorized" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse({ success: false, reason: "unauthorized" }, 401);
    }
    const caller = userData.user;

    const { referralCode } = await req.json();
    const normalizedCode = String(referralCode ?? "").trim().toLowerCase();
    if (!normalizedCode) {
      return jsonResponse({ success: false, reason: "invalid_code" });
    }

    const { data: referrer, error: referrerError } = await supabaseClient
      .from("users")
      .select("id, referral_reward_expires_at")
      .eq("referral_code", normalizedCode)
      .maybeSingle();
    if (referrerError) throw referrerError;
    if (!referrer) {
      return jsonResponse({ success: false, reason: "invalid_code" });
    }

    if (referrer.id === caller.id) {
      return jsonResponse({ success: false, reason: "self_referral" });
    }

    const { data: existingReferral, error: existingReferralError } = await supabaseClient
      .from("referrals")
      .select("id")
      .eq("referred_user_id", caller.id)
      .maybeSingle();
    if (existingReferralError) throw existingReferralError;
    if (existingReferral) {
      return jsonResponse({ success: false, reason: "already_claimed" });
    }

    const { error: insertReferralError } = await supabaseClient
      .from("referrals")
      .insert({
        referrer_user_id: referrer.id,
        referred_user_id: caller.id,
        referred_email: caller.email ?? null,
        status: "completed",
        completed_at: new Date().toISOString(),
      });
    if (insertReferralError) throw insertReferralError;

    const { count: completedCount, error: completedCountError } = await supabaseClient
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", referrer.id)
      .eq("status", "completed");
    if (completedCountError) throw completedCountError;

    let referrerRewarded = false;
    const now = new Date();
    const rewardExpiresAt = referrer.referral_reward_expires_at
      ? new Date(referrer.referral_reward_expires_at)
      : null;
    const needsReward = !rewardExpiresAt || rewardExpiresAt <= now;

    if ((completedCount ?? 0) >= 3 && needsReward) {
      const rewardExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: rewardUpdateError } = await supabaseClient
        .from("users")
        .update({ referral_reward_expires_at: rewardExpiry })
        .eq("id", referrer.id);
      if (rewardUpdateError) throw rewardUpdateError;
      referrerRewarded = true;
    }

    return jsonResponse({ success: true, referrerRewarded });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
