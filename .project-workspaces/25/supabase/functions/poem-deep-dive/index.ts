/**
 * Poem Deep Dive — Edge Function
 *
 * Takes a saved poem (template + body fields + optional inspiration) and
 * returns a structured analysis: scripture connections, theme / symbolism
 * unpacking, and 1–2 alternate-tone refinements.
 *
 * Powered by Lovable AI Gateway. Uses tool-calling for reliable structured
 * output (per platform guidance — never ask the model to "return JSON").
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are Deep Dive — a contemplative companion for sacred writing within SanctumIQ.

You are given a poem the user has written: a heart cry, a psalm-style praise, or a proverb.

Your task is to honor what is already on the page and gently illuminate it. Stay tightly grounded in the words the user wrote — do not redirect, do not preach, do not invent themes that aren't present.

Tone: warm, unhurried, collegial. You are a research partner sitting beside the writer, not above them.

Return three things via the provided tool:

1. scripture_connections — 3 to 5 short items. Each is a verse reference plus one sentence on why it resonates with this specific poem's themes or imagery.
2. theme_unpacking — 2 to 4 short paragraphs. Identify the imagery, motifs, or theological threads actually present in the poem and unpack them honestly.
3. alternate_versions — 1 to 2 brief refinements. Each has a tone label (e.g. "lament", "praise", "terser", "more lyrical") and a rewritten version of the poem in that tone. Keep each rewrite under 80 words.

Rules:
- Quote or paraphrase the user's actual words when illuminating themes.
- Never speculate about the writer's biography or emotional state beyond what the text shows.
- If the poem is very short or sparse, scripture_connections may have just 3 items and alternate_versions may have just 1.`;

interface PoemPayload {
  template: "heart_cry" | "psalm" | "proverb";
  title?: string;
  body?: string;
  praise?: string;
  anchor?: string;
  line?: string;
  inspiration?: string;
}

function buildUserMessage(poem: PoemPayload): string {
  const parts: string[] = [];
  if (poem.title?.trim()) parts.push(`Title: ${poem.title.trim()}`);
  parts.push(`Template: ${poem.template}`);
  if (poem.template === "heart_cry" && poem.body?.trim()) {
    parts.push(`Heart cry:\n${poem.body.trim()}`);
  } else if (poem.template === "psalm") {
    if (poem.praise?.trim()) parts.push(`Praise:\n${poem.praise.trim()}`);
    if (poem.anchor?.trim()) parts.push(`Anchor verse: ${poem.anchor.trim()}`);
  } else if (poem.template === "proverb" && poem.line?.trim()) {
    parts.push(`Proverb:\n${poem.line.trim()}`);
  }
  if (poem.inspiration?.trim()) parts.push(`Inspiration / seed: ${poem.inspiration.trim()}`);
  return parts.join("\n\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const _gate = await checkAiAccess(req, "poem-deep-dive");
    if (!_gate.ok) return _gate.response;

    const poem = (await req.json()) as PoemPayload;

    const hasContent =
      (poem.template === "heart_cry" && poem.body?.trim()) ||
      (poem.template === "psalm" && (poem.praise?.trim() || poem.anchor?.trim())) ||
      (poem.template === "proverb" && poem.line?.trim());

    if (!hasContent) {
      return new Response(
        JSON.stringify({ error: "Write a few lines before running a Deep Dive." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway is not configured." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

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
          { role: "user", content: buildUserMessage(poem) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "render_poem_deep_dive",
              description: "Return the structured Deep Dive analysis for this poem.",
              parameters: {
                type: "object",
                properties: {
                  scripture_connections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        reference: {
                          type: "string",
                          description: "Bible verse reference, e.g. 'Psalm 42:1'.",
                        },
                        why: {
                          type: "string",
                          description: "One sentence on why it resonates with this poem.",
                        },
                      },
                      required: ["reference", "why"],
                      additionalProperties: false,
                    },
                  },
                  theme_unpacking: {
                    type: "array",
                    items: {
                      type: "string",
                      description:
                        "A short paragraph unpacking imagery / motifs / threads in the poem.",
                    },
                  },
                  alternate_versions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tone: {
                          type: "string",
                          description: "Tone label, e.g. 'lament', 'praise', 'terser'.",
                        },
                        text: { type: "string", description: "Rewritten poem under 80 words." },
                      },
                      required: ["tone", "text"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["scripture_connections", "theme_unpacking", "alternate_versions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "render_poem_deep_dive" } },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(
        JSON.stringify({ error: "Deep Dive is busy right now — try again in a moment." }),
        { status: 429, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    if (aiRes.status === 402) {
      return new Response(
        JSON.stringify({
          error: "AI usage limit reached for this workspace. Add credits in Settings to continue.",
        }),
        { status: 402, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("Poem Deep Dive AI error:", aiRes.status, text);
      return new Response(JSON.stringify({ error: "Deep Dive could not complete right now." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      console.error("Poem Deep Dive: no tool_call returned", JSON.stringify(json).slice(0, 500));
      return new Response(JSON.stringify({ error: "Deep Dive returned an unexpected response." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(argsRaw);
    } catch {
      return new Response(JSON.stringify({ error: "Deep Dive returned malformed output." }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ analysis: parsed }), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Poem Deep Dive error:", err);
    return new Response(JSON.stringify({ error: "Deep Dive failed unexpectedly." }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});
