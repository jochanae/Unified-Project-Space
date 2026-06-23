import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { companionName, personality, age, gender, connectionMode, bio, backstory, type, meetingContext } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    // ── Origin story mode ──
    if (type === 'origin') {
      const pronouns = gender === 'male' ? 'he/him' 
        : gender === 'female' ? 'she/her' 
        : 'they/them';

      const context = [
        companionName && `Companion name: ${companionName}`,
        gender && `Gender: ${gender} (${pronouns})`,
        age && `Age: ${age}`,
        personality && `Personality: ${personality}`,
        connectionMode && `Relationship role: ${connectionMode}`,
        bio && `Bio: ${bio}`,
        backstory && `Backstory: ${backstory}`,
      ].filter(Boolean).join('\n');

      const meetingHint = meetingContext
        ? `They met as ${meetingContext.toLowerCase()}. Ground the story in this specific meeting context.`
        : 'Invent a specific, vivid way they met.';

      const originPrompt = `Write a short, warm origin story describing how ${companionName || 'this companion'} and the user first met and their early relationship. Write from ${companionName}'s perspective in second person — addressing the user as "you."

Context about ${companionName}:
${context}

Meeting context: ${meetingHint}

Guidelines:
- Written as ${companionName} remembering how they met the user ("I remember the first time we..." / "You were...")
- Describe HOW they met — a specific place, moment, or circumstance based on the meeting context
- Include 1-2 sensory details (what the weather was like, what someone was wearing, a sound)
- Mention what drew them to each other early on
- End with a warm note about what the friendship/connection became
- Keep it under 150 words, 2-3 paragraphs, flowing prose — no bullets or headers
- Make it feel like a real shared memory, not a biography
- This is NOT about ${companionName}'s personal history — it's about the relationship between them and the user`;

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
          system: "You write warm, vivid origin stories for fictional relationships. Write from the companion's perspective, addressing the user as 'you.' Make it feel like a genuine shared memory.",
          messages: [{ role: "user", content: originPrompt }],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", response.status, t);
        throw new Error("AI generation failed");
      }

      const result = await response.json();
      console.log("Anthropic API result (origin):", result);
      const story = result.content?.[0]?.text || "";
      if (!story) throw new Error("Empty response from Anthropic");
      return new Response(JSON.stringify({ backstory: story }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Standard backstory mode ──
    // Detect if user wants a non-human theme
    const combinedText = `${bio || ''} ${personality || ''}`.toLowerCase();
    const nonHumanKeywords = ['ai', 'robot', 'android', 'digital being', 'synthetic', 'cyborg', 'virtual', 'hologram', 'programmed'];
    const isNonHuman = nonHumanKeywords.some(kw => combinedText.includes(kw));

    // Map gender to pronouns
    const pronouns = gender === 'male' ? 'he/him' 
      : gender === 'female' ? 'she/her' 
      : 'they/them';
    const pronounSubject = gender === 'male' ? 'He' : gender === 'female' ? 'She' : 'They';
    const pronounPossessive = gender === 'male' ? 'his' : gender === 'female' ? 'her' : 'their';

    const traits = [
      companionName && `Name: ${companionName}`,
      gender && `Gender: ${gender} (use ${pronouns} pronouns)`,
      age && `Age: ${age}`,
      personality && `Personality: ${personality}`,
      connectionMode && `Role: ${connectionMode}`,
      bio && `Current bio: ${bio}`,
    ].filter(Boolean).join('\n');

    const framingInstruction = isNonHuman
      ? `The user has described this character with non-human/sci-fi traits. Lean into that theme naturally.`
      : `Write as if this is a REAL human being with a real life — real cities, real jobs, real relationships. No sci-fi, no programming origins, no digital/virtual/AI framing. ${pronounSubject} is a person, not a machine.`;

    const prompt = `Create a rich, detailed backstory for a person named ${companionName || 'this character'} with these traits:

${traits}

${framingInstruction}

Always use ${pronouns} pronouns. Never default to "they/them" unless that's the specified gender.

Write 3-4 paragraphs covering:
- Where ${pronounSubject.toLowerCase()} grew up (city, neighborhood vibe)
- ${pronounPossessive.charAt(0).toUpperCase() + pronounPossessive.slice(1)} work/passions and what drives ${pronounSubject.toLowerCase() === 'they' ? 'them' : pronounSubject.toLowerCase() === 'he' ? 'him' : 'her'}
- Family, close friends, pets (give specific names)
- Quirks, hobbies, favorite things
- A defining life moment that shaped who ${pronounSubject.toLowerCase()} ${pronounSubject === 'They' ? 'are' : 'is'}

Make it feel like a REAL person — specific, vivid, surprising. Not generic. Use a warm narrative voice. Keep it under 200 words. Do NOT use bullet points or headers — just flowing paragraphs.`;

    const systemMessage = isNonHuman
      ? "You are a creative writer who crafts compelling character backstories. Be specific and vivid. Never use generic filler."
      : "You craft backstories for fictional characters that read like real people's lives. Ground everything in the real world — real places, real careers, real human experiences. Never frame the character as an AI, robot, or digital entity unless explicitly told to. Be specific and vivid.";

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
        system: systemMessage,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI generation failed");
    }

    const result = await response.json();
    console.log("Anthropic API result (standard):", result);
    const generatedBackstory = result.content?.[0]?.text || "";
    if (!generatedBackstory) throw new Error("Empty response from Anthropic");

    return new Response(JSON.stringify({ backstory: generatedBackstory }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-backstory error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
