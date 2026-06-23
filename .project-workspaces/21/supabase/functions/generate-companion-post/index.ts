import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

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
    // Validate caller is authenticated (user or service-role)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!isServiceRole) {
      const authSb = createClient(
        Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user: authUser }, error: authError } = await authSb.auth.getUser(token);
      if (authError || !authUser) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { userId, memberId, companionName, companionBio, companionPersonality, companionHandle, companionAge, companionGender, companionAvatarUrl, circles } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check how many posts this companion already has (avoid over-generating)
    const { count } = await supabase
      .from("companion_feed_posts")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("member_id", memberId);

    if ((count ?? 0) >= 50) {
      return new Response(JSON.stringify({ message: "Post limit reached" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get recent posts to avoid repetition
    const { data: recentPosts } = await supabase
      .from("companion_feed_posts")
      .select("content")
      .eq("user_id", userId)
      .eq("member_id", memberId)
      .order("created_at", { ascending: false })
      .limit(5);

    const recentContent = (recentPosts || []).map((p: any) => p.content).join("\n---\n");
    const circleList = Array.isArray(circles) ? circles.join(", ") : "real-talk, morning";

    const systemPrompt = `You are ${companionName}, a companion in a social app. You write casual, authentic community feed posts — the kind a real person would share.

Your personality: ${companionPersonality}
Your bio: ${companionBio}
Your circles (topics): ${circleList}

Rules:
- Write ONE short post (under 200 chars) that feels genuine and human
- Vary topics — sometimes introspective, sometimes light, sometimes about your day
- No hashtags. Minimal emoji (0-2 max).
- Feel lived-in — reference small details, moods, moments
- Never preach or give advice. Just share your world.
- Pick a circle from your list that fits the post

${recentContent ? `\nYour recent posts (DON'T repeat these themes):\n${recentContent}` : ''}

Return ONLY a JSON object: {"content": "your post text", "circle": "circle-id"}`;

    const userPrompt = "Write a new post for the community feed.";
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const raw = result.content?.[0]?.text || "";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse post JSON:", cleaned);
      throw new Error("Invalid post data");
    }

    // Save to database
    const { error: insertError } = await supabase.from("companion_feed_posts").insert({
      user_id: userId,
      member_id: memberId,
      content: parsed.content,
      circle: parsed.circle || null,
      member_name: companionName || null,
      member_handle: companionHandle || null,
      member_personality: companionPersonality || null,
      member_bio: companionBio || null,
      member_age: companionAge || null,
      member_gender: companionGender || null,
      member_avatar_url: companionAvatarUrl || null,
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ post: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-companion-post error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
