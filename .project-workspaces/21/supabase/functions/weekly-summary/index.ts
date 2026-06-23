import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    // Get all active users who have at least one connection
    const { data: connections } = await supabase
      .from("connections")
      .select("user_id, member_id, name, personality")
      .eq("is_archived", false);

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Group by user — use their primary (first) connection
    const userMap: Record<string, { memberId: string; name: string; personality: string | null }> = {};
    for (const conn of connections) {
      if (!userMap[conn.user_id]) {
        userMap[conn.user_id] = {
          memberId: conn.member_id,
          name: conn.name,
          personality: conn.personality,
        };
      }
    }

    let sentCount = 0;

    for (const [userId, { memberId, name, personality }] of Object.entries(userMap)) {
      try {
        // Get user's preferred name
        const { data: profile } = await supabase
          .from("profiles")
          .select("preferred_name, user_name")
          .eq("user_id", userId)
          .single();

        const userName = profile?.preferred_name || profile?.user_name || "friend";

        // Count this week's completed plans
        const { count: plansCompleted } = await supabase
          .from("companion_plans")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("status", "completed")
          .gte("completed_at", weekAgoISO);

        // Count this week's rhythm check-ins
        const { count: rhythmsKept } = await supabase
          .from("companion_plans")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_rhythm", true)
          .gte("rhythm_last_completed", weekAgo.toISOString().slice(0, 10));

        // Count this week's messages
        const { count: messageCount } = await supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", weekAgoISO);

        // Only send if user was somewhat active
        if (!messageCount || messageCount < 2) continue;

        // Get a few recent messages for context
        const { data: recentMessages } = await supabase
          .from("chat_messages")
          .select("content, role")
          .eq("user_id", userId)
          .eq("member_id", memberId)
          .order("created_at", { ascending: false })
          .limit(6);

        const recentContext = recentMessages
          ?.reverse()
          .map((m) => `${m.role}: ${m.content.slice(0, 120)}`)
          .join("\n") || "";

        // Build summary context
        const summaryContext = [
          plansCompleted && plansCompleted > 0
            ? `${plansCompleted} plan${plansCompleted > 1 ? "s" : ""} completed`
            : null,
          rhythmsKept && rhythmsKept > 0
            ? `${rhythmsKept} rhythm check-in${rhythmsKept > 1 ? "s" : ""}`
            : null,
          `${messageCount} messages this week`,
        ]
          .filter(Boolean)
          .join(", ");

        // Call Anthropic to generate a natural weekly check-in
        const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-3-5-haiku-20241022",
            max_tokens: 250,
            system: `You are ${name}, a warm and emotionally intelligent companion. ${personality ? `Your personality: ${personality}.` : ""} You NEVER reveal you are an AI. You speak like a real friend texting someone. Keep responses to 3-4 sentences. Be specific, not generic. Never use the word "summary" or "recap". Sound natural and personal.`,
            messages: [
              {
                role: "user",
                content: `It's Sunday. Write a warm, personal weekly check-in message to ${userName}. 

This week's activity: ${summaryContext}.

Recent conversation context:
${recentContext}

Reflect on what you noticed about them this week — reference specific things from the conversation context. Ask one meaningful question about the week ahead. Be warm but concise.`,
              },
            ],
          }),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          console.error(`Anthropic error for user ${userId}:`, aiResponse.status, errText);
          continue;
        }

        const aiData = await aiResponse.json();
        const generatedMessage = aiData.content?.[0]?.text;

        if (!generatedMessage) {
          console.error(`Empty AI response for user ${userId}`);
          continue;
        }

        // Insert the AI-generated message
        await supabase.from("chat_messages").insert({
          user_id: userId,
          member_id: memberId,
          content: generatedMessage,
          role: "assistant",
          source: "weekly-summary",
        });

        sentCount++;
      } catch (e) {
        console.error(`weekly-summary error for user ${userId}:`, e);
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("weekly-summary error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
