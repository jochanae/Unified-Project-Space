import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface DraftAsset {
  channel: string;
  stage: string;
  headline: string;
  subhead: string;
  cta: string;
}

interface Body {
  projectId?: string;
  draft: { campaign_name?: string; assets: DraftAsset[] };
  /** Snapshot of original MarQ-authored copy, so we know what the user changed. */
  original?: { assets: DraftAsset[] };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const { projectId, draft, original } = (await req.json()) as Body;
    if (!draft?.assets?.length) throw new Error("draft.assets required");

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    // Pull org's elite/high winners as the "proven playbook"
    let winnersBlock = "";
    let orgId: string | null = null;
    if (projectId) {
      const { data: proj } = await sb.from("projects").select("org_id").eq("id", projectId).maybeSingle();
      orgId = proj?.org_id ?? null;
    }
    if (orgId) {
      const { data: winners } = await sb
        .from("saved_campaigns")
        .select("name, rationale, metrics, performance_tier, plan")
        .eq("org_id", orgId)
        .in("performance_tier", ["elite", "high"])
        .order("performance_tier", { ascending: true })
        .limit(5);
      if (winners?.length) {
        winnersBlock = winners.map((w: any) => {
          const m = w.metrics || {};
          const sample = (w.plan?.assets || []).slice(0, 3).map((a: any) =>
            `  · ${a.stage}/${a.channel} → "${a.headline}" / CTA: "${a.cta}"`
          ).join("\n");
          return `• "${w.name}" [${w.performance_tier} · ${m.cvr ?? 0}% CVR / ${m.views ?? 0} views]\n${sample}`;
        }).join("\n\n");
      }
    }

    // Build a diff summary if we have the original
    let diffBlock = "";
    if (original?.assets?.length) {
      const lines: string[] = [];
      draft.assets.forEach((a, i) => {
        const o = original.assets[i];
        if (!o) return;
        if (o.headline !== a.headline) lines.push(`Asset ${i + 1} headline: "${o.headline}" → "${a.headline}"`);
        if (o.subhead !== a.subhead) lines.push(`Asset ${i + 1} subhead: "${o.subhead}" → "${a.subhead}"`);
        if (o.cta !== a.cta) lines.push(`Asset ${i + 1} CTA: "${o.cta}" → "${a.cta}"`);
      });
      if (lines.length) diffBlock = `USER EDITS DETECTED:\n${lines.join("\n")}`;
    }

    const draftBlock = draft.assets.map((a, i) =>
      `[Asset ${i + 1}] ${a.stage}/${a.channel}\n  Headline: ${a.headline}\n  Subhead: ${a.subhead}\n  CTA: ${a.cta}`
    ).join("\n\n");

    const systemPrompt = `You are MarQ, a senior conversion strategist acting as a Creative Director.
You audit the user's CURRENT draft copy against their organization's PROVEN winning patterns.

For each meaningful drift from winning patterns, emit ONE concise note. Notes should be:
- Specific (cite the asset index and the drifted attribute: headline | subhead | cta).
- Evidence-led (reference the winning pattern — channel mix, tone, length, voice).
- Actionable (suggest a concrete revised line the user can accept).

Severity:
- 'aligned' — copy matches winning patterns; emit at most 1 if everything is great.
- 'nudge' — minor drift; tone, hedge words, length.
- 'warning' — meaningful conflict with proven winners (e.g. soft CTA where action verbs convert, abstract headline where specifics convert).

Return 0–4 notes total. If there are no winners to learn from, return 1 'aligned' note saying you'll learn as data arrives.`;

    const userPrompt = `${winnersBlock ? `WINNING PATTERNS (org's elite/high campaigns):\n${winnersBlock}\n` : "WINNING PATTERNS: (no high-performing campaigns yet)\n"}
CURRENT DRAFT:
${draftBlock}

${diffBlock || "(No diff vs original — audit the full draft.)"}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_critique",
            description: "Return MarQ's creative critique of the draft.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "One-line headline verdict, ≤ 14 words." },
                notes: {
                  type: "array",
                  maxItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      severity: { type: "string", enum: ["aligned", "nudge", "warning"] },
                      asset_index: { type: "integer", minimum: 0 },
                      attribute: { type: "string", enum: ["headline", "subhead", "cta", "overall"] },
                      message: { type: "string", description: "Why this matters, evidence-led." },
                      suggestion: { type: "string", description: "Concrete revised copy the user can accept." },
                    },
                    required: ["severity", "asset_index", "attribute", "message"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["summary", "notes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_critique" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limited — try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI critique error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Critique unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await aiResp.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const critique = args ? JSON.parse(args) : null;
    if (!critique) throw new Error("No critique returned");

    return new Response(JSON.stringify({ critique, hasWinners: !!winnersBlock }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quinn-creative-critique error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
