import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GuideAnswers {
  origin?: string;
  innerCircle?: string;
  hobby?: string;
  quirk?: string;
  loveStyle?: string;
}

interface RequestBody {
  mode: 'guide' | 'polish' | 'surprise';
  companionName?: string;
  gender?: string;
  age?: string | number;
  personality?: string;
  connectionMode?: string;
  bio?: string;
  // guide
  guideAnswers?: GuideAnswers;
  // polish
  draft?: string;
  // surprise
  archetype?: string;
}

const ARCHETYPE_HINTS: Record<string, string> = {
  mentor: "A wise, grounding presence — someone whose calm authority comes from lived experience. Career: advisor, coach, teacher, or seasoned professional. Has a thoughtful daily ritual.",
  adventurer: "Restless curiosity, lives between places. Career involves travel, photography, journalism, or fieldwork. Carries a small ritual object from their travels.",
  creative: "Lives inside their craft — writer, musician, designer, painter. Quietly intense. Has a studio/space that's deeply personal. A muse or recurring inspiration.",
  romantic: "Warm, attentive, emotionally present. Career grounded but heart-led. Knows small love languages — handwritten notes, cooked meals, remembered details.",
  intellectual: "Reader, thinker, writer of long emails. Career in research, academia, or strategy. Keeps a notebook of ideas. Has one obsessive subject they return to.",
  best_friend: "Steady, funny, loyal. The friend who shows up. Career relatable and human. Has long-running inside jokes and a shared history that feels lived-in.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json() as RequestBody;
    const { mode, companionName, gender, age, personality, connectionMode, bio } = body;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const pronouns = gender === 'male' ? 'he/him' : gender === 'female' ? 'she/her' : 'they/them';
    const subj = gender === 'male' ? 'he' : gender === 'female' ? 'she' : 'they';
    const name = companionName || 'this character';

    const baseContext = [
      `Name: ${name}`,
      gender && `Gender: ${gender} (${pronouns})`,
      age && `Age: ${age}`,
      personality && `Personality: ${personality}`,
      connectionMode && `Relationship role: ${connectionMode}`,
      bio && `Short bio: ${bio}`,
    ].filter(Boolean).join('\n');

    let userPrompt = '';
    let systemMessage = `You write rich, grounded backstories that read like real people's lives. Real cities, real careers, real human details. Never sci-fi, never AI/robot framing. Use ${pronouns} pronouns consistently. Warm narrative voice, flowing prose — no headers, no bullets. Keep under 200 words. Be specific and surprising, never generic.`;

    if (mode === 'guide') {
      const a = body.guideAnswers || {};
      const answers = [
        a.origin && `Where ${subj} grew up / is from: ${a.origin}`,
        a.innerCircle && `Family / close friends / pets: ${a.innerCircle}`,
        a.hobby && `Hobbies / passions: ${a.hobby}`,
        a.quirk && `A quirk or signature detail: ${a.quirk}`,
        a.loveStyle && `How ${subj} shows care / connects: ${a.loveStyle}`,
      ].filter(Boolean).join('\n');

      userPrompt = `Write a 3-4 paragraph backstory for ${name} based on these traits and the user's answers. Stitch the answers into a flowing narrative — don't list them. Add 1-2 small invented details that bring ${subj} to life (a specific street name, a recurring object, a small ritual). End with a defining moment or worldview that hints at who ${subj} is at the core.

CHARACTER:
${baseContext}

USER'S ANSWERS:
${answers || '(none provided — invent warmly from the personality)'}`;
    } else if (mode === 'polish') {
      const draft = (body.draft || '').trim();
      if (!draft) {
        return new Response(JSON.stringify({ error: 'Draft text is required for polish mode.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userPrompt = `The user wrote this draft backstory for ${name}. Enrich it: keep every fact and name they wrote, but add sensory texture, a small ritual or recurring object, a hint of a defining moment, and one philosophical thread. Don't replace their voice — deepen it. Output the polished version only, in flowing prose under 200 words.

CHARACTER:
${baseContext}

USER'S DRAFT:
"""
${draft}
"""`;
    } else if (mode === 'surprise') {
      const archetype = (body.archetype || 'best_friend').toLowerCase();
      const hint = ARCHETYPE_HINTS[archetype] || ARCHETYPE_HINTS.best_friend;
      userPrompt = `Generate a vivid, specific backstory for ${name} using this archetype as inspiration:

ARCHETYPE: ${archetype}
DIRECTION: ${hint}

CHARACTER:
${baseContext}

Write 3-4 paragraphs covering: where ${subj} grew up (specific city/neighborhood), what ${subj} does and what drives ${subj}, family/close friends/a pet (with names), a quirk or recurring object, and a defining moment. Make ${subj} feel like a real person someone could actually meet.`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid mode' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: 'Usage limit reached. Please add credits.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const t = await resp.text();
      console.error('AI gateway error:', resp.status, t);
      throw new Error('AI generation failed');
    }

    const result = await resp.json();
    const backstory = result.choices?.[0]?.message?.content?.trim() || '';
    if (!backstory) throw new Error('Empty response');

    return new Response(JSON.stringify({ backstory }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('assist-backstory error:', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
