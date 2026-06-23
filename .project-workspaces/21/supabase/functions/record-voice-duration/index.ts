import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    const { durationSeconds } = await req.json();
    if (!durationSeconds || durationSeconds <= 0) {
      return new Response(
        JSON.stringify({ ok: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is premium
    const { data: subData } = await adminSb
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", userId)
      .maybeSingle();

    const isPremium = subData?.plan === "premium" && subData?.status === "active";

    if (isPremium) {
      // Increment premium voice seconds on profiles, capped at 3600
      await adminSb.rpc("increment_premium_voice", {
        p_user_id: userId,
        p_seconds: Math.min(Math.ceil(durationSeconds), 3600),
      });

      // Also track in usage_tracking for analytics
      const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
      await adminSb.rpc("increment_voice_minutes", { p_user_id: userId, p_minutes: minutes });

      // Check if user is in warning territory
      const { data: updated } = await adminSb
        .from("profiles")
        .select("voice_minutes_used")
        .eq("user_id", userId)
        .maybeSingle();

      const totalUsed = updated?.voice_minutes_used ?? 0;
      const WARN_THRESHOLD = 3000; // 50 minutes in seconds

      return new Response(
        JSON.stringify({
          ok: true,
          total_seconds_used: totalUsed,
          warning: totalUsed >= WARN_THRESHOLD && totalUsed < 3600,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Increment free trial seconds used, capped at 180
      await adminSb.rpc("increment_voice_trial", {
        p_user_id: userId,
        p_seconds: Math.min(Math.ceil(durationSeconds), 180),
      });
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("record-voice-duration error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
