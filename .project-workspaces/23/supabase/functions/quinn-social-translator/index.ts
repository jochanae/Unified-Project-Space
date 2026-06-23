import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

interface TranslateRequest {
  projectId: string;
  platforms?: string[]; // defaults to ['instagram','linkedin','tiktok']
  daysOfContent?: number; // defaults to 7
  mode?: "deep_dive" | "spray_and_pray"; // defaults to deep_dive
}

interface SocialPost {
  platform: string;
  content_type: string;
  hook: string;
  body: string;
  hashtags: string[];
  cta?: string;
  media_suggestion?: string;
  audio_suggestion?: string;
  narrative_day?: number;
  narrative_role?: string;
}

const PLATFORM_RULES: Record<string, string> = {
  instagram: "Instagram Reel/Post: Hook in first 3 words. Caption max 200 chars. 5-8 hashtags. Conversational, scroll-stopping. Suggest a Reel concept (b-roll, talking head, text overlay).",
  linkedin: "LinkedIn long-form: 1200-1800 chars. Professional but human. No hashtag clutter (3-5 max). Lead with insight, end with question. No emoji spam.",
  tiktok: "TikTok short script: Hook in first 2 seconds. Body is a 15-30s spoken script with [VISUAL] cues. 3-5 trending hashtags. Suggest a trending audio if relevant.",
  twitter: "Twitter/X: Single punchy thread starter under 270 chars. 1-2 hashtags. Provocative or insight-led.",
  facebook: "Facebook post: Story-first, 300-600 chars. 2-3 hashtags. Aim for shares.",
};

// Deep Dive 7-day narrative arc — proves MarQ thinks in systems, not posts
const NARRATIVE_ARC = `
DEEP DIVE NARRATIVE ARC (7-day campaign — every post must reinforce ONE core Signal theme):
- Day 1 — HOOK (Paradigm Shift): A controversial, eye-opening insight that reframes how the audience sees the problem. Stop the scroll, make them rethink.
- Day 2 — DEPTH (Why It Matters): Educational breakdown of the mechanics behind the insight. Build credibility.
- Day 3 — DEPTH (How It Works): Tactical how-to or framework. Show the system at work.
- Day 4 — PROOF (Social Proof): A case study, story, or "what life looks like after." Make it tangible.
- Day 5 — FRICTION (Objection Handling): Address the #1 reason people don't act. Disarm the resistance.
- Day 6 — BRIDGE (Call to Movement): Invite them into the world / community / philosophy. Soft pivot.
- Day 7 — BRIDGE (Hard Action): Direct CTA toward the funnel / offer. Close the loop.

CRITICAL: Posts across platforms on the SAME day must "shake hands" — they share the day's role, but each speaks the platform's native language. The campaign must feel like a coordinated launch, not a content dump.`;

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

    const body = (await req.json()) as TranslateRequest;
    const {
      projectId,
      platforms = ["instagram", "linkedin", "tiktok"],
      daysOfContent = 7,
      mode = "deep_dive",
    } = body;

    if (!projectId) {
      return new Response(JSON.stringify({ error: "projectId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userRow } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", user.id)
      .single();
    if (!userRow?.org_id) throw new Error("Missing org_id for user");

    const { data: blueprintRow } = await supabase
      .from("project_context")
      .select("directive, id")
      .eq("project_id", projectId)
      .eq("context_type", "strategy_blueprint")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let strategy = "";
    let signalSourceId: string | null = null;
    if (blueprintRow) {
      strategy = blueprintRow.directive;
      signalSourceId = blueprintRow.id;
    } else {
      const { data: project } = await supabase
        .from("projects")
        .select("name, goal")
        .eq("id", projectId)
        .single();
      strategy = JSON.stringify({
        name: project?.name ?? "Untitled",
        goal: project?.goal ?? "Drive leads",
      });
    }

    // ─── Build tracked landing URL (Direct-Response link injection) ───
    const { data: projectRow } = await supabase
      .from("projects")
      .select("slug, custom_domain, domain_verified")
      .eq("id", projectId)
      .maybeSingle();

    const { data: publishedPage } = await supabase
      .from("pages")
      .select("slug, published_url, is_published, step_index")
      .eq("project_id", projectId)
      .eq("is_published", true)
      .order("step_index", { ascending: true })
      .limit(1)
      .maybeSingle();

    const campaignId = crypto.randomUUID();
    const shortCampaignTag = campaignId.slice(0, 8);

    const baseHost =
      projectRow?.custom_domain && projectRow?.domain_verified
        ? `https://${projectRow.custom_domain}`
        : "https://intoiq.app";
    const pageSlug = publishedPage?.slug ?? projectRow?.slug ?? "";
    const rawLanding =
      publishedPage?.published_url ||
      (pageSlug ? `${baseHost}/p/${pageSlug}` : baseHost);

    const buildTrackedUrl = (platform: string) => {
      try {
        const u = new URL(rawLanding);
        u.searchParams.set("utm_source", platform);
        u.searchParams.set("utm_medium", "social");
        u.searchParams.set("utm_campaign", `iq_${shortCampaignTag}`);
        u.searchParams.set("utm_content", "direct_response");
        return u.toString();
      } catch {
        return rawLanding;
      }
    };

    const trackedByPlatform: Record<string, string> = {};
    for (const p of platforms) trackedByPlatform[p] = buildTrackedUrl(p);

    const linkInjectionRules = `
DIRECT-RESPONSE LINK INJECTION (NON-NEGOTIABLE):
Every post's \`cta\` field MUST end with the platform's exact tracked URL below. Do NOT shorten, alter, or omit it. Do NOT invent other URLs.
${Object.entries(trackedByPlatform).map(([p, u]) => `  - ${p}: ${u}`).join("\n")}
`;

    const directResponseRules = `
INTOIQ DIRECT-RESPONSE ENGINE (this is what separates us from generic calendar tools like GoDaddy Airo):
- This is NOT brand-awareness filler. NEVER write generic "Happy [day]!", holiday, "fun fact", or "tip of the day" posts.
- Every post is a conversion asset. Use one of these frameworks, chosen per post based on the strongest angle in the Blueprint:
    AIDA — Attention (pattern-interrupt hook) → Interest (specific insight) → Desire (outcome / transformation) → Action (the tracked link).
    PAS  — Problem (named pain) → Agitation (cost of inaction) → Solution (the offer) → Action (the tracked link).
- Speak directly to the Blueprint's target audience and their stated pain. Reference the actual offer / mechanism — no vague platitudes.
- The \`cta\` line must contain a verb-led command (e.g. "Grab the playbook →", "Run the audit →", "Lock your spot →") immediately followed by the tracked URL on the same line.
- The \`hook\` must stop the scroll in the first line — specificity, contrast, or a contrarian claim. No emojis as the first character.
`;

    const platformRules = platforms
      .map((p) => `- ${p.toUpperCase()}: ${PLATFORM_RULES[p] ?? "Standard social post."}`)
      .join("\n");

    const isDeepDive = mode === "deep_dive";

    const systemPrompt = isDeepDive
      ? `You are MarQ — Chief Marketing Officer for IntoIQ. You don't generate posts; you architect direct-response campaigns. Translate the user's Strategy Blueprint into a coordinated ${daysOfContent}-day Deep Dive: ONE core Signal theme, expanded across a narrative arc, distributed natively per platform, every post engineered to drive a click to the funnel.
${directResponseRules}
${NARRATIVE_ARC}

Platform Rules:
${platformRules}
${linkInjectionRules}
Output exactly ${daysOfContent} posts PER platform. Each post MUST include narrative_day (1-${daysOfContent}) and narrative_role (Hook | Depth | Proof | Friction | Bridge). Same day across platforms shares the role and theme but speaks the platform's native language. Also return campaign_theme (the core Signal you're dissecting, e.g. "The Mid-Career Pivot").`
      : `You are MarQ, a tactical direct-response distribution strategist for IntoIQ. Translate the user's Strategy Blueprint into platform-native, conversion-driven social content.
${directResponseRules}
Platform Rules:
${platformRules}
${linkInjectionRules}
Output ${daysOfContent} posts PER platform.`;

    const userPrompt = isDeepDive
      ? `Strategy Blueprint:
${strategy}

Pick the strongest single Signal from this Blueprint as your campaign_theme. Then build a coordinated ${daysOfContent}-day Deep Dive across these platforms: ${platforms.join(", ")}.
Alternate AIDA and PAS frameworks across the arc. Every \`cta\` MUST end with the exact tracked URL for that platform.`
      : `Strategy Blueprint:
${strategy}

Generate ${daysOfContent} direct-response posts for each of these platforms: ${platforms.join(", ")}.
Alternate AIDA and PAS frameworks. Every \`cta\` MUST end with the exact tracked URL for that platform.`;

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
              name: "emit_social_calendar",
              description: "Return platform-native social posts as a coordinated campaign.",
              parameters: {
                type: "object",
                properties: {
                  campaign_theme: {
                    type: "string",
                    description: "The single core Signal theme this entire campaign dissects (e.g. 'The Mid-Career Pivot').",
                  },
                  posts: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        platform: { type: "string", enum: platforms },
                        content_type: { type: "string", enum: ["post", "reel", "story", "article", "short", "thread"] },
                        hook: { type: "string" },
                        body: { type: "string" },
                        hashtags: { type: "array", items: { type: "string" } },
                        cta: { type: "string" },
                        media_suggestion: { type: "string" },
                        audio_suggestion: { type: "string" },
                        narrative_day: { type: "integer", minimum: 1, maximum: daysOfContent },
                        narrative_role: { type: "string", enum: ["Hook", "Depth", "Proof", "Friction", "Bridge"] },
                      },
                      required: ["platform", "content_type", "hook", "body", "hashtags", "narrative_day", "narrative_role"],
                    },
                  },
                },
                required: ["campaign_theme", "posts"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_social_calendar" } },
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
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

    const parsed = JSON.parse(toolCall.function.arguments);
    const posts: SocialPost[] = parsed.posts ?? [];
    const campaignTheme: string = parsed.campaign_theme ?? "Untitled Campaign";

    // campaignId was generated above for tracked URL construction

    const rows = posts.map((p) => {
      const trackedUrl = trackedByPlatform[p.platform] ?? rawLanding;
      // Safety net: enforce tracked-link injection in the CTA even if the model omitted it
      let cta = (p.cta ?? "").trim();
      if (!cta) {
        cta = `Tap the link to dive in → ${trackedUrl}`;
      } else if (!cta.includes(trackedUrl)) {
        cta = `${cta.replace(/\s+$/, "")} ${trackedUrl}`;
      }
      return {
        org_id: userRow.org_id,
        project_id: projectId,
        created_by: user.id,
        platform: p.platform,
        content_type: p.content_type,
        hook: p.hook,
        body: p.body,
        hashtags: p.hashtags ?? [],
        cta,
        media_suggestion: p.media_suggestion ?? null,
        audio_suggestion: p.audio_suggestion ?? null,
        signal_source_id: signalSourceId,
        status: "draft",
        campaign_id: campaignId,
        campaign_theme: campaignTheme,
        narrative_day: p.narrative_day ?? null,
        narrative_role: p.narrative_role ?? null,
        generation_mode: mode,
      };
    });

    const { data: inserted, error: insertErr } = await supabase
      .from("social_campaigns")
      .insert(rows)
      .select();

    if (insertErr) throw insertErr;

    return new Response(
      JSON.stringify({
        success: true,
        count: inserted?.length ?? 0,
        campaign_id: campaignId,
        campaign_theme: campaignTheme,
        mode,
        posts: inserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("quinn-social-translator error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
