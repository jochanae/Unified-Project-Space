import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ItemRequest {
  id: string;
  name: string;
  prompt_modifier: string;
  model?: string;
  source_image_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await authSb.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { items } = (await req.json()) as { items: ItemRequest[] };
    if (!items?.length) throw new Error("No items provided");

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results: { id: string; url: string; error?: string }[] = [];

    for (const item of items) {
      try {
        let messages: any[];

        if (item.source_image_url) {
          // Image editing mode: multimodal message
          messages = [{
            role: "user",
            content: [
              { type: "text", text: item.prompt_modifier },
              { type: "image_url", image_url: { url: item.source_image_url } }
            ]
          }];
          console.log(`Editing image for ${item.id}: ${item.prompt_modifier}`);
        } else {
          // Text-to-image generation mode
          const prompt = `Fashion product photo: ${item.name}. A single ${item.prompt_modifier.replace(/^wearing\s+/i, "").replace(/^carrying\s+/i, "")}. Clean studio lighting, dark gradient background transitioning from deep charcoal to black, centered composition, high-end fashion product photography, item displayed on its own, no person, no model, no mannequin, slight dramatic shadow underneath, professional e-commerce style.`;
          messages = [{ role: "user", content: prompt }];
          console.log(`Generating image for ${item.id}: ${prompt}`);
        }

        // Use Gemini directly for image generation
        // GEMINI_API_KEY already declared in outer scope (line 43)
        if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

        const prompt = messages[0]?.content || messages[0]?.role;
        const aiResp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: typeof prompt === "string" ? prompt : JSON.stringify(messages) }] }],
              generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
            }),
          }
        );

        if (!aiResp.ok) {
          const errText = await aiResp.text();
          console.error(`AI error for ${item.id}:`, aiResp.status, errText);
          results.push({ id: item.id, url: "", error: `AI ${aiResp.status}` });
          continue;
        }

        const aiData = await aiResp.json();
        let imageDataUrl: string | undefined;
        // Native Gemini shape: candidates[].content.parts[] with inlineData
        const parts = aiData.candidates?.[0]?.content?.parts || [];
        const inlinePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
        if (inlinePart?.inlineData?.data) {
          imageDataUrl = `data:${inlinePart.inlineData.mimeType};base64,${inlinePart.inlineData.data}`;
        }

        if (!imageDataUrl) {
          console.error(`No image returned for ${item.id}`);
          results.push({ id: item.id, url: "", error: "No image in response" });
          continue;
        }

        // Extract base64 data
        const base64Data = imageDataUrl.replace(
          /^data:image\/\w+;base64,/,
          ""
        );
        const binaryData = Uint8Array.from(atob(base64Data), (c) =>
          c.charCodeAt(0)
        );

        // Upload to storage
        const filePath = `${item.id}.png`;
        const { error: uploadError } = await supabase.storage
          .from("gift-images")
          .upload(filePath, binaryData, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${item.id}:`, uploadError);
          results.push({
            id: item.id,
            url: "",
            error: uploadError.message,
          });
          continue;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("gift-images").getPublicUrl(filePath);

        console.log(`✅ ${item.id}: ${publicUrl}`);
        results.push({ id: item.id, url: publicUrl });
      } catch (itemErr: any) {
        console.error(`Error for ${item.id}:`, itemErr);
        results.push({
          id: item.id,
          url: "",
          error: itemErr.message || "Unknown error",
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-gift-images error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
