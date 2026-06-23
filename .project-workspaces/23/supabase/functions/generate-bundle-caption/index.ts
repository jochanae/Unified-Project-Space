import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type BundleType = "zero_to_launch" | "weekend_push";
type Platform = "instagram" | "tiktok" | "x" | "linkedin";

const SYSTEM = `You are MarQ, an Intelligent Execution Engine writing short, high-conversion social captions for solo founders. Tone: tactical, confident, modern. No emoji-stuffing (1 max). Output ONLY the caption text — no quotes, no preamble.`;

const PLATFORM_SPEC: Record<Platform, { name: string; rules: string; charCap: number }> = {
  instagram: { name: "Instagram", rules: "Hook in line 1. 3 short lines. Max 3 hashtags. End with 'link in bio'.", charCap: 380 },
  tiktok:    { name: "TikTok",    rules: "Hook in 6 words. 2 short lines. 2-3 trending-style hashtags. Punchy.", charCap: 220 },
  x:         { name: "X (Twitter)", rules: "Single tweet. Sharp. 1 line, max 240 chars. No hashtags. End with the link.", charCap: 240 },
  linkedin:  { name: "LinkedIn",  rules: "Pro tone. 4-6 short lines with line breaks. Insight first, CTA last. No hashtags inline; 2 max at end.", charCap: 600 },
};

function userPromptFor(type: BundleType, platform: Platform, project: any, ctxList: string[]) {
  const p = PLATFORM_SPEC[platform];
  const ctx = ctxList.length ? `Project context:\n- ${ctxList.join("\n- ")}\n` : "";
  const intent = type === "weekend_push"
    ? `Weekend-evening push to drive late-night browsers to my waitlist/funnel. Urgent but premium.`
    : `Launch-day announcement for a new waitlist/early-access. Lead with outcome, not feature.`;
  return `Platform: ${p.name}
Platform rules: ${p.rules}
Hard char cap: ${p.charCap}
Intent: ${intent}
Project: ${project?.name || "my project"}
Goal: ${project?.goal || "grow audience"}
${ctx}Write the caption only.`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: corsHeaders });

    const body = await req.json();
    const project_id: string = body.project_id;
    const bundle_type: BundleType = body.bundle_type;
    const platform: Platform = (body.platform || "instagram") as Platform;
    if (!project_id || !bundle_type || !PLATFORM_SPEC[platform]) {
      return new Response(JSON.stringify({ error: "missing or invalid params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${jwt}`, apikey: SERVICE_KEY },
    });
    if (!userRes.ok) return new Response(JSON.stringify({ error: "auth failed" }), { status: 401, headers: corsHeaders });
    const userData = await userRes.json();
    const userId = userData?.id;
    const userEmail = userData?.email;

    const orgRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=org_id`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const orgRows = await orgRes.json();
    const orgId = orgRows?.[0]?.org_id;
    if (!orgId) return new Response(JSON.stringify({ error: "no org" }), { status: 403, headers: corsHeaders });

    const projRes = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${project_id}&org_id=eq.${orgId}&select=id,name,goal,slug`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const project = (await projRes.json())?.[0];
    if (!project) return new Response(JSON.stringify({ error: "project not found" }), { status: 404, headers: corsHeaders });

    const ctxRes = await fetch(
      `${SUPABASE_URL}/rest/v1/project_context?project_id=eq.${project_id}&select=directive,context_type&limit=8`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } },
    );
    const ctxRows = (await ctxRes.json()) || [];
    const ctxList = ctxRows.map((r: any) => r.directive).filter(Boolean).slice(0, 6);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPromptFor(bundle_type, platform, project, ctxList) },
        ],
        max_tokens: 260,
        temperature: 0.85,
      }),
    });

    if (aiRes.status === 429) return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429, headers: corsHeaders });
    if (aiRes.status === 402) return new Response(JSON.stringify({ error: "credits_exhausted" }), { status: 402, headers: corsHeaders });
    if (!aiRes.ok) throw new Error(`AI ${aiRes.status}`);

    const data = await aiRes.json();
    const caption = (data.choices?.[0]?.message?.content || "").trim();

    // Build tracked link (server-side, authoritative)
    const utmCampaign = bundle_type === "weekend_push" ? "weekend-push" : "launch-sprint";
    const siteUrl = Deno.env.get("SITE_URL") || "https://intoiq.app";
    const trackedLink = `${siteUrl.replace(/\/$/, "")}/p/${project.slug}?utm_source=${platform}&utm_medium=social&utm_campaign=${utmCampaign}`;

    // History log
    await fetch(`${SUPABASE_URL}/rest/v1/bundle_deployments`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        org_id: orgId,
        project_id,
        deployed_by: userId,
        bundle_type,
        platform,
        caption,
        tracked_link: trackedLink,
        utm_campaign: utmCampaign,
      }),
    });

    // Auto-queue 48h self-reminder follow-up to the deploying user
    if (userEmail) {
      const sendAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      const subject = `MarQ check-in: how did the ${PLATFORM_SPEC[platform].name} push perform?`;
      const reminderBody = `48 hours ago you deployed a ${bundle_type === "weekend_push" ? "Weekend Audience Push" : "48-Hour Waitlist Sprint"} bundle for ${project.name} on ${PLATFORM_SPEC[platform].name}.

Open IntoIQ Analytics → Traffic Channels to see how that source converted.

Tracked link: ${trackedLink}

— MarQ`;
      await fetch(`${SUPABASE_URL}/rest/v1/scheduled_followups`, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          org_id: orgId,
          scheduled_by: userId,
          recipient_email: userEmail,
          subject,
          body: reminderBody,
          send_at: sendAt,
          status: "pending",
          source: "bundle_reminder",
          channel: "email",
        }),
      });
    }

    return new Response(
      JSON.stringify({
        caption,
        tracked_link: trackedLink,
        platform,
        project: { id: project.id, name: project.name, slug: project.slug },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-bundle-caption error:", e);
    return new Response(JSON.stringify({ error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
