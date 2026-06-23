/**
 * Plan Generator — Ministry Series Planner
 *
 * Takes a minister's free-form thought and generates a structured
 * ministry series plan: weeks, themes, scriptures, service elements.
 *
 * Uses ANTHROPIC_API_KEY (same as Selah and Sermon Composer).
 * Replaced LOVABLE_API_KEY which was never set in Supabase secrets.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a ministry planning assistant for SanctumIQ.

A minister has shared a thought — a series idea, a program concept, an outreach vision, or a seasonal theme. Your job is to shape it into a structured, usable ministry plan.

Return a JSON object ONLY. No markdown, no explanation, no preamble. Match this exact structure:

{
  "plan_title": "string — concise title for the series or plan",
  "summary": "string — 2-3 sentences describing the vision and purpose",
  "weeks": [
    {
      "week": 1,
      "title": "string — title for this week or session",
      "theme": "string — the central theme or focus",
      "scripture": "string — primary scripture reference (e.g. John 3:16-17)",
      "key_idea": "string — one sentence capturing what the congregation should leave with",
      "service_elements": ["string", "string"] // 2-4 suggested elements: worship, prayer, communion, altar call, etc.
    }
  ],
  "notes": "string — any pastoral notes, preparation suggestions, or seasonal considerations"
}

Rules:
- Generate 3 to 8 weeks depending on the scope of the thought.
- Keep scripture references specific and accurate.
- Service elements should be practical and denomination-neutral unless the minister signals a tradition.
- The plan is a starting point the minister will shape — give them structure, not a script.
- Return ONLY the JSON. Nothing else.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const _gate = await checkAiAccess(req, "plan-generator");
    if (!_gate.ok) return _gate.response;

    const { thought, timezone, today } = await req.json();

    if (!thought || typeof thought !== "string" || thought.trim().length < 4) {
      return new Response(
        JSON.stringify({ error: "Add a little more detail to your thought first." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const userPrompt = [
      `Minister's thought: ${thought.trim()}`,
      timezone ? `Timezone: ${timezone}` : null,
      today ? `Today's date: ${today}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const detail = await response.text();
      console.error("plan-generator Anthropic error", status, detail);
      const message =
        status === 429
          ? "Rate limit reached. Please try again in a moment."
          : `Generation error (${status})`;
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim() ?? "";

    if (!text) {
      return new Response(JSON.stringify({ error: "No plan was returned. Try again." }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Strip markdown code fences if present
    const clean = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      console.error("plan-generator JSON parse error:", clean.slice(0, 300));
      return new Response(
        JSON.stringify({ error: "Could not parse the generated plan. Try again." }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    if (!parsed.weeks?.length) {
      return new Response(
        JSON.stringify({ error: "Plan returned no weeks. Try again with more detail." }),
        { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("plan-generator error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
