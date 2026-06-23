/**
 * Scriptural Blueprint — Edge Function
 *
 * Generates a structured research blueprint for a given passage:
 *   - Historical context (3 entries)
 *   - Linguistic roots (3 Greek/Hebrew/Aramaic terms)
 *   - Cross-references (4 passages)
 *   - Action steps (4 ministerial/devotional)
 *
 * Returns typed JSON via tool-calling so the client can render the
 * BlueprintData shape directly. Powered by Lovable AI Gateway.
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are the Scriptural Blueprint engine for SanctumIQ — a luxury research tool for ministers, scholars, and devoted students of scripture.

Given a passage reference, version, and full passage text, produce a tight, faithful research blueprint that fits the BlueprintData shape exactly.

Quality bar:
- Concrete, not generic. Every entry must be tied to THIS passage.
- Faithful to the text. No speculation, no doctrines the passage does not support.
- Warm, scholarly, unhurried. You are a research partner, not a preacher.
- Linguistic roots must be real terms from the actual underlying Greek (NT) or Hebrew/Aramaic (OT) of this passage. Transliterate cleanly (e.g. "Agápē", "Hesed").
- Cross-references must be real, specific passages with a one-line note explaining the textual or thematic connection.
- Action steps are short, practical imperatives a minister could carry into the week.

Always call the build_blueprint tool. Never reply in prose.`;

const BLUEPRINT_TOOL = {
  type: "function",
  function: {
    name: "build_blueprint",
    description: "Return a complete Scriptural Blueprint for the given passage.",
    parameters: {
      type: "object",
      properties: {
        historicalContext: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              heading: {
                type: "string",
                description: "Short, vivid heading (3–6 words).",
              },
              body: {
                type: "string",
                description:
                  "1–3 sentence paragraph grounding the passage in its historical/cultural setting.",
              },
            },
            required: ["heading", "body"],
            additionalProperties: false,
          },
        },
        linguisticRoots: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              term: {
                type: "string",
                description: "Transliterated term, e.g. 'Agápē' or 'Hesed'.",
              },
              language: {
                type: "string",
                enum: ["Greek", "Hebrew", "Aramaic"],
              },
              gloss: {
                type: "string",
                description: "One-line definitional gloss.",
              },
              note: {
                type: "string",
                description:
                  "1–2 sentence note on nuance, tense, or theological weight in this passage.",
              },
            },
            required: ["term", "language", "gloss", "note"],
            additionalProperties: false,
          },
        },
        crossReferences: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "object",
            properties: {
              ref: {
                type: "string",
                description: "Scripture reference, e.g. 'Romans 5:8'.",
              },
              note: {
                type: "string",
                description: "One-line connection to the focus passage.",
              },
            },
            required: ["ref", "note"],
            additionalProperties: false,
          },
        },
        actionSteps: {
          type: "array",
          minItems: 4,
          maxItems: 4,
          items: {
            type: "string",
            description: "Short, practical imperative for the minister or reader.",
          },
        },
      },
      required: ["historicalContext", "linguisticRoots", "crossReferences", "actionSteps"],
      additionalProperties: false,
    },
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const _gate = await checkAiAccess(req, "scriptural-blueprint");
    if (!_gate.ok) return _gate.response;

    const { reference, passageText, version, book, chapter } = await req.json();

    if (typeof reference !== "string" || !reference.trim()) {
      return json({ error: "Missing 'reference'." }, 400);
    }
    if (typeof passageText !== "string" || passageText.trim().length < 10) {
      return json({ error: "Missing or too-short 'passageText'." }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "AI gateway is not configured." }, 500);
    }

    const userMessage = [
      `Reference: ${reference}`,
      version ? `Version: ${version}` : null,
      book && chapter ? `Book/Chapter: ${book} ${chapter}` : null,
      `Passage text:\n${passageText.trim()}`,
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
        tools: [BLUEPRINT_TOOL],
        tool_choice: {
          type: "function",
          function: { name: "build_blueprint" },
        },
      }),
    });

    if (aiRes.status === 429) {
      return json(
        {
          error: "Blueprint engine is busy right now — try again in a moment.",
        },
        429,
      );
    }
    if (aiRes.status === 402) {
      return json(
        {
          error: "AI usage limit reached for this workspace. Add credits in Settings to continue.",
        },
        402,
      );
    }
    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("Blueprint AI error:", aiRes.status, text);
      return json({ error: "Blueprint could not be drafted right now." }, 500);
    }

    const data = await aiRes.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      console.error("Blueprint missing tool call", JSON.stringify(data));
      return json({ error: "Blueprint engine returned an empty draft." }, 502);
    }

    let parsed: unknown;
    try {
      parsed = typeof argsRaw === "string" ? JSON.parse(argsRaw) : argsRaw;
    } catch (err) {
      console.error("Blueprint JSON parse failed", err, argsRaw);
      return json({ error: "Blueprint draft was malformed." }, 502);
    }

    const blueprint = {
      reference,
      version: typeof version === "string" && version ? version : "KJV",
      passageText: passageText.trim(),
      ...(parsed as Record<string, unknown>),
    };

    return json({ blueprint }, 200);
  } catch (err) {
    console.error("Blueprint error:", err);
    return json({ error: "Blueprint failed unexpectedly." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
