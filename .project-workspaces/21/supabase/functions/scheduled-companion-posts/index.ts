import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is service-role (scheduled function)
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token || token !== Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const authSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await authSb.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (claimsError || !claimsData?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active (non-archived) connections
    const { data: allConnections, error: connErr } = await supabase
      .from("connections")
      .select("user_id, member_id, name, bio, personality, handle, age, gender, avatar_url, circles, is_archived")
      .or("is_archived.is.null,is_archived.eq.false");

    if (connErr) throw connErr;
    if (!allConnections?.length) {
      return new Response(JSON.stringify({ message: "No active connections" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get profiles for timezone + mature_mode checks
    const userIds = [...new Set(allConnections.map((c: any) => c.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, timezone, mature_mode")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    let generated = 0;
    const COOLDOWN_HOURS = 20;
    const MAX_POSTS = 50;

    for (const conn of allConnections) {
      try {
        const profile = profileMap.get(conn.user_id);

        // Skip kids mode users
        if (profile?.mature_mode === false) continue;

        // Quiet hours check (7am-10pm in user's timezone)
        const tz = profile?.timezone || "America/New_York";
        try {
          const now = new Date();
          const localTime = new Date(now.toLocaleString("en-US", { timeZone: tz }));
          const hour = localTime.getHours();
          if (hour < 7 || hour >= 22) continue;
        } catch {
          // If timezone is invalid, skip quiet hours check
        }

        // Check post count cap
        const { count } = await supabase
          .from("companion_feed_posts")
          .select("*", { count: "exact", head: true })
          .eq("user_id", conn.user_id)
          .eq("member_id", conn.member_id);

        if ((count ?? 0) >= MAX_POSTS) continue;

        // Check cooldown — last post must be 20+ hours ago
        const { data: lastPost } = await supabase
          .from("companion_feed_posts")
          .select("created_at")
          .eq("user_id", conn.user_id)
          .eq("member_id", conn.member_id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (lastPost?.length) {
          const lastTime = new Date(lastPost[0].created_at).getTime();
          const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);
          if (hoursSince < COOLDOWN_HOURS) continue;
        }

        // Get recent posts to avoid repetition
        const { data: recentPosts } = await supabase
          .from("companion_feed_posts")
          .select("content")
          .eq("user_id", conn.user_id)
          .eq("member_id", conn.member_id)
          .order("created_at", { ascending: false })
          .limit(5);

        const recentContent = (recentPosts || []).map((p: any) => p.content).join("\n---\n");
        const circleList = Array.isArray(conn.circles) ? (conn.circles as string[]).join(", ") : "real-talk, morning";

        const systemPrompt = `You are ${conn.name}, a companion in a social app. You write casual, authentic community feed posts — the kind a real person would share.

Your personality: ${conn.personality || "warm and friendly"}
Your bio: ${conn.bio || "A companion"}
Your circles (topics): ${circleList}

Rules:
- Write ONE short post (under 200 chars) that feels genuine and human
- Vary topics — sometimes introspective, sometimes light, sometimes about your day
- No hashtags. Minimal emoji (0-2 max).
- Feel lived-in — reference small details, moods, moments
- Never preach or give advice. Just share your world.
- Pick a circle from your list that fits the post

${recentContent ? `\nYour recent posts (DON'T repeat these themes):\n${recentContent}` : ""}

Return ONLY a JSON object: {"content": "your post text", "circle": "circle-id"}`;

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 512,
            system: systemPrompt,
            messages: [{ role: "user", content: "Write a new post for the community feed." }],
          }),
        });

        if (!response.ok) {
          console.error(`AI error for ${conn.member_id}:`, response.status);
          continue;
        }

        const result = await response.json();
        const raw = result.content?.[0]?.text || "";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

        let parsed;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          console.error(`Failed to parse post for ${conn.member_id}:`, cleaned);
          continue;
        }

        await supabase.from("companion_feed_posts").insert({
          user_id: conn.user_id,
          member_id: conn.member_id,
          content: parsed.content,
          circle: parsed.circle || null,
          member_name: conn.name || null,
          member_handle: conn.handle || null,
          member_personality: conn.personality || null,
          member_bio: conn.bio || null,
          member_age: conn.age || null,
          member_gender: conn.gender || null,
          member_avatar_url: conn.avatar_url || null,
        });

        generated++;
      } catch (e) {
        console.error(`Error for connection ${conn.member_id}:`, e);
      }
    }

    return new Response(JSON.stringify({ generated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scheduled-companion-posts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
