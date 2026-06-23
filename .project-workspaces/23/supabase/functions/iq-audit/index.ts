import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const { strategy, landingPage, funnelSteps } = await req.json();
    if (!landingPage) throw new Error("landingPage is required");

    // Slim payload to avoid blowing the model's input token budget.
    const trim = (v: unknown, n = 600) =>
      typeof v === "string" ? (v.length > n ? v.slice(0, n) + "…" : v) : v;

    const slimLanding = landingPage && typeof landingPage === "object" ? {
      headline: trim((landingPage as any).headline, 240),
      subheadline: trim((landingPage as any).subheadline, 400),
      cta_text: trim((landingPage as any).cta_text, 120),
      cta_subtext: trim((landingPage as any).cta_subtext, 200),
      optin_heading: trim((landingPage as any).optin_heading, 200),
      social_proof: trim((landingPage as any).social_proof, 400),
      features: Array.isArray((landingPage as any).features)
        ? (landingPage as any).features.slice(0, 6).map((f: any) => ({
            title: trim(f?.title, 120),
            description: trim(f?.description, 300),
          }))
        : [],
    } : landingPage;

    const slimStrategy = strategy && typeof strategy === "object" ? {
      audience: trim((strategy as any).audience, 300),
      offer: trim((strategy as any).offer, 300),
      positioning: trim((strategy as any).positioning, 300),
      hook: trim((strategy as any).hook, 300),
    } : strategy;

    const slimSteps = Array.isArray(funnelSteps)
      ? funnelSteps.slice(0, 12).map((s: any) => ({
          title: trim(s?.title, 120),
          step_type: s?.step_type,
          description: trim(s?.description, 240),
        }))
      : funnelSteps;

    let funnelContext = JSON.stringify(
      { strategy: slimStrategy, landingPage: slimLanding, funnelSteps: slimSteps },
      null,
      2,
    );

    // Hard cap: ~60k chars (~15k tokens). Anything bigger gets sliced.
    const MAX_CHARS = 60000;
    if (funnelContext.length > MAX_CHARS) {
      funnelContext = funnelContext.slice(0, MAX_CHARS) + "\n…[truncated]";
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are an elite conversion rate optimization expert. Audit the provided funnel for conversion effectiveness. Check: headline clarity, CTA strength and visibility, social proof quality, feature/benefit framing, audience-offer alignment, mobile readability, and funnel step flow. Be specific and actionable.`,
          },
          {
            role: "user",
            content: `Audit this funnel for conversion optimization:\n\n${funnelContext}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_audit",
              description: "Return the audit results",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "Overall conversion readiness score 0-100",
                  },
                  issues: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: {
                          type: "string",
                          enum: ["pass", "warning", "suggestion"],
                          description: "pass = good, warning = needs fix, suggestion = could improve",
                        },
                        label: { type: "string", description: "Short label for the check" },
                        detail: { type: "string", description: "Specific actionable detail" },
                        autoFixed: { type: "boolean", description: "Whether this was auto-fixed" },
                      },
                      required: ["type", "label", "detail"],
                    },
                    description: "5-8 audit items covering headline, CTA, social proof, features, mobile, funnel flow",
                  },
                },
                required: ["score", "issues"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_audit" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI audit error:", status, errText);
      throw new Error("Audit failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return audit results");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("iq-audit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
