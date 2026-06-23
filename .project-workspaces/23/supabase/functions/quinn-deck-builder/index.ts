// MarQ Deck Builder — converts a project/page/url into PresentQ-ready slide JSON.
// Auth required. Persists to presentq_decks and returns share_token for PresentQ deep link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 10;

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`deck-builder:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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
  } catch { return null; }
}

function clampLength(n: unknown): 5 | 7 | 10 {
  const v = Number(n);
  if (v === 5 || v === 7 || v === 10) return v;
  return 7;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
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

    const body = await req.json().catch(() => ({}));
    const projectId: string | null = body?.project_id ?? null;
    const pageId: string | null = body?.page_id ?? null;
    const rawUrl: string = String(body?.url || "").trim();
    const sourceText: string = String(body?.source_text || "").trim();
    const titleHint: string = String(body?.title || "").trim();
    const length = clampLength(body?.length);
    const generateImages: boolean = body?.generate_images === true;

    // Rate limit
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip") || "unknown";
    const ipHash = await hashIp(ip);
    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await supabase
      .from("landing_audit_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash).gte("created_at", since);
    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(JSON.stringify({ error: "Rate limit reached. Try again in an hour." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    supabase.from("landing_audit_rate_limits").insert({ ip_hash: ipHash }).then(() => {});

    // Build context: from URL (Firecrawl), from page record, or from raw text
    let contextText = sourceText;
    let resolvedTitle = titleHint;
    let resolvedSourceUrl: string | null = null;

    if (rawUrl) {
      const url = isValidHttpUrl(rawUrl);
      if (!url) {
        return new Response(JSON.stringify({ error: "Provide a valid public http(s) URL." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!FIRECRAWL_API_KEY) {
        return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY missing" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.toString(), formats: ["markdown", "summary"], onlyMainContent: true }),
      });
      const fcJson = await fcRes.json().catch(() => ({}));
      if (!fcRes.ok) {
        const status = fcRes.status === 402 ? 402 : 502;
        return new Response(JSON.stringify({ error: fcJson?.error || `Firecrawl failed (${fcRes.status})` }), {
          status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const doc = fcJson?.data ?? fcJson;
      contextText = (doc?.markdown || doc?.summary || "").slice(0, 12000);
      resolvedTitle = resolvedTitle || doc?.metadata?.title || url.hostname;
      resolvedSourceUrl = url.toString();
    } else if (pageId) {
      const { data: page } = await supabase
        .from("pages").select("id, title, slug, content_blocks, active_hook, project_id, org_id, published_url")
        .eq("id", pageId).maybeSingle();
      if (!page || page.org_id !== orgId) {
        return new Response(JSON.stringify({ error: "Page not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resolvedTitle = resolvedTitle || page.title || "Untitled Page";
      resolvedSourceUrl = page.published_url || null;
      contextText = JSON.stringify({
        title: page.title, hook: page.active_hook, blocks: page.content_blocks,
      }).slice(0, 12000);
    } else if (projectId) {
      const { data: proj } = await supabase
        .from("projects").select("id, name, goal, org_id").eq("id", projectId).maybeSingle();
      if (!proj || proj.org_id !== orgId) {
        return new Response(JSON.stringify({ error: "Project not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resolvedTitle = resolvedTitle || proj.name;
      // Pull latest stream blocks for context
      const { data: blocks } = await supabase
        .from("stream_blocks").select("block_type, content")
        .eq("project_id", projectId).order("order_index", { ascending: true }).limit(20);
      contextText = JSON.stringify({
        project: proj.name, goal: proj.goal, blocks: blocks || [],
      }).slice(0, 12000);
    }

    if (!contextText) {
      return new Response(JSON.stringify({ error: "No source content provided." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // AI: generate slide JSON
    const prompt = `You are MarQ, an Intelligent Execution Engine. Convert this funnel content into a clean ${length}-slide pitch deck for PresentQ.

Source title: ${resolvedTitle || "Untitled"}
${resolvedSourceUrl ? `Source URL: ${resolvedSourceUrl}` : ""}

Source content:
"""
${contextText}
"""

Return STRICT JSON with this shape and nothing else:
{
  "title": "deck title (max 8 words)",
  "subtitle": "one-line subtitle (max 14 words)",
  "theme": "cinematic|editorial|minimal",
  "slides": [
    {
      "layout": "title|hook|problem|solution|proof|offer|story|objections|bonus|cta",
      "headline": "slide headline (max 10 words)",
      "subheadline": "supporting line (max 18 words)",
      "bullets": ["bullet 1", "bullet 2", "bullet 3"],
      "speaker_notes": "1-2 sentences for the presenter"
    }
  ]
}
Rules:
- Exactly ${length} slides.
- First slide layout MUST be "title". Last slide layout MUST be "cta".
- ${length === 5 ? "Use: title, hook, problem→solution, proof, cta." : length === 7 ? "Add audience and offer slides." : "Include story, objections, and bonus slides."}
- Bullets must be punchy fragments (max 8 words each), no full sentences.
- No prose outside the JSON.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are MarQ. Always reply with valid JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "AI is busy. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      return new Response(JSON.stringify({ error: `AI deck build failed: ${t || aiRes.status}` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "{}";
    let deck: Record<string, unknown> = {};
    try { deck = JSON.parse(raw); }
    catch {
      const match = raw.match(/\{[\s\S]*\}/);
      deck = match ? JSON.parse(match[0]) : {};
    }

    const slides = Array.isArray((deck as { slides?: unknown }).slides) ? (deck as { slides: unknown[] }).slides : [];
    const finalTitle = String((deck as { title?: string }).title || resolvedTitle || "Untitled Deck").slice(0, 120);
    const theme = String((deck as { theme?: string }).theme || "cinematic");

    // Optional: generate one hero image per slide and attach `image_url` to each slide.
    let imagesGenerated = 0;
    let imagesFailed = 0;
    if (generateImages && slides.length > 0) {
      const imagePromises = slides.map(async (s: any, idx: number) => {
        const headline = String(s?.headline || "").slice(0, 120);
        const sub = String(s?.subheadline || "").slice(0, 200);
        const layout = String(s?.layout || "content");
        const imgPrompt = `Cinematic, premium ${theme} hero image for slide ${idx + 1} of a pitch deck (layout: ${layout}). Concept: "${headline}". Tone: ${sub}. Style: editorial, abstract, high-end magazine quality, soft volumetric lighting, no text, no logos, 16:9 composition, depth of field. Visual must support the deck title "${finalTitle}".`;
        try {
          const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image-preview",
              messages: [{ role: "user", content: imgPrompt }],
              modalities: ["image", "text"],
            }),
          });
          if (!imgRes.ok) {
            imagesFailed++;
            console.warn(`Slide ${idx + 1} image gen failed: ${imgRes.status}`);
            return;
          }
          const imgJson = await imgRes.json();
          const url = imgJson?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          if (url) {
            (s as any).image_url = url;
            imagesGenerated++;
          } else {
            imagesFailed++;
          }
        } catch (e) {
          imagesFailed++;
          console.warn(`Slide ${idx + 1} image gen exception:`, e);
        }
      });
      await Promise.all(imagePromises);
    }

    const { data: saved, error: saveErr } = await supabase
      .from("presentq_decks")
      .insert({
        org_id: orgId,
        project_id: projectId,
        page_id: pageId,
        created_by: userId,
        title: finalTitle,
        source_url: resolvedSourceUrl,
        slide_count: slides.length || length,
        slides,
        metadata: {
          subtitle: (deck as { subtitle?: string }).subtitle || null,
          theme,
          generated_at: new Date().toISOString(),
          images_generated: imagesGenerated,
          images_failed: imagesFailed,
        },
      })
      .select("id, share_token, title, slide_count")
      .single();

    if (saveErr || !saved) {
      return new Response(JSON.stringify({ error: saveErr?.message || "Failed to save deck" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      deck_id: saved.id,
      share_token: saved.share_token,
      title: saved.title,
      slide_count: saved.slide_count,
      slides,
      metadata: { subtitle: (deck as { subtitle?: string }).subtitle, theme, images_generated: imagesGenerated, images_failed: imagesFailed },
      presentq_url: `https://presentq.app/import?token=${saved.share_token}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("quinn-deck-builder error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
