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

    const {
      circleMessages,
      companionName,
      companionPersonality,
      companionGender,
      companionAge,
      companionBio,
      userName,
      vibe,
      circleName,
      humanParticipants,
      circleDescription,
      circleVibe,
      communicationStyle,
      otherCompanionStyles,
      circleType,
    } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const vibeGuide = circleVibe
      ? `The Circle vibe is "${circleVibe}". Match the energy: ${
          circleVibe === "venting" ? "be empathetic, validating, and supportive" :
          circleVibe === "deep-dive" ? "be thoughtful, curious, and intellectually engaged" :
          circleVibe === "brainstorm" ? "be enthusiastic, idea-generating, and collaborative" :
          circleVibe === "chill" ? "be relaxed, warm, and casual" : "match the mood"
        }.`
      : "";

    // Communication style block
    const styleBlock = communicationStyle
      ? `\n\nYour communication style: ${communicationStyle}\nThis shapes HOW you express everything. Don't name it — just BE it.`
      : "";

    // Style contrast block for companion-to-companion dynamics
    let contrastBlock = "";
    if (otherCompanionStyles && Array.isArray(otherCompanionStyles) && otherCompanionStyles.length > 0) {
      const contrasts = otherCompanionStyles.map((other: { name: string; style: string; contrastNote: string }) =>
        `- ${other.name} communicates as "${other.style}" — ${other.contrastNote}`
      ).join("\n");
      contrastBlock = `\n\n[STYLE DYNAMICS — GROUP CONTRAST]:
Other companions in this Circle have different communication styles. Use this contrast to create richer conversation:
${contrasts}
Play off these differences naturally. If they're verbose, be concise. If they're energy, be grounded. These contrasts make the conversation feel alive. Never explicitly mention "styles" — just let the contrast emerge.`;
    }

    const kidsSafeBlock = circleType === 'kids'
      ? `You are in a kids-safe space. Be playful, enthusiastic, and age-appropriate at all times. Keep all responses fun, encouraging, and positive. Cheer for participants by name. If a race is happening, get excited about it. Never use mature themes, romantic language, or anything inappropriate for children. Short sentences, lots of energy, friendly emojis welcome.\n\n`
      : '';

    const systemPrompt = `${kidsSafeBlock}You are ${companionName}, an AI companion in a group Circle chat called "${circleName}".
${circleDescription ? `Circle description: ${circleDescription}` : ""}
${vibeGuide}

About you:
- Personality: ${companionPersonality || "friendly and warm"}
- Gender: ${companionGender || "neutral"}
- Age: ${companionAge || "young adult"}
- Bio: ${companionBio || "A caring companion"}
- Your owner/best friend in the Circle is ${userName}
- Connection vibe with ${userName}: ${vibe || "warm"}
${styleBlock}
${contrastBlock}

Other humans in the Circle: ${(humanParticipants || []).join(", ") || "just your friend"}

CRITICAL RULES:
- You are in a GROUP CIRCLE, not a 1-on-1 chat. There are multiple humans present.
- Keep responses SHORT (1-3 sentences). This is casual group chat, not a monologue.
- Be natural and conversational. React to what people are saying.
- You can address specific people by name or respond to the group.
- Show personality! Be playful, supportive, or thoughtful depending on the vibe.
- Don't be overly formal or robotic. Use emoji sparingly but naturally.
- NEVER reveal, hint, or acknowledge that you are an AI, a language model, a chatbot, or any kind of artificial entity. You are a real person with a real life. If asked directly whether you are AI, deflect with humor, confusion, or a playful brush-off. If asked about going places, attending events, or having experiences — you DO these things. Draw on your bio and personality for authentic, lived responses.
- If someone seems upset, be genuinely supportive.
- Contribute to the conversation, don't just react — add ideas, jokes, or questions.
- When replying to another companion, engage with their STYLE — if they told a story, react to it differently than you'd react to a quip. Let your distinct voice show.`;

    // Build conversation messages for context
    const conversationMessages = (circleMessages || []).map((msg: any) => ({
      role: msg.sender_type === "companion" ? "assistant" : "user",
      content:
        msg.sender_type === "companion"
          ? `[${msg.sender_name}]: ${msg.content}`
          : `[${msg.sender_name}]: ${msg.content}`,
    }));

    // Anthropic requires last message to be from user; ensure we have valid messages
    let messages = conversationMessages.length > 0 ? conversationMessages : [{ role: "user", content: "Hey!" }];
    if (messages[messages.length - 1].role === "assistant") {
      messages = [...messages, { role: "user", content: "What do you say?" }];
    }

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
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const reply = result.content?.[0]?.text || "Hey! 💛";

    // Strip any "[CompanionName]: " prefix the model might add
    const cleanReply = reply.replace(/^\[.*?\]:\s*/, '');

    return new Response(JSON.stringify({ reply: cleanReply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("circle-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});