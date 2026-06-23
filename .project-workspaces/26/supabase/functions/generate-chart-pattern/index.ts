// Generates educational chart-pattern illustrations via Lovable AI (Gemini image).
// Ported from Old Quinn-standalone, adapted to Quinn's auth + compliance posture.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PATTERN_PROMPTS: Record<string, string> = {
  "head-shoulders":
    "A stock chart showing a head and shoulders pattern with three peaks — the middle peak (head) the highest, two smaller shoulders, and a clear neckline. Clean professional trading chart.",
  "double-top":
    "A stock chart showing a double top pattern: two peaks at roughly the same price level with a support line, indicating bearish reversal. Clean professional trading chart.",
  "double-bottom":
    "A stock chart showing a double bottom pattern: two troughs at roughly the same price level with a resistance line, indicating bullish reversal. Clean professional trading chart.",
  "cup-handle":
    "A stock chart showing a cup and handle pattern — rounded bottom cup followed by a small consolidation handle and breakout point. Clean professional trading chart.",
  "ascending-triangle":
    "A stock chart showing an ascending triangle: flat resistance with rising support trendline, bullish continuation. Clean professional trading chart.",
  "descending-triangle":
    "A stock chart showing a descending triangle: flat support with falling resistance trendline, bearish continuation. Clean professional trading chart.",
  "bull-flag":
    "A stock chart showing a bull flag: sharp upward pole then a downward-sloping consolidation flag. Clean professional trading chart.",
  "bear-flag":
    "A stock chart showing a bear flag: sharp downward pole then an upward-sloping consolidation flag. Clean professional trading chart.",
  "wedge-rising":
    "A stock chart showing a rising wedge with converging upward trendlines, typically bearish reversal. Clean professional trading chart.",
  "wedge-falling":
    "A stock chart showing a falling wedge with converging downward trendlines, typically bullish reversal. Clean professional trading chart.",
  "support-resistance":
    "A stock chart showing clear horizontal support and resistance levels with price bouncing between them. Clean professional trading chart with annotations.",
  "fibonacci":
    "A stock chart with Fibonacci retracement levels (23.6%, 38.2%, 50%, 61.8%) drawn on a trend, showing price reactions at each level. Clean professional trading chart.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const pattern = String(body?.pattern || "").trim().toLowerCase();
    const style = body?.style === "dark" ? "dark" : "clean";

    if (!pattern) return json({ error: "Pattern is required" }, 400);
    if (pattern.length > 60) return json({ error: "Invalid pattern" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "AI gateway not configured" }, 500);
    }

    const base =
      PATTERN_PROMPTS[pattern] ||
      `A clean professional stock chart illustration of the ${pattern} pattern with clear annotations.`;
    const prompt = base + (style === "dark"
      ? " Use a dark background with light-colored lines and text."
      : " Use a white background with dark-colored lines and text.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (res.status === 429) return json({ error: "Rate limited. Try again shortly." }, 429);
    if (res.status === 402) return json({ error: "AI credits exhausted." }, 402);
    if (!res.ok) {
      const err = await res.text();
      console.error("AI image error:", err);
      return json({ error: "Image generation failed" }, 500);
    }

    const data = await res.json();
    const imageUrl = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) return json({ error: "No image returned" }, 500);

    return json({
      success: true,
      pattern,
      imageUrl,
      disclaimer: "Educational illustration only. Not investment advice.",
    });
  } catch (err) {
    console.error("generate-chart-pattern error", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
