/**
 * daily-word-match — Edge Function
 *
 * Takes free-text input from Zone 2 (What's on your heart?)
 * and uses Claude Haiku to classify it against one of 60 feeling categories.
 * Returns the category name so the client can look up the curated verses.
 *
 * Cost: ~150 tokens per call. At Haiku pricing ≈ $0.000015 per lookup.
 * No verse generation — just classification. Zero hallucination risk.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CATEGORIES = [
  "anxiety",
  "fear",
  "grief",
  "peace",
  "strength",
  "hope",
  "forgiveness",
  "faith",
  "loneliness",
  "direction",
  "joy",
  "healing",
  "marriage",
  "children",
  "finances",
  "anger",
  "patience",
  "temptation",
  "leadership",
  "wisdom",
  "protection",
  "prayer",
  "work",
  "new beginning",
  "praise",
  "shame",
  "identity",
  "courage",
  "depression",
  "trust",
  "obedience",
  "salvation",
  "breakthrough",
  "love",
  "unity",
  "generosity",
  "humility",
  "restoration",
  "death",
  "scripture",
  "holy spirit",
  "miracles",
  "morning",
  "night",
  "friendship",
  "spiritual warfare",
  "abundance",
  "season",
  "future",
  "persecution",
  "focus",
  "contentment",
  "repentance",
  "education",
  "nation",
  "aging",
  "disappointment",
  "longing",
  "comparison",
  "grief over a dream",
  "temptation",
];

const SYSTEM_PROMPT = `You are a classification assistant for a Bible app. Your only job is to match what someone shares to the single most relevant category from this list:

${CATEGORIES.join(", ")}

Rules:
- Return ONLY the category name, exactly as written above. Nothing else.
- No punctuation, no explanation, no quotes.
- If multiple categories could apply, return the single most relevant one.
- If nothing fits well, return the closest match. Never return empty.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const _gate = await checkAiAccess(req, "daily-word-match");
    if (!_gate.ok) return _gate.response;

    const { input } = await req.json();

    if (!input?.trim()) {
      return new Response(JSON.stringify({ error: "No input provided" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: input.trim() }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return new Response(JSON.stringify({ error: "Classification unavailable" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const category = data.content?.[0]?.text?.trim().toLowerCase() ?? "";

    return new Response(JSON.stringify({ category }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("daily-word-match error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
