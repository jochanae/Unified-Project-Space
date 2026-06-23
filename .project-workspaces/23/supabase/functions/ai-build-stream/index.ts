import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

    const { projectId, goal, lockedAngle } = await req.json();
    if (!projectId || !goal) throw new Error("projectId and goal are required");

    // Build the locked-angle directive if user picked one in pre-flight
    let lockedDirective = "";
    if (lockedAngle?.angle && lockedAngle?.intentMode) {
      const intentMap: Record<string, string> = {
        conversion: "CONVERSION-FIRST: Optimize for fast lead capture, low cognitive load, single clear promise.",
        differentiation: "DIFFERENTIATION-FIRST: Stake out a contrarian, category-redefining position. No safe framing.",
        premium: "PREMIUM-FIRST: Signal status, taste, exclusivity. Restrained language, aspiration over urgency.",
      };
      lockedDirective = `\n\n## 🔒 LOCKED ANGLE (HIGHEST PRIORITY — DO NOT DRIFT)
The user committed to this exact angle in pre-flight. Every piece of generated copy MUST honor it.
- **Intent Mode:** ${intentMap[lockedAngle.intentMode] || lockedAngle.intentMode}
- **Angle Name:** ${lockedAngle.angle.name}
- **Wedge:** ${lockedAngle.angle.wedge}
- **Audience Cut:** ${lockedAngle.angle.audience_cut}
- **Locked Hook (use as the foundation for headline + strategy.hook):** ${lockedAngle.angle.hook}
- **Why this works:** ${lockedAngle.angle.why_it_works}

Do NOT propose alternative angles. Do NOT blend wedges. Build the entire funnel committed to this single position.`;
    }

    // Get user's org and Signal Lab context
    const { data: userData } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();
    if (!userData) throw new Error("User not found");
    const orgId = userData.org_id;

    // Fetch Signal Lab output + saved URL audits to enrich the build
    const { data: signalContexts } = await supabase
      .from("project_context")
      .select("directive, context_type, created_at")
      .eq("project_id", projectId)
      .in("context_type", ["signal_lab", "style_signal", "url_audit"])
      .order("created_at", { ascending: false });

    let signalContext = "";
    let styleContext = "";
    let auditContext = "";
    const auditBlocks: string[] = [];

    for (const ctx of signalContexts || []) {
      if (ctx.context_type === "signal_lab" && !signalContext) {
        try {
          const parsed = JSON.parse(ctx.directive);
          signalContext = `\n\n## Signal Lab Output (CRITICAL — use this refined brand signal as the foundation for ALL generated copy, positioning, and strategy):
- **One-Liner:** ${parsed.oneLiner || ""}
- **Elevator Pitch:** ${parsed.elevatorPitch || ""}
- **Social Bio:** ${parsed.socialBio || ""}`;
        } catch {
          signalContext = `\n\n## Signal Lab Output:\n${ctx.directive}`;
        }
      }
      if (ctx.context_type === "style_signal" && !styleContext) {
        try {
          const parsed = JSON.parse(ctx.directive);
          const paletteStr = parsed.palette?.map((c: any) => `${c.name}: ${c.hex}`).join(", ") || "";
          styleContext = `\n\n## Style Signal (CRITICAL — apply this visual identity to ALL generated page content, CTAs, and design choices):
- **Brand Vibe:** ${parsed.vibe || "Not specified"}
- **Mood:** ${parsed.mood || ""}
- **Palette:** ${paletteStr}
- **Typography:** ${parsed.typography?.heading || ""} (headings) / ${parsed.typography?.body || ""} (body)
- **Visual Direction:** ${parsed.visualDirection || ""}`;
        } catch {
          styleContext = `\n\n## Style Signal:\n${ctx.directive}`;
        }
      }
      if (ctx.context_type === "url_audit" && auditBlocks.length < 3) {
        try {
          const parsed = JSON.parse(ctx.directive);
          const a = parsed.audit || {};
          const frictions = Array.isArray(a.frictions) ? a.frictions.slice(0, 5) : [];
          const opportunities = Array.isArray(a.opportunities) ? a.opportunities.slice(0, 5) : [];
          if (frictions.length || opportunities.length || a.suggested_hook || a.suggested_cta) {
            auditBlocks.push(`### Audited URL: ${parsed.url || parsed.title || "unknown"}${typeof a.score === "number" ? ` (signal ${a.score}/100)` : ""}
${a.verdict ? `- **Verdict:** ${a.verdict}\n` : ""}${frictions.length ? `- **Frictions to AVOID in copy:**\n${frictions.map((f: string) => `  - ${f}`).join("\n")}\n` : ""}${opportunities.length ? `- **Opportunities to LEAN INTO:**\n${opportunities.map((o: string) => `  - ${o}`).join("\n")}\n` : ""}${a.suggested_hook ? `- **Reference hook:** ${a.suggested_hook}\n` : ""}${a.suggested_cta ? `- **Reference CTA:** ${a.suggested_cta}` : ""}`);
          }
        } catch {
          // skip malformed audit entries
        }
      }
    }

    if (auditBlocks.length) {
      auditContext = `\n\n## Live URL Audits (CRITICAL — the user has audited real pages. Treat the FRICTIONS as anti-patterns to eliminate from generated copy, and the OPPORTUNITIES as conversion levers to embed in headline/features/CTA):\n${auditBlocks.join("\n\n")}`;
    }

    // Call Lovable AI with tool calling for structured output
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
            content: `You are IntoIQ — an elite funnel strategist. Given a business goal, generate a complete funnel strategy. Be specific, actionable, and conversion-focused. Write copy that sells.

If the goal mentions a local business, service territory, city, state, neighborhood, real estate market, home service, clinic, venue, or ZIP/postal targeting, set landing_page.service_area_required to true. If the user provides ZIP/postal codes, include them in landing_page.service_area_zips; otherwise leave service_area_zips empty so the user can fill them in before publishing.

When generating video_suggestion, suggest a specific type of video the user should create (e.g. "Product demo walkthrough", "Customer testimonial reel", "Founder story intro") along with a description and recommended placement in the funnel. Only suggest a video if it genuinely enhances the funnel — not every funnel needs one.${lockedDirective}${signalContext}${styleContext}${auditContext}`,
          },
          {
            role: "user",
            content: `Build me a complete funnel for this goal: "${goal}"`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_funnel",
              description: "Generate a complete funnel strategy with steps and landing page content",
              parameters: {
                type: "object",
                properties: {
                  strategy: {
                    type: "object",
                    properties: {
                      audience: { type: "string", description: "Target audience description" },
                      offer: { type: "string", description: "Core offer/value proposition" },
                      positioning: { type: "string", description: "Market positioning statement" },
                      hook: { type: "string", description: "Attention-grabbing hook line" },
                    },
                    required: ["audience", "offer", "positioning", "hook"],
                  },
                  funnel_steps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        step_type: { type: "string", enum: ["landing", "optin", "thankyou", "sales", "email"] },
                        description: { type: "string" },
                      },
                      required: ["title", "step_type", "description"],
                    },
                    description: "3-5 funnel steps in order",
                  },
                  landing_page: {
                    type: "object",
                    properties: {
                      headline: { type: "string", description: "Hero headline — bold, benefit-driven" },
                      subheadline: { type: "string", description: "Supporting line under the headline" },
                      cta_text: { type: "string", description: "Call-to-action button text" },
                      service_area_required: { type: "boolean", description: "True when ZIP/postal code should be captured for lead qualification or local service targeting" },
                      service_area_label: { type: "string", description: "Short helper text explaining the covered area or ZIP qualification" },
                      service_area_zips: { type: "array", items: { type: "string" }, description: "Allowed ZIP/postal codes explicitly provided by the user; leave empty if unknown" },
                      features: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            description: { type: "string" },
                          },
                          required: ["title", "description"],
                        },
                        description: "3 key feature/benefit blocks",
                      },
                      social_proof: { type: "string", description: "A short social proof statement" },
                    },
                    required: ["headline", "subheadline", "cta_text", "features", "social_proof"],
                  },
                  video_suggestion: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Short title for the suggested video, e.g. 'Product Demo'" },
                      description: { type: "string", description: "What the video should cover and why it helps conversion" },
                      placement: { type: "string", enum: ["hero", "after_features", "before_cta", "testimonial_section"], description: "Where in the landing page this video should appear" },
                      placeholder_url: { type: "string", description: "Always set to empty string — user will add their own URL" },
                    },
                    required: ["title", "description", "placement", "placeholder_url"],
                  },
                  thank_you_page: {
                    type: "object",
                    properties: {
                      headline: { type: "string", description: "Thank you headline — confirms their action and builds excitement" },
                      subheadline: { type: "string", description: "What happens next — tell them to check their email, what they will receive, etc." },
                      cta_text: { type: "string", description: "Secondary CTA button text — could be share on social, book a call, or explore more" },
                      cta_url: { type: "string", description: "URL for the secondary CTA — can be a social link, calendar link, or homepage" },
                      bonus_message: { type: "string", description: "Optional bonus or surprise message to increase delight — e.g. a discount code hint or extra resource" },
                    },
                    required: ["headline", "subheadline", "cta_text"],
                  },
                  social_promo: {
                    type: "object",
                    properties: {
                      instagram_caption: { type: "string", description: "An engaging Instagram caption (under 200 words) with relevant hashtags that promotes the funnel offer. Include a call to action to visit the link in bio." },
                      linkedin_post: { type: "string", description: "A professional LinkedIn post (under 150 words) that positions the offer as valuable thought leadership. Include a call to action." },
                      twitter_post: { type: "string", description: "A concise tweet (under 280 characters) with a hook and call to action for the funnel." },
                      email_teaser: { type: "string", description: "A short email snippet (2-3 sentences) that could be sent to an existing list to drive traffic to the funnel." },
                    },
                    required: ["instagram_caption", "linkedin_post", "twitter_post", "email_teaser"],
                  },
                },
                required: ["strategy", "funnel_steps", "landing_page", "thank_you_page", "social_promo"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_funnel" } },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings > Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI did not return structured output");

    const result = JSON.parse(toolCall.function.arguments);

    // Save everything to DB in parallel
    const streamBlocksToInsert = [
      { project_id: projectId, org_id: orgId, block_type: "input", content: { goal }, order_index: 0, status: "complete" },
      { project_id: projectId, org_id: orgId, block_type: "strategy", content: result.strategy, order_index: 1, status: "complete" },
      { project_id: projectId, org_id: orgId, block_type: "funnel_map", content: { steps: result.funnel_steps }, order_index: 2, status: "complete" },
      { project_id: projectId, org_id: orgId, block_type: "page_content", content: result.landing_page, order_index: 3, status: "complete" },
      ...(result.video_suggestion ? [{ project_id: projectId, org_id: orgId, block_type: "video_suggestion", content: result.video_suggestion, order_index: 4, status: "complete" }] : []),
      ...(result.thank_you_page ? [{ project_id: projectId, org_id: orgId, block_type: "thank_you_content", content: result.thank_you_page, order_index: 5, status: "complete" }] : []),
      ...(result.social_promo ? [{ project_id: projectId, org_id: orgId, block_type: "social_promo", content: result.social_promo, order_index: 6, status: "complete" }] : []),
      ...(lockedAngle?.angle ? [{ project_id: projectId, org_id: orgId, block_type: "locked_angle", content: lockedAngle, order_index: 7, status: "complete" }] : []),
    ];

    const funnelStepsToInsert = result.funnel_steps.map((s: any, i: number) => ({
      project_id: projectId,
      org_id: orgId,
      title: s.title,
      step_type: s.step_type,
      order_index: i,
    }));

    // Delete old blocks and steps before inserting new ones (handles re-generation)
    await Promise.all([
      supabase.from("stream_blocks").delete().eq("project_id", projectId).eq("org_id", orgId),
      supabase.from("funnel_steps").delete().eq("project_id", projectId).eq("org_id", orgId),
    ]);

    const [blocksRes, stepsRes] = await Promise.all([
      supabase.from("stream_blocks").insert(streamBlocksToInsert),
      supabase.from("funnel_steps").insert(funnelStepsToInsert),
      supabase.from("projects").update({ goal }).eq("id", projectId),
    ]);

    if (blocksRes.error) console.error("blocks insert error:", blocksRes.error);
    if (stepsRes.error) console.error("steps insert error:", stepsRes.error);

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-build-stream error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
