import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadBrandKitContext } from "../_shared/brand-kit-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Body {
  projectId?: string;
  templateId: string; // 'obsidian-tile' | 'gold-flyer' | 'cinematic-story'
  tone?: string;
  brandName?: string;
  // Optional Briefing Session inputs (Growth tier)
  briefing?: {
    audience?: string;     // e.g. "high-net-worth retirees", "young families"
    painPoint?: string;    // e.g. "fear of market loss"
    desiredOutcome?: string; // e.g. "tax-free retirement income"
    objection?: string;    // a single objection to overcome
  };
  variations?: number; // 1 (default) or 3 (Growth tier "give me options")
}

const TEMPLATE_BRIEF: Record<string, string> = {
  "obsidian-tile":
    "Square 1080x1080 social tile for Instagram/Facebook. Headline must be punchy (max 8 words). Subhead is one tight sentence (max 14 words). CTA is 2-3 words.",
  "gold-flyer":
    "Print 8.5x11 flyer. Headline is a bold promise (max 10 words). Subhead explains the offer in one clear sentence (max 18 words). CTA is action-oriented (max 4 words).",
  "cinematic-story":
    "Vertical 1080x1920 story for IG/TikTok. Headline reads like a hook line (max 7 words). Subhead is a thumb-stopping line (max 12 words). CTA is a directive (max 3 words).",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = (await req.json()) as Body;
    const {
      projectId,
      templateId,
      tone = "cinematic-confident",
      brandName,
      briefing,
      variations = 1,
    } = body;

    // Pull project + Signal Lab + Strategy Blueprint context
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    // Tier gate — server-side enforcement
    let userTier: "free" | "operator" | "growth" = "free";
    try {
      const { data: userRes } = await sb.auth.getUser();
      const userId = userRes?.user?.id;
      if (userId) {
        const { data: sub } = await sb
          .from("subscriptions")
          .select("product_id, status, current_period_end")
          .eq("user_id", userId)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (sub) {
          const pid = (sub.product_id || "").toLowerCase();
          if (pid.includes("growth") || pid === "prod_uk90oxxalltey4".toLowerCase()) {
            userTier = "growth";
          } else if (pid) {
            userTier = "operator";
          }
        }
      }
    } catch { /* anon — stay free */ }

    if (userTier === "free") {
      return new Response(
        JSON.stringify({
          error: "AI Architect Mode is locked.",
          locked: true,
          tier_required: "operator",
          message: "Upgrade to Identity to unlock MarQ's intelligence-driven copywriter.",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let projectName = "";
    let projectGoal = "";
    let blueprintSummary = "";
    let signalSummary = "";
    let orgId: string | undefined;

    if (projectId) {
      const { data: proj } = await sb
        .from("projects")
        .select("name, goal, org_id")
        .eq("id", projectId)
        .maybeSingle();
      if (proj) {
        projectName = proj.name ?? "";
        projectGoal = proj.goal ?? "";
        orgId = (proj as any).org_id;
      }

      // Pull BOTH signal_lab + strategy_blueprint contexts in one query
      const { data: contexts } = await sb
        .from("project_context")
        .select("directive, context_type, created_at")
        .eq("project_id", projectId)
        .in("context_type", ["signal_lab", "strategy_blueprint"])
        .order("created_at", { ascending: false });

      const blueprintCtx = (contexts || []).find((c) => c.context_type === "strategy_blueprint");
      const signalCtx = (contexts || []).find((c) => c.context_type === "signal_lab");

      if (blueprintCtx?.directive) {
        try {
          const parsed = JSON.parse(blueprintCtx.directive);
          if (parsed?.sections?.length) {
            blueprintSummary = parsed.sections
              .slice(0, 4)
              .map((s: any) => `${s.title}: ${(s.points || []).slice(0, 3).join(" | ")}`)
              .join("\n");
          }
        } catch { /* ignore */ }
      }

      if (signalCtx?.directive) {
        try {
          const parsed = JSON.parse(signalCtx.directive);
          // Signal Lab blueprint shape varies — pluck the common high-signal fields
          const pieces: string[] = [];
          if (parsed?.persona) pieces.push(`Audience: ${typeof parsed.persona === "string" ? parsed.persona : JSON.stringify(parsed.persona).slice(0, 200)}`);
          if (parsed?.pain || parsed?.painPoints) pieces.push(`Pain: ${JSON.stringify(parsed.pain || parsed.painPoints).slice(0, 200)}`);
          if (parsed?.transformation || parsed?.outcome) pieces.push(`Transformation: ${JSON.stringify(parsed.transformation || parsed.outcome).slice(0, 200)}`);
          if (parsed?.hooks?.length) pieces.push(`Proven hooks: ${parsed.hooks.slice(0, 3).map((h: any) => typeof h === "string" ? h : h.text || h.headline).join(" | ")}`);
          if (parsed?.snippet) pieces.push(`Origin snippet: ${parsed.snippet.slice(0, 240)}`);
          signalSummary = pieces.join("\n");
        } catch { /* ignore */ }
      }
    }

    const brief = TEMPLATE_BRIEF[templateId] ?? TEMPLATE_BRIEF["obsidian-tile"];
    const variationCount = userTier === "growth" && variations > 1 ? Math.min(variations, 3) : 1;

    // Brand Kit context — make every line of copy sound like the user's brand
    const brandCtx = await loadBrandKitContext(supabaseUrl, supabaseAnon, authHeader, orgId);
    const brandBlock = brandCtx?.promptBlock ? `\n${brandCtx.promptBlock}\n` : "";

    const systemPrompt = `You are MarQ, an elite direct-response copywriter and creative director.
You translate a founder's Signal Lab intelligence into conversion-grade marketing copy.
Rules:
- Speak to the audience's specific pain and transformation — never generic platitudes.
- Concrete, sensory, benefit-first. No clichés ("unlock your potential", "level up", "game-changer"). No emojis.
- If the brand serves a regulated vertical (insurance, finance, health), use industry-aware language without overclaiming.
- Tone: ${tone}. Voice should feel premium, confident, and specific — like a luxury intelligence platform.
- NEVER repeat the user's literal project name as the headline. Translate it into a benefit or hook.
${brandBlock}Output MUST come through the provided tool. Do not include any explanation.`;

    const briefingBlock = briefing
      ? `BRIEFING (operator-supplied):
- Audience: ${briefing.audience || "(unspecified)"}
- Pain point: ${briefing.painPoint || "(unspecified)"}
- Desired outcome: ${briefing.desiredOutcome || "(unspecified)"}
- Objection to overcome: ${briefing.objection || "(unspecified)"}\n`
      : "";

    const userPrompt = `BRAND: ${brandName || "(unspecified)"}
PROJECT: ${projectName || "(unspecified)"}
GOAL: ${projectGoal || "(unspecified)"}
${signalSummary ? `SIGNAL LAB INTELLIGENCE:\n${signalSummary}\n` : ""}${blueprintSummary ? `STRATEGY BLUEPRINT:\n${blueprintSummary}\n` : ""}${briefingBlock}TEMPLATE BRIEF: ${brief}

Generate ${variationCount === 1 ? "ONE strong copy variation" : `${variationCount} distinctly different copy variations (vary the angle: pain-led, outcome-led, curiosity-led)`} (headline + subhead + cta).`;

    const toolSchema = variationCount === 1
      ? {
          type: "object",
          properties: {
            headline: { type: "string" },
            subhead: { type: "string" },
            cta: { type: "string" },
          },
          required: ["headline", "subhead", "cta"],
          additionalProperties: false,
        }
      : {
          type: "object",
          properties: {
            variations: {
              type: "array",
              minItems: variationCount,
              maxItems: variationCount,
              items: {
                type: "object",
                properties: {
                  angle: { type: "string", description: "pain | outcome | curiosity" },
                  headline: { type: "string" },
                  subhead: { type: "string" },
                  cta: { type: "string" },
                },
                required: ["angle", "headline", "subhead", "cta"],
                additionalProperties: false,
              },
            },
          },
          required: ["variations"],
          additionalProperties: false,
        };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_marketing_copy",
              description: "Return marketing copy for the asset.",
              parameters: toolSchema,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_marketing_copy" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Workspace settings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Copywriter unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    let parsed: any = null;
    if (args) {
      try { parsed = JSON.parse(args); } catch { /* ignore */ }
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: "No copy returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Always include the primary copy at the top level for backwards compatibility
    const primary = parsed.variations?.[0] ?? parsed;
    const result = {
      headline: primary.headline,
      subhead: primary.subhead,
      cta: primary.cta,
      variations: parsed.variations,
      tier: userTier,
      context_used: {
        signal_lab: !!signalSummary,
        strategy_blueprint: !!blueprintSummary,
        briefing: !!briefing,
        brand_kit: !!brandCtx,
      },
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quinn-marketing-copy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
