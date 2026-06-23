// Public Signal Audit — streams a mini Strategy Blueprint to landing visitors.
// No auth required. Rate-limited to 3 req / hour / IP via landing_audit_rate_limits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

const SYSTEM_PROMPT = `You are MarQ, the IntoIQ Strategist. A visitor has handed you a single sentence describing their book, business, or offer. Perform a Signal Audit: identify the highest-resonance market signal, name the competitive void, and draft a Day 1 social hook.

Your tone is elite, clinical, decisive. No fluff. No hedging. No emojis. No "here is what I found."

Output ONLY these section markers on their own lines, in this exact order:

###STAGE:signal###
The Identified Signal — give it a memorable, ownable name (e.g., "The Executive Resilience Framework"). One bold phrase, max 8 words.

###STAGE:positioning###
One line explaining what this signal means and why the market is hungry for it (max 26 words).

###STAGE:void###
The Missing Link — name what every competitor is doing AND the unique edge this visitor owns. Format: "Most competitors focus on X; your edge is Y." (max 22 words)

###STAGE:hook###
The Day 1 LinkedIn hook — a scroll-stopping opening line for their first social post. Sharp, contrarian, specific (max 18 words).

###STAGE:funnel###
A 3-step funnel sketch in this exact format: "Step 1: [hook page] → Step 2: [lead magnet] → Step 3: [conversion]" (max 28 words total).

###STAGE:next###
One line teasing what unlocks once they claim the full map — name 2-3 specific assets (e.g., 7-day social arc, landing page draft, email sequence). Max 24 words.

Output ONLY the marked sections in order. No preamble, no closing remarks.`;

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip + "intoiq-audit-salt");
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();

    if (!input || typeof input !== "string" || input.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Please share a longer description (min 5 chars)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (input.length > 600) {
      return new Response(
        JSON.stringify({ error: "Input too long (max 600 chars)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ────────── IP rate limit (3/hr) ──────────
    const ip = getClientIp(req);
    const ipHash = await hashIp(ip);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

    const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error: countErr } = await supabase
      .from("landing_audit_rate_limits")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if (countErr) {
      console.error("Rate-limit count error:", countErr);
    } else if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return new Response(
        JSON.stringify({
          error: "You've used your 3 free audits this hour. Sign up for unlimited access.",
          rateLimited: true,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Record this attempt (fire-and-forget; failures should not block the audit)
    supabase
      .from("landing_audit_rate_limits")
      .insert({ ip_hash: ipHash })
      .then(({ error }) => {
        if (error) console.error("Rate-limit insert error:", error);
      });

    // ────────── AI gateway ──────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: input.trim() },
          ],
          stream: true,
        }),
      },
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "MarQ is at capacity. Try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Audit failed. Try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (err) {
    console.error("ai-signal-audit error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
