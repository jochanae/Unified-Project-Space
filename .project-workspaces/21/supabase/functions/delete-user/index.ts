import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: userError } = await authClient.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = caller.id;

    // Verify caller is admin
    const adminSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: isAdmin } = await adminSb.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userIds } = await req.json();
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return new Response(JSON.stringify({ error: "userIds array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prevent deleting yourself
    const safeIds = userIds.filter((id: string) => id !== callerId);

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const userId of safeIds) {
      // Delete related data first (tables without cascade)
      const tables = [
        "connections", "chat_messages", "companion_feed_posts", "companion_media",
        "companion_milestones", "memories", "cami_memories", "cami_session_history",
        "matchmaking_sessions", "mood_checkins", "journal_entries", "gratitude_entries",
        "favorites", "notifications", "notification_preferences", "user_badges",
        "vibe_points", "usage_tracking", "rate_limits", "ice_contacts",
        "sms_profiles", "push_subscriptions", "user_footer_preferences",
        "user_gift_purchases", "blocked_users", "reports", "presence_moments",
        "reminders", "beta_feedback", "client_errors", "bug_reports",
        "post_comments", "post_reactions", "user_posts", "circle_companions",
        "circle_guestbook", "circle_members", "circle_messages",
      ];

      for (const table of tables) {
        await adminSb.from(table).delete().eq("user_id", userId);
      }

      // Delete from profiles
      await adminSb.from("profiles").delete().eq("user_id", userId);

      // Delete from subscriptions
      await adminSb.from("subscriptions").delete().eq("user_id", userId);

      // Delete the auth user
      const { error } = await adminSb.auth.admin.deleteUser(userId);
      results.push({
        id: userId,
        success: !error,
        error: error?.message,
      });
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Delete user error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
