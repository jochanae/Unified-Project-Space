import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT verification - extract authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { appearanceDescription, referenceImageUrl, memberId, mode: rawMode = 'full', changedDetails, equippedGiftModifiers, visualStyle, pathType, skipProfileUpdate, companionRole, matureMode } = body;

    function getRoleClothingDirective(role: string, mature: boolean): string {
      switch (role) {
        case 'mentor':
        case 'assistant':
        case 'accountability':
          // Professional roles: enforce appropriate attire even when mature mode is on
          return '\nIMPORTANT CLOTHING DIRECTIVE: This companion is in a professional/mentorship role. They MUST be fully and appropriately clothed at all times — smart casual or professional attire. No exposed chest, no shirtless, no revealing clothing. Think: clean shirt, sweater, blazer, or similar.';
        case 'romantic':
          // Romantic: only unlock when mature mode is explicitly on
          if (mature) return '';
          return '\nCLOTHING DIRECTIVE: This companion should be clothed in casual or stylish attire. No shirtless, no underwear, no revealing clothing.';
        case 'friend':
        case 'kids-companion':
        default:
          if (mature) return '';
          return '\nCLOTHING DIRECTIVE: This companion should be casually but fully clothed — t-shirt, hoodie, jacket, etc. No shirtless, no underwear, no boxer shorts, no revealing clothing.';
      }
    }
    const clothingDirective = getRoleClothingDirective(companionRole || 'friend', matureMode === true);

    const isMatureGeneration = matureMode === true;
    const giftModifierClothingConstraint = equippedGiftModifiers && !isMatureGeneration
      ? ' IMPORTANT: The person must be fully clothed in the portrait. No underwear, boxer shorts, silk shorts, or intimate apparel visible unless this is an explicit mature mode generation.'
      : '';
    // Universal clothing constraint — applied to ALL non-abstract, non-mature generations
    const universalClothingRule = !isMatureGeneration
      ? '\nABSOLUTE RULE: The person MUST be fully and appropriately clothed. NEVER generate shirtless, in underwear, boxer shorts, silk shorts, lingerie, swimwear, or intimate apparel. Choose casual, stylish, or smart clothing — t-shirt, hoodie, jacket, button-up, sweater, blazer, dress, etc.'
      : '';
    // 'reference' and 'upload' are legacy/new aliases
    // 'upload' with photorealistic = use image directly (no re-render)
    // 'upload' with any other style = render uploaded photo in that style
    const isUploadMode = rawMode === 'upload' || rawMode === 'reference';
    const effectiveStyle = visualStyle || 'photorealistic';
    const uploadUseDirectly = isUploadMode && effectiveStyle === 'photorealistic' && referenceImageUrl;
    const mode = isUploadMode ? 'full' : rawMode;

    // Rate limiting
    const adminSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: allowed } = await adminSb.rpc("check_rate_limit", {
      p_user_id: userId,
      p_endpoint: "generate-avatar",
      p_max_requests: 5,
      p_window_minutes: 1,
    });
    if (allowed === false) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait before generating more avatars." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!appearanceDescription) {
      return new Response(
        JSON.stringify({ error: "appearanceDescription is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Resolve style prefix based on onboarding visual style choice
    const getStyleDirective = (style?: string): { prefix: string; isAbstract: boolean } => {
      // Normalize: lowercase + collapse hyphens to spaces so 'moody-portrait', 'Moody Portrait', 'moody portrait' all match
      const s = (style || '').toLowerCase().replace(/-/g, ' ').trim();

      // Abstract family — no human face
      if (s.includes('abstract') || s.includes('cosmic') || s.includes('energy') ||
          s.includes('ai generated') || s.includes('ai gen') || s.includes('stylized')) {
        return { prefix: 'CRITICAL: No human faces, no people, no bodies — the described entity IS the entire subject. ', isAbstract: true };
      }

      switch (s) {
        case 'painterly':
        case 'illustrated':
        case 'artistic':
          return { prefix: 'painterly fine art portrait, soft expressive brushwork, warm impressionist style, rich color depth', isAbstract: false };

        case 'anime':
        case 'anime / stylized':
        case 'anime stylized':
          return { prefix: 'anime portrait style, clean crisp lines, large expressive eyes, vibrant saturated colors, manga-inspired', isAbstract: false };

        case 'comic':
        case 'comic / graphic novel':
        case 'comic graphic novel':
        case 'graphic novel':
          return { prefix: 'comic book portrait style, bold ink outlines, flat cel shading, high contrast colors, graphic novel art', isAbstract: false };

        case '3d rendered':
        case '3d render':
        case '3d':
          return { prefix: '3D rendered portrait, smooth subsurface skin shading, soft studio lighting, cinematic render quality, Pixar-inspired realism', isAbstract: false };

        case 'moody portrait':
          return { prefix: 'moody cinematic portrait, dramatic chiaroscuro lighting, film photography aesthetic, deep shadows', isAbstract: false };

        case 'digital art':
          return { prefix: 'digital art portrait, clean precise rendering, concept art quality, polished illustration style', isAbstract: false };

        case 'watercolor':
          return { prefix: 'watercolor portrait, soft flowing washes of color, delicate paper texture, gentle impressionistic style', isAbstract: false };

        case 'cyberpunk':
          return { prefix: 'cyberpunk portrait, neon-lit night city atmosphere, high tech low life aesthetic, vibrant cyan and magenta tones', isAbstract: false };

        case 'cosmic portrait':
          return { prefix: 'cosmic fantasy portrait, ethereal nebula glow, celestial atmosphere, otherworldly beauty', isAbstract: false };

        case 'pop art':
          return { prefix: 'pop art portrait, bold flat colors, strong black outlines, high contrast graphic design, Andy Warhol inspired', isAbstract: false };

        case 'photorealistic':
        default:
          return { 
            prefix: 'photo-realistic portrait, warm natural lighting, soft bokeh background. DIVERSITY REQUIRED: Do not default to any specific ethnicity, skin tone, hair type, or background. The appearance description is the sole and complete source of truth for all physical features. Reflect genuine global human diversity.', 
            isAbstract: false 
          };
      }
    };

    // pathType='abstract' is the hard switch — always wins over style keyword detection

    // UPLOAD MODE — photorealistic: use the uploaded image directly, no re-rendering
    // This preserves the exact photo the user chose. Any other style re-renders it.
    if (uploadUseDirectly) {
      // Just save the reference URL directly as the avatar
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      if (memberId) {
        await supabase.from("connections").update({
          avatar_url: referenceImageUrl,
          reference_image_url: referenceImageUrl,
          appearance_desc: appearanceDescription || null,
          image_style: effectiveStyle,
        }).eq("user_id", userId).eq("member_id", memberId);
        // Also persist to companion_media
        try {
          await supabase.from("companion_media").insert({
            user_id: userId, member_id: memberId,
            media_type: "selfie", image_url: referenceImageUrl,
            caption: "Uploaded photo ✨", prompt: appearanceDescription?.slice(0, 500) || null,
          });
        } catch { /* non-blocking */ }
      }
      return new Response(JSON.stringify({ avatarUrl: referenceImageUrl, appearanceDescription }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleDirective = pathType === 'abstract'
      ? { prefix: 'CRITICAL: No human faces, no people, no bodies — the described entity IS the entire subject. ', isAbstract: true }
      : pathType === 'face'
        ? { ...getStyleDirective(visualStyle), isAbstract: false }
        : getStyleDirective(visualStyle);

    // Build the prompt content — mode-aware
    let promptText: string;

    if (styleDirective.isAbstract) {
      // Abstract mode: support both energy orbs AND object-based symbolic imagery
      const hasObjectHint = /bible|cross|book|nature|tree|flame|dove|star|moon|sun|crystal|sword|shield|lotus|mountain|ocean|candle|lantern|feather|anchor|crown|rose|lion|eagle|wolf|phoenix|cloud|clouds|rainbow|rain|sky|heaven|light|music|song|gospel|church|spiritual|spirit|prayer|angel|wings|butterfly|flower|garden|river|waterfall|forest|aurora|galaxy|nebula|cosmos|universe/i.test(appearanceDescription);

      // If user uploaded a reference image, preserve its look
      const hasRef = !!referenceImageUrl;
      const refPreamble = hasRef
        ? `REFERENCE IMAGE: The attached image is the user's uploaded artwork. You MUST preserve this image's exact visual identity — same colors, composition, shapes, textures, overall aesthetic, and mood. Treat it as the ground truth. Only enhance quality and resolution while keeping it as close to the original as possible.\n\n`
        : '';
      
      promptText = hasObjectHint
        ? `${refPreamble}Create a beautiful, symbolic, spiritual image centered on: ${appearanceDescription}.
${equippedGiftModifiers ? `\nAdditionally incorporate: ${equippedGiftModifiers}.${giftModifierClothingConstraint}` : ''}

CRITICAL RULES — these are absolute and must not be broken:
- ABSOLUTE ZERO human faces, eyes, portraits, body parts, or human forms of any kind — not even implied
- This is non-negotiable: no people, no silhouettes, no humanoid shapes
- The object or symbol described IS the entire subject of the image${hasRef ? '\n- PRESERVE the uploaded image\'s exact look, colors, composition, and feel — enhance quality only' : ''}
- Ethereal, luminous quality — glowing light, sacred warmth, divine presence
- Rich, deep colors — golden rays, soft halos, cosmic glow
- The image should feel meaningful, peaceful, and spiritually alive
- Square composition, centered subject
- No text, watermarks, or typography`
        : `${refPreamble}Create a beautiful abstract energy visualization: ${appearanceDescription}.
${equippedGiftModifiers ? `\nAdditionally incorporate: ${equippedGiftModifiers}.${giftModifierClothingConstraint}` : ''}

CRITICAL RULES — these are absolute and must not be broken:
- ZERO human faces, eyes, portraits, or body parts of any kind  
- ZERO people, silhouettes, or human forms whatsoever
- Pure abstract: flowing energy, light, color, form — no recognizable human features${hasRef ? '\n- PRESERVE the uploaded image\'s exact visual identity — same colors, shapes, composition, textures, and mood' : ''}
- Luminous, ethereal quality — glowing orbs, cosmic light, organic energy
- Rich colors that feel warm, alive, and emotionally resonant
- Square composition, centered
- No text or watermarks`;
    } else if (mode === 'restyle' && referenceImageUrl) {
      // Restyle mode: preserve identity AND art style, only change outfit/accessories
      const styleNote = styleDirective.prefix ? ` Render in ${styleDirective.prefix} style.` : ' Keep the same photorealistic portrait photography style.';
      promptText = `Edit this person's photo. Keep their EXACT face, facial features, skin tone, hair, body type, identity, and overall artistic style completely unchanged. 

Only modify the following: ${changedDetails || 'outfit and clothing style'}.${equippedGiftModifiers ? ` Also: ${equippedGiftModifiers}.${giftModifierClothingConstraint}` : ''}${styleNote}

Full appearance context: ${appearanceDescription}.

Critical rules:
- The person must look IDENTICAL — same face, same expression style, same person
- Keep the SAME art style and rendering technique as the reference image
- Only change clothing, accessories, or background as specified
- Maintain the same lighting, color grading, and photography style
- Square composition, head and shoulders framing
- No text or watermarks${universalClothingRule}${clothingDirective}`;
    } else if (mode === 'full' && referenceImageUrl) {
      // New Look mode with reference: generate in a new art style but preserve likeness
      const stylePrefix = styleDirective.prefix ? `${styleDirective.prefix}. ` : 'photo-realistic. ';
      const isNonPhoto = styleDirective.prefix && !styleDirective.prefix.includes('photo-realistic');
      promptText = isNonPhoto
        ? `STYLE MANDATE: Render this portrait ENTIRELY in ${stylePrefix} style. This is NOT a photograph — it must look like ${styleDirective.prefix.split(',')[0]}.

This is a reference photo of a real person. Create a ${styleDirective.prefix.split(',')[0]} portrait of THIS EXACT PERSON.

CRITICAL RULES:
- The generated person MUST look like the person in the reference photo — same face shape, skin tone, hair color, hair texture, facial features
- The ART STYLE must be dramatically and obviously different from a photograph
- The rendering technique, brushwork/linework, color treatment, and overall aesthetic MUST match the ${styleDirective.prefix.split(',')[0]} medium
- Do NOT produce a photograph or photo-realistic image — the style transformation must be clearly visible
${appearanceDescription ? `\nAdditional context: ${appearanceDescription}` : ''}
${equippedGiftModifiers ? `\nAdditionally: ${equippedGiftModifiers}.${giftModifierClothingConstraint}` : ''}
- Warm, inviting atmosphere
- Genuine, warm expression — approachable and kind
- Square composition, head and shoulders framing
- No text or watermarks${universalClothingRule}${clothingDirective}`
        : `${stylePrefix}This is a reference photo of a real person. Generate a high-quality portrait of THIS EXACT PERSON.

CRITICAL: The generated person MUST look like the person in the reference photo. Preserve their exact face shape, skin tone, hair color, hair texture, and facial features. Same person, same identity.
${appearanceDescription ? `\nAdditional context: ${appearanceDescription}` : ''}
${equippedGiftModifiers ? `\nAdditionally: ${equippedGiftModifiers}.${giftModifierClothingConstraint}` : ''}
Style guidelines:
- Warm, natural lighting (golden hour feel)
- Soft background blur (bokeh)
- Genuine, warm expression — approachable and kind
- High quality portrait photography style
- Square composition, head and shoulders framing
- No text or watermarks${universalClothingRule}${clothingDirective}`;
    } else {
      // Full mode without reference: generate from scratch
      const stylePrefix = styleDirective.prefix ? `${styleDirective.prefix}. ` : 'photo-realistic. ';
      promptText = `${stylePrefix}Generate a beautiful portrait of a person with these characteristics: ${appearanceDescription}. 
${equippedGiftModifiers ? `\nAdditionally, they are: ${equippedGiftModifiers}.${giftModifierClothingConstraint}` : ''}
Style guidelines:
- Warm, natural lighting (golden hour feel)
- Soft background blur (bokeh)
- Genuine, warm expression — approachable and kind
- High quality ${styleDirective.prefix || 'portrait photography'} style
- Square composition, head and shoulders framing
- No text or watermarks
- The person should feel real, warm, and trustworthy — like someone you'd want as a close friend${universalClothingRule}${clothingDirective}`;
    }

    const messageContent: any[] = [{ type: "text", text: promptText }];

    // Include reference image for restyle mode (required) or optionally for full mode
    if (referenceImageUrl) {
      messageContent.push({
        type: "image_url",
        image_url: { url: referenceImageUrl },
      });
    }

    // Generate the avatar image using Gemini directly
    // GEMINI_API_KEY already declared above (line 78)
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");
    let base64DataUrl: string | undefined;

    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`Attempting image generation via Gemini (attempt ${attempt}/${MAX_ATTEMPTS})`);
      
      // Build parts array — resolve any HTTP image URLs to inlineData
      const resolvedParts = await Promise.all(messageContent.map(async (part: any) => {
        if (part.type === "text") return { text: part.text };
        if (part.type === "image_url") {
          const url = part.image_url?.url || "";
          if (url.startsWith("data:")) {
            const [header, data] = url.split(",");
            const mimeType = header.replace("data:", "").replace(";base64", "");
            return { inlineData: { mimeType, data } };
          }
          try {
            const imgResp = await fetch(url);
            if (imgResp.ok) {
              const buf = await imgResp.arrayBuffer();
              const b64 = base64Encode(new Uint8Array(buf));
              const ct = imgResp.headers.get("content-type") || "image/jpeg";
              return { inlineData: { mimeType: ct, data: b64 } };
            }
          } catch (e) {
            console.error("Failed to fetch reference image:", e);
          }
          return { text: "[reference image unavailable]" };
        }
        return { text: JSON.stringify(part) };
      }));

      const imageResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: resolvedParts }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        }
      );

      if (!imageResp.ok) {
        const status = imageResp.status;
        const errBody = await imageResp.text().catch(() => '');
        console.error(`Image generation error (attempt ${attempt}): ${status} ${errBody.slice(0, 500)}`);
        if (status === 429) {
          if (attempt < MAX_ATTEMPTS) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
            continue;
          }
          return new Response(
            JSON.stringify({ error: "Rate limited, please try again in a moment" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1500 * attempt));
          continue;
        }
        throw new Error(`Gemini returned ${status}`);
      }

      const imageData = await imageResp.json();
      
      // Shape 1: choices[0].message.images[] (Lovable gateway style)
      const images = imageData.choices?.[0]?.message?.images;
      if (Array.isArray(images) && images.length > 0) {
        base64DataUrl = images[0]?.image_url?.url;
      }
      // Shape 2: choices[0].message.content as array with image_url parts
      if (!base64DataUrl) {
        const msgContent = imageData.choices?.[0]?.message?.content;
        if (Array.isArray(msgContent)) {
          const imgPart = msgContent.find((p: any) => p.type === "image_url");
          if (imgPart?.image_url?.url) base64DataUrl = imgPart.image_url.url;
          // Shape 3: inlineData from native Gemini responses
          if (!base64DataUrl) {
            const inlinePart = msgContent.find((p: any) => p.inlineData?.data || p.inline_data?.data);
            if (inlinePart) {
              const d = inlinePart.inlineData || inlinePart.inline_data;
              const mime = d.mimeType || d.mime_type || 'image/png';
              base64DataUrl = `data:${mime};base64,${d.data}`;
            }
          }
        }
      }
      // Shape 4: candidates[].content.parts[] (raw Gemini SDK shape)
      if (!base64DataUrl) {
        const candidates = imageData.candidates;
        if (Array.isArray(candidates)) {
          for (const c of candidates) {
            const parts = c.content?.parts;
            if (Array.isArray(parts)) {
              const inlinePart = parts.find((p: any) => p.inlineData?.data || p.inline_data?.data);
              if (inlinePart) {
                const d = inlinePart.inlineData || inlinePart.inline_data;
                const mime = d.mimeType || d.mime_type || 'image/png';
                base64DataUrl = `data:${mime};base64,${d.data}`;
                break;
              }
            }
          }
        }
      }

      if (base64DataUrl) {
        console.log(`Image generated successfully on attempt ${attempt}`);
        break;
      }

      console.warn(`No image in response on attempt ${attempt}. Keys: ${JSON.stringify(Object.keys(imageData))}`);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }
    }

    if (!base64DataUrl) {
      throw new Error("Image generation failed after multiple attempts");
    }

    // Extract base64 data and upload to storage
    const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const fileName = `${userId}/avatar-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("companion-avatars")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload avatar image");
    }

    const { data: urlData } = supabase.storage
      .from("companion-avatars")
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Skip profile/connection updates for ephemeral images (e.g. gift selfies)
    if (!skipProfileUpdate) {
      // Save to profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          companion_avatar_url: avatarUrl,
          companion_appearance_desc: appearanceDescription,
        })
        .eq("user_id", userId);

      if (updateError) {
        console.error("Profile update error:", updateError);
      }

      // Also save to connections table if memberId provided (multi-companion support)
      if (memberId) {
        const { error: connError, count } = await supabase
          .from("connections")
          .update({
            avatar_url: avatarUrl,
            appearance_desc: appearanceDescription,
            reference_image_url: avatarUrl,
            image_style: visualStyle || 'photorealistic',
          })
          .eq("user_id", userId)
          .eq("member_id", memberId);

        if (connError) {
          console.error("Connection update error:", connError);
        }
      }
    }

    // Persist to companion_media as a selfie so it appears in Moments/Vault
    if (memberId) {
      try {
        await supabase.from("companion_media").insert({
          user_id: userId,
          member_id: memberId,
          media_type: skipProfileUpdate ? "gift-selfie" : "selfie",
          image_url: avatarUrl,
          caption: skipProfileUpdate ? "Gift moment 🎁" : "First look ✨",
          prompt: appearanceDescription?.slice(0, 500) || null,
        });
      } catch (mediaErr) {
        console.error("Media insert error:", mediaErr);
      }
    }

    return new Response(
      JSON.stringify({ avatarUrl, appearanceDescription }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Generate avatar error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
