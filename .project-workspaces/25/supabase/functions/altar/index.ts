/**
 * Altar — Edge Function
 * Zero-trace processing for heavy thoughts in the Sanctuary.
 *
 * Takes a burden the user wants to lay down and returns:
 *   - truth:    a short scriptural / contemplative reframe (one sentence)
 *   - movement: a small, concrete movement (breath, line, micro-prayer)
 *
 * Nothing is stored server-side. The client decides whether to keep
 * the result in the Vault or release it.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Altar within SanctumIQ — a quiet, reverent presence where someone lays down a heavy thought.

You receive a burden, worry, fear, regret, or anxious thought. You respond with exactly two short pieces:

1. "truth" — one sentence (max 25 words) that gently reframes the burden through a scriptural or contemplative lens. Warm, not corrective. Never quote chapter:verse explicitly unless asked. Speak as a friend who has sat with the Word.

2. "movement" — one short, concrete invitation (max 18 words) — a breath, a phrase to whisper, or a tiny act. Specific, embodied, simple.

Rules:
- Never minimize the feeling.
- Never preach or moralize.
- No bullet points, no headers in the values.
- Never begin "truth" with "Remember" or "You should."
- Output ONLY a JSON object: {"truth": "...", "movement": "..."}
- No prose before or after the JSON.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const _gate = await checkAiAccess(req, "altar");
    if (!_gate.ok) return _gate.response;

    const { burden } = await req.json();
    const text = typeof burden === "string" ? burden.trim() : "";

    if (text.length < 3) {
      return new Response(JSON.stringify({ error: "Lay something down first." }), {
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
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: text }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return new Response(JSON.stringify({ error: "The Altar is quiet right now. Try again." }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text?.trim() ?? "";

    let truth = "";
    let movement = "";
    try {
      // Try to extract JSON even if model added stray prose
      const match = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : raw);
      truth = String(parsed.truth ?? "").trim();
      movement = String(parsed.movement ?? "").trim();
    } catch {
      truth = raw;
      movement = "Take one slow breath. Then return.";
    }

    if (!truth) {
      truth = "Held. You don't have to carry it alone.";
      movement = "Breathe in for four. Out for six. Once.";
    }

    return new Response(JSON.stringify({ truth, movement }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Altar error:", err);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
