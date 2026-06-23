/**
 * Sermon Deep Dive — Edge Function
 *
 * Takes the sermon's pinned scriptures + scratchpad notes and returns
 * suggested cross-references, historical/cultural context, and angles
 * the minister may not have considered. Powered by Lovable AI Gateway.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Deep Dive — a research companion for ministers preparing sermons within SanctumIQ.

Given a set of pinned scripture references and the minister's scratchpad notes, produce a focused, useful research brief.

Return your response in markdown with these sections, in order, omitting any section that has nothing substantive to add:

## Cross-References
3–6 closely related passages from elsewhere in scripture, each with a one-line note explaining the connection.

## Historical / Cultural Context
2–4 short paragraphs on the setting, audience, idiom, or background that illuminates the pinned passages.

## Angles to Consider
3–5 sermon angles or framings the minister might not have considered yet — practical, pastoral, faithful to the text. Each angle: a heading and 1–2 sentences.

## A Question Worth Sitting With
One single, contemplative question to bring back to prayer before preaching.

Rules:
- Be concrete, not generic. Reference the actual passages by name.
- Stay tightly grounded in the text. No speculation, no doctrines the text does not support.
- Honor what the minister has already noted in the scratchpad — build on it, don't redirect.
- Warm, collegial, unhurried tone. You are a research partner, not a preacher.
- Keep the entire response under ~600 words.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const _gate = await checkAiAccess(req, "sermon-deep-dive");
    if (!_gate.ok) return _gate.response;

    const { pins, scratchpad, sermonTitle, sermonTheme } = await req.json();

    if (!Array.isArray(pins) || pins.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Pin at least one scripture to your sermon before running a Deep Dive.",
        }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway is not configured." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const pinList = pins
      .map(
        (p: { scripture_ref: string; version?: string }) =>
          `- ${p.scripture_ref}${p.version ? ` (${p.version})` : ""}`,
      )
      .join("\n");

    const userMessage = [
      sermonTitle ? `Sermon title: ${sermonTitle}` : null,
      sermonTheme ? `Theme: ${sermonTheme}` : null,
      `Pinned scriptures:\n${pinList}`,
      scratchpad?.trim() ? `Scratchpad notes:\n${scratchpad.trim()}` : "Scratchpad notes: (empty)",
    ]
      .filter(Boolean)
      .join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({
          error: "Deep Dive is busy right now — try again in a moment.",
        }),
        {
          status: 429,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({
          error: "AI usage limit reached for this workspace. Add credits in Settings to continue.",
        }),
        {
          status: 402,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        },
      );
    }

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("Deep Dive AI error:", aiRes.status, text);
      return new Response(JSON.stringify({ error: "Deep Dive could not complete right now." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const content = json?.choices?.[0]?.message?.content?.toString().trim() ?? "";

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Deep Dive error:", err);
    return new Response(JSON.stringify({ error: "Deep Dive failed unexpectedly." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
