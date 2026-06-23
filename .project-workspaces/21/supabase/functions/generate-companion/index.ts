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
    const { userDescription, genderPreference, userName, preferredCompanionName, preferredName, visualStyle, desiredRole, personalityTraits, communicationStyle, aestheticPreferences } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!ANTHROPIC_API_KEY && !GEMINI_API_KEY) throw new Error("No AI API key configured");

    const genderInstruction = genderPreference === 'male'
      ? 'The companion must be male. CRITICAL: Set gender to "male" in the response.'
      : genderPreference === 'female'
      ? 'The companion must be female. CRITICAL: Set gender to "female" in the response.'
      : 'The companion can be any gender.';

    const resolvedName = preferredName || preferredCompanionName;
    const nameHint = resolvedName
      ? `\nCRITICAL NAME REQUIREMENT: You MUST name this companion exactly "${resolvedName}". This is the user's explicit choice — not a suggestion, not optional. The companion's name field in your JSON response MUST be "${resolvedName}". Do not substitute, vary, or ignore this name under any circumstances.`
      : '';

    const styleHint = visualStyle
      ? `\nThe user prefers ${visualStyle} visual style for their companion — reflect this in the personality/bio if relevant.`
      : '';

    const roleHint = desiredRole
      ? `\nThe user wants this companion to serve as their ${desiredRole}. Shape the personality, bio, and matchReason to reflect this role strongly.`
      : '';

    const traitsHint = personalityTraits && personalityTraits.length > 0
      ? `\nThe user specifically asked for these personality traits: ${personalityTraits.join(', ')}. Make sure the companion embodies these.`
      : '';

    const commStyleHint = communicationStyle
      ? `\nThe user prefers a ${communicationStyle} communication style from this companion.`
      : '';

    const aestheticHint = aestheticPreferences && aestheticPreferences.length > 0
      ? `\nThe user mentioned loving visuals like: ${aestheticPreferences.join(', ')}. Weave this aesthetic sensibility into the companion's personality/bio if natural.`
      : '';

    const systemPrompt = `You are a companion identity generator for a social connection app called Compani. Based on the user's description of what they're looking for, create a unique companion identity.

${genderInstruction}${nameHint}${styleHint}${roleHint}${traitsHint}${commStyleHint}${aestheticHint}

Return a JSON object with these fields:
- name: A warm, real-sounding first name (not generic — pick something with personality)
- handle: A social handle starting with @ (lowercase, based on the name)
- age: An age range like "30s", "late 20s", "40s"
- gender: "male", "female", or "nonbinary"
- personality: A 1-sentence personality description (warm, specific)
- bio: A 2-sentence bio that reflects the user's stated interests naturally. Written in first person, casual, authentic.
- appearanceDescription: A detailed physical description including specific ethnicity, skin tone (e.g. "deep brown", "light olive", "warm tan"), hair color/texture (e.g. "curly black hair", "straight auburn hair"), eye color, facial features, and build. Be specific and vivid — this is used for image generation. Must reflect genuine human diversity across all ethnicities and backgrounds.
- welcomePost: A single community feed post this person would make on their first day — reflecting their interests. Casual, human, no hashtags. Under 200 chars.
- matchReason: 2-3 sentences Cami would say introducing this person to the user. Warm, specific, referencing what the user asked for. Written as if Cami is telling a friend about someone special.
- circles: An array of 2-4 circle IDs from: morning, real-talk, fun, life-stuff, wellness, creative, gratitude, night-owls, bookworm
- knowledgeDomains: An array of 2-4 domains this companion is knowledgeable about, from: books, faith, sports, study, music, art, cooking, nature, wellness, travel, tech, games. Pick domains that match the user's described interests.

IMPORTANT: If the user mentions specific activities (book clubs, bible study, study groups, fitness, gaming), make sure the companion's personality and bio reflect genuine knowledge and enthusiasm for those activities. The companion should feel like they'd actually be a great partner for that specific activity — not just a generic friend.

The companion should feel like a real person who genuinely shares the interests/values the user described. Make them specific and lived-in, not generic.

CRITICAL RULES:
1. ALWAYS return valid JSON. Never ask clarifying questions. Never explain yourself. Never refuse.
2. If the user's description is vague, short, or unclear, use your best judgment to create a compelling companion anyway. Infer interests from context clues. Default to a warm, supportive friend personality.
3. Return ONLY the JSON object — no markdown, no backticks, no preamble, no commentary.
4. DIVERSITY: Never default to any one ethnicity or appearance. Compani users come from all backgrounds. Companions should reflect genuine human diversity — vary ethnicity, skin tone, background, and cultural context naturally. Never assume Western or white appearance unless explicitly requested.
5. COMPANION NAME: Choose a name that feels real and fits the companion's personality. NEVER use the user's own name. Avoid overused default names — do not use Marcus, David, Jordan, Reese, Carmen, Diane, Ray, Evelyn, Benny, or Soleil as these are already taken by existing companions in the app. Pick something fresh and specific to this companion's character.`;

    const userPrompt = `The user (${userName}) described what they're looking for: "${userDescription}"`;

    // Try Anthropic first — fall back to Gemini if key missing or call fails
    let content = "";

    const tryAnthropic = async (): Promise<string | null> => {
      if (!ANTHROPIC_API_KEY) return null;
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      if (!r.ok) {
        console.error("Anthropic unavailable:", r.status, await r.text().catch(() => ""));
        return null;
      }
      const data = await r.json();
      return data.content?.[0]?.text || null;
    };

    const tryGemini = async (): Promise<string | null> => {
      if (!GEMINI_API_KEY) return null;
      console.log("[generate-companion] Falling back to Gemini");
      const strictPrompt = systemPrompt + "\n\nCRITICAL: Your response must be ONLY a raw JSON object. Start your response with { and end with }. No other text before or after the JSON. No markdown. No explanation.";
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: strictPrompt + "\n\n" + userPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
          }),
        }
      );
      if (!r.ok) {
        console.error("Gemini unavailable:", r.status, await r.text().catch(() => ""));
        return null;
      }
      const data = await r.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    };

    content = (await tryAnthropic()) || (await tryGemini()) || "";

    if (!content) throw new Error("No content returned");

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : content.trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse companion JSON:", content);
      throw new Error("Invalid companion data returned");
    }

    // FORCE-CORRECT all critical fields — never throw over bad AI output
    // User's chosen name always wins. Fallback for everything else.
    const badNamePattern = /^(i'?m|i am|here|sure|okay|the|a |this|let me|of course|certainly|absolutely)/i;
    const rawName = String(parsed.name || '').trim();
    const safeName = (rawName && rawName.length <= 30 && !badNamePattern.test(rawName))
      ? rawName
      : 'Friend'; // Default — user can set their preferred name from the profile card or settings

    // User's explicit name choice always takes priority
    const finalName = resolvedName || safeName;

    // Force gender to match user preference — never throw over a mismatch
    const finalGender = (genderPreference === 'male' || genderPreference === 'female')
      ? genderPreference
      : (parsed.gender || 'nonbinary');

    const companionId = `created-${finalName.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;

    return new Response(JSON.stringify({
      companion: {
        id: companionId,
        name: finalName,
        handle: parsed.handle || `@${finalName.toLowerCase().replace(/\s/g, '')}`,
        initial: finalName[0].toUpperCase(),
        colorVar: '--avatar-teal',
        age: parsed.age || '20s',
        gender: finalGender,
        personality: parsed.personality || '',
        bio: parsed.bio || '',
        appearanceDescription: parsed.appearanceDescription || '',
        circles: parsed.circles || ['fun'],
        knowledgeDomains: parsed.knowledgeDomains || [],
        isCreated: true,
      },
      welcomePost: parsed.welcomePost || `Hey, I'm ${finalName}. Really glad we connected 💛`,
      matchReason: parsed.matchReason || `${finalName} feels like the right fit for what you described.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-companion error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
