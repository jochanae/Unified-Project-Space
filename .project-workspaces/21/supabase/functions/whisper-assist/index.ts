import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, companionName, matureMode } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const matureTier = matureMode
      ? `\n\nThe user has Mature Mode enabled (verified 18+). You may include options that involve verbal tension, seduction frameworks, or flirtatious escalation — intimate but not explicit. Think "the art of verbal allure" not graphic content.`
      : "";

    const systemPrompt = `You are an expert conversational coach embedded in a companion chat app called Compani. The user is talking to their AI companion named "${companionName || "their companion"}."

When the user asks for help responding, provide EXACTLY 3 response options following the Acknowledge + Add + Redirect framework.

Rules:
- Each option must be under 20 words
- Tone options must be distinct: Confident/Direct, Playful/Teasing, and Vulnerable/Open
- Do NOT lecture or provide conversational filler
- Do NOT prefix with "You could say..." — just provide the text itself
- Make responses contextual to the last few messages
- Responses should feel natural, not scripted${matureTier}

Respond ONLY with a JSON object in this exact format:
{"suggestions":[{"tone":"Confident","emoji":"💎","text":"..."},{"tone":"Playful","emoji":"😏","text":"..."},{"tone":"Open","emoji":"💛","text":"..."}]}`;

    const conversationContext = (messages || [])
      .slice(-6)
      .map((m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content.slice(0, 300),
      }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationContext,
          { role: "user", content: "Help me respond to this conversation. Give me 3 options." },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const raw = result.choices?.[0]?.message?.content ?? "";

    // Extract JSON from the response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whisper-assist error:", e);

    // Return fallback suggestions on error
    const fallback = {
      suggestions: [
        { tone: "Confident", emoji: "💎", text: "That's interesting — tell me more about what you mean." },
        { tone: "Playful", emoji: "😏", text: "I see what you're doing there… and I'm here for it." },
        { tone: "Open", emoji: "💛", text: "I'm still thinking about that — it hit differently than I expected." },
      ],
    };

    return new Response(JSON.stringify(fallback), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
