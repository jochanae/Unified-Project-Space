import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

interface RefineRequest {
  postId: string;
  // Each slider is -2..+2; 0 = unchanged
  sliders: {
    tactical_graceful?: number; // - tactical, + graceful
    punchy_depth?: number;      // - punchy, + depth
    bold_subtle?: number;       // - bold, + subtle
  };
  customNote?: string; // optional freeform nudge
}

const PLATFORM_RULES: Record<string, string> = {
  instagram: "Hook in first 3 words. Caption max 200 chars. 5-8 hashtags.",
  linkedin: "1200-1800 chars. Professional but human. 3-5 hashtags max.",
  tiktok: "Hook in first 2 seconds. 15-30s spoken script with [VISUAL] cues. 3-5 hashtags.",
  twitter: "Single punchy thread starter under 270 chars. 1-2 hashtags.",
  facebook: "Story-first, 300-600 chars. 2-3 hashtags.",
};

function describeSlider(value: number, lowLabel: string, highLabel: string): string | null {
  if (!value || value === 0) return null;
  const intensity = Math.abs(value) >= 2 ? "strongly" : "slightly";
  return value < 0
    ? `Shift the voice ${intensity} more ${lowLabel}.`
    : `Shift the voice ${intensity} more ${highLabel}.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RefineRequest;
    if (!body.postId) {
      return new Response(JSON.stringify({ error: "postId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: post, error: postErr } = await supabase
      .from("social_campaigns")
      .select("*")
      .eq("id", body.postId)
      .single();
    if (postErr || !post) throw new Error("Post not found");

    // Pull Identity Lock from Strategy Blueprint for the project
    let strategy = "";
    if (post.project_id) {
      const { data: blueprint } = await supabase
        .from("project_context")
        .select("directive")
        .eq("project_id", post.project_id)
        .eq("context_type", "strategy_blueprint")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (blueprint) strategy = blueprint.directive;
    }

    const sliderInstructions = [
      describeSlider(body.sliders.tactical_graceful ?? 0, "tactical and direct", "graceful and warm"),
      describeSlider(body.sliders.punchy_depth ?? 0, "punchy and concise", "deep and explanatory"),
      describeSlider(body.sliders.bold_subtle ?? 0, "bold and provocative", "subtle and understated"),
    ].filter(Boolean).join(" ");

    const platformRule = PLATFORM_RULES[post.platform] ?? "Standard social post.";
    const roleContext = post.narrative_role
      ? `This post plays the "${post.narrative_role}" role on Day ${post.narrative_day} of the "${post.campaign_theme}" Deep Dive arc. Preserve that strategic intent.`
      : "";

    const systemPrompt = `You are MarQ — Chief Marketing Officer. Refine an existing social post while STRICTLY preserving the user's Identity Lock (voice, terminology, positioning from their Strategy Blueprint).

Platform: ${post.platform.toUpperCase()} — ${platformRule}
${roleContext}

Identity Lock (Strategy Blueprint):
${strategy || "(no blueprint — preserve the existing tone)"}

Your job: rewrite the hook and body per the user's tone adjustments below. Keep the same core message and narrative role. Do NOT change topic, do NOT add new claims.`;

    const userPrompt = `CURRENT POST:
Hook: ${post.hook}
Body: ${post.body}

TONE ADJUSTMENTS:
${sliderInstructions || "(no slider changes — apply the custom note only)"}
${body.customNote ? `\nUSER NOTE: ${body.customNote}` : ""}

Return the refined hook and body.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
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
              name: "emit_refined_post",
              description: "Return the refined hook and body for the social post.",
              parameters: {
                type: "object",
                properties: {
                  hook: { type: "string", description: "Refined hook." },
                  body: { type: "string", description: "Refined body." },
                },
                required: ["hook", "body"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_refined_post" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit — try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      throw new Error(`AI gateway error: ${aiResp.status}`);
    }

    const aiData = await aiResp.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call returned from AI");

    const refined = JSON.parse(toolCall.function.arguments) as { hook: string; body: string };

    const { data: updated, error: updateErr } = await supabase
      .from("social_campaigns")
      .update({
        hook: refined.hook,
        body: refined.body,
        refinement_count: (post.refinement_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.postId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ success: true, post: updated }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("quinn-social-refine error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
