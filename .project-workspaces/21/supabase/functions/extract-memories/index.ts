import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Tier classification prompt (inline for speed — no second API call) ──
const TIER_CLASSIFICATION = `
Also classify each memory into a tier and assign scores:

Tiers:
- "foundational": Core identity — phobias, trauma, health conditions, family deaths, core values. NEVER decay.
- "identity": Career, relationship status, major goals, education, living situation. Changes slowly.
- "episodic": Specific events, stories, past experiences.
- "contextual": Current projects, recent activities, current interests.
- "transient": Mood states, temporary preferences, fleeting interests.

vulnerability_score (0-30): How vulnerable was the disclosure?
- 30: Deep fears/trauma/shame
- 20: Emotional pain, insecurity, mental health
- 15: Accomplishments revealing struggle, goals exposing fears
- 5: Casual personal mention
- 0: Factual update
`;

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
    const { data: { user }, error: userError } = await sb.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, userName } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Only extract from the last few exchanges to keep it efficient
    const recentMessages = messages.slice(-10);
    const conversation = recentMessages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? userName : "Companion"}: ${m.content}`
      )
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: `You are a memory extraction AND classification system. Read the conversation and extract key facts the user revealed about themselves.

Return ONLY a JSON array of objects with these fields:
- "text": concise standalone fact
- "category": general | emotional | wellness
- "tier": foundational | identity | episodic | contextual | transient
- "vulnerability_score": 0-30
- "themes": array of 3-8 lowercase semantic tags that capture the MEANING of this memory (e.g. ["career", "software", "entrepreneurship"] or ["phobia", "animals", "frogs", "fear", "anxiety"])

${TIER_CLASSIFICATION}

Categories:
- "general": Life facts — job, hobbies, family, living situation, preferences, routines
- "emotional": Moods, stressors, joys, fears, things that excite or worry them
- "wellness": Health conditions, medications, exercise habits, diet, sleep patterns, goals
- "practice": Skills being learned or practiced
- "habit_completion": Recurring actions completed
- "milestone": Significant personal moments

Theme tagging guidelines:
- Tags should be concrete nouns, verbs, or adjectives (not articles/prepositions)
- Include both specific terms ("python", "yoga") and broader concepts ("programming", "fitness")
- Include emotional dimensions when relevant ("anxiety", "pride", "frustration")
- Think: "what topics would make this memory relevant to surface?"

Rules:
- Extract only what the USER said, not the companion
- Each entry should be a concise, standalone fact
- Skip greetings, small talk, and anything too vague
- If there's nothing meaningful to extract, return an empty array []
- Return ONLY the JSON array, no other text`,
        messages: [
          {
            role: "user",
            content: `Extract and classify memories from this conversation:\n\n${conversation}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);
      return new Response(JSON.stringify({ entries: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "[]";

    let entries;
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      entries = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse memory extraction:", content);
      entries = [];
    }

    const validTiers = ["foundational", "identity", "episodic", "contextual", "transient"];
    const validCategories = ["general", "emotional", "wellness", "practice", "habit_completion", "milestone"];
    const now = new Date().toISOString();

    const validated = (Array.isArray(entries) ? entries : [])
      .filter(
        (e: any) =>
          e.text &&
          typeof e.text === "string" &&
          validCategories.includes(e.category)
      )
      .map((e: any) => {
        let themes: string[] = Array.isArray(e.themes)
          ? e.themes
              .filter((t: any) => typeof t === "string" && t.trim())
              .map((t: string) => t.toLowerCase().trim())
              .slice(0, 10)
          : [];

        // SAFETY NET: if AI returned no themes, derive them from the text so the
        // memory can still be retrieved by topic/keyword scoring. We extract:
        //  - proper nouns / brand-like CamelCase + ALL-CAPS tokens (verbatim, lowercased)
        //  - significant lowercase content words (length >= 5) as topic fallbacks
        if (themes.length === 0) {
          const derived = new Set<string>();
          const properNounRe = /\b([A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*|[A-Z]{2,6}|[A-Z][a-z0-9]{3,})\b/g;
          const matches = e.text.match(properNounRe) || [];
          for (const m of matches) derived.add(m.toLowerCase());

          const STOPWORDS = new Set(["have","with","that","this","there","their","about","would","could","should","because","while","after","before","other","really","still","just","into","from","been","were","when","where","what","which","they","them","then","than","also","over","into"]);
          const words = e.text.toLowerCase().match(/\b[a-z]{5,}\b/g) || [];
          const freq: Record<string, number> = {};
          for (const w of words) {
            if (STOPWORDS.has(w)) continue;
            freq[w] = (freq[w] || 0) + 1;
          }
          const topWords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([w]) => w);
          for (const w of topWords) derived.add(w);

          themes = Array.from(derived).slice(0, 8);
          console.log(`[extract-memories] AI returned no themes; derived ${themes.length} from text`);
        }

        return {
          text: e.text,
          category: e.category,
          tier: validTiers.includes(e.tier) ? e.tier : "contextual",
          vulnerability_score: Math.max(0, Math.min(30, e.vulnerability_score || 0)),
          emotional_weight: e.category === "emotional" ? 20 : e.category === "wellness" ? 10 : 0,
          themes,
          extractedAt: now,
        };
      });

    return new Response(JSON.stringify({ entries: validated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Memory extraction error:", e);
    return new Response(
      JSON.stringify({ entries: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
