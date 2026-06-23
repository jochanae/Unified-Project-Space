// Live URL Signal Audit — scrapes a URL via Firecrawl and runs an AI audit.
// Auth required (logged-in users only). Rate-limited per IP via landing_audit_rate_limits.
// Persists the result to project_context (context_type='url_audit') when project_id is provided.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 5; // 5 audits / hour / user

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`url-audit:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function isValidHttpUrl(value: string): URL | null {
  try {
    const u = new URL(value);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Block obvious local/private targets
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host === "0.0.0.0"
    ) {
      return null;
    }
    return u;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Resolve org_id
    const { data: profile } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", userId)
      .maybeSingle();
    const orgId = profile?.org_id;
    if (!orgId) {
      return new Response(JSON.stringify({ error: "Organization not found" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Body
    const body = await req.json().catch(() => ({}));
    const rawUrl = String(body?.url || "").trim();
    const projectId: string | null = body?.project_id ?? null;
    const persist: boolean = body?.persist !== false;

    const url = isValidHttpUrl(rawUrl);
    if (!url) {
      return new Response(JSON.stringify({ error: "Provide a valid public http(s) URL." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit by IP hash
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const ipHash = await hashIp(ip);
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("landing_audit_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({
          error: "Rate limit reached. Try again in an hour.",
          retry_after_minutes: 60,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    supabase
      .from("landing_audit_rate_limits")
      .insert({ ip_hash: ipHash })
      .then(() => {});

    // 1) Scrape with Firecrawl v2
    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url.toString(),
        formats: ["markdown", "summary"],
        onlyMainContent: true,
      }),
    });
    const fcJson = await fcRes.json().catch(() => ({}));
    if (!fcRes.ok) {
      const msg = fcJson?.error || `Firecrawl failed (${fcRes.status})`;
      const status = fcRes.status === 402 ? 402 : 502;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const doc = fcJson?.data ?? fcJson;
    const markdown: string = (doc?.markdown || "").slice(0, 12000);
    const summary: string = doc?.summary || "";
    const meta = doc?.metadata || {};
    const pageTitle: string = meta?.title || url.hostname;

    if (!markdown && !summary) {
      return new Response(
        JSON.stringify({ error: "Could not extract readable content from that URL." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) AI audit via Lovable AI Gateway
    const auditPrompt = `You are MarQ, an Intelligent Execution Engine. Audit this live page with Tactical Grace.
Source URL: ${url.toString()}
Page title: ${pageTitle}

Page content (markdown, truncated):
"""
${markdown || summary}
"""

Return STRICT JSON with this shape and nothing else:
{
  "verdict": "one short headline-style sentence (max 14 words)",
  "score": number 0-100,
  "clarity": { "rating": "weak|ok|sharp", "note": "one sentence" },
  "hook": { "rating": "weak|ok|sharp", "note": "one sentence" },
  "cta": { "rating": "weak|ok|sharp", "note": "one sentence" },
  "trust_signals": { "rating": "weak|ok|sharp", "note": "one sentence" },
  "frictions": ["short bullet", "short bullet", "short bullet"],
  "opportunities": ["short bullet", "short bullet", "short bullet"],
  "suggested_hook": "rewritten hook (max 14 words)",
  "suggested_cta": "rewritten CTA button label (max 5 words)"
}
No prose outside the JSON. Be concrete and specific to the page.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are MarQ. Always reply with valid JSON only." },
          { role: "user", content: auditPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "AI is busy. Try again in a moment." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      return new Response(JSON.stringify({ error: `AI audit failed: ${t || aiRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let audit: Record<string, unknown> = {};
    try {
      audit = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      audit = match ? JSON.parse(match[0]) : {};
    }

    const result = {
      url: url.toString(),
      title: pageTitle,
      summary,
      audit,
      audited_at: new Date().toISOString(),
    };

    // Persist for the project (only if user has access to it)
    if (persist && projectId) {
      const { data: proj } = await supabase
        .from("projects")
        .select("id, org_id")
        .eq("id", projectId)
        .maybeSingle();
      if (proj && proj.org_id === orgId) {
        await supabase.from("project_context").insert({
          project_id: projectId,
          org_id: orgId,
          context_type: "url_audit",
          directive: JSON.stringify(result),
        });
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("audit-live-url error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
