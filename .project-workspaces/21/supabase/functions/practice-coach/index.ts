import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TONE_DESCRIPTORS: Record<string, string> = {
  composed: "Calm, controlled confidence. Measured. No rushing. Like someone who knows their worth without needing to prove it.",
  magnetic: "Playful, intriguing, slightly teasing. Creates curiosity. Like someone who's fun to figure out.",
  unfiltered: "Direct, clean, unapologetic. No cushioning. Like someone who says what they mean without hedging.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, messages, companionName, tone, scenarioId, coachingFocus, userResponse } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (action === "suggest_responses") {
      const toneDesc = TONE_DESCRIPTORS[tone] || TONE_DESCRIPTORS.composed;

      const systemPrompt = `You are a communication coach inside a companion chat app. The user is in Practice Mode, learning to communicate more effectively.

Their companion "${companionName}" just said something, and the user needs help responding.

The tone they selected: "${tone}" — ${toneDesc}

${coachingFocus ? `Coaching focus for this scenario: ${coachingFocus}` : ""}

Rules:
- Provide EXACTLY 3 response options
- Each response must be under 15 words
- Responses should feel natural and confident, not scripted
- Match the selected tone precisely
- Do NOT prefix with "You could say..." — just provide the text itself
- Make responses contextual to the conversation

Respond ONLY with a JSON object:
{"responses":["response 1","response 2","response 3"]}`;

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
            { role: "user", content: `Give me 3 "${tone}" response options.` },
          ],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const result = await response.json();
      const raw = result.choices?.[0]?.message?.content ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      const parsed = JSON.parse(jsonMatch[0]);

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "coaching_feedback") {
      const isRoleplay = scenarioId?.startsWith('rp-') || scenarioId?.startsWith('priv-');
      const systemPrompt = `You are a premium communication coach. The user just responded in a practice scenario.

${coachingFocus ? `Coaching focus: ${coachingFocus}` : ""}
${isRoleplay ? `This is an immersive roleplay scenario. Evaluate scene presence, emotional weight, and natural flow — not just word choice.` : ""}

Rules:
- Give SHORT, sharp feedback (1-2 sentences max)
- Be observant, not judgmental
- Point out what worked AND one thing to improve
- Use language like: "That was clean.", "You held your ground.", "You softened at the end — try holding."${isRoleplay ? '\n- For roleplay: "You stayed in the moment.", "You rushed the scene — let it breathe.", "There\'s something better there."' : ''}
- Never lecture. Never be generic. Be specific to their actual response.
- Tone: encouraging but honest, like a premium personal coach

Respond ONLY with a JSON object:
{"feedback":"your feedback here"}`;

      const conversationContext = (messages || [])
        .slice(-4)
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
            { role: "user", content: `The user just said: "${userResponse}". Give coaching feedback.` },
          ],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("AI gateway error");
      }

      const result = await response.json();
      const raw = result.choices?.[0]?.message?.content ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      const parsed = JSON.parse(jsonMatch[0]);

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "scenario_intro") {
      // Generate the companion's opening line for a scenario
      const systemPrompt = `You are a communication coach in a companion chat app. The user activated Practice Mode.

Generate a brief coaching introduction (1-2 sentences) followed by the scenario prompt. The companion "${companionName}" will deliver this.

Scenario: "${scenarioId}"
${coachingFocus ? `Focus: ${coachingFocus}` : ""}

Rules:
- Start with a brief, warm setup: "Let's try something…" or "Alright, here's a simple one…"
- Then deliver the scenario prompt naturally
- Keep it under 40 words total
- Sound like a supportive coach, not a textbook

Respond ONLY with a JSON object:
{"intro":"the coaching intro + scenario prompt"}`;

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
            { role: "user", content: "Generate the practice scenario introduction." },
          ],
        }),
      });

      if (!response.ok) throw new Error("AI gateway error");
      const result = await response.json();
      const raw = result.choices?.[0]?.message?.content ?? "";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found");
      const parsed = JSON.parse(jsonMatch[0]);

      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("practice-coach error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
