import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;

async function checkRateLimit(supabase: SupabaseClient, key: string) {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max_attempts: RATE_LIMIT_MAX,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
    } as Record<string, unknown>);
    if (error) {
      console.error("Rate limit check failed:", error.message);
      return { is_limited: false, count: 0, remaining: RATE_LIMIT_MAX };
    }
    const result = data as { is_limited: boolean; count: number; remaining: number };
    return result;
  } catch (e) {
    console.error("Rate limit exception:", e instanceof Error ? e.message : "Unknown error");
    return { is_limited: false, count: 0, remaining: RATE_LIMIT_MAX };
  }
}

async function resetRateLimit(supabase: SupabaseClient, key: string) {
  try {
    await supabase.rpc('reset_rate_limit', { p_key: key } as Record<string, unknown>);
  } catch (e) {
    console.error("Rate limit reset failed:", e instanceof Error ? e.message : "Unknown error");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, securityAnswer, newPassword } = await req.json();

    if (!username || !securityAnswer || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ success: false, error: "Password must be at least 6 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const normalizedUsername = username.toLowerCase().trim();
    const rateLimitKey = `kids_reset_pwd:${normalizedUsername}`;

    const rateLimit = await checkRateLimit(supabaseAdmin, rateLimitKey);
    if (rateLimit.is_limited) {
      console.log(`reset-kid-password: rate limited (attempts: ${rateLimit.count})`);
      return new Response(
        JSON.stringify({ success: false, error: "Too many attempts. Please wait 15 minutes or ask a parent for help." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch both plaintext and hashed security answer columns
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("kids_profiles")
      .select("id, user_id, security_question, security_answer, security_answer_hash")
      .ilike("username", normalizedUsername)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ success: false, error: "Account not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify security answer - support both hashed and legacy plaintext
    const normalizedAnswer = securityAnswer.toLowerCase().trim();
    let isValidAnswer = false;

    // First try bcrypt hash verification (new method)
    if (profile.security_answer_hash) {
      try {
        isValidAnswer = await bcrypt.compare(normalizedAnswer, profile.security_answer_hash);
      } catch (_e) {
        // bcrypt error, fall through to legacy check
      }
    }

    // Fallback to legacy plaintext comparison
    if (!isValidAnswer && profile.security_answer) {
      isValidAnswer = profile.security_answer.toLowerCase().trim() === normalizedAnswer;

      // If legacy match, migrate to hashed version and clear plaintext
      if (isValidAnswer) {
        try {
          const newHash = await bcrypt.hash(normalizedAnswer);
          await supabaseAdmin
            .from("kids_profiles")
            .update({
              security_answer_hash: newHash,
              security_answer: null,
            })
            .eq("id", profile.id);
        } catch (_e) {
          // Migration failed, non-critical
        }
      }
    }

    if (!isValidAnswer) {
      return new Response(
        JSON.stringify({ success: false, error: "Incorrect security answer" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      profile.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError instanceof Error ? updateError.message : "Unknown");
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await resetRateLimit(supabaseAdmin, rateLimitKey);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : "Internal error");
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
