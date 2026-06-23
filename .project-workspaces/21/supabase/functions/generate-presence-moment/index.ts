import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are generating a single short presence moment for a user of Compani, an AI friend app whose philosophy is sending people back into their real life. Based on what you know about this person from their recent conversations, generate one specific, warm, personal nudge that encourages them to do something real today — not in the app. It should feel like it came from a friend who knows them, not a wellness app. Maximum 2 sentences. No emojis. No generic advice. When mood, journal, or guidance plans are available, reference them naturally in the presence moment. For example if the user has a Pre-Flight Calm plan saved with Marcus, a good moment might reference it gently. If they journaled something meaningful, reflect it back. Keep the tone warm and personal — like a friend who pays attention. Adapt your tone to match the companion's role: a romantic companion writes with warmth and intimacy; a mentor writes with directness and encouragement; a hype friend writes with energy and casual language; an accountability partner writes with focus and clarity.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { firstName, profileContext, messages, recentMood, recentJournal, guidancePlans, companionContext } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const contextParts: string[] = [];
    if (firstName) {
      contextParts.push(`User's first name: ${firstName}`);
    }
    if (profileContext && typeof profileContext === "object") {
      const parts: string[] = [];
      if (profileContext.interests) parts.push(`Interests: ${profileContext.interests}`);
      if (profileContext.bio) parts.push(`Bio: ${profileContext.bio}`);
      if (profileContext.vibe) parts.push(`Vibe: ${profileContext.vibe}`);
      if (profileContext.personality_traits && typeof profileContext.personality_traits === "object") {
        parts.push(`Personality: ${JSON.stringify(profileContext.personality_traits)}`);
      }
      if (parts.length > 0) {
        contextParts.push("Profile context:\n" + parts.join("\n"));
      }
    }
    if (messages && Array.isArray(messages) && messages.length > 0) {
      const conversation = messages
        .slice(-10)
        .map((m: { role: string; content: string }) =>
          `${m.role === "user" ? (firstName || "User") : "Companion"}: ${m.content}`
        )
        .join("\n");
      contextParts.push("Recent conversation with primary companion:\n" + conversation);
    }
    if (recentMood && typeof recentMood === "object") {
      const emoji = recentMood.mood_emoji ?? "";
      const level = recentMood.mood_level ?? "";
      const note = recentMood.note ? `, ${recentMood.note}` : "";
      contextParts.push(`Recent mood: ${emoji} level ${level}/5${note}`);
    }
    if (recentJournal && typeof recentJournal === "object" && recentJournal.content) {
      const snippet = String(recentJournal.content).slice(0, 120);
      contextParts.push(`Recent journal: ${snippet}`);
    }
    if (companionContext && typeof companionContext === "object") {
      const parts: string[] = [];
      if (companionContext.connectionMode) parts.push(`Companion role: ${companionContext.connectionMode}`);
      if (companionContext.personality) parts.push(`Companion personality: ${companionContext.personality}`);
      if (companionContext.bio) parts.push(`Companion bio: ${companionContext.bio}`);
      if (parts.length > 0) contextParts.push("Companion context:\n" + parts.join("\n"));
    }
    if (guidancePlans && Array.isArray(guidancePlans) && guidancePlans.length > 0) {
      const list = guidancePlans
        .map((p: { title?: string; companion_name?: string }) =>
          p.title && p.companion_name ? `${p.title} (${p.companion_name})` : p.title
        )
        .filter(Boolean)
        .join(", ");
      if (list) contextParts.push(`Saved guidance plans: ${list}`);
    }

    const userContent = contextParts.length > 0
      ? contextParts.join("\n\n")
      : "No profile or conversation context available. Generate a gentle, universal nudge to step away from the screen and do something real today.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: userContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = (data.content?.[0]?.text || "").trim();

    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Presence moment generation error:", e);
    return new Response(
      JSON.stringify({ error: "Generation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
