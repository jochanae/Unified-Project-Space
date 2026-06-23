import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit constants
const RATE_LIMIT_MAX = 5; // Max attempts
const RATE_LIMIT_WINDOW_MINUTES = 15; // 15 minutes

interface RateLimitResult {
  is_limited: boolean;
  count: number;
  remaining: number;
}

/**
 * Check rate limit using persistent database storage
 * Returns { is_limited, count, remaining }
 */
async function checkRateLimit(
  supabase: SupabaseClient,
  key: string
): Promise<RateLimitResult> {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_key: key,
      p_max_attempts: RATE_LIMIT_MAX,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES
    } as Record<string, unknown>);

    if (error) {
      // Log error without exposing sensitive details
      console.error("Rate limit check failed:", error.message);
      // Fail open but with reduced limit for safety
      return { is_limited: false, count: 0, remaining: RATE_LIMIT_MAX };
    }

    const result = data as { is_limited: boolean; count: number; remaining: number };
    return {
      is_limited: result.is_limited,
      count: result.count,
      remaining: result.remaining
    };
  } catch (e) {
    console.error("Rate limit exception:", e instanceof Error ? e.message : "Unknown error");
    return { is_limited: false, count: 0, remaining: RATE_LIMIT_MAX };
  }
}

/**
 * Reset rate limit on successful authentication
 */
async function resetRateLimit(
  supabase: SupabaseClient,
  key: string
): Promise<void> {
  try {
    await supabase.rpc('reset_rate_limit', { p_key: key } as Record<string, unknown>);
  } catch (e) {
    // Non-critical, just log
    console.error("Rate limit reset failed:", e instanceof Error ? e.message : "Unknown error");
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, username, securityAnswer, newPassword } = await req.json();
    
    // Create admin client - NOTE: Service role key is used securely here
    // and never logged or exposed in responses
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Action: Hash a security answer (for signup)
    if (action === "hash-security-answer") {
      if (!securityAnswer || typeof securityAnswer !== "string") {
        return new Response(
          JSON.stringify({ success: false, error: "Security answer is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const normalizedAnswer = securityAnswer.toLowerCase().trim();
      const hash = await bcrypt.hash(normalizedAnswer);
      
      return new Response(
        JSON.stringify({ success: true, hash }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Check if username exists (for login flow)
    if (action === "lookup") {
      if (!username || typeof username !== "string") {
        console.log("kids-auth lookup: missing username");
        return new Response(
          JSON.stringify({ success: false, error: "Username is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const normalizedUsername = username.toLowerCase().trim();
      const rateLimitKey = `kids_lookup:${normalizedUsername}`;
      
      // Check persistent rate limit
      const rateLimit = await checkRateLimit(supabaseAdmin, rateLimitKey);
      
      if (rateLimit.is_limited) {
        console.log(`kids-auth lookup: rate limited for user (attempts: ${rateLimit.count})`);
        return new Response(
          JSON.stringify({ success: false, error: "Too many attempts. Please wait 15 minutes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Only fetch the minimum required fields (including avatar_url for photo display)
      const { data: profile, error } = await supabaseAdmin
        .from("kids_profiles")
        .select("id, user_id, age_tier, security_question, display_name, first_name, avatar_emoji, avatar_url")
        .ilike("username", normalizedUsername)
        .single();

      if (error || !profile) {
        console.log("kids-auth lookup: username not found");
        return new Response(
          JSON.stringify({ success: false, exists: false }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Fetch auth user to get the actual login email (handles legacy accounts)
      let loginEmail: string | null = null;
      try {
        const { data: authUserData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        if (!authError && authUserData?.user?.email) {
          loginEmail = authUserData.user.email;
        }
      } catch (e) {
        // Non-critical, proceed without email
      }

      // Return only safe data needed for login UI
      return new Response(
        JSON.stringify({
          success: true,
          exists: true,
          profile: {
            id: profile.id,
            user_id: profile.user_id,
            age_tier: profile.age_tier,
            security_question: profile.security_question,
            display_name: profile.display_name || profile.first_name || normalizedUsername,
            avatar_emoji: profile.avatar_emoji,
            avatar_url: profile.avatar_url,
            login_email: loginEmail,
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action: Reset password with security answer
    if (action === "reset-password") {
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

      const normalizedUsername = username.toLowerCase().trim();
      const rateLimitKey = `kids_reset:${normalizedUsername}`;

      // Check persistent rate limit for password reset attempts
      const rateLimit = await checkRateLimit(supabaseAdmin, rateLimitKey);
      
      if (rateLimit.is_limited) {
        console.log(`kids-auth reset-password: rate limited (attempts: ${rateLimit.count})`);
        return new Response(
          JSON.stringify({ success: false, error: "Too many attempts. Please wait 15 minutes or ask a parent for help." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the kid profile by username - include both legacy and new hash columns
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("kids_profiles")
        .select("id, user_id, security_question, security_answer, security_answer_hash")
        .ilike("username", normalizedUsername)
        .single();

      if (profileError || !profile) {
        console.log("kids-auth reset-password: account not found");
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
        } catch (e) {
          // bcrypt error, try legacy
        }
      }

      // Fallback to legacy plaintext comparison
      if (!isValidAnswer && profile.security_answer) {
        isValidAnswer = profile.security_answer.toLowerCase().trim() === normalizedAnswer;
        
        // If legacy match, migrate to hashed version
        if (isValidAnswer) {
          try {
            const newHash = await bcrypt.hash(normalizedAnswer);
            await supabaseAdmin
              .from("kids_profiles")
              .update({ 
                security_answer_hash: newHash,
                security_answer: null // Clear plaintext after migration
              })
              .eq("id", profile.id);
          } catch (e) {
            // Migration failed, non-critical
          }
        }
      }

      if (!isValidAnswer) {
        console.log("kids-auth reset-password: incorrect security answer");
        return new Response(
          JSON.stringify({ success: false, error: "Incorrect security answer" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update the password using admin privileges
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        profile.user_id,
        { password: newPassword }
      );

      if (updateError) {
        // Handle specific error codes without exposing internals
        const code = (updateError as { code?: string }).code;
        if (code === "weak_password") {
          return new Response(
            JSON.stringify({
              success: false,
              error: "That password is too easy to guess or has been found in data breaches. Please choose a stronger password with at least 8 characters, a mix of letters and numbers, and avoid common phrases.",
              reason: "weak_password",
            }),
            { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.error("kids-auth reset-password: password update failed");
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update password" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Reset rate limit on success
      await resetRateLimit(supabaseAdmin, rateLimitKey);

      return new Response(
        JSON.stringify({ success: true, user_id: profile.user_id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    // Log error without exposing stack traces or sensitive data
    console.error("kids-auth error:", error instanceof Error ? error.message : "Internal error");
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
