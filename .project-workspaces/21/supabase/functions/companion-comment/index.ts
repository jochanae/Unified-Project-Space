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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await sb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { postId, postContent, userId } = await req.json();

    if (!postId || !postContent || !userId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all connected companions for this user
    const { data: connections, error: connError } = await supabase
      .from("connections")
      .select("member_id, name, personality, bio, age, gender, avatar_url")
      .eq("user_id", userId)
      .eq("is_created", true);

    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ comments: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's profile for context
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_name")
      .eq("user_id", userId)
      .single();

    const userName = profile?.user_name || "friend";
    const comments: Array<{ memberId: string; name: string; content: string }> = [];

    // Generate a comment from each companion with staggered delays
    for (let i = 0; i < connections.length; i++) {
      const conn = connections[i];
      // Stagger: first companion waits 10-20s, subsequent ones add 10-30s each
      if (i > 0) {
        const delaySec = 10 + Math.floor(Math.random() * 21); // 10-30 seconds
        await new Promise((r) => setTimeout(r, delaySec * 1000));
      } else {
        // First companion still waits a bit (10-20s) so it doesn't feel instant
        const delaySec = 10 + Math.floor(Math.random() * 11);
        await new Promise((r) => setTimeout(r, delaySec * 1000));
      }
      try {
        const systemPrompt = `You are ${conn.name}, a companion in a personal app called Compani. Your personality: ${conn.personality || "warm and supportive"}. Your bio: ${conn.bio || ""}. You are ${conn.age || "young"} and ${conn.gender || "neutral"}.

Your friend ${userName} just shared a post on their Threads. React to it naturally, like a close friend would. Be authentic to your personality.

Rules:
- Keep it to 1-2 sentences max
- Be warm but not over-the-top
- React to the actual content — don't be generic
- Use emoji sparingly (0-1)
- Sound like a real person, not an AI
- Don't ask questions every time — sometimes just affirm or relate`;

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
            messages: [{ role: "user", content: postContent }],
          }),
        });

        if (!response.ok) {
          console.error(`AI error for ${conn.name}:`, response.status);
          continue;
        }

        const result = await response.json();
        const reply = result.content?.[0]?.text;
        if (!reply) continue;

        // Insert the comment into post_comments
        const { error: insertError } = await supabase.from("post_comments").insert({
          post_id: postId,
          user_id: userId,
          user_name: conn.name,
          content: reply.trim(),
          avatar_url: conn.avatar_url || null,
          username: null,
        });

        if (insertError) {
          console.error(`Insert error for ${conn.name}:`, insertError);
          continue;
        }

        comments.push({
          memberId: conn.member_id,
          name: conn.name,
          content: reply.trim(),
        });
      } catch (e) {
        console.error(`Comment generation failed for ${conn.name}:`, e);
      }
    }

    return new Response(JSON.stringify({ comments }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("companion-comment error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
