import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CONSOLIDATION_THRESHOLD = 80; // min memories before narrative consolidation kicks in
const HARD_CAP = 300;
const MAX_NARRATIVES_PER_RUN = 3;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { userId, memberId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ status: "missing_user_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth verification
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token !== anonKey && token !== serviceKey) {
        const authClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user }, error: authError } = await authClient.auth.getUser();
        if (authError || !user || user.id !== userId) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get unconsolidated memories for this user (and optionally specific companion)
    let query = supabase
      .from("memories")
      .select("id, text, category, tier, themes, extracted_at, emotional_weight, vulnerability_score, base_score")
      .eq("user_id", userId)
      .eq("consolidated", false)
      .order("extracted_at", { ascending: true });

    if (memberId) {
      query = query.eq("member_id", memberId);
    }

    const { data: memories, error: memError } = await query.limit(500);
    if (memError) throw memError;

    if (!memories || memories.length < CONSOLIDATION_THRESHOLD) {
      return new Response(
        JSON.stringify({ status: "below_threshold", count: memories?.length ?? 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Consolidate] ${memories.length} unconsolidated memories for user ${userId}`);

    // ── Step 1: Cluster memories by theme overlap ──
    const clusters = clusterByThemes(memories);
    console.log(`[Consolidate] Found ${clusters.length} theme clusters`);

    // Only process the largest clusters (most value in consolidation)
    const topClusters = clusters
      .filter(c => c.memories.length >= 5) // need at least 5 memories to make a narrative
      .sort((a, b) => b.memories.length - a.memories.length)
      .slice(0, MAX_NARRATIVES_PER_RUN);

    if (topClusters.length === 0) {
      return new Response(
        JSON.stringify({ status: "no_clusters_large_enough", clusterSizes: clusters.map(c => c.memories.length) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { narrativesCreated: 0, memoriesConsolidated: 0, errors: [] as string[] };

    for (const cluster of topClusters) {
      try {
        const narrative = await generateNarrative(cluster, ANTHROPIC_API_KEY);
        if (!narrative) continue;

        // Determine member_id — use the most common one in the cluster
        const memberCounts: Record<string, number> = {};
        // We don't have member_id in the select, so we need to get it
        const memoryIds = cluster.memories.map(m => m.id);
        const { data: memWithMember } = await supabase
          .from("memories")
          .select("id, member_id")
          .in("id", memoryIds);

        let narrativeMemberId = memberId || "unknown";
        if (memWithMember) {
          for (const m of memWithMember) {
            memberCounts[m.member_id] = (memberCounts[m.member_id] || 0) + 1;
          }
          const topMember = Object.entries(memberCounts).sort((a, b) => b[1] - a[1])[0];
          if (topMember) narrativeMemberId = topMember[0];
        }

        // Insert into memory_narratives
        const { error: insertError } = await supabase.from("memory_narratives").insert({
          user_id: userId,
          member_id: narrativeMemberId,
          title: narrative.title,
          narrative_text: narrative.narrativeText,
          narrative_type: narrative.narrativeType,
          source_memory_ids: memoryIds,
          themes: cluster.sharedThemes,
          word_count: narrative.narrativeText.split(/\s+/).length,
          regenerate_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });

        if (insertError) {
          console.error("[Consolidate] Insert narrative error:", insertError);
          results.errors.push(`Insert failed: ${insertError.message}`);
          continue;
        }

        // Mark source memories as consolidated (don't delete them)
        await supabase
          .from("memories")
          .update({ consolidated: true })
          .in("id", memoryIds);

        results.narrativesCreated++;
        results.memoriesConsolidated += memoryIds.length;
        console.log(`[Consolidate] Created narrative "${narrative.title}" from ${memoryIds.length} memories`);
      } catch (err) {
        results.errors.push((err as Error).message);
        console.error("[Consolidate] Cluster processing error:", err);
      }
    }

    // ── Step 2: Hard cap eviction (oldest general, non-foundational) ──
    const { count: totalCount } = await supabase
      .from("memories")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);

    let evicted = 0;
    if ((totalCount ?? 0) > HARD_CAP) {
      const excess = (totalCount ?? 0) - HARD_CAP;
      const { data: toEvict } = await supabase
        .from("memories")
        .select("id")
        .eq("user_id", userId)
        .eq("category", "general")
        .in("tier", ["transient", "contextual"])
        .eq("consolidated", true)
        .order("extracted_at", { ascending: true })
        .limit(excess);

      if (toEvict && toEvict.length > 0) {
        await supabase.from("memories").delete().in("id", toEvict.map(m => m.id));
        evicted = toEvict.length;
        console.log(`[Consolidate] Evicted ${evicted} consolidated transient/contextual memories (hard cap)`);
      }
    }

    return new Response(
      JSON.stringify({
        status: "done",
        ...results,
        totalMemories: totalCount,
        evicted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[Consolidate] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Theme-based clustering ──
interface MemoryForCluster {
  id: string;
  text: string;
  category: string;
  tier: string | null;
  themes: string[] | null;
  extracted_at: string;
  emotional_weight: number | null;
  vulnerability_score: number | null;
  base_score: number | null;
}

interface ThemeCluster {
  sharedThemes: string[];
  label: string;
  memories: MemoryForCluster[];
}

function clusterByThemes(memories: MemoryForCluster[]): ThemeCluster[] {
  // Build theme frequency map
  const themeFreq: Record<string, number> = {};
  for (const m of memories) {
    for (const t of m.themes || []) {
      themeFreq[t] = (themeFreq[t] || 0) + 1;
    }
  }

  // Find significant themes (appear in 3+ memories)
  const significantThemes = Object.entries(themeFreq)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])
    .map(([theme]) => theme);

  // Cluster: group memories that share 2+ significant themes
  const clusters: ThemeCluster[] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < significantThemes.length; i++) {
    const primaryTheme = significantThemes[i];

    // Find memories with this theme that aren't already assigned
    const candidates = memories.filter(
      m => !assigned.has(m.id) && (m.themes || []).includes(primaryTheme)
    );

    if (candidates.length < 5) continue;

    // Find secondary themes that co-occur
    const coThemes: Record<string, number> = {};
    for (const m of candidates) {
      for (const t of m.themes || []) {
        if (t !== primaryTheme) coThemes[t] = (coThemes[t] || 0) + 1;
      }
    }

    const topCoThemes = Object.entries(coThemes)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([theme]) => theme);

    const sharedThemes = [primaryTheme, ...topCoThemes];
    const label = sharedThemes.slice(0, 3).join(" & ");

    // Only include memories that match at least 2 of the shared themes
    const clusterMemories = candidates.filter(m => {
      const memThemes = new Set(m.themes || []);
      const matchCount = sharedThemes.filter(t => memThemes.has(t)).length;
      return matchCount >= 2;
    });

    if (clusterMemories.length >= 5) {
      for (const m of clusterMemories) assigned.add(m.id);
      clusters.push({ sharedThemes, label, memories: clusterMemories });
    }
  }

  return clusters;
}

// ── Narrative generation ──
async function generateNarrative(
  cluster: ThemeCluster,
  apiKey: string
): Promise<{ title: string; narrativeText: string; narrativeType: string } | null> {
  const memoriesText = cluster.memories
    .map((m, i) => `${i + 1}. [${m.tier || "unknown"}] ${m.text}`)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `You create narrative portraits from clustered memory entries about a person. 
A narrative portrait is a rich, flowing paragraph that weaves together related facts into a coherent story about one aspect of someone's life.

Rules:
- Write in second person ("They...") as if describing the person to their companion
- Preserve ALL specific details: names, dates, places, numbers
- Weave facts into a natural narrative, not a bullet list
- Include emotional context where the memories reveal it
- The narrative should feel like a friend describing someone they know well
- Keep it under 200 words
- Return ONLY valid JSON, no markdown

Narrative types:
- "career_identity": Work, business, professional life
- "emotional_landscape": Emotional patterns, fears, joys, stressors
- "health_wellness": Physical/mental health, habits, goals
- "relationships": Family, friends, social dynamics
- "lifestyle": Hobbies, interests, daily routines, preferences
- "growth_journey": Personal development, skills, aspirations`,
      messages: [
        {
          role: "user",
          content: `Create a narrative portrait from these ${cluster.memories.length} related memories (themes: ${cluster.sharedThemes.join(", ")}):\n\n${memoriesText}\n\nRespond with JSON: {"title": "short descriptive title", "narrative_text": "the narrative paragraph", "narrative_type": "one of the types listed"}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error("[Consolidate] Anthropic error:", response.status);
    return null;
  }

  const data = await response.json();
  const content = data.content?.[0]?.text || "";
  try {
    const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const validTypes = ["career_identity", "emotional_landscape", "health_wellness", "relationships", "lifestyle", "growth_journey"];
    return {
      title: parsed.title || cluster.label,
      narrativeText: parsed.narrative_text || "",
      narrativeType: validTypes.includes(parsed.narrative_type) ? parsed.narrative_type : "lifestyle",
    };
  } catch {
    console.error("[Consolidate] Failed to parse narrative:", content);
    return null;
  }
}
