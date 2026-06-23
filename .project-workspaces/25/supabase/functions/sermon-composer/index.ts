/**
 * Sermon Composer — Edge Function
 *
 * Generates structured sermon outlines and full manuscripts from a minister's
 * theme + scripture. Powered by Anthropic Claude (consistent voice with Selah).
 *
 * Actions:
 *   outline    — return a JSON outline (intro, points, illustrations, application, close)
 *   manuscript — return the full preached manuscript (markdown)
 *   revise     — revise existing manuscript with the user's instruction
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { checkAiAccess } from "../_shared/ai-access.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRADITION_GUIDANCE: Record<string, string> = {
  Baptist:
    "Structure as a three-point expository sermon grounded in the text. Formal cadence, strong textual authority, clear invitation at the close. Each point flows from the scripture, not imposed on it.",
  Pentecostal:
    "Allow for Spirit-led flow and spontaneity in feel. Build energy progressively. Emphasize the Holy Spirit's movement, personal testimony moments, and a crescendo close. Language is vibrant, expectant, bold.",
  Reformed:
    "Theologically dense and doctrinally grounded. Long-form argument built from the text outward. Calvinist-influenced framing — God's sovereignty, grace, covenant. Scholarly but pastoral.",
  "Non-denominational":
    "Conversational and application-heavy. Story-led, relatable language, contemporary illustrations. Avoid churchy jargon. Feels like a TED talk shaped by scripture.",
  Anglican:
    "Liturgical and measured. Steeped in classical language. Thoughtful, unhurried. Points build with reverence. Close with a blessing, not a call to action.",
  AME: "Narrative arc with rhythmic cadence. Builds from quiet reflection to passionate declaration. Rooted in the Black church tradition — prophetic, communal, triumphant. The close carries the whooping cadence if the manuscript calls for it.",
  Evangelical:
    "Accessible, passionate, scripture-saturated. Personal testimony woven in. Clear gospel invitation at the close. Warm and urgent.",
  Lutheran:
    "Law and Gospel structure — sin and grace in tension. Text-driven. The sermon always moves toward grace. Sacramental undertones.",
  Methodist:
    "Practical holiness and social justice sensibility. Grace-forward, Wesleyan warmth. Application leans toward transformation in daily life.",
  Catholic:
    "Homiletic in form — brief, focused on the lectionary text, tied to the liturgical season. Pastoral and catechetical tone.",
};

const OUTLINE_SYSTEM = `You are Sermon Composer — a sermon preparation partner for SanctumIQ.
Your role is to draft a faithful, well-structured sermon outline that the minister will read,
shape, and ultimately preach in their own voice. You serve their preparation; you do not replace it.

Produce a structured outline ONLY. Return valid JSON matching the requested schema.
- Stay grounded in the scripture provided. Do not import doctrines outside what the text supports.
- When a tradition is specified, honor its structural conventions, rhetorical patterns, and theological emphases. This is the single most important instruction — the tradition shapes everything: structure, language, cadence, close.
- Each main point should be exegetically defensible from the scripture text.
- Illustrations should be human, concrete, and culturally neutral unless audience or tradition specifies otherwise.
- Application points should move from understanding → conviction → action.`;

const MANUSCRIPT_SYSTEM = `You are Sermon Composer — drafting a full sermon manuscript for a minister to revise.
The minister has approved an outline. Expand it into a preachable manuscript in markdown.

Voice and craft:
- Warm, pastoral, unhurried. Built for the spoken word, not the page.
- Use the requested tone and audience. Honor the requested length.
- When a tradition is specified, it governs everything: the structure of the sermon, the rhetorical style, the cadence of sentences, the language register, and the shape of the close. A Baptist sermon and a Pentecostal sermon on the same text should feel unmistakably different.
- Open with a hook that earns attention without theatrics. Land the close with weight appropriate to the tradition.
- Move from text → meaning → resonance → invitation. Always invitation, never coercion.
- Use markdown headings (##) for the major sections of the outline.
- Quote the scripture text where it appears in the flow. Add 1-2 supporting cross-references only if they truly serve the point.
- This is a draft. The minister will edit. Do not flag it as AI-generated in the text.`;

const REVISE_SYSTEM = `You are Sermon Composer revising an existing sermon manuscript at the minister's direction.
- Apply the requested changes thoroughly while preserving the manuscript's overall structure unless they ask you to restructure.
- Return the COMPLETE revised manuscript in markdown. Do not return only the changed section.
- Do not add commentary about what you changed.`;

const OUTLINE_TOOL = {
  name: "emit_outline",
  description: "Return the structured sermon outline.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Working title for the sermon (max 80 chars)." },
      big_idea: {
        type: "string",
        description: "One-sentence proposition the whole sermon serves.",
      },
      introduction: {
        type: "string",
        description: "2-3 sentence opening that earns attention and sets the text.",
      },
      points: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            heading: { type: "string", description: "Concise main point." },
            scripture_anchor: {
              type: "string",
              description: "Specific verse(s) supporting this point.",
            },
            explanation: {
              type: "string",
              description: "2-3 sentences explaining the point from the text.",
            },
            illustration: { type: "string", description: "One illustration, story, or analogy." },
            application: {
              type: "string",
              description: "How the listener carries this into the week.",
            },
          },
          required: ["heading", "scripture_anchor", "explanation", "illustration", "application"],
        },
      },
      conclusion: {
        type: "string",
        description: "2-3 sentence close with invitation or call to response.",
      },
      benediction: { type: "string", description: "One-sentence sending blessing." },
    },
    required: ["title", "big_idea", "introduction", "points", "conclusion", "benediction"],
  },
};

const LENGTH_GUIDANCE: Record<string, string> = {
  short: "Aim for ~1,200 words (8-10 minute sermon).",
  standard: "Aim for ~2,200 words (15-18 minute sermon).",
  long: "Aim for ~3,500 words (25-30 minute sermon).",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });

  try {
    const _gate = await checkAiAccess(req, "sermon-composer");
    if (!_gate.ok) return _gate.response;

    const body = await req.json();
    const action: "outline" | "manuscript" | "revise" = body.action ?? "outline";

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return json({ error: "AI provider not configured" }, 500);
    }

    if (action === "outline") {
      return await composeOutline(body, apiKey);
    }
    if (action === "manuscript") {
      return await composeManuscript(body, apiKey);
    }
    if (action === "revise") {
      return await reviseManuscript(body, apiKey);
    }
    return json({ error: "Unknown action" }, 400);
  } catch (err) {
    console.error("Sermon Composer error:", err);
    return json({ error: "Sermon Composer is unavailable right now. Please try again." }, 500);
  }
});

async function composeOutline(body: Record<string, string>, apiKey: string) {
  const { theme, scripture_ref, scripture_text, audience, tone, length_target, tradition } = body;
  if (!theme && !scripture_ref)
    return json({ error: "Provide a theme or scripture reference." }, 400);

  const traditionNote =
    tradition && TRADITION_GUIDANCE[tradition]
      ? `Tradition: ${tradition} — ${TRADITION_GUIDANCE[tradition]}`
      : tradition
        ? `Tradition: ${tradition}`
        : null;

  const userMessage = [
    scripture_ref ? `Scripture: ${scripture_ref}` : null,
    scripture_text ? `Text: "${scripture_text}"` : null,
    theme ? `Theme: ${theme}` : null,
    audience ? `Audience: ${audience}` : null,
    tone ? `Tone: ${tone}` : null,
    length_target ? `Length: ${LENGTH_GUIDANCE[length_target] ?? length_target}` : null,
    traditionNote,
  ]
    .filter(Boolean)
    .join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: OUTLINE_SYSTEM,
      tools: [OUTLINE_TOOL],
      tool_choice: { type: "tool", name: "emit_outline" },
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Anthropic outline error:", resp.status, errText);
    return json({ error: "Outline generation failed" }, 502);
  }

  const data = await resp.json();
  const toolUse = data.content?.find((c: { type: string }) => c.type === "tool_use");
  if (!toolUse?.input) return json({ error: "Outline could not be parsed" }, 502);
  return json({ outline: toolUse.input });
}

async function composeManuscript(body: Record<string, unknown>, apiKey: string) {
  const { outline, scripture_ref, scripture_text, audience, tone, length_target, tradition } =
    body as Record<string, unknown>;
  const traditionStr = String(tradition ?? "");
  const traditionNote =
    traditionStr && TRADITION_GUIDANCE[traditionStr]
      ? `Tradition: ${traditionStr} — ${TRADITION_GUIDANCE[traditionStr]}`
      : traditionStr
        ? `Tradition: ${traditionStr}`
        : null;
  if (!outline) return json({ error: "Outline required to draft manuscript." }, 400);

  const userMessage = [
    scripture_ref ? `Scripture: ${scripture_ref}` : null,
    scripture_text ? `Text: "${scripture_text}"` : null,
    audience ? `Audience: ${audience}` : null,
    tone ? `Tone: ${tone}` : null,
    `Length: ${LENGTH_GUIDANCE[String(length_target ?? "standard")] ?? "Aim for ~2,200 words."}`,
    traditionNote,
    "",
    "Approved outline (JSON):",
    JSON.stringify(outline, null, 2),
    "",
    "Now draft the full sermon manuscript in markdown.",
  ]
    .filter(Boolean)
    .join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      system: MANUSCRIPT_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Anthropic manuscript error:", resp.status, errText);
    return json({ error: "Manuscript generation failed" }, 502);
  }

  const data = await resp.json();
  const manuscript = data.content?.[0]?.text?.trim() ?? "";
  if (!manuscript) return json({ error: "Empty manuscript returned" }, 502);
  return json({ manuscript });
}

async function reviseManuscript(body: Record<string, unknown>, apiKey: string) {
  const { manuscript, instruction } = body;
  if (!manuscript || !instruction) {
    return json({ error: "Manuscript and instruction required." }, 400);
  }

  const userMessage = [
    "Current manuscript (markdown):",
    String(manuscript),
    "",
    "Revision instruction from the minister:",
    String(instruction),
    "",
    "Return the complete revised manuscript in markdown.",
  ].join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8000,
      system: REVISE_SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("Anthropic revise error:", resp.status, errText);
    return json({ error: "Revision failed" }, 502);
  }

  const data = await resp.json();
  const revised = data.content?.[0]?.text?.trim() ?? "";
  if (!revised) return json({ error: "Empty revision returned" }, 502);
  return json({ manuscript: revised });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
