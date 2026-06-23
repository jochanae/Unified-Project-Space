// Competitor Feeds Audit — scrapes 1-5 competitor URLs via Firecrawl,
// audits each individually, then runs an aggregate "where you can win" briefing.
// Auth required. Identity + Innovation tier only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_COMPETITORS = 5;

function isValidHttpUrl(value: string): URL | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host === "0.0.0.0"
    ) return null;
    return u;
  } catch {
    return null;
  }
}

async function scrapeOne(url: string, apiKey: string) {
  const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      url,
      formats: ["markdown", "summary"],
      onlyMainContent: true,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || `Firecrawl ${res.status} for ${url}`);
  const doc = json?.data ?? json;
  return {
    url,
    title: doc?.metadata?.title || new URL(url).hostname,
    summary: doc?.summary || "",
    markdown: (doc?.markdown || "").slice(0, 6000),
  };
}

async function aiCall(prompt: string, system: string, lovableKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (res.status === 429) throw new Error("RATE_LIMITED");
  if (res.status === 402) throw new Error("CREDITS_EXHAUSTED");
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const json = await res.json();
  const raw = json?.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw); } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing API keys" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { data: profile } = await supabase
      .from("users").select("org_id").eq("id", userId).maybeSingle();
    const orgId = profile?.org_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tier gate: identity or innovation only
    const { data: tier } = await supabase.rpc("get_org_subscription_tier", { _org_id: orgId });
    if (tier === "signal") {
      return new Response(JSON.stringify({
        error: "Competitor Intel requires Identity or Innovation tier.",
        upgrade_required: true,
      }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const projectId: string = body?.project_id;
    const rawUrls: string[] = Array.isArray(body?.urls) ? body.urls : [];

    if (!projectId) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validUrls = rawUrls
      .map((u) => isValidHttpUrl(String(u || "").trim()))
      .filter((u): u is URL => u !== null)
      .slice(0, MAX_COMPETITORS)
      .map((u) => u.toString());

    if (validUrls.length === 0) {
      return new Response(JSON.stringify({ error: "Provide 1-5 valid http(s) URLs." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify project belongs to org
    const { data: proj } = await supabase
      .from("projects").select("id, org_id, name, goal").eq("id", projectId).maybeSingle();
    if (!proj || proj.org_id !== orgId) {
      return new Response(JSON.stringify({ error: "Project not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Scrape all competitors in parallel
    const scrapeResults = await Promise.allSettled(
      validUrls.map((u) => scrapeOne(u, FIRECRAWL_API_KEY)),
    );

    const scraped = scrapeResults
      .map((r, i) => r.status === "fulfilled"
        ? r.value
        : { url: validUrls[i], title: validUrls[i], summary: "", markdown: "", error: String((r as any).reason?.message || r.reason) })
      .filter((s) => s.markdown || s.summary || s.error);

    if (scraped.every((s) => !s.markdown && !s.summary)) {
      return new Response(JSON.stringify({ error: "Could not scrape any competitor URL." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Per-competitor mini audits in parallel
    const individualAudits = await Promise.all(scraped.map(async (s) => {
      if (!s.markdown && !s.summary) {
        return { ...s, audit: { error: s.error || "scrape failed" } };
      }
      try {
        const audit = await aiCall(
          `Competitor URL: ${s.url}\nTitle: ${s.title}\n\nContent (truncated):\n"""\n${s.markdown || s.summary}\n"""\n\nReturn STRICT JSON:\n{\n  "positioning": "1 sentence on how they position",\n  "primary_hook": "their main hook (max 14 words)",\n  "primary_cta": "their primary CTA label",\n  "strengths": ["short bullet", "short bullet"],\n  "weaknesses": ["short bullet", "short bullet"],\n  "audience_signal": "who they target (1 short sentence)"\n}`,
          "You are MarQ, an Intelligent Execution Engine. Audit competitor pages with Tactical Grace. Reply with valid JSON only.",
          LOVABLE_API_KEY,
        );
        return { url: s.url, title: s.title, audit };
      } catch (e) {
        return { url: s.url, title: s.title, audit: { error: e instanceof Error ? e.message : "audit failed" } };
      }
    }));

    // 3) Aggregate "where you can win" briefing
    const aggregate = await aiCall(
      `Project: ${proj.name}\nGoal: ${proj.goal || "(not set)"}\n\nCompetitor audits:\n${JSON.stringify(individualAudits, null, 2)}\n\nReturn STRICT JSON:\n{\n  "verdict": "one headline-style sentence on the competitive landscape (max 16 words)",\n  "shared_patterns": ["pattern they all share", "pattern they all share"],\n  "positioning_gaps": ["gap you can exploit", "gap you can exploit"],\n  "hook_angles_to_steal": ["angle to test", "angle to test"],\n  "where_you_can_win": ["concrete move", "concrete move", "concrete move"],\n  "suggested_hook": "a sharper hook for ${proj.name} (max 14 words)",\n  "suggested_cta": "a sharper CTA (max 5 words)"\n}`,
      "You are MarQ. Compare a creator's project against competitors and surface concrete competitive moves. Reply with valid JSON only.",
      LOVABLE_API_KEY,
    );

    const result = {
      project_id: projectId,
      competitor_urls: validUrls,
      individual_audits: individualAudits,
      aggregate_briefing: aggregate,
      audited_at: new Date().toISOString(),
    };

    // 4) Persist (upsert by project_id)
    const { data: existing } = await supabase
      .from("competitor_audits")
      .select("id")
      .eq("project_id", projectId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("competitor_audits")
        .update({
          competitor_urls: validUrls,
          individual_audits: individualAudits,
          aggregate_briefing: aggregate,
          last_run_at: result.audited_at,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("competitor_audits").insert({
        org_id: orgId,
        project_id: projectId,
        competitor_urls: validUrls,
        individual_audits: individualAudits,
        aggregate_briefing: aggregate,
        last_run_at: result.audited_at,
        created_by: userId,
      });
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("audit-competitor-feeds error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "RATE_LIMITED" ? 429 : msg === "CREDITS_EXHAUSTED" ? 402 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
