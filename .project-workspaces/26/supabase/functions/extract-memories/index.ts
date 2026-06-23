// Quinn — Memory Extraction (the "Scribe")
// Runs in the background after a chat turn. Reads recent conversation,
// distills durable truths, and persists them to quinn_memories.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const EXTRACTOR_MODEL = "google/gemini-2.5-flash"; // cheap + fast for distillation

// Tier defaults (decay in days; null = never decays)
const TIER_DEFAULTS: Record<
  string,
  { decay_days: number | null; base_score: number }
> = {
  foundational: { decay_days: null, base_score: 95 },
  identity: { decay_days: 365, base_score: 85 },
  episodic: { decay_days: 180, base_score: 65 },
  contextual: { decay_days: 30, base_score: 55 },
  transient: { decay_days: 7, base_score: 35 },
};

const EXTRACTOR_PROMPT = `You are Quinn's memory scribe. Your job is to read a financial-mentor conversation transcript and extract DURABLE TRUTHS about the user that Quinn should remember in future sessions.

Output ONLY a JSON array of memory objects. No prose, no markdown, no explanation. If nothing memorable, return [].

Each memory object MUST have:
- "tier": one of "foundational" | "identity" | "episodic" | "contextual" | "transient"
- "topic": short label (≤ 60 chars), e.g. "Risk tolerance", "Spouse income", "Brokerage consolidation"
- "content": single sentence stating the truth from the user's perspective. ≤ 200 chars. Past or present tense.
- "emotional_weight": integer -2..+2 (-2 distress, 0 neutral, +2 joy/excitement)

TIER GUIDE:
- foundational: core values, life philosophy, AND STRATEGIC PATTERNS that define how this user thinks and decides. Almost never changes. Includes:
    * Core values ("Generational wealth is the priority.")
    * Risk tolerance ("Conservative — prefers capital preservation over upside.")
    * Decision-making style ("Decides via data and second-order analysis, not gut.")
    * Time-horizon orientation ("Operates on a 10+ year horizon.")
    * Primary Project / Umbrella Organization (their main business venture, holding company, family office, or life mission — capture the SPECIFIC name)
    * Identity-defining commitments ("Refuses to take on consumer debt.")
- identity: stable life facts — career, family structure, long-term goals. ("Software engineer at a Series B startup." / "Two kids, ages 5 and 8.")
- episodic: specific past financial events. ("Sold rental property in March 2024 for $640k.")
- contextual: ACTIVE projects, current life situations, in-flight decisions. ("Currently consolidating two brokerage accounts via in-kind ACATS.")
- transient: passing concerns or moods. ("Anxious about today's market dip.")

STRATEGIC PATTERN EXTRACTION (high priority):
Actively look for evidence of HOW the user thinks, decides, and weighs trade-offs — not just WHAT they own. Patterns like risk tolerance, decision style, sequencing preferences, and ecosystem-level commitments belong in the FOUNDATIONAL tier because they govern every future recommendation Quinn makes.

EXTRACTION RULES:
1. Skip generic statements. Only extract things SPECIFIC to this user.
2. Skip Quinn's own statements unless they capture a user decision.
3. Skip questions. Extract only declared facts, stated preferences, or revealed strategic patterns.
4. Skip duplicates of memories already in the "EXISTING MEMORIES" block — unless the user has CHANGED their position, in which case extract the new version with appropriate tier.
5. Be conservative. 0-5 memories per call is normal. Quality over quantity.
6. Numbers are durable. Names are durable. Dates are durable. Strategic patterns are durable. Vibes are not.`;

interface ExtractedMemory {
  tier: keyof typeof TIER_DEFAULTS;
  topic: string;
  content: string;
  emotional_weight: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const messages: Array<{ role: string; content: string }> = body?.messages || [];
    const conversationId: string | null = body?.conversationId || null;
    const projectId: string | null = body?.projectId || null;

    if (!messages.length) {
      return new Response(JSON.stringify({ extracted: 0, skipped: "no messages" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull existing active memories so the extractor can skip duplicates
    const { data: existingMems } = await supabaseAdmin
      .from("quinn_memories")
      .select("tier, topic, content")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("current_score", { ascending: false })
      .limit(40);

    const existingBlock = (existingMems || [])
      .map((m) => `- [${m.tier}] ${m.topic}: ${m.content}`)
      .join("\n");

    // Take the last ~16 messages, strip system, cap content
    const transcript = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-16)
      .map((m) => `${m.role === "user" ? "USER" : "QUINN"}: ${String(m.content).slice(0, 1500)}`)
      .join("\n\n");

    const userPrompt = `EXISTING MEMORIES (do not duplicate unless changed):
${existingBlock || "(none yet)"}

CONVERSATION TRANSCRIPT:
${transcript}

Return the JSON array now.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const aiRes = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EXTRACTOR_MODEL,
        messages: [
          { role: "system", content: EXTRACTOR_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI extraction failed:", aiRes.status, errText);
      return new Response(
        JSON.stringify({ error: "Extraction failed", status: aiRes.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiJson = await aiRes.json();
    let raw: string = aiJson?.choices?.[0]?.message?.content || "[]";
    // Strip markdown fences if the model added any
    raw = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/g, "").trim();

    let parsed: ExtractedMemory[] = [];
    try {
      parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) parsed = [];
    } catch (e) {
      console.warn("Could not parse memory JSON:", raw.slice(0, 300));
      parsed = [];
    }

    // Validate + insert
    const valid = parsed.filter((m) =>
      m && typeof m === "object"
        && typeof m.topic === "string" && m.topic.length > 0
        && typeof m.content === "string" && m.content.length > 0
        && TIER_DEFAULTS[m.tier as keyof typeof TIER_DEFAULTS] != null
    ).slice(0, 6); // hard cap per call

    if (!valid.length) {
      return new Response(
        JSON.stringify({ extracted: 0, raw_count: parsed.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const rows = valid.map((m) => {
      const defaults = TIER_DEFAULTS[m.tier];
      const ew = Math.max(-2, Math.min(2, Math.trunc(m.emotional_weight ?? 0)));
      return {
        user_id: user.id,
        tier: m.tier,
        topic: m.topic.slice(0, 80),
        content: m.content.slice(0, 500),
        base_score: defaults.base_score,
        current_score: defaults.base_score + ew * 5,
        decay_days: defaults.decay_days,
        emotional_weight: ew,
        source_conversation_id: conversationId,
        project_id: projectId,
      };
    });

    const { error: insertErr } = await supabaseAdmin
      .from("quinn_memories")
      .insert(rows);

    if (insertErr) {
      console.error("Memory insert failed:", insertErr);
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ extracted: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("extract-memories error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
