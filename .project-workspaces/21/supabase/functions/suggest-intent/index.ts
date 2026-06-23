import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify user
    const token = authHeader?.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    // Gather recent context: last mood check-in + last private insight + recent chat sentiment
    const [moodRes, memoriesRes] = await Promise.all([
      supabase
        .from("mood_checkins")
        .select("mood_emoji, mood_level, note")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("memories")
        .select("text, category")
        .eq("user_id", user.id)
        .order("extracted_at", { ascending: false })
        .limit(5),
    ]);

    const recentMoods = moodRes.data || [];
    const recentMemories = memoriesRes.data || [];

    const contextLines: string[] = [];
    if (recentMoods.length > 0) {
      contextLines.push("Recent moods: " + recentMoods.map(m => `${m.mood_emoji} (level ${m.mood_level})${m.note ? ': ' + m.note : ''}`).join("; "));
    }
    if (recentMemories.length > 0) {
      contextLines.push("Recent themes: " + recentMemories.map(m => m.text).join("; "));
    }

    const contextBlock = contextLines.length > 0
      ? `\n\nUser context:\n${contextLines.join("\n")}`
      : "";

    const prompt = `You are a luxury wellness companion. Based on the user's recent emotional state, suggest exactly 3 single power-words for their daily intention. Each word should be aspirational and grounding — words like "Resilience", "Clarity", "Softness", "Unstoppable", "Presence", "Grace".${contextBlock}

Return ONLY a JSON array of 3 strings, nothing else. Example: ["Clarity","Resilience","Softness"]`;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    let words: string[] = [];

    if (GEMINI_API_KEY) {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 100 },
          }),
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
        const match = text.match(/\[.*\]/s);
        if (match) words = JSON.parse(match[0]);
      }
    } else if (ANTHROPIC_API_KEY) {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 100,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const text = data.content?.[0]?.text || "[]";
        const match = text.match(/\[.*\]/s);
        if (match) words = JSON.parse(match[0]);
      }
    }

    // Fallback if AI fails
    if (!words.length) {
      const fallbacks = ["Clarity", "Presence", "Strength", "Grace", "Focus", "Courage", "Stillness", "Growth", "Resilience"];
      words = fallbacks.sort(() => Math.random() - 0.5).slice(0, 3);
    }

    return new Response(JSON.stringify({ words }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[suggest-intent]", err);
    return new Response(JSON.stringify({ words: ["Clarity", "Presence", "Strength"] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
