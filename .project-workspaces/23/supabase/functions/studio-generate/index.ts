// studio-generate — unified Studio Engine backend.
//
// Replaces (Phase 2 cutover):
//   - quinn-generate-image
//   - generate-hero-image
//   - generate-social-image
//   - generate-logo
//
// Single entrypoint driven by `mode`:
//   logo | flyer | social | hero | freeform
//
// Always brand-aware via loadBrandKitContext. Uploads to marketing-assets.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { loadBrandKitContext } from "../_shared/brand-kit-context.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Mode = "logo" | "flyer" | "social" | "hero" | "freeform";
type Platform = "instagram" | "linkedin" | "twitter";

function dims(
  mode: Mode,
  platform?: Platform,
  override?: { width?: number; height?: number },
): { w: number; h: number; descriptor: string } {
  switch (mode) {
    case "logo":
      return { w: 1024, h: 1024, descriptor: "Square logo mark (1024×1024) on a clean background" };
    case "flyer":
      return { w: 1080, h: 1350, descriptor: "Marketing flyer (1080×1350, 4:5 portrait)" };
    case "hero":
      return { w: 1200, h: 630, descriptor: "Web hero / Open Graph image (1200×630, landscape)" };
    case "social":
      if (platform === "linkedin") return { w: 1200, h: 627, descriptor: "LinkedIn feed image (1200×627)" };
      if (platform === "twitter") return { w: 1200, h: 675, descriptor: "X / Twitter post image (1200×675)" };
      return { w: 1080, h: 1080, descriptor: "Instagram square post (1080×1080)" };
    case "freeform":
    default: {
      const w = override?.width ?? 1024;
      const h = override?.height ?? 1024;
      return { w, h, descriptor: `Free-form composition (${w}×${h})` };
    }
  }
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!m) throw new Error("Invalid image data URL from AI");
  const mime = m[1];
  const binary = atob(m[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await authClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const mode: Mode = (body?.mode as Mode) || "freeform";
    const prompt: string = (body?.prompt || "").toString().trim();
    const platform: Platform | undefined = body?.platform;
    const projectId: string | undefined = body?.projectId;
    const templateId: string | undefined = body?.templateId;
    const referenceImage: string | undefined = body?.referenceImage;
    const strict: boolean = !!body?.strict;
    const subMode: string | undefined = body?.subMode; // e.g. 'icon' for logo
    const style: string | undefined = body?.style;     // logo aesthetic preset

    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["logo", "flyer", "social", "hero", "freeform"].includes(mode)) {
      return new Response(JSON.stringify({ error: "invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { w, h, descriptor } = dims(mode, platform, { width: body?.width, height: body?.height });

    // Resolve org_id for brand kit + storage scoping.
    const userId = (claims.claims as Record<string, unknown>).sub as string | undefined;
    let orgId: string | undefined;
    if (userId) {
      const { data: userRow } = await authClient
        .from("users")
        .select("org_id")
        .eq("id", userId)
        .maybeSingle();
      orgId = (userRow as { org_id?: string } | null)?.org_id;
    }

    let brandPromptAddition = "";
    if (!strict) {
      try {
        const brandCtx = await loadBrandKitContext(SUPABASE_URL, SUPABASE_ANON_KEY, authHeader, orgId);
        if (brandCtx) {
          const palette = [brandCtx.primaryColor, brandCtx.accentColor, brandCtx.backgroundColor]
            .filter(Boolean)
            .join(", ");
          const bits = [
            brandCtx.visualStyle && `aesthetic: ${brandCtx.visualStyle}`,
            palette && `palette anchored on ${palette}`,
            brandCtx.fontHeading && `typographic feel of ${brandCtx.fontHeading}`,
            brandCtx.voice && `tone: ${brandCtx.voice}`,
          ].filter(Boolean);
          if (bits.length) {
            brandPromptAddition = `BRAND CONSTRAINTS — match the "${brandCtx.name}" brand exactly: ${bits.join(" · ")}.`;
          }
        }
      } catch (e) {
        console.warn("studio-generate brand kit lookup failed:", e);
      }
    }

    const logoStyleAesthetics: Record<string, string> = {
      "modern and minimal": "clean geometric shapes, minimal line work, modern sans-serif feel, ample negative space",
      "bold and geometric": "strong angular shapes, bold lines, impactful symmetry, heavy visual weight",
      "elegant and luxurious": "refined serif-inspired elements, metallic textures, sophisticated ornamental details, premium feel",
      "playful and colorful": "rounded organic shapes, friendly curves, dynamic composition, energetic feel",
      "retro vintage": "classic hand-drawn elements, retro typography feel, nostalgic textures, badge or emblem style",
      "tech and futuristic": "sharp edges, circuit-inspired patterns, holographic feel, forward-looking shapes",
    };

    const modeGuidance: Record<Mode, string> = {
      logo: subMode === "icon"
        ? "Generate a single logo element / icon on a perfectly solid pure white (#FFFFFF) background. Isolated graphic, no shadows, no other elements — suitable for brand logo use."
        : `Produce a clean, professional logo on a pure white background. Vector-style artwork, high contrast, no text unless requested. Aesthetics: ${logoStyleAesthetics[style || ""] || style || "clean and professional"}.`,
      flyer: "Produce a marketing flyer with strong headline hierarchy and visual focal point.",
      social: "Produce a scroll-stopping social post with one clear visual idea.",
      hero: "Produce a wide cinematic hero image — strong composition, leaves room for overlay copy.",
      freeform: "Produce a high-quality image that matches the user's request.",
    };

    // Build prompt — strict mode bypasses guidance/descriptor entirely.
    const finalPrompt = strict
      ? prompt
      : [
          modeGuidance[mode],
          prompt,
          `Surface: ${descriptor}. Composition must work cropped to ${w}×${h}.`,
          templateId ? `Template hint: ${templateId}.` : "",
          brandPromptAddition,
        ]
          .filter(Boolean)
          .join("\n\n");

    // Build multimodal content for reference-image edit flow.
    const userContent: unknown = referenceImage
      ? [
          {
            type: "text",
            text: strict
              ? finalPrompt
              : `You are a precise image editor. Apply ONLY the change described — do not redesign, restyle, or add decorative elements. Keep the same composition, palette, and proportions unless the instruction explicitly says otherwise. Output ONLY the image.\n\nEdit instruction: ${prompt}`,
          },
          { type: "image_url", image_url: { url: referenceImage } },
        ]
      : finalPrompt;

    // Pro model for edits / logo, flash for everything else.
    const model = referenceImage || mode === "logo"
      ? "google/gemini-3-pro-image-preview"
      : "google/gemini-3.1-flash-image-preview";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const status = aiRes.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited — try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("studio-generate AI error:", status, errText);
      return new Response(JSON.stringify({ error: "Image generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiRes.json();
    const dataUrl: string | undefined =
      data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!dataUrl) throw new Error("No image returned from AI");

    if (!orgId) {
      return new Response(
        JSON.stringify({ success: true, imageUrl: dataUrl, mode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { bytes, mime } = dataUrlToBytes(dataUrl);
    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
    const path = `${orgId}/studio-${mode}-${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await authClient.storage
      .from("marketing-assets")
      .upload(path, bytes, { contentType: mime, upsert: false });

    if (upErr) {
      console.warn("studio-generate upload failed, returning data URL fallback:", upErr);
      return new Response(
        JSON.stringify({ success: true, imageUrl: dataUrl, mode }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: pub } = authClient.storage.from("marketing-assets").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // Persist as a marketing_assets row so the Asset Library + project attribution work.
    const assetTypeMap: Record<Mode, string> = {
      logo: "logo",
      flyer: "flyer",
      hero: "hero",
      social: "social_tile",
      freeform: "social_tile",
    };
    const title = prompt.slice(0, 80) || `Studio ${mode}`;
    const { error: insertErr } = await authClient.from("marketing_assets").insert({
      org_id: orgId,
      project_id: projectId ?? null,
      created_by: userId ?? null,
      asset_type: assetTypeMap[mode],
      template_id: templateId ?? `studio-${mode}`,
      title,
      config: { mode, prompt, platform, source: "studio-generate" },
      image_url: publicUrl,
      storage_path: path,
    });
    if (insertErr) console.warn("studio-generate marketing_assets insert failed:", insertErr);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: publicUrl,
        storagePath: path,
        mode,
        projectId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("studio-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
