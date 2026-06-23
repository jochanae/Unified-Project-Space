// generate-work-image
// On-demand AI image generation for STRATEGIC / WORK visuals only:
// diagrams, flowcharts, mockups, charts, mood boards, sketches, reference images.
// NOT for selfies, companion likeness, or character portraits — that's companion-image.
//
// Pipeline:
//   prompt -> Lovable AI Gateway (Nano Banana 2: gemini-3.1-flash-image-preview)
//   -> upload base64 to "work-artifacts" storage bucket (private, user-scoped)
//   -> insert chat_artifacts row with kind='work_image' and signed/public URL
//   -> return { imageUrl, artifactId } to the client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

type WorkVisualKind =
  | "diagram"
  | "flowchart"
  | "mockup"
  | "wireframe"
  | "chart"
  | "moodboard"
  | "sketch"
  | "reference"
  | "other";

type SketchStylePreset = 'concept' | 'wireframe' | 'moodboard' | 'photoreal';

interface Body {
  prompt: string;
  visualKind?: WorkVisualKind;
  title?: string;
  memberId?: string;
  messageId?: string;
  projectId?: string | null;
  /** When set, the model edits/refines this image instead of generating from scratch */
  referenceImageUrl?: string;
  /** When refining, link the new artifact back to the parent */
  parentArtifactId?: string;
  /** Optional recent conversation snippet (last 3-6 lines) used to bias the prompt */
  conversationContext?: string;
  /** User-selected style preset; overrides visualKind inference */
  stylePreset?: SketchStylePreset;
}

const PRESET_TO_KIND: Record<SketchStylePreset, WorkVisualKind> = {
  concept: 'sketch',
  wireframe: 'wireframe',
  moodboard: 'moodboard',
  photoreal: 'reference',
};

const PRESET_STYLE_HINT: Record<SketchStylePreset, string> = {
  concept: 'Loose hand-drawn whiteboard sketch, dark marker on light background, casual but legible.',
  wireframe: 'Clean low-fidelity UI wireframe, light background, generous whitespace, grayscale blocks, simple geometry.',
  moodboard: 'Editorial mood board collage, balanced composition, cohesive palette, magazine-quality layout.',
  photoreal: 'Photorealistic product render, studio lighting, crisp materials, clean dark background, high detail.',
};

function styleHintFor(kind: WorkVisualKind): string {
  switch (kind) {
    case "diagram":
    case "flowchart":
      return "Clean, professional vector-style diagram on a soft white background. Crisp readable labels in modern sans-serif. Minimal color palette (2-3 colors max). Clear arrows and shapes. No photorealism.";
    case "mockup":
    case "wireframe":
      return "Modern UI mockup, clean app interface, light background, generous whitespace, realistic typography, looks like a polished product screenshot. No human faces.";
    case "chart":
      return "Crisp data visualization, clean axes, readable labels, professional editorial style, minimal palette. No 3D effects, no clutter.";
    case "moodboard":
      return "Editorial mood board collage, balanced composition, cohesive color palette, magazine-quality layout.";
    case "sketch":
      return "Loose hand-drawn whiteboard sketch, dark marker on light background, casual but legible, like a planning session photo.";
    case "reference":
      return "High-quality reference image, clean composition, well-lit, suitable as a visual brief.";
    default:
      return "Clean professional illustration suitable for strategic / work context. No human faces unless explicitly required.";
  }
}

function inferVisualKind(prompt: string, explicit?: WorkVisualKind): WorkVisualKind {
  if (explicit) return explicit;
  const p = prompt.toLowerCase();
  if (/\b(flow|workflow|pipeline|funnel|sequence)\b/.test(p)) return "flowchart";
  if (/\b(diagram|architecture|system map|nodes?|arrows?)\b/.test(p)) return "diagram";
  if (/\b(wireframe|app screen|ui|interface|mockup|dashboard|landing page)\b/.test(p)) return /wireframe/.test(p) ? "wireframe" : "mockup";
  if (/\b(chart|graph|trend|axis|data visualization)\b/.test(p)) return "chart";
  if (/\b(moodboard|mood board|palette|aesthetic|inspiration)\b/.test(p)) return "moodboard";
  if (/\b(product render|photorealistic|industrial design|device|chassis|studio lighting|reference)\b/.test(p)) return "reference";
  return "sketch";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Auth: require a valid bearer
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = (await req.json()) as Body;
    const prompt = (body.prompt || "").trim();
    if (!prompt || prompt.length < 4) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stylePreset: SketchStylePreset | undefined =
      body.stylePreset && PRESET_TO_KIND[body.stylePreset] ? body.stylePreset : undefined;
    const visualKind: WorkVisualKind = stylePreset
      ? PRESET_TO_KIND[stylePreset]
      : inferVisualKind(prompt, body.visualKind);
    const title = (body.title || prompt.slice(0, 60)).trim();
    const styleHint = stylePreset ? PRESET_STYLE_HINT[stylePreset] : styleHintFor(visualKind);
    const isRefine = !!body.referenceImageUrl;

    const contextBlock = body.conversationContext?.trim()
      ? `\n\nCONVERSATION CONTEXT (use this to shape the aesthetic — do not render the text itself):\n${body.conversationContext.trim().slice(0, 1200)}`
      : "";

    const intent = isRefine
      ? `Refine the attached image with this change: ${prompt}. Preserve the elements not mentioned. Keep composition, framing, and overall identity unless the change requires otherwise.`
      : prompt;

    const fullPrompt = `${intent}${contextBlock}\n\nVISUAL STYLE: ${styleHint}\n\nIMPORTANT: This is a WORK / STRATEGIC visual — never generate selfies, portraits, or character likenesses. Focus on clarity, legibility, and professional polish.`;

    // Build messages — when refining, include the reference image as a multimodal part
    const userContent: unknown = isRefine
      ? [
          { type: "text", text: fullPrompt },
          { type: "image_url", image_url: { url: body.referenceImageUrl } },
        ]
      : fullPrompt;

    // Call Lovable AI Gateway — Nano Banana 2 (gemini-3.1-flash-image-preview)
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const text = await aiResp.text();
      console.error("[generate-work-image] AI gateway error:", aiResp.status, text);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResp.json();
    const dataUrl: string | undefined =
      aiData?.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!dataUrl || !dataUrl.startsWith("data:")) {
      console.error("[generate-work-image] No image in response", aiData);
      return new Response(JSON.stringify({ error: "Model returned no image" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decode base64 -> bytes
    const commaIdx = dataUrl.indexOf(",");
    const meta = dataUrl.slice(5, commaIdx); // e.g. "image/png;base64"
    const base64 = dataUrl.slice(commaIdx + 1);
    const mime = meta.split(";")[0] || "image/png";
    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";

    const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    // Upload to work-artifacts bucket: {userId}/{timestamp}-{rand}.{ext}
    const filename = `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from("work-artifacts")
      .upload(filename, binary, { contentType: mime, upsert: false });

    if (uploadErr) {
      console.error("[generate-work-image] Upload failed:", uploadErr);
      return new Response(JSON.stringify({ error: "Storage upload failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bucket is private — generate a long-lived signed URL (1 year)
    const { data: signed, error: signErr } = await supabase.storage
      .from("work-artifacts")
      .createSignedUrl(filename, 60 * 60 * 24 * 365);

    if (signErr || !signed?.signedUrl) {
      console.error("[generate-work-image] Sign failed:", signErr);
      return new Response(JSON.stringify({ error: "Could not sign URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageUrl = signed.signedUrl;

    // Insert chat_artifacts row
    const { data: artifactRow, error: insertErr } = await supabase
      .from("chat_artifacts")
      .insert({
        user_id: userId,
        member_id: body.memberId || "workbench",
        message_id: body.messageId || null,
        kind: "work_image",
        title,
        language: null,
        content: imageUrl,
        project_id: body.projectId || null,
        metadata: {
          visualKind,
          stylePreset: stylePreset || null,
          prompt,
          parentArtifactId: body.parentArtifactId || null,
          storagePath: filename,
          model: "google/gemini-3.1-flash-image-preview",
          mime,
        },
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[generate-work-image] Artifact insert failed:", insertErr);
      // Image is still in storage — return URL anyway so user sees it
      return new Response(JSON.stringify({ imageUrl, artifactId: null, warning: "Image generated but not saved to Workbench" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        imageUrl,
        artifactId: artifactRow?.id ?? null,
        title,
        visualKind,
        stylePreset: stylePreset || undefined,
        parentArtifactId: body.parentArtifactId || undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[generate-work-image] error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
