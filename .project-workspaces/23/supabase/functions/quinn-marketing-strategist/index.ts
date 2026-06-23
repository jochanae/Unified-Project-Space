import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BrandKitInput {
  brand_name?: string;
  tagline?: string;
  accent_hex?: string;
  voice?: string;
  mood?: string;
  heading_font?: string;
}

interface Body {
  projectId?: string;
  /** Optional follow-up message — when present, treat as a refinement chat turn. */
  message?: string;
  /** Prior plan returned from this fn, passed back for refinement. */
  priorPlan?: unknown;
  brandName?: string;
  brand?: BrandKitInput;
  /** When true, return TWO distinct variants (A/B duel). */
  variants?: boolean;
  /** When 'remix', preserve winning logic + refresh copy. */
  mode?: "default" | "remix";
  /** For remix mode — the source winning plan to refresh. */
  sourcePlan?: unknown;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Body;
    const { projectId, message, priorPlan, brandName, brand, variants, mode, sourcePlan } = body;
    const effectiveBrandName = brand?.brand_name || brandName || "";

    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    let projectName = "";
    let projectGoal = "";
    let blueprintSummary = "";
    let performanceMemory = "";

    if (projectId) {
      const { data: proj } = await sb
        .from("projects")
        .select("name, goal, org_id")
        .eq("id", projectId)
        .maybeSingle();
      if (proj) {
        projectName = proj.name ?? "";
        projectGoal = proj.goal ?? "";
      }

      const { data: ctx } = await sb
        .from("project_context")
        .select("directive")
        .eq("project_id", projectId)
        .eq("context_type", "strategy_blueprint")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ctx?.directive) {
        try {
          const parsed = JSON.parse(ctx.directive);
          if (parsed?.sections?.length) {
            blueprintSummary = parsed.sections
              .slice(0, 6)
              .map((s: any) => `${s.title}: ${(s.points || []).slice(0, 4).join(" | ")}`)
              .join("\n");
          }
        } catch { /* ignore */ }
      }

      // Performance Memory: pull top campaigns by real CVR (Closed Loop v1)
      if (proj?.org_id) {
        const { data: winners } = await sb
          .from("saved_campaigns")
          .select("name, rationale, metrics, performance_tier, plan")
          .eq("org_id", proj.org_id)
          .in("performance_tier", ["elite", "high"])
          .order("performance_tier", { ascending: true })
          .limit(3);
        if (winners?.length) {
          performanceMemory = winners
            .map((w: any) => {
              const m = w.metrics || {};
              const stages = (w.plan?.assets || [])
                .map((a: any) => `${a.stage}/${a.channel}`)
                .join(", ");
              return `• "${w.name}" [${w.performance_tier}] — ${m.cvr ?? 0}% CVR on ${m.views ?? 0} views (${m.leads ?? 0} leads). Mix: ${stages}.${w.rationale ? ` Rationale: ${w.rationale}` : ""}`;
            })
            .join("\n");
        }
      }
    }

    const isRemix = mode === "remix" && sourcePlan;

    const systemPrompt = `You are MarQ, a senior conversion strategist for IntoIQ.
You design end-to-end marketing campaigns from the user's Strategy Blueprint.
Output is ALWAYS the structured tool call — never plain prose.

Rules:
- The campaign must include 3 assets: one social_tile, one flyer, one story.
- Each asset's copy obeys length limits: tile (headline ≤ 8 words), flyer (headline ≤ 10), story (headline ≤ 7).
- Subheads are tight (≤ 18 words). CTAs are 2–4 words, action-led.
- Sequencing: order assets from awareness → desire → action.
- Channel hint per asset: instagram | facebook | linkedin | tiktok | print | email.
- Include a one-line strategic_rationale tying the campaign back to the blueprint.
- Optionally include a 3-step distribution_plan (each step ≤ 14 words).
- Premium voice. No emojis. No clichés.
- Honour the BRAND VOICE and MOOD when writing copy.
- For each asset emit an accent_usage hint: 'subtle' | 'bold' | 'monochrome'.
- If PERFORMANCE MEMORY is provided, treat it as the user's proven playbook. Lean into the channel mix, stage cadence, and tone of past 'elite' campaigns.${
      variants
        ? `

A/B VARIANT MODE — return TWO complete campaign plans (variant_a and variant_b) that test a SINGLE strategic axis:
- Same channels, same stages, same target outcome.
- DIFFERENT angle / hook / promise (e.g. fear-of-loss vs. aspiration; quantified vs. emotional; direct vs. story-led).
- Make the strategic_rationale of EACH variant explicitly state the hypothesis it tests.
- Variant A is the safer interpretation of past winners. Variant B takes a calculated risk.`
        : ""
    }${
      isRemix
        ? `

REMIX MODE — A winning campaign is provided as SOURCE PLAN. Preserve what made it win:
- Same channel mix, same stage cadence, same accent_usage choices, same campaign archetype.
- REWRITE every headline / subhead / CTA so it feels fresh (different hook, different verb, different specificity).
- Keep the strategic spine identical. The rationale must call out which winning pattern is preserved.`
        : ""
    }`;

    const brandBlock = brand
      ? `BRAND VAULT:
  - Name: ${brand.brand_name || "(unspecified)"}
  - Tagline: ${brand.tagline || "(none)"}
  - Accent color: ${brand.accent_hex || "(default gold)"}
  - Voice: ${brand.voice || "(unspecified)"}
  - Mood: ${brand.mood || "(unspecified)"}`
      : `BRAND: ${effectiveBrandName || "(unspecified)"}`;

    const contextBlock = `${brandBlock}
PROJECT: ${projectName || "(unspecified)"}
GOAL: ${projectGoal || "(unspecified)"}
${blueprintSummary ? `STRATEGY BLUEPRINT:\n${blueprintSummary}\n` : "STRATEGY BLUEPRINT: (none yet — infer from project name + goal)\n"}${performanceMemory ? `\nPERFORMANCE MEMORY (real outcomes from past campaigns — weight new plan toward these patterns):\n${performanceMemory}\n` : ""}`;

    const userPrompt = isRemix
      ? `${contextBlock}

SOURCE PLAN (winning — preserve spine, refresh copy):
${JSON.stringify(sourcePlan, null, 2)}

Return the remix as a single full plan via the tool.`
      : message
        ? `${contextBlock}
PRIOR PLAN (JSON):
${JSON.stringify(priorPlan ?? {}, null, 2)}

USER REFINEMENT REQUEST:
${message}

Return an updated full plan via the tool.`
        : variants
          ? `${contextBlock}
Design TWO competing campaign variants (A vs. B) for the same goal, testing one strategic axis.`
          : `${contextBlock}
Design the optimal launch campaign now.`;

    const planSchema = {
      type: "object",
      properties: {
        campaign_name: { type: "string" },
        strategic_rationale: { type: "string" },
        assets: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              template_id: { type: "string", enum: ["obsidian-tile", "gold-flyer", "cinematic-story"] },
              asset_type: { type: "string", enum: ["social_tile", "flyer", "story"] },
              channel: { type: "string", enum: ["instagram", "facebook", "linkedin", "tiktok", "print", "email"] },
              stage: { type: "string", enum: ["awareness", "desire", "action"] },
              headline: { type: "string" },
              subhead: { type: "string" },
              cta: { type: "string" },
              accent_usage: { type: "string", enum: ["subtle", "bold", "monochrome"] },
            },
            required: ["template_id", "asset_type", "channel", "stage", "headline", "subhead", "cta", "accent_usage"],
            additionalProperties: false,
          },
        },
        distribution_plan: { type: "array", items: { type: "string" } },
      },
      required: ["campaign_name", "strategic_rationale", "assets"],
      additionalProperties: false,
    };

    const tool = variants
      ? {
          type: "function",
          function: {
            name: "emit_campaign_duel",
            description: "Return two A/B campaign variants for a head-to-head test.",
            parameters: {
              type: "object",
              properties: {
                duel_hypothesis: { type: "string", description: "One sentence: what axis this duel tests." },
                variant_a: planSchema,
                variant_b: planSchema,
              },
              required: ["duel_hypothesis", "variant_a", "variant_b"],
              additionalProperties: false,
            },
          },
        }
      : {
          type: "function",
          function: {
            name: "emit_campaign_plan",
            description: "Return a full marketing campaign plan.",
            parameters: planSchema,
          },
        };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: tool.function.name } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Strategist unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    let parsed: any = null;
    if (args) {
      try {
        parsed = JSON.parse(args);
      } catch { /* ignore */ }
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: "No plan returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (variants) {
      return new Response(
        JSON.stringify({
          duel: {
            hypothesis: parsed.duel_hypothesis,
            variant_a: parsed.variant_a,
            variant_b: parsed.variant_b,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ plan: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quinn-marketing-strategist error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
