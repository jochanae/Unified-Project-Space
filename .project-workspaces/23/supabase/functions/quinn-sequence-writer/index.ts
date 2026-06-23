import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { loadBrandKitContext } from "../_shared/brand-kit-context.ts";

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { projectId, goal, existingStrategy, sequenceType } = await req.json();
    if (!projectId) throw new Error("projectId is required");

    // Get user org
    const { data: userData } = await supabase
      .from("users")
      .select("org_id, display_name")
      .eq("id", user.id)
      .single();
    if (!userData) throw new Error("User not found");

    // Fetch project + Signal Lab + Style Signal context
    const [projectRes, contextRes] = await Promise.all([
      supabase.from("projects").select("name, goal").eq("id", projectId).single(),
      supabase
        .from("project_context")
        .select("directive, context_type")
        .eq("project_id", projectId)
        .in("context_type", ["signal_lab", "style_signal"])
        .order("created_at", { ascending: false }),
    ]);

    const project = projectRes.data;
    const contexts = contextRes.data || [];

    let signalContext = "";
    let styleContext = "";

    for (const ctx of contexts) {
      if (ctx.context_type === "signal_lab" && !signalContext) {
        try {
          const parsed = JSON.parse(ctx.directive);
          signalContext = `\n\n## Identity Lock (CRITICAL — every email must sound like this brand):
- **One-Liner:** ${parsed.oneLiner || ""}
- **Elevator Pitch:** ${parsed.elevatorPitch || ""}
- **Social Bio:** ${parsed.socialBio || ""}
- **Hooks:** ${(parsed.hooks || []).join(" | ")}`;
        } catch {
          signalContext = `\n\n## Brand Signal:\n${ctx.directive}`;
        }
      }
      if (ctx.context_type === "style_signal" && !styleContext) {
        try {
          const parsed = JSON.parse(ctx.directive);
          styleContext = `\n\n## Style Signal (match this vibe in tone and word choices):
- **Brand Vibe:** ${parsed.vibe || "Not specified"}
- **Mood:** ${parsed.mood || ""}
- **Visual Direction:** ${parsed.visualDirection || ""}`;
        } catch {
          styleContext = `\n\n## Style Signal:\n${ctx.directive}`;
        }
      }
    }

    const projectGoal = goal || project?.goal || "Build a high-converting funnel";
    const projectName = project?.name || "Project";

    const seqType = sequenceType || "welcome";
    const seqDescriptions: Record<string, string> = {
      welcome: "a 5-email Welcome & Nurture sequence for new opt-ins. Build trust, deliver a quick win, overcome the #1 objection, create urgency, and close with a clear CTA.",
      recovery: "a 3-email Recovery sequence for leads who clicked but didn't convert. Re-engage with a new angle, address the likely hesitation, and offer a time-sensitive incentive.",
      onboarding: "a 4-email Onboarding sequence for new customers. Welcome them, guide first steps, share a power-user tip, and invite deeper engagement.",
      reengagement: "a 3-email Re-Engagement sequence for cold subscribers. Remind them why they signed up, share something valuable, and give a final 'stay or go' choice.",
    };

    const seqInstruction = seqDescriptions[seqType] || seqDescriptions.welcome;

    // Brand Kit context — make every email sound like the user's brand
    const brandCtx = await loadBrandKitContext(
      supabaseUrl,
      supabaseKey,
      authHeader,
      userData.org_id,
    );
    const brandBlock = brandCtx?.promptBlock ? `\n${brandCtx.promptBlock}\n` : "";

    const systemPrompt = `You are MarQ — an elite Email Strategist inside IntoIQ. You write email sequences that feel personal, strategic, and conversion-optimized.

## Your approach:
- Every email has a clear strategic purpose (never filler)
- Subject lines are curiosity-driven, not clickbait
- Body copy reads like a trusted advisor, not a marketer
- Each email builds on the previous (story arc)
- Match the brand's voice and positioning exactly
- Use the Identity Lock and Style Signal as your creative foundation
- End each email with ONE clear next step
${signalContext}${styleContext}${brandBlock}

## Project: "${projectName}"
Goal: ${projectGoal}
${existingStrategy ? `\n## Existing Strategy (use this as foundation):\n- Audience: ${existingStrategy.audience}\n- Offer: ${existingStrategy.offer}\n- Positioning: ${existingStrategy.positioning}\n- Hook: ${existingStrategy.hook}` : ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${seqInstruction}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_email_sequence",
              description: "Generate a complete email sequence with strategic purpose per email",
              parameters: {
                type: "object",
                properties: {
                  sequence_name: { type: "string", description: "Name for this sequence" },
                  emails: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        subject: { type: "string", description: "Subject line" },
                        body: { type: "string", description: "Full email body, 3-4 paragraphs, conversational" },
                        purpose: { type: "string", description: "Strategic purpose (e.g. 'Welcome + Quick Win')" },
                        delay_days: { type: "number", description: "Days after previous email (0 = immediate)" },
                        trigger_stage: { type: "string", description: "Pipeline stage trigger: 'new', 'contacted', 'qualified', 'proposal', or 'none' for time-based" },
                      },
                      required: ["subject", "body", "purpose", "delay_days", "trigger_stage"],
                    },
                  },
                },
                required: ["sequence_name", "emails"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_email_sequence" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quinn-sequence-writer error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
