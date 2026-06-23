// Pre-flight: given a goal + intent mode, propose 3 distinct positioning angles
// with rationale and tradeoffs. The user picks ONE before Build Stream runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const INTENT_DIRECTIVES: Record<string, string> = {
  conversion:
    "INTENT: CONVERSION-FIRST. Optimize each angle for fast lead capture, low cognitive load, and a clear single-value promise. Favor concrete benefit > abstraction.",
  differentiation:
    "INTENT: DIFFERENTIATION-FIRST. Each angle must stake out a contrarian or category-redefining position. Avoid safe / generic framing.",
  premium:
    "INTENT: PREMIUM-FIRST. Each angle must signal high status, taste, and exclusivity. Favor restrained language, identity-coded benefit, and aspiration over urgency.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { goal, intentMode, projectId } = await req.json();
    if (!goal || typeof goal !== "string") throw new Error("goal is required");
    if (!intentMode || !INTENT_DIRECTIVES[intentMode]) {
      throw new Error("intentMode must be one of: conversion, differentiation, premium");
    }

    // Pull Signal Lab context if available — keeps angles grounded in real positioning
    let signalContext = "";
    if (projectId) {
      const { data: ctx } = await supabase
        .from("project_context")
        .select("directive, context_type")
        .eq("project_id", projectId)
        .in("context_type", ["signal_lab", "style_signal"])
        .order("created_at", { ascending: false })
        .limit(2);

      for (const c of ctx || []) {
        if (c.context_type === "signal_lab") {
          try {
            const p = JSON.parse(c.directive);
            signalContext += `\nExisting Signal: ${p.oneLiner || ""} | ${p.elevatorPitch || ""}`;
          } catch {
            signalContext += `\nExisting Signal: ${c.directive.slice(0, 240)}`;
          }
        }
      }
    }

    const systemPrompt = `You are IntoIQ — an elite funnel strategist running a pre-flight checkpoint.
The user has chosen an intent mode. Your job is to propose THREE distinct positioning angles ("wedges") for their funnel.

${INTENT_DIRECTIVES[intentMode]}

CONSTRAINTS:
- Each angle must be meaningfully different from the others (different audience cut, different hook, or different value frame).
- Be opinionated. No safe averages. No hedging language like "could" or "might."
- Each angle gets a short tradeoff so the user understands what they're picking AGAINST.
- Names must be 2-4 words, evocative, not generic ("The Memory Wedge" not "Option A").${signalContext}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Goal: "${goal}"\n\nPropose 3 angles.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "propose_angles",
              description: "Return 3 distinct positioning angles for the funnel.",
              parameters: {
                type: "object",
                properties: {
                  angles: {
                    type: "array",
                    minItems: 3,
                    maxItems: 3,
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "2-4 word evocative angle name" },
                        wedge: { type: "string", description: "One-sentence positioning statement" },
                        audience_cut: { type: "string", description: "Specific slice of audience this targets" },
                        hook: { type: "string", description: "The opening line the funnel will lead with" },
                        why_it_works: { type: "string", description: "1-2 sentence rationale" },
                        tradeoff: { type: "string", description: "What you give up by picking this angle" },
                      },
                      required: ["name", "wedge", "audience_cut", "hook", "why_it_works", "tradeoff"],
                    },
                  },
                },
                required: ["angles"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "propose_angles" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResponse.text();
      console.error("AI error:", status, t);
      throw new Error("AI generation failed");
    }

    const data = await aiResponse.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured output");
    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, angles: parsed.angles, intentMode }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-propose-angles error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
