import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

interface RemixRequest {
  campaignId: string;
  angle: string; // preset key or custom phrase
  customDirection?: string;
  replaceOriginal?: boolean; // default false → creates a sibling mission
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
  instagram: "Instagram Reel/Post: Hook in first 3 words. Caption max 200 chars. 5-8 hashtags. Conversational, scroll-stopping.",
  linkedin: "LinkedIn long-form: 1200-1800 chars. Professional but human. 3-5 hashtags. Lead with insight, end with question.",
  tiktok: "TikTok short script: Hook in first 2 seconds. 15-30s spoken script with [VISUAL] cues. 3-5 trending hashtags.",
  twitter: "Twitter/X: Single punchy thread starter under 270 chars. 1-2 hashtags.",
  facebook: "Facebook post: Story-first, 300-600 chars. 2-3 hashtags.",
};

const ANGLE_PRESETS: Record<string, string> = {
  provocative: "PROVOCATIVE — Lead with controversy. Challenge conventional wisdom head-on. Make readers uncomfortable in a productive way. Bold claims, sharp contrasts.",
  educational: "EDUCATIONAL — Teach the framework. Break down the mechanics with clarity. Use analogies and step-by-step structure. Authority through generosity.",
  story_led: "STORY-LED — Narrative-first. Open with a scene, a person, a moment. Let the insight emerge from the story, not the other way around.",
  tactical: "TACTICAL — Pure execution. Specific scripts, exact numbers, copy-paste frameworks. No fluff, no inspiration — just what to do tomorrow morning.",
  aspirational: "ASPIRATIONAL — Paint the after-state. What life looks like once they've internalized the Signal. Identity-driven, future-pacing, transformation language.",
  contrarian: "CONTRARIAN — Take the opposite stance the audience expects. Argue against the trend. Position the user as the smart minority who sees what others miss.",
};

const NARRATIVE_ARC = `
DEEP DIVE NARRATIVE ARC (7-day campaign — every post reinforces ONE core Signal theme):
- Day 1 — HOOK (Paradigm Shift)
- Day 2 — DEPTH (Why It Matters)
- Day 3 — DEPTH (How It Works)
- Day 4 — PROOF (Social Proof / Case Study)
- Day 5 — FRICTION (Objection Handling)
- Day 6 — BRIDGE (Call to Movement)
- Day 7 — BRIDGE (Hard Action / CTA)

Same day across platforms must "shake hands" — same role and theme, native language per platform.`;

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

    const body = (await req.json()) as RemixRequest;
    const { campaignId, angle, customDirection, replaceOriginal = false } = body;

    if (!campaignId || !angle) {
      return new Response(JSON.stringify({ error: "campaignId and angle required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load existing mission to preserve theme + project + signal source
    const { data: existing, error: existingErr } = await supabase
      .from("social_campaigns")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("narrative_day", { ascending: true });

    if (existingErr) throw existingErr;
    if (!existing || existing.length === 0) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const seed = existing[0];
    const projectId = seed.project_id;
    const orgId = seed.org_id;
    const campaignTheme = seed.campaign_theme ?? "Untitled Campaign";
    const signalSourceId = seed.signal_source_id;
    const platforms = Array.from(new Set(existing.map((p) => p.platform)));
    const daysOfContent = Math.max(...existing.map((p) => p.narrative_day ?? 7));

    // Pull strategy blueprint for Identity Lock
    let strategy = "";
    if (signalSourceId) {
      const { data: ctx } = await supabase
        .from("project_context")
        .select("directive")
        .eq("id", signalSourceId)
        .maybeSingle();
      if (ctx?.directive) strategy = ctx.directive;
    }
    if (!strategy && projectId) {
      const { data: ctxFallback } = await supabase
        .from("project_context")
        .select("directive")
        .eq("project_id", projectId)
        .eq("context_type", "strategy_blueprint")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ctxFallback?.directive) strategy = ctxFallback.directive;
    }

    const angleDirective = ANGLE_PRESETS[angle] ?? `CUSTOM ANGLE — ${angle}`;
    const platformRules = platforms
      .map((p) => `- ${p.toUpperCase()}: ${PLATFORM_RULES[p] ?? "Standard social post."}`)
      .join("\n");

    const systemPrompt = `You are MarQ — Chief Marketing Officer for IntoIQ. You are REMIXING an existing 7-day Deep Dive campaign.

CRITICAL RULES:
1. PRESERVE the campaign_theme exactly: "${campaignTheme}". The Signal does not change.
2. PRESERVE the 7-day narrative arc structure (Hook → Depth → Proof → Friction → Bridge).
3. PIVOT the ANGLE — the voice, attack, and emotional register all shift to match this directive:
   ${angleDirective}
4. Respect the Identity Lock from the user's Strategy Blueprint — no out-of-character vocabulary.
${customDirection ? `5. ADDITIONAL USER DIRECTION: ${customDirection}` : ""}

${NARRATIVE_ARC}

Platform Rules:
${platformRules}

Output exactly ${daysOfContent} posts PER platform. Each post MUST include narrative_day (1-${daysOfContent}) and narrative_role. Same day across platforms shares role + theme but speaks native language.`;

    const userPrompt = `Strategy Blueprint (Identity Lock):
${strategy || "(no blueprint — infer voice from campaign theme)"}

Campaign theme to preserve: "${campaignTheme}"
Platforms: ${platforms.join(", ")}
Days: ${daysOfContent}

Remix this entire ${daysOfContent}-day arc through the new angle. Same theme, new attack vector.`;

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
              name: "emit_remixed_calendar",
              description: "Return the remixed campaign with the same theme and arc but a new angle.",
              parameters: {
                type: "object",
                properties: {
                  remix_label: {
                    type: "string",
                    description: "Short label describing the remix (e.g. 'Provocative Cut', 'Tactical Cut').",
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
                required: ["remix_label", "posts"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_remixed_calendar" } },
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
    const remixLabel: string = parsed.remix_label ?? "Remix";

    const newCampaignId = crypto.randomUUID();
    const remixedTheme = `${campaignTheme} · ${remixLabel}`;

    const rows = posts.map((p) => ({
      org_id: orgId,
      project_id: projectId,
      created_by: user.id,
      platform: p.platform,
      content_type: p.content_type,
      hook: p.hook,
      body: p.body,
      hashtags: p.hashtags ?? [],
      cta: p.cta ?? null,
      media_suggestion: p.media_suggestion ?? null,
      audio_suggestion: p.audio_suggestion ?? null,
      signal_source_id: signalSourceId,
      status: "draft",
      campaign_id: newCampaignId,
      campaign_theme: remixedTheme,
      narrative_day: p.narrative_day ?? null,
      narrative_role: p.narrative_role ?? null,
      generation_mode: "deep_dive",
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("social_campaigns")
      .insert(rows)
      .select();

    if (insertErr) throw insertErr;

    // Optionally archive the original mission
    if (replaceOriginal) {
      await supabase
        .from("social_campaigns")
        .update({ status: "archived" })
        .eq("campaign_id", campaignId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: inserted?.length ?? 0,
        campaign_id: newCampaignId,
        campaign_theme: remixedTheme,
        remix_label: remixLabel,
        original_campaign_id: campaignId,
        replaced: replaceOriginal,
        posts: inserted,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    console.error("quinn-social-remix error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
