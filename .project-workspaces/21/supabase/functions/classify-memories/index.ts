import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TIER_DEFINITIONS = `
foundational: Core identity facts that NEVER change or are deeply personal
- Phobias, fears, traumas
- Chronic health conditions, disabilities
- Core family structure (deaths, estrangements)
- Sexual orientation, gender identity
- Religious/spiritual core beliefs
- Deep-seated values (veganism, pacifism, etc.)
Examples: "Has a fear/phobia of frogs", "Father passed away", "Type 1 diabetic"

identity: Major life aspects that change slowly
- Career, job, business ownership
- Relationship status (married, divorced, single)
- Major life goals and aspirations
- Educational background
- Living situation (city, housing type)
Examples: "Runs Into Innovations", "Working as flight attendant", "Building 4 SaaS products"

episodic: Specific events, stories, conversations
- Past experiences and stories
- Memorable moments
- Specific conversations or interactions
Examples: "Worked red-eye flight on April 10th", "Shipped CQ integration last week"

contextual: Current activities and temporary states
- Current projects and work
- Recent activities
- Current interests
Examples: "Working on IntoIQ refactor", "Listening to Mary J Blige lately"

transient: Passing states and preferences
- Mood states
- Temporary preferences
- Fleeting interests
Examples: "Feeling tired today", "In the mood for pizza"
`;

const VULNERABILITY_GUIDELINES = `
Vulnerability score (0-30) based on how the memory was shared:
30: Early deep vulnerability — phobias, trauma, shame, deeply personal struggles
20: Emotional disclosure — pain, fear, insecurity, mental health, family conflicts
15: Proud vulnerable moments — accomplishments revealing prior struggle, goals that expose fears
5: Casual personal mention — shared without emotional charge
0: Factual update — objective information, no emotional component
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("Missing ANTHROPIC_API_KEY");
    }

    const { memory_id, memory_text, conversation_number } = await req.json();

    // If no specific memory_id, classify all unclassified memories
    if (!memory_id) {
      return await classifyAllMemories(supabase, ANTHROPIC_API_KEY);
    }

    // Classify single memory
    const classification = await classifyMemory(memory_text, conversation_number, ANTHROPIC_API_KEY);

    const { data, error } = await supabase
      .from("memories")
      .update({
        tier: classification.tier,
        emotional_weight: classification.emotional_weight,
        vulnerability_score: classification.vulnerability_score,
        themes: classification.themes,
        source_context: {
          conversation_number: conversation_number || null,
          vulnerability_disclosed: classification.vulnerability_score >= 15,
          emotional_charge: classification.emotional_weight >= 20 ? "high" : classification.emotional_weight >= 10 ? "medium" : "low",
          classification_reasoning: classification.reasoning,
        },
      })
      .eq("id", memory_id)
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, classification, updated_memory: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Classification error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function classifyMemory(
  memoryText: string,
  conversationNumber: number | null,
  apiKey: string
): Promise<{ tier: string; emotional_weight: number; vulnerability_score: number; themes: string[]; reasoning: string }> {
  const prompt = `Classify this memory into the appropriate tier, assign scores, and generate semantic theme tags.

Memory: "${memoryText}"
Conversation number when shared: ${conversationNumber || "unknown"}

${TIER_DEFINITIONS}

${VULNERABILITY_GUIDELINES}

Emotional weight guidelines:
- Category = "emotional": base 30
- Category = "wellness": base 15
- Category = "general": base 0

Theme tagging: Generate 3-8 lowercase semantic tags that capture the MEANING of this memory.
- Tags should be concrete nouns, verbs, or adjectives
- Include specific terms ("python", "yoga") AND broader concepts ("programming", "fitness")
- Include emotional dimensions when relevant ("anxiety", "pride")
- Think: "what topics would make this memory relevant to surface?"

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{"tier": "foundational|identity|episodic|contextual|transient", "emotional_weight": 0, "vulnerability_score": 0, "themes": ["tag1", "tag2", "tag3"], "reasoning": "Brief explanation"}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const responseText = data.content[0].text.trim();
  const cleanedText = responseText.replace(/```json\n?|\n?```/g, "").trim();

  const classification = JSON.parse(cleanedText);
  const validTiers = ["foundational", "identity", "episodic", "contextual", "transient"];
  if (!validTiers.includes(classification.tier)) throw new Error(`Invalid tier: ${classification.tier}`);
  classification.emotional_weight = Math.max(0, Math.min(30, classification.emotional_weight));
  classification.vulnerability_score = Math.max(0, Math.min(30, classification.vulnerability_score));
  classification.themes = Array.isArray(classification.themes)
    ? classification.themes.filter((t: any) => typeof t === "string").map((t: string) => t.toLowerCase().trim()).slice(0, 10)
    : [];

  return classification;
}

async function classifyAllMemories(supabase: any, apiKey: string) {
  // Get memories that need classification (no themes or no source_context)
  const { data: allMemories, error } = await supabase
    .from("memories")
    .select("id, text, extracted_at, user_id, source_context, themes")
    .order("extracted_at", { ascending: true })
    .limit(1000);

  if (error) throw error;

  // Filter to memories needing classification or theme tagging
  const memories = (allMemories || []).filter((m: any) => {
    // Needs themes
    if (!m.themes || (Array.isArray(m.themes) && m.themes.length === 0)) return true;
    // Needs classification
    if (!m.source_context) return true;
    if (typeof m.source_context === 'object' && Object.keys(m.source_context).length === 0) return true;
    if (!m.source_context.auto_classified && !m.source_context.classification_reasoning) return true;
    return false;
  }).slice(0, 100);

  if (!memories || memories.length === 0) {
    return new Response(
      JSON.stringify({ success: true, message: "No unclassified memories found" }),
      { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  }

  const results = { processed: 0, successful: 0, failed: 0, errors: [] as any[] };
  const oldestDate = new Date(memories[0].extracted_at);

  for (const memory of memories) {
    try {
      const memoryDate = new Date(memory.extracted_at);
      const daysSinceOldest = Math.floor((memoryDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));
      const estimatedConversationNumber = Math.floor(daysSinceOldest / 1) + 1;

      const classification = await classifyMemory(memory.text, estimatedConversationNumber, apiKey);

      await supabase
        .from("memories")
        .update({
          tier: classification.tier,
          emotional_weight: classification.emotional_weight,
          vulnerability_score: classification.vulnerability_score,
          themes: classification.themes,
          source_context: {
            conversation_number: estimatedConversationNumber,
            vulnerability_disclosed: classification.vulnerability_score >= 15,
            emotional_charge: classification.emotional_weight >= 20 ? "high" : classification.emotional_weight >= 10 ? "medium" : "low",
            classification_reasoning: classification.reasoning,
            auto_classified: true,
          },
        })
        .eq("id", memory.id);

      results.successful++;
      console.log(`Classified memory ${memory.id}: ${classification.tier}, themes: ${classification.themes.join(', ')}`);
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (err) {
      results.failed++;
      results.errors.push({ memory_id: memory.id, error: (err as Error).message });
      console.error(`Failed to classify memory ${memory.id}:`, err);
    }
    results.processed++;
  }

  return new Response(
    JSON.stringify({
      success: true,
      results,
      message: `Processed ${results.processed} memories: ${results.successful} successful, ${results.failed} failed`,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
