// Single-block regeneration endpoint for the Page Builder.
// Returns ONLY new content for the requested block, preserving its field schema.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TONE_HINTS: Record<string, string> = {
  punchier: "Make it punchier, shorter, more direct. Cut filler.",
  professional: "Make it more professional, confident, and credible.",
  emotional: "Make it more emotional, personal, and resonant.",
  bolder: "Make it bolder and more provocative without being clickbait.",
  clearer: "Make it clearer and more concrete. Remove abstraction.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json();
    const blockType: string = body.blockType;
    const currentContent: Record<string, string> = body.currentContent || {};
    const tone: string = body.tone || "punchier";
    const projectMission: string = body.projectMission || "";
    const projectName: string = body.projectName || "";
    const lockedAngle = body.lockedAngle as
      | { intentMode?: string; angle?: { name?: string; wedge?: string; hook?: string; audience_cut?: string } }
      | null
      | undefined;

    if (!blockType || typeof currentContent !== "object") {
      return new Response(JSON.stringify({ error: "blockType and currentContent required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fieldKeys = Object.keys(currentContent);
    const toneInstruction = TONE_HINTS[tone] || TONE_HINTS.punchier;

    const lockedDirective = lockedAngle?.angle
      ? `\n\n🔒 LOCKED ANGLE (HIGHEST PRIORITY — DO NOT DRIFT):
- Intent: ${lockedAngle.intentMode}
- Angle: ${lockedAngle.angle.name}
- Wedge: ${lockedAngle.angle.wedge}
- Audience: ${lockedAngle.angle.audience_cut}
- Locked Hook: ${lockedAngle.angle.hook}
This regenerated block MUST stay committed to this exact angle. Do not propose alternative positioning.`
      : "";

    const systemPrompt = `You are an expert UI copywriter for high-converting landing pages.
You regenerate ONLY the content for the "${blockType}" block of a landing page.

CONSTRAINTS:
1. Maintain context from the project mission.
2. Return EXACTLY the same JSON keys as provided. Do not add, remove, or rename fields.
3. Provide a version that differs meaningfully from the previous one. ${toneInstruction}
4. No conversational filler. Return ONLY a JSON object that matches the schema.
5. Preserve any URL/href values (keys ending in "url", "href", "link") unchanged unless they are placeholders like "#".${lockedDirective}`;

    const userPrompt = `Project: ${projectName || "(untitled)"}
Mission: ${projectMission || "(not specified — infer reasonable positioning)"}

Block type: ${blockType}
Required fields (return all of these keys, no others): ${JSON.stringify(fieldKeys)}

Previous content (do not repeat):
${JSON.stringify(currentContent, null, 2)}

Return only valid JSON.`;

    const properties: Record<string, { type: string; description: string }> = {};
    for (const k of fieldKeys) {
      properties[k] = { type: "string", description: `New value for "${k}".` };
    }

    const aiBody = {
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_block_content",
            description: "Return the regenerated block content as a flat object of strings.",
            parameters: {
              type: "object",
              properties,
              required: fieldKeys,
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_block_content" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(aiBody),
    });

    if (!resp.ok) {
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in workspace settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await resp.text();
      console.error("AI gateway error:", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let newContent: Record<string, string> = {};
    if (toolCall?.function?.arguments) {
      try {
        newContent = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Failed to parse tool args:", e);
      }
    }

    // Sanitize: keep only original keys, coerce to strings, preserve URL fields if AI changed real URLs
    const sanitized: Record<string, string> = {};
    for (const k of fieldKeys) {
      const incoming = newContent[k];
      sanitized[k] = typeof incoming === "string" && incoming.length > 0 ? incoming : currentContent[k];
      // Preserve real URLs untouched
      const isUrlKey = /url|href|link/i.test(k);
      const prev = currentContent[k] || "";
      if (isUrlKey && prev && prev !== "#" && /^https?:\/\//i.test(prev)) {
        sanitized[k] = prev;
      }
    }

    return new Response(JSON.stringify({ content: sanitized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("quinn-block-regen error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
