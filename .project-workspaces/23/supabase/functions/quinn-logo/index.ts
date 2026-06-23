import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    const { messages, canvasState, projectContext } = await req.json();
    if (!messages) throw new Error("messages required");

    // Build canvas context description for MarQ
    let canvasContext = "";
    if (canvasState) {
      const { elements, canvasSize, backgroundColor } = canvasState;
      canvasContext = `\n\n## Current Logo Canvas State
Canvas: ${canvasSize?.width || 512}×${canvasSize?.height || 512}px, background: ${backgroundColor || "#0a0a1a"}
Elements on canvas (${elements?.length || 0}):`;
      if (elements?.length) {
        for (const el of elements) {
          if (el.type === "text") {
            canvasContext += `\n- [id: "${el.id}"] TEXT "${el.text}" at (${Math.round(el.x)}, ${Math.round(el.y)}), font: ${el.fontFamily} ${el.fontStyle || "normal"} ${el.fontSize}px`;
            if (el.fillLinearGradient) {
              canvasContext += `, gradient: ${el.fillLinearGradient.colors.join(" → ")} (${el.fillLinearGradient.direction})`;
            } else if (el.fill) {
              canvasContext += `, color: ${el.fill}`;
            }
            if (el.letterSpacing) canvasContext += `, spacing: ${el.letterSpacing}px`;
            if (el.baselineGroup) canvasContext += `, baseline: "${el.baselineGroup}"`;
          } else if (el.type === "image") {
            canvasContext += `\n- [id: "${el.id}"] IMAGE at (${Math.round(el.x)}, ${Math.round(el.y)}), ${Math.round(el.width || 0)}×${Math.round(el.height || 0)}px`;
            if (el.baselineGroup) canvasContext += `, baseline: "${el.baselineGroup}"`;
          }
        }
      }
    }

    // Build project context section
    let projectSection = "";
    if (projectContext) {
      projectSection = `\n\n## Active Project Context`;
      if (projectContext.name) projectSection += `\nProject: "${projectContext.name}"`;
      if (projectContext.goal) projectSection += `\nGoal: ${projectContext.goal}`;
      if (projectContext.directives?.length) {
        projectSection += `\nBrand & Identity Directives:`;
        for (const d of projectContext.directives) {
          projectSection += `\n- [${d.context_type}] ${d.directive}`;
        }
      }
      projectSection += `\n\nUse this context to inform your design suggestions — match the brand's tone, audience, and positioning. Suggest fonts, colors, and layouts that align with the project's identity.`;
    }

    const systemPrompt = `You are MarQ — Logo Design Associate inside IntoIQ.

## Your role
You help design and refine logos on a Konva canvas. You can both suggest creative ideas AND directly manipulate canvas elements by emitting structured commands.

## How to control the canvas
When the user asks you to change something on the canvas, include a JSON command block in your response wrapped in \`\`\`canvas-commands\`\`\` fences. The block must be a JSON array of command objects.

### Available commands:

**update_element** — Modify an existing element by id:
\`\`\`json
{ "action": "update_element", "id": "<element-id>", "attrs": { "x": 100, "fontSize": 48, "fill": "#ff0000" } }
\`\`\`
Supported attrs for text: x, y, text, fontSize, fontFamily, fontStyle, fill, letterSpacing, rotation, baselineGroup, fillLinearGradient (object with "colors": [c1,c2] and "direction": "vertical"|"horizontal")
Supported attrs for image: x, y, width, height, rotation, baselineGroup

**add_text** — Add a new text element:
\`\`\`json
{ "action": "add_text", "attrs": { "text": "Hello", "x": 100, "y": 200, "fontSize": 40, "fontFamily": "Inter", "fill": "#ffffff" } }
\`\`\`

**delete_element** — Remove an element by id:
\`\`\`json
{ "action": "delete_element", "id": "<element-id>" }
\`\`\`

**set_background** — Change the canvas background color:
\`\`\`json
{ "action": "set_background", "color": "#1a1a2e" }
\`\`\`

**set_canvas_size** — Resize the canvas:
\`\`\`json
{ "action": "set_canvas_size", "width": 1024, "height": 512 }
\`\`\`

**generate_image** — Generate an AI image and add it to the canvas. Use this when the user asks for an icon, graphic, symbol, or generated visual:
\`\`\`json
{ "action": "generate_image", "prompt": "a minimalist lightning bolt icon in teal and gold, on a clean white background, isolated graphic with no background elements", "width": 150, "height": 150, "attrs": { "x": 200, "y": 100 } }
\`\`\`
The prompt should describe a clean, logo-suitable graphic. **CRITICAL**: Always include "on a clean white background" or "isolated on white" in the prompt so the output has a removable/transparent background. Always specify reasonable width/height and position.

**edit_image** — Edit/modify an existing image element on the canvas. Use this when the user wants to change, fix, or transform an existing image:
\`\`\`json
{ "action": "edit_image", "id": "<element-id>", "prompt": "make the icon more geometric and add a subtle glow effect" }
\`\`\`
The id must reference an existing image element. The prompt describes what to change. The edited image replaces the original at the same position and size.

## Rules
1. Always explain what you're doing conversationally BEFORE the command block.
2. When the user says "make it bigger/smaller" for text, adjust fontSize. For images, adjust width/height proportionally.
3. When adjusting colors, suggest complementary palettes and explain why.
4. Keep baseline groups consistent — if elements share a group, maintain alignment.
5. Be creative but precise with pixel values.
6. If the user's request is purely conversational (asking for advice, brainstorming), just respond normally without commands.
7. You can combine multiple commands in one block for complex changes.
8. **CRITICAL — Per-segment styling**: When the user wants different styling on different parts of a word (e.g. "make IQ gold" in "INTOIQ"), you MUST:
   a. Delete the original single text element.
   b. Add separate text elements for each segment (e.g. "INTO" and "IQ") with the same fontSize, fontFamily, fontStyle, and y position.
   c. Position the x coordinates so the segments appear seamlessly next to each other (estimate character width as ~0.6 × fontSize for most fonts).
   d. Put them in the same baselineGroup so they stay aligned.
   e. Apply the different styling (color, gradient, etc.) to the relevant segment only.
   This gives the user pixel-perfect control over individual letter groups.

## Your personality
- Sharp, creative, and precise. You treat logo design as a craft.
- Concise. Use markdown for structure. Bold the key insight.
- When suggesting, give 2-3 options with reasoning.
- When the user attaches an image in their message (via paste, drag-drop, or file picker), you can:
  a. Analyze it and suggest improvements
  b. Add it directly to the canvas using add_image with the image URL from the message: { "action": "add_image", "attrs": { "imageUrl": "<the-image-url-from-message>", "x": 156, "y": 156 }, "width": 200, "height": 200 }
  c. Use generate_image to create a refined/improved version based on the reference
  d. If the user says "add this to the canvas" or similar, use add_image to place it directly
${canvasContext}${projectSection}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      throw new Error("AI generation failed");
    }

    return new Response(aiResponse.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("quinn-logo error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
