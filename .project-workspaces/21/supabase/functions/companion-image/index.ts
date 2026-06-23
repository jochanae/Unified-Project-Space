import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let authenticatedUserId: string | null = null;
  const adminSb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  try {
    // Rate limiting & daily cap enforcement
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const authSb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: { user } } = await authSb.auth.getUser();
      if (user?.id) {
        authenticatedUserId = user.id;
        const { data: allowed } = await adminSb.rpc("check_rate_limit", {
          p_user_id: user.id,
          p_endpoint: "companion-image",
          p_max_requests: 10,
          p_window_minutes: 1,
        });
        if (allowed === false) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please wait before generating more images." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // ── Daily image cap enforcement ──
        const [subResult, usageResult] = await Promise.all([
          adminSb.from("subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle(),
          adminSb.from("usage_tracking").select("images_generated").eq("user_id", user.id).eq("usage_date", new Date().toISOString().slice(0, 10)).maybeSingle(),
        ]);

        const isPremiumUser = subResult.data?.plan === 'premium' && subResult.data?.status === 'active';
        const imagesGeneratedToday = usageResult.data?.images_generated || 0;
        const DAILY_IMAGE_CAP = 10;

        if (!isPremiumUser && imagesGeneratedToday >= DAILY_IMAGE_CAP) {
          return new Response(
            JSON.stringify({ error: "Daily image limit reached. Upgrade to Premium for unlimited images.", shouldSend: false }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    const {
      messages,
      companionName,
      userName,
      companionAppearanceDesc,
      referenceImageUrl,
      mode,
      activityPrompt,
      stickerExpression,
      userId,
      userAppearanceDesc,
      userReferenceImageUrl,
      imageStyle,
      memberId,
      likenessPrompt,
      textImageType,
      textContent,
      textImagePrompt,
      sourceImageUrl,
      editInstruction,
      companionRole,
      matureMode,
    } = await req.json();

    const resolvedStyle = imageStyle || 'photorealistic';
    const resolvedRole = companionRole || 'friend';
    const isMatureMode = matureMode === true;

    // Role-aware clothing/presentation directive — skipped entirely when mature mode is on
    function getRoleClothingDirective(role: string, mature: boolean): string {
      if (mature) return ''; // User has opted into mature content — no clothing restrictions
      switch (role) {
        case 'mentor':
        case 'assistant':
        case 'accountability':
          return '\nIMPORTANT CLOTHING DIRECTIVE: This companion is in a professional/mentorship role. They MUST be fully and appropriately clothed at all times — smart casual or professional attire. No exposed chest, no shirtless, no revealing clothing. Think: clean shirt, sweater, blazer, or similar.';
        case 'friend':
        case 'kids-companion':
          return '\nCLOTHING DIRECTIVE: This companion should be casually but fully clothed — t-shirt, hoodie, jacket, etc. No shirtless or overly revealing attire.';
        case 'romantic':
          return '\nCLOTHING DIRECTIVE: This companion should be clothed in casual or stylish attire. No shirtless, no underwear, no revealing clothing unless mature mode is explicitly enabled.';
        default:
          return '\nCLOTHING DIRECTIVE: This companion should be appropriately and fully clothed.';
      }
    }
    const clothingDirective = getRoleClothingDirective(resolvedRole, isMatureMode);

    // Fetch owned gift prompt modifiers + cached traits for this user+companion
    let giftModifiers = '';
    let cachedTraits: Record<string, string[]> | null = null;
    let userCachedTraits: Record<string, string[]> | null = null;
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    if (userId && memberId) {
      try {
        const [purchasesResult, connectionResult, profileResult] = await Promise.all([
          sb.from('user_gift_purchases').select('gift_id').eq('user_id', userId).eq('member_id', memberId),
          sb.from('connections').select('cached_traits').eq('user_id', userId).eq('member_id', memberId).maybeSingle(),
          sb.from('profiles').select('user_cached_traits').eq('user_id', userId).maybeSingle(),
        ]);

        const purchases = purchasesResult.data;
        // Gift outfit modifiers only for direct gift-delivery image requests — not selfies, contextual, activity, etc.
        if ((mode || 'contextual') === 'gift' && purchases && purchases.length > 0) {
          const giftIds = purchases.map((p: any) => p.gift_id);
          const { data: gifts } = await sb.from('virtual_gifts').select('prompt_modifier, mature_only, category').in('id', giftIds);
          if (gifts && gifts.length > 0) {
            let filtered = isMatureMode
              ? gifts
              : gifts.filter((g: any) => !g.mature_only);
            if (!isMatureMode) {
              const intimateInPrompt = (pm: string) => {
                const lower = (pm || '').toLowerCase();
                if (['boxer', 'shorts', 'chemise', 'bodysuit', 'corset', 'slip', 'robe'].some((w) => lower.includes(w))) return true;
                if (lower.includes('teddy') && !lower.includes('teddy bear')) return true;
                return false;
              };
              filtered = filtered.filter(
                (g: any) =>
                  (g.category || '').toLowerCase() !== 'lingerie' && !intimateInPrompt(g.prompt_modifier || '')
              );
            }
            if (filtered.length > 0) {
              giftModifiers = ' ' + filtered.map((g: any) => g.prompt_modifier).join('. Also ') + '.';
            }
          }
        }

        cachedTraits = connectionResult.data?.cached_traits as Record<string, string[]> | null;

        // Lazy extraction: if no cached traits but appearance desc exists, extract via AI
        if (!cachedTraits && companionAppearanceDesc) {
          cachedTraits = await extractAndCacheTraits(GEMINI_API_KEY, companionAppearanceDesc, userId, memberId, sb);
        }

        // User cached traits — same lazy extraction pattern
        userCachedTraits = profileResult.data?.user_cached_traits as Record<string, string[]> | null;
        if (!userCachedTraits && userAppearanceDesc) {
          userCachedTraits = await extractAndCacheUserTraits(GEMINI_API_KEY, userAppearanceDesc, userId, sb);
        }
      } catch (e) {
        console.error('Failed to load gift modifiers / cached traits:', e);
      }
    }

    const imageMode = mode || "contextual";
    const giftModsForPrompt = imageMode === 'gift' ? giftModifiers : '';
    const hasAppearance = !!companionAppearanceDesc || !!referenceImageUrl;

    // ─── DESCRIBE-USER MODE ─── (no image generation, skip increment)
    if (imageMode === "describe-user" && referenceImageUrl) {
      return await handleDescribeUser(GEMINI_API_KEY, referenceImageUrl, corsHeaders);
    }

    // ─── TEXT-IMAGE MODE ─── (generates an image with legible handwritten text)
    // text-image fields already destructured from req.json() above
    if (imageMode === "text-image") {
      const resp = await handleTextImage(GEMINI_API_KEY, companionName, userName, textImageType || 'letter', textContent || activityPrompt || '', textImagePrompt, companionAppearanceDesc, userId, corsHeaders);
      if (resp.ok) fireAndForgetImageIncrement(authenticatedUserId, adminSb);
      return resp;
    }

    // ─── EDIT-IMAGE MODE ─── (modifies an existing image per instruction)
    // edit-image fields already destructured from req.json() above
    if (imageMode === "edit-image" && sourceImageUrl && editInstruction) {
      const resp = await handleEditImage(GEMINI_API_KEY, sourceImageUrl, editInstruction, companionName, userId, corsHeaders);
      if (resp.ok) fireAndForgetImageIncrement(authenticatedUserId, adminSb);
      return resp;
    }

    // ─── STICKER MODE ───
    if (imageMode === "sticker" && stickerExpression) {
      const resp = await handleSticker(GEMINI_API_KEY, companionAppearanceDesc, referenceImageUrl, stickerExpression, userId, corsHeaders);
      if (resp.ok) fireAndForgetImageIncrement(authenticatedUserId, adminSb);
      return resp;
    }

    // ─── Compute persistent seed from memberId for identity consistency ───
    const characterSeed = memberId ? computeCharacterSeed(memberId) : undefined;

    // ─── SELFIE / PORTRAIT MODE (+ gift delivery: same portrait path, gift modifiers only when imageMode === 'gift') ───
    if (imageMode === "selfie" || imageMode === "gift") {
      const resp = await handleSelfie(GEMINI_API_KEY, companionName, userName, companionAppearanceDesc, referenceImageUrl, userId, resolvedStyle, giftModsForPrompt, corsHeaders, characterSeed, cachedTraits, clothingDirective);
      if (resp.ok) fireAndForgetImageIncrement(authenticatedUserId, adminSb);
      return resp;
    }

    // ─── LIKENESS / TOGETHER MODE ───
    if (imageMode === "likeness") {
      const resp = await handleLikeness(GEMINI_API_KEY, companionName, userName, companionAppearanceDesc, referenceImageUrl, userAppearanceDesc, userReferenceImageUrl, likenessPrompt || activityPrompt, messages, userId, resolvedStyle, giftModsForPrompt, corsHeaders, characterSeed, cachedTraits, userCachedTraits, clothingDirective);
      if (resp.ok) fireAndForgetImageIncrement(authenticatedUserId, adminSb);
      return resp;
    }

    // ─── ACTIVITY SCENE MODE ───
    if (imageMode === "activity" && activityPrompt) {
      const resp = await handleActivity(GEMINI_API_KEY, companionName, userName, companionAppearanceDesc, referenceImageUrl, userAppearanceDesc, userReferenceImageUrl, activityPrompt, userId, resolvedStyle, giftModsForPrompt, corsHeaders, characterSeed, cachedTraits, userCachedTraits, clothingDirective);
      if (resp.ok) fireAndForgetImageIncrement(authenticatedUserId, adminSb);
      return resp;
    }

    // ─── CONTEXTUAL (AUTO) MODE ───
    const resp = await handleContextual(GEMINI_API_KEY, messages, companionName, userName, companionAppearanceDesc, referenceImageUrl, hasAppearance, userId, resolvedStyle, giftModsForPrompt, corsHeaders, userAppearanceDesc, userReferenceImageUrl, characterSeed, cachedTraits, userCachedTraits, clothingDirective);
    if (resp.ok) fireAndForgetImageIncrement(authenticatedUserId, adminSb);
    return resp;

  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error(String(e));
    console.error("Companion image error:", err.message, err.stack || '');
    return new Response(
      JSON.stringify({ shouldSend: false, error: err.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: increment image count after successful generation
function fireAndForgetImageIncrement(userId: string | null, sb: any) {
  if (!userId) return;
  sb.rpc("increment_image_count", { p_user_id: userId }).then(null, () => {});
}

// ══════════════════════════════════════════════════════
// VISUAL DNA ANCHOR SYSTEM
// ══════════════════════════════════════════════════════

/**
 * Compute a deterministic seed number from a memberId string.
 * This ensures the same companion always starts from the same "noise",
 * promoting visual consistency across generations.
 */
function computeCharacterSeed(memberId: string): number {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    const ch = memberId.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0; // Convert to 32-bit integer
  }
  // Ensure positive and in a useful range
  return Math.abs(hash) % 999999 + 1;
}

/**
 * Build an exhaustive Visual DNA identity lock for a character.
 * This goes beyond simple descriptions — it extracts and reinforces
 * specific facial markers, skin tone, bone structure, and distinctive features.
 * The instruction is framed as a "hard constraint" that the AI must obey.
 */
function buildVisualDNA(desc: string, label: string, seed?: number, imageStyle?: string): string {
  if (!desc) return '';

  const isRealistic = !imageStyle || (imageStyle || '').toLowerCase().replace(/-/g, ' ').trim() === 'photorealistic';
  const accuracyPhrase = isRealistic
    ? "MUST be reproduced with photographic accuracy. Do NOT generalize, idealize, average, or merge with any other person's features."
    : `MUST be faithfully rendered in the current art style. Translate these features into the art style — do NOT revert to photorealism. Same identity (skin tone, hair, face shape, marks) but rendered stylistically.`;

  const seedDirective = seed
    ? `\n[SEED PERSISTENCE]: Use generation seed ${seed}. This character ALWAYS starts from this exact seed to maintain visual consistency across all images.`
    : '';

  return `[VISUAL DNA ANCHOR — ${label}]:
HARD CONSTRAINT: The following character identity ${accuracyPhrase}

EXACT FEATURES: ${desc}

IDENTITY RULES:
- Skin tone: reproduce the EXACT shade and undertone described${isRealistic ? '' : ' — translated into the art style'}. Do not lighten, darken, or shift hue.
- Eye shape & color: match precisely. No substitutions.
- Nose bridge width, tip shape: match precisely.
- Jawline & bone structure: match precisely.
- Hair texture, color, length, style: match precisely including any graying, fading, or styling details.
- Distinctive marks (freckles, dimples, scars, moles): include ALL of them.
- Age indicators: maintain the correct apparent age range.
${seedDirective}

[CONTEXT ISOLATION]: This is ${label} and ONLY ${label}. Do NOT borrow, blend, or average features from any other character. If generating two people, keep each person's DNA completely separate.`;
}

// ─── REALISM KEYWORDS ───
const REALISM_ANCHOR = `Unretouched photography. Visible pores and natural skin texture. Shot on Sony A1, 85mm f/1.4 GM lens. Natural available light. High-fidelity skin detail, no smoothing, no airbrushing, no plastic look. Subtle film grain.`;

// Style modifiers for image generation
function getStylePrefix(style: string): string {
  // Normalize: lowercase + collapse hyphens to spaces so 'Moody Portrait', 'moody-portrait', 'moody portrait' all match
  const s = (style || '').toLowerCase().replace(/-/g, ' ').trim();
  switch (s) {
    case 'anime': return 'In anime/manga art style with vibrant colors, expressive eyes, and clean linework: ';
    case 'illustrated':
    case 'painterly':
    case 'artistic':
      return 'In painterly fine art style, expressive brushwork, warm impressionist tones: ';
    case 'moody portrait': return 'In moody cinematic portrait style, dramatic chiaroscuro lighting, deep shadows: ';
    case 'digital art': return 'In digital art style, clean precise rendering, concept art quality: ';
    case 'comic':
    case 'comic / graphic novel':
    case 'comic graphic novel':
      return 'In comic book art style, bold ink outlines, flat cel shading, high contrast colors: ';
    case '3d render':
    case '3d rendered':
    case '3d':
      return 'In 3D rendered Pixar/Disney animation style, smooth cartoon proportions, soft studio lighting, expressive animated character: ';
    case 'watercolor': return 'In watercolor illustration style, soft flowing color washes, delicate paper texture: ';
    case 'cyberpunk': return 'In cyberpunk art style, neon-lit atmosphere, vibrant cyan and magenta tones: ';
    case 'cosmic portrait':
    case 'cosmic / energy':
    case 'cosmic energy':
      return 'In cosmic fantasy art style, ethereal nebula glow, celestial atmosphere: ';
    case 'pop art': return 'In pop art style, bold flat colors, high contrast graphic design: ';
    case 'abstract':
    case 'energy orb':
    case 'spirit creature':
    case 'silhouette':
    case 'stylized':
    case 'ai generated':
    case 'ai-generated':
      return 'NON-HUMAN ENTITY. Do NOT generate a person, face, body, or human form of any kind. Generate the object, creature, or energy form described. ';
    case 'photorealistic':
    default: return '';
  }
}

// Extract and reinforce key traits — prefer cached AI-extracted traits, fallback to keyword scan
function reinforceAppearance(desc: string, cachedTraits?: Record<string, string[]> | null): string {
  if (!desc && !cachedTraits) return '';

  // If we have AI-extracted cached traits, use them directly
  if (cachedTraits && Object.keys(cachedTraits).length > 0) {
    const reinforcements: string[] = [];
    if (cachedTraits.accessories?.length) {
      reinforcements.push(`IMPORTANT: This person is ALWAYS wearing their signature ${cachedTraits.accessories.join(', ')} — must be clearly visible in every image`);
    }
    if (cachedTraits.hair_style?.length) {
      reinforcements.push(`Hair MUST match: ${cachedTraits.hair_style.join(', ')} — do NOT change hairstyle between images`);
    }
    if (cachedTraits.hair_color?.length) {
      reinforcements.push(`Hair color: ${cachedTraits.hair_color.join(', ')} — reproduce this EXACT shade`);
    }
    if (cachedTraits.skin_tone?.length) {
      reinforcements.push(`Skin tone: ${cachedTraits.skin_tone.join(', ')} — reproduce this EXACT shade and undertone`);
    }
    if (cachedTraits.facial_hair?.length) {
      reinforcements.push(`Facial hair: ${cachedTraits.facial_hair.join(', ')} — maintain this consistently`);
    }
    if (cachedTraits.distinctive_marks?.length) {
      reinforcements.push(`Distinctive features: ${cachedTraits.distinctive_marks.join(', ')} — these MUST appear in every image`);
    }
    if (cachedTraits.eye_details?.length) {
      reinforcements.push(`Eyes: ${cachedTraits.eye_details.join(', ')} — match precisely`);
    }
    if (cachedTraits.body_build?.length) {
      reinforcements.push(`Build: ${cachedTraits.body_build.join(', ')}`);
    }
    return reinforcements.length > 0 ? '\n[TRAIT PERSISTENCE — AI-EXTRACTED]: ' + reinforcements.join('. ') + '.' : '';
  }

  // Fallback: keyword scanning from natural language
  if (!desc) return '';
  const lower = desc.toLowerCase();
  const reinforcements: string[] = [];

  const accessoryKeywords = [
    'watch', 'glasses', 'sunglasses', 'earrings', 'necklace', 'bracelet',
    'ring', 'chain', 'pendant', 'piercing', 'hat', 'cap', 'beanie',
    'headband', 'scarf', 'tie', 'bow tie', 'cufflinks', 'anklet',
  ];
  const foundAccessories = accessoryKeywords.filter(k => lower.includes(k));
  if (foundAccessories.length > 0) {
    reinforcements.push(`IMPORTANT: This person is ALWAYS wearing their signature ${foundAccessories.join(', ')} — must be clearly visible in every image`);
  }

  const hairKeywords = [
    'locs', 'dreadlocks', 'braids', 'cornrows', 'afro', 'buzz cut',
    'pixie', 'mohawk', 'frohawk', 'fade', 'taper', 'waves', 'curly',
    'wavy', 'straight', 'bob', 'ponytail', 'bun', 'updo', 'bangs',
    'twist-out', 'coils', 'slicked', 'shaved',
  ];
  const foundHair = hairKeywords.filter(k => lower.includes(k));
  if (foundHair.length > 0) {
    reinforcements.push(`Hair MUST match: ${foundHair.join(', ')} — do NOT change hairstyle between images`);
  }

  const hairColorPattern = lower.match(/(?:hair(?:\s+is)?|with)\s+(black|brown|blonde|red|auburn|silver|gray|grey|platinum|blue|pink|purple|green|white|strawberry|copper|chestnut|sandy|honey|golden|dark|light)\s*(?:hair|colored|colou?red)?/);
  if (hairColorPattern) {
    reinforcements.push(`Hair color: ${hairColorPattern[1]} — reproduce this EXACT shade`);
  }

  const skinPattern = lower.match(/((?:deep|rich|dark|medium|light|fair|pale|olive|warm|cool|golden|tan|brown|caramel|ebony|mahogany|porcelain|ivory|peach|rosy|bronze|copper|wheat|honey|amber|chocolate|espresso)[\s-]*(?:brown|tone|skin|complexion|toned|skinned)?(?:\s+(?:with|and)\s+\w+\s+undertone)?)/);
  if (skinPattern) {
    reinforcements.push(`Skin tone: ${skinPattern[1].trim()} — reproduce this EXACT shade and undertone`);
  }

  const facialHairKeywords = ['beard', 'goatee', 'mustache', 'moustache', 'stubble', 'clean-shaven', 'sideburns'];
  const foundFacialHair = facialHairKeywords.filter(k => lower.includes(k));
  if (foundFacialHair.length > 0) {
    reinforcements.push(`Facial hair: ${foundFacialHair.join(', ')} — maintain this consistently`);
  }

  const markKeywords = ['freckles', 'dimples', 'scar', 'birthmark', 'mole', 'beauty mark', 'tattoo'];
  const foundMarks = markKeywords.filter(k => lower.includes(k));
  if (foundMarks.length > 0) {
    reinforcements.push(`Distinctive features: ${foundMarks.join(', ')} — these MUST appear in every image`);
  }

  return reinforcements.length > 0 ? '\n[TRAIT PERSISTENCE]: ' + reinforcements.join('. ') + '.' : '';
}

/**
 * Use AI to extract structured traits from a natural language appearance description,
 * then cache the result on the connection record for future use.
 */
async function extractAndCacheTraits(
  apiKey: string, appearanceDesc: string, userId: string, memberId: string, sb: any
): Promise<Record<string, string[]> | null> {
  try {
    console.log('[TraitExtraction] Extracting traits for', memberId);
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: `Extract structured visual traits from this appearance description. Return ONLY valid JSON with these keys (use empty arrays if not mentioned):

{
  "accessories": ["watch", "glasses"],
  "hair_style": ["groomed locs"],
  "hair_color": ["black"],
  "skin_tone": ["deep brown with warm undertone"],
  "facial_hair": ["trimmed beard"],
  "distinctive_marks": ["dimples", "scar on left cheek"],
  "eye_details": ["dark brown almond-shaped"],
  "body_build": ["athletic"]
}

Description: "${appearanceDesc}"

Output ONLY the JSON object, no markdown, no explanation.`,
        }],
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const traits = JSON.parse(cleaned);

    // Validate structure
    const validKeys = ['accessories', 'hair_style', 'hair_color', 'skin_tone', 'facial_hair', 'distinctive_marks', 'eye_details', 'body_build'];
    const sanitized: Record<string, string[]> = {};
    for (const key of validKeys) {
      if (Array.isArray(traits[key]) && traits[key].length > 0) {
        sanitized[key] = traits[key].map((v: any) => String(v));
      }
    }

    if (Object.keys(sanitized).length === 0) return null;

    // Cache to database
    await sb.from('connections')
      .update({ cached_traits: sanitized })
      .eq('user_id', userId)
      .eq('member_id', memberId);

    console.log('[TraitExtraction] Cached traits:', JSON.stringify(sanitized));
    return sanitized;
  } catch (e) {
    console.error('[TraitExtraction] Failed:', e);
    return null;
  }
}

/**
 * Extract and cache traits for the USER (stored on profiles table).
 * Same approach as companion traits but stored differently.
 */
async function extractAndCacheUserTraits(
  apiKey: string, userAppearanceDesc: string, userId: string, sb: any
): Promise<Record<string, string[]> | null> {
  try {
    console.log('[UserTraitExtraction] Extracting traits for user', userId);
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: `Extract structured visual traits from this appearance description. Return ONLY valid JSON with these keys (use empty arrays if not mentioned):

{
  "accessories": ["watch", "glasses"],
  "hair_style": ["groomed locs"],
  "hair_color": ["black"],
  "skin_tone": ["deep brown with warm undertone"],
  "facial_hair": ["trimmed beard"],
  "distinctive_marks": ["dimples", "scar on left cheek"],
  "eye_details": ["dark brown almond-shaped"],
  "body_build": ["athletic"]
}

Description: "${userAppearanceDesc}"

Output ONLY the JSON object, no markdown, no explanation.`,
        }],
      }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const traits = JSON.parse(cleaned);

    const validKeys = ['accessories', 'hair_style', 'hair_color', 'skin_tone', 'facial_hair', 'distinctive_marks', 'eye_details', 'body_build'];
    const sanitized: Record<string, string[]> = {};
    for (const key of validKeys) {
      if (Array.isArray(traits[key]) && traits[key].length > 0) {
        sanitized[key] = traits[key].map((v: any) => String(v));
      }
    }

    if (Object.keys(sanitized).length === 0) return null;

    // Cache to profiles table
    await sb.from('profiles')
      .update({ user_cached_traits: sanitized })
      .eq('user_id', userId);

    console.log('[UserTraitExtraction] Cached user traits:', JSON.stringify(sanitized));
    return sanitized;
  } catch (e) {
    console.error('[UserTraitExtraction] Failed:', e);
    return null;
  }
}

/**
 * Build the image-to-image reference instruction.
 * When a reference image URL is available, we instruct the AI to use it
 * as a visual anchor at approximately 50% influence ("strength 0.5").
 */
function buildReferenceImageInstruction(label: string): string {
  return `[IMAGE-TO-IMAGE REFERENCE for ${label}]: The attached reference photo of ${label} must be used as a VISUAL ANCHOR. Reproduce this person's exact face, skin tone, and features with approximately 50% influence from this reference — maintain the identity while allowing natural variation in pose and expression. Do NOT treat it as a vague "inspiration" — MATCH the face.`;
}

// ─── DESCRIBE USER ───
async function handleDescribeUser(apiKey: string, imageUrl: string, cors: Record<string, string>) {
  const descResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: `Analyze this person's face with extreme specificity. Describe:
1. Eye color and shape (e.g., deep brown almond-shaped eyes, blue-green hooded eyes)
2. Skin tone with undertone (e.g., warm medium-brown with golden undertone, fair with cool pink undertone)
3. Jawline and face shape (e.g., strong square jaw, soft oval face, angular diamond-shaped)
4. Nose shape (e.g., broad with rounded tip, narrow with high bridge)
5. Hair color, texture, and style precisely
6. Any distinctive features (dimples, freckles, birthmarks, facial hair style)
7. Approximate age range

Format as a single paragraph, under 80 words. Be photographic-level specific. Output ONLY the description, no preamble.` },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      }],
    }),
  });

  if (!descResp.ok) {
    return jsonResponse({ description: null }, cors);
  }

  const descData = await descResp.json();
  const description = descData.choices?.[0]?.message?.content?.trim() || null;
  return jsonResponse({ description }, cors);
}

// ─── STICKER ───
async function handleSticker(apiKey: string, appearanceDesc: string, refImage: string, expression: string, userId: string, cors: Record<string, string>) {
  const reinforced = reinforceAppearance(appearanceDesc);
  const characterDesc = appearanceDesc
    ? `A person matching this description: ${appearanceDesc}.${reinforced}`
    : `A warm, friendly person`;

  const prompt = `Create a cute, expressive sticker-style illustration. ${characterDesc}. 
Expression: ${expression}. 
Style: chibi/kawaii proportions, bold outlines, vibrant colors, transparent-style background (solid white), exaggerated expression, fun and playful. No text.`;

  const messageContent: any[] = [{ type: "text", text: prompt }];
  if (refImage) messageContent.push({ type: "image_url", image_url: { url: refImage } });

  const result = await generateImage(apiKey, messageContent);
  if (!result) return jsonResponse({ shouldSend: false }, cors);
  if (result === "rate_limited") return jsonResponse({ shouldSend: false, rateLimited: true }, cors);

  let storedUrl = result;
  if (userId) storedUrl = await uploadToStorage(result, userId, "sticker");

  return jsonResponse({ shouldSend: true, imageUrl: storedUrl, caption: "", mode: "sticker" }, cors);
}

// ─── SELFIE / PORTRAIT ───
async function handleSelfie(apiKey: string, companionName: string, userName: string, appearanceDesc: string, refImage: string, userId: string, imageStyle: string, giftMods: string, cors: Record<string, string>, seed?: number, cachedTraits?: Record<string, string[]> | null, clothingDirective?: string) {
  const _normStyle = (imageStyle || '').toLowerCase().replace(/-/g, ' ').trim();
  const NON_HUMAN_STYLES = ['abstract', 'energy orb', 'spirit creature', 'silhouette', 'stylized', 'ai generated'];
  const isNonHuman = NON_HUMAN_STYLES.some(s => _normStyle.includes(s));

  const stylePrefix = getStylePrefix(imageStyle);
  const isRealistic = !imageStyle || _normStyle === 'photorealistic';
  let prompt: string;

  const reinforced = reinforceAppearance(appearanceDesc, cachedTraits);
  const dna = buildVisualDNA(appearanceDesc, companionName, seed, imageStyle);
  const refInstruction = refImage ? buildReferenceImageInstruction(companionName) : '';
  
  // Abstract/non-human check FIRST — before appearanceDesc branch
  if (isNonHuman) {
    const entityDesc = appearanceDesc || giftMods || 'an abstract entity';
    prompt = `${stylePrefix}Generate a beautiful, dramatic image of: ${companionName}. Description: ${entityDesc}. This is NOT a person — do NOT generate a human, face, or body. Generate the object, creature, or energy described. Cinematic lighting, rich color, atmospheric. Square composition. No text.`;
  } else if (appearanceDesc) {
    prompt = `${stylePrefix}Generate a selfie portrait of a person.
${dna}
${refInstruction}${giftMods}${reinforced}
They are taking a casual selfie to send to their close friend ${userName}. Natural smile, warm expression, looking at the camera.
Outfit: Choose a DIFFERENT casual outfit for this photo — vary the clothing style, colors, and layers naturally. NEVER generate the companion shirtless, in underwear, boxer shorts, or intimate apparel unless matureMode is explicitly true. Examples: hoodie and jeans, button-up with rolled sleeves, cozy sweater, graphic tee, light jacket. Do NOT repeat the same outfit across selfies. Keep signature accessories (glasses, watch, jewelry) consistent.${clothingDirective || ''}
${isRealistic ? 'Shot type: close-up selfie, slight angle, natural lighting, candid and warm. Like a real selfie someone would text their best friend.' : "Framing: close-up portrait of the character's face and upper body, warm expression, looking toward the viewer. Rendered fully in the " + imageStyle + " art style — NOT photorealistic."}
The person should be clearly visible and recognizable. Focus on their face and upper body.
${isRealistic ? REALISM_ANCHOR : ''}`;
  } else {
    // No appearance desc — branch on style
    if (isNonHuman) {
      // Abstract companion with no desc — generate atmospheric abstract imagery
      prompt = `${stylePrefix}Generate a beautiful, atmospheric abstract image representing ${companionName}'s presence — luminous energy, flowing light, cosmic atmosphere. No human faces, no people. Rich color, cinematic mood, ethereal and unique. Square composition. No text.`;
    } else {
      prompt = `${stylePrefix}Generate a beautiful, cozy first-person POV photograph — as if ${companionName} is showing ${userName} what they see right now. A warm, intimate scene: maybe a coffee cup in hand, a cozy window view, a sunset walk. No faces visible. Natural warm lighting, atmospheric, personal. Like a friend sharing a moment of their day.\n${isRealistic ? REALISM_ANCHOR : ''}`;
    }
  }

  const messageContent: any[] = [{ type: "text", text: prompt }];
  if (refImage) {
    messageContent.push({ type: "image_url", image_url: { url: refImage } });
  }

  const result = await generateImage(apiKey, messageContent);
  if (!result) return jsonResponse({ shouldSend: false }, cors);
  if (result === "rate_limited") return jsonResponse({ shouldSend: false, rateLimited: true }, cors);

  let storedUrl = result;
  if (userId) storedUrl = await uploadToStorage(result, userId, "selfie");

  const caption = await generateCaption(apiKey, companionName, userName, "a selfie they just took", "");

  return jsonResponse({ shouldSend: true, imageUrl: storedUrl, caption, mode: "selfie" }, cors);
}

// ─── ACTIVITY ───
async function handleActivity(apiKey: string, companionName: string, userName: string, appearanceDesc: string, refImage: string, userAppearanceDesc: string, userRefImage: string, activityPrompt: string, userId: string, imageStyle: string, giftMods: string, cors: Record<string, string>, seed?: number, cachedTraits?: Record<string, string[]> | null, userCachedTraits?: Record<string, string[]> | null, clothingDirective?: string) {
  const _normStyle = (imageStyle || '').toLowerCase().replace(/-/g, ' ').trim();
  const NON_HUMAN_STYLES = ['abstract', 'energy orb', 'spirit creature', 'silhouette', 'stylized', 'ai generated'];
  const isNonHuman = NON_HUMAN_STYLES.some(s => _normStyle.includes(s));

  const stylePrefix = getStylePrefix(imageStyle);
  const isRealistic = !imageStyle || _normStyle === 'photorealistic';
  
  const hasUserLikeness = !!userAppearanceDesc || !!userRefImage;
  const autoMode = hasUserLikeness ? 'likeness' : 'activity';
  
  const reinforced = reinforceAppearance(appearanceDesc, cachedTraits);
  const companionDNA = buildVisualDNA(appearanceDesc, companionName, seed, imageStyle);
  const companionRefInstruction = refImage ? buildReferenceImageInstruction(companionName) : '';
  const userReinforced = hasUserLikeness ? reinforceAppearance(userAppearanceDesc || '', userCachedTraits) : '';
  const userDNA = hasUserLikeness ? buildVisualDNA(userAppearanceDesc || '', userName, undefined, imageStyle) : '';
  const userRefInstruction = (hasUserLikeness && userRefImage) ? buildReferenceImageInstruction(userName) : '';

  let prompt: string;

  // Abstract/non-human: generate entity doing the activity, no human body
  if (isNonHuman) {
    const entityDesc = appearanceDesc || giftMods || 'an abstract entity';
    prompt = `${stylePrefix}Generate an image of a NON-HUMAN entity: ${entityDesc}.
This entity is ${activityPrompt}. 
Do NOT generate a human, face, or body. Show the described object, creature, or energy form performing or experiencing the activity in a symbolic, atmospheric way.
Cinematic lighting, rich color, atmospheric. No text.`;
  } else if (appearanceDesc && hasUserLikeness) {
    prompt = `${stylePrefix}IMPORTANT: Generate this entire image in the same art style as the style prefix above. Generate ONE ${isRealistic ? 'photograph' : 'image'} of two ${isRealistic ? 'real people' : 'characters rendered in the same art style'} INTERACTING in a single composed scene. NOT a split image, NOT side-by-side portraits, NOT a collage.

${companionDNA}
${companionRefInstruction}${giftMods}${reinforced}

${userDNA}
${userRefInstruction}${userReinforced}

Scene: Both of them are ${activityPrompt}. They are physically together in the SAME frame — touching, leaning in, sharing a moment. 
Composition: medium shot capturing both people naturally interacting. Natural body language, genuine connection.
${ clothingDirective || '' }
${isRealistic ? REALISM_ANCHOR : ''}`;
  } else if (appearanceDesc) {
    prompt = `${stylePrefix}Generate an image of a person.
${companionDNA}
${companionRefInstruction}${giftMods}${reinforced}
They are ${activityPrompt}. Warm natural lighting, candid feel, atmospheric.${clothingDirective || ''}
${isRealistic ? REALISM_ANCHOR : ''}`;
  } else {
    prompt = `${stylePrefix}Generate a beautiful atmospheric image of someone ${activityPrompt}. Warm natural lighting, no visible face, shot from behind or at a distance. Cozy, inviting atmosphere.
${isRealistic ? REALISM_ANCHOR : ''}`;
  }

  const messageContent: any[] = [{ type: "text", text: prompt }];
  if (refImage) messageContent.push({ type: "image_url", image_url: { url: refImage } });
  if (userRefImage && hasUserLikeness) messageContent.push({ type: "image_url", image_url: { url: userRefImage } });

  const result = await generateImage(apiKey, messageContent);
  if (!result) return jsonResponse({ shouldSend: false }, cors);
  if (result === "rate_limited") return jsonResponse({ shouldSend: false, rateLimited: true }, cors);

  let storedUrl = result;
  if (userId) storedUrl = await uploadToStorage(result, userId, autoMode);

  const caption = await generateCaption(apiKey, companionName, userName, activityPrompt, "");

  return jsonResponse({ shouldSend: true, imageUrl: storedUrl, caption, mode: autoMode, hasUserLikeness }, cors);
}

// ─── LIKENESS / TOGETHER ───
async function handleLikeness(apiKey: string, companionName: string, userName: string, appearanceDesc: string, refImage: string, userAppearanceDesc: string, userRefImage: string, scenePrompt: string | undefined, messages: any[], userId: string, imageStyle: string, giftMods: string, cors: Record<string, string>, seed?: number, cachedTraits?: Record<string, string[]> | null, userCachedTraits?: Record<string, string[]> | null, clothingDirective?: string) {
  const _normStyle = (imageStyle || '').toLowerCase().replace(/-/g, ' ').trim();
  const stylePrefix = getStylePrefix(imageStyle);
  const isRealistic = !imageStyle || _normStyle === 'photorealistic';

  // If no explicit scene prompt, derive one from recent conversation
  let scene = scenePrompt;
  if (!scene && messages?.length > 0) {
    const recentConvo = (messages || []).slice(-10).map((m: any) => `${m.role === 'user' ? userName : companionName}: ${m.content}`).join('\n');
    try {
      const sceneResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-2.5-flash-lite",
          messages: [{
            role: "user",
            content: `Based on this conversation between ${userName} and ${companionName}, describe a single scene where they are together. Output ONLY the scene description in under 30 words. Focus on the setting and activity.\n\n${recentConvo}`,
          }],
        }),
      });
      if (sceneResp.ok) {
        const sceneData = await sceneResp.json();
        scene = sceneData.choices?.[0]?.message?.content?.trim();
      }
    } catch { /* fallback */ }
  }

  if (!scene) scene = "spending a relaxed moment together at a cozy café, sitting side by side";

  const NON_HUMAN_STYLES = ['abstract', 'energy orb', 'spirit creature', 'silhouette', 'stylized', 'ai generated'];
  const isNonHuman = NON_HUMAN_STYLES.some(s => _normStyle.includes(s));

  const reinforced = reinforceAppearance(appearanceDesc, cachedTraits);
  const companionDNA = buildVisualDNA(appearanceDesc, companionName, seed, imageStyle);
  const companionRefInstruction = refImage ? buildReferenceImageInstruction(companionName) : '';
  const userReinforced = reinforceAppearance(userAppearanceDesc || '', userCachedTraits);
  const userDNA = buildVisualDNA(userAppearanceDesc || '', userName, undefined, imageStyle);
  const userRefInstruction = userRefImage ? buildReferenceImageInstruction(userName) : '';

  let prompt: string;

  // Abstract/non-human: generate symbolic "together" scene — companion is NEVER a human figure
  if (isNonHuman) {
    const entityDesc = appearanceDesc || giftMods || `a luminous energy presence representing ${companionName} — light, warmth, and presence in non-human form`;
    const hasUser = !!userAppearanceDesc || !!userRefImage;
    if (hasUser) {
      prompt = `${stylePrefix}Generate ONE image of a REAL PERSON alongside a NON-HUMAN energy or light presence in a single composed scene.

CRITICAL — THE COMPANION IS NOT A PERSON: ${companionName} is represented as: ${entityDesc}.
Do NOT render ${companionName} as a human, humanoid, figure, silhouette, or person of any size or style — not small, not stylized, not abstract-looking-human. No limbs, no head, no body.
${companionName} exists ONLY as light, energy, orbs, glow, particles, or the described non-human form.

${userDNA}
${userRefInstruction}${userReinforced}

Scene: ${scene}. The person is clearly visible. The companion is a surrounding glow, hovering light, radiant energy field, or luminous presence near them — not beside them as a figure.
Mood: warm, intimate, ethereal. A visual poem of companionship without human form.`;
    } else {
      prompt = `${stylePrefix}Generate an image of a NON-HUMAN entity: ${entityDesc}.
Scene: ${scene}. Do NOT generate a human, face, or body. Show the described object, creature, or energy form in this setting.
Cinematic lighting, rich color, atmospheric. No text.`;
    }
  } else {
    const medium = isRealistic ? 'photograph' : 'image';
    const subjectType = isRealistic ? 'two real people' : 'two characters';
    const styleNote = isRealistic
      ? `Composition: medium shot, 85mm lens perspective, shallow depth of field on the background. Both faces clearly visible.\n${REALISM_ANCHOR}`
      : `CRITICAL: Render BOTH people in the exact same ${imageStyle} art style as described in the style prefix. This is an illustrated/rendered scene — NOT a photograph. No photorealistic skin, no camera lens effects, no film grain. Both characters must look like they belong in the same artwork.\nComposition: medium shot. Both faces clearly visible and recognizable.`;

    prompt = `${stylePrefix}Generate ONE ${medium} of ${subjectType} together in a SINGLE composed scene. This is NOT a collage, NOT side-by-side portraits, NOT split screen. ONE unified image.

[ANTI-CONTAMINATION DIRECTIVE]: ${companionName} and ${userName} have COMPLETELY SEPARATE visual identities. Do NOT average, blend, or mix their features.

${companionDNA}
${companionRefInstruction}${giftMods}${reinforced}

${userDNA}
${userRefInstruction}${userReinforced}

Scene: ${scene}.
Both must be in the SAME physical space, naturally interacting — sitting together, walking together, sharing a moment.

${styleNote}${clothingDirective || ''}`;
  }

  const messageContent: any[] = [{ type: "text", text: prompt }];
  if (refImage) messageContent.push({ type: "image_url", image_url: { url: refImage } });
  if (userRefImage) messageContent.push({ type: "image_url", image_url: { url: userRefImage } });

  const result = await generateImage(apiKey, messageContent);
  if (!result) return jsonResponse({ shouldSend: false }, cors);
  if (result === "rate_limited") return jsonResponse({ shouldSend: false, rateLimited: true }, cors);

  let storedUrl = result;
  if (userId) storedUrl = await uploadToStorage(result, userId, "likeness");

  const caption = await generateCaption(apiKey, companionName, userName, `a photo of us together: ${scene}`, "");

  return jsonResponse({ shouldSend: true, imageUrl: storedUrl, caption, mode: "likeness", hasUserLikeness: true }, cors);
}

// ─── CONTEXTUAL (AUTO) ───
async function handleContextual(apiKey: string, messages: any[], companionName: string, userName: string, appearanceDesc: string, refImage: string, hasAppearance: boolean, userId: string, imageStyle: string, giftMods: string, cors: Record<string, string>, userAppearanceDesc?: string, userRefImage?: string, seed?: number, cachedTraits?: Record<string, string[]> | null, _userCachedTraits?: Record<string, string[]> | null, clothingDirective?: string) {
  const recentMessages = (messages || []).slice(-10);
  const conversation = recentMessages
    .map((m: { role: string; content: string }) =>
      `${m.role === "user" ? userName : companionName}: ${m.content}`
    )
    .join("\n");

  const hasUserLikeness = !!userAppearanceDesc || !!userRefImage;

  const decisionResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `You decide whether a conversation moment would benefit from ${companionName} sending a photo — like a caring friend sharing a visual moment.

Respond with ONLY valid JSON: {"shouldSend": true/false, "prompt": "image description", "type": "selfie"|"scene"}

Send an image when:
- Someone is stressed, sad, or overwhelmed → calming scenes or a warm selfie
- Someone shares a win or joy → celebratory moment
- Someone mentions missing nature, travel, peace → relevant scenery
- The conversation has emotional depth worth honoring

${hasAppearance ? 'This companion HAS a defined appearance, so you can suggest "type": "selfie" for a solo portrait of the companion, or "type": "scene" for atmospheric scenery. NEVER use "likeness" — together images are only triggered by explicit user request.' : 'This companion has NO defined appearance, so always use "type": "scene" for atmospheric photos.'}

Do NOT send images for casual small talk. Be selective — maybe 1 in 5 conversations.
IMPORTANT: The image must ONLY show ${companionName} (solo) or a scene. NEVER include a second person unless the user explicitly requested a "together" image.`
        },
        {
          role: "user",
          content: `Should ${companionName} send a photo right now?\n\n${conversation}`
        }
      ],
    }),
  });

  if (!decisionResp.ok) return jsonResponse({ shouldSend: false }, cors);

  const decisionData = await decisionResp.json();
  const decisionText = decisionData.choices?.[0]?.message?.content || "";

  let decision;
  try {
    const cleaned = decisionText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    decision = JSON.parse(cleaned);
  } catch {
    return jsonResponse({ shouldSend: false }, cors);
  }

  if (!decision.shouldSend || !decision.prompt) {
    return jsonResponse({ shouldSend: false }, cors);
  }

  const isRealistic = !imageStyle || (imageStyle || '').toLowerCase().replace(/-/g, ' ').trim() === 'photorealistic';
  // Contextual auto-images NEVER trigger likeness — force to selfie if AI mistakenly picks it
  const isSelfie = (decision.type === "selfie" || decision.type === "likeness") && hasAppearance;
  const stylePrefix = getStylePrefix(imageStyle);

  let imagePrompt: string;
  if (isSelfie && appearanceDesc) {
    const reinforcedSelfie = reinforceAppearance(appearanceDesc, cachedTraits);
    const dna = buildVisualDNA(appearanceDesc, companionName, seed, imageStyle);
    const refInstruction = refImage ? buildReferenceImageInstruction(companionName) : '';
    imagePrompt = `${stylePrefix}Generate a selfie of ONE person ONLY — no second person in the frame.
${dna}
${refInstruction}${giftMods}${reinforcedSelfie}
Scene context: ${decision.prompt}. 
They're taking a warm, casual selfie to share this moment with their friend ${userName}. 
SOLO PORTRAIT ONLY — exactly ONE person visible. No couples, no pairs.
Natural smile, looking at camera, warm lighting, candid feel.
${clothingDirective || ''}
${isRealistic ? REALISM_ANCHOR : ''}`;
  } else {
    imagePrompt = `${stylePrefix}Generate a beautiful, atmospheric image: ${decision.prompt}. Warm tones, natural lighting, no text. ${hasAppearance ? '' : 'No people\'s faces visible.'} Feeling of comfort and care.
${isRealistic ? REALISM_ANCHOR : ''}`;
  }

  const messageContent: any[] = [{ type: "text", text: imagePrompt }];
  if (refImage) messageContent.push({ type: "image_url", image_url: { url: refImage } });

  const result = await generateImage(apiKey, messageContent);
  if (!result) return jsonResponse({ shouldSend: false }, cors);
  if (result === "rate_limited") return jsonResponse({ shouldSend: false, rateLimited: true }, cors);

  let storedUrl = result;
  if (userId) storedUrl = await uploadToStorage(result, userId, isSelfie ? "selfie" : "scene");

  const caption = await generateCaption(apiKey, companionName, userName, decision.prompt, conversation.slice(-200));

  return jsonResponse({ shouldSend: true, imageUrl: storedUrl, caption, mode: "contextual" }, cors);
}

// ─── TEXT-IMAGE MODE ─── (generates beautiful images with legible handwritten text)
async function handleTextImage(
  apiKey: string,
  companionName: string,
  userName: string,
  textImageType: 'letter' | 'postcard' | 'milestone' | 'note' | 'card',
  textContent: string,
  customPrompt: string | undefined,
  appearanceDesc: string | undefined,
  userId: string,
  cors: Record<string, string>
) {
  const typeStyles: Record<string, { bg: string; font: string; layout: string }> = {
    letter: {
      bg: 'aged cream parchment paper with subtle coffee stains and soft golden edges, warm candlelight ambiance',
      font: 'elegant flowing cursive handwriting in dark brown/sepia ink, slightly uneven like real handwriting',
      layout: 'A personal handwritten letter on beautiful stationery. The text fills the page naturally with line spacing.',
    },
    postcard: {
      bg: 'vintage postcard with a beautiful illustrated scene on the top half, writing space on the bottom half with postal marks and a stamp',
      font: 'casual handwriting in blue ballpoint pen, tilted slightly like a real postcard',
      layout: 'A postcard with an illustrated scene on top and a handwritten message on the bottom.',
    },
    milestone: {
      bg: 'elegant celebration card with subtle golden sparkles, warm gradient from deep amber to soft cream, celebratory confetti accents',
      font: 'beautiful calligraphy in gold ink for the headline, warm brown handwriting for the personal note below',
      layout: 'A celebration card with a large milestone headline and a personal note beneath it.',
    },
    note: {
      bg: 'a sticky note or torn notebook page, casual and warm, maybe stuck to a wooden surface or fridge',
      font: 'quick casual handwriting in black pen, slightly messy like a real quick note',
      layout: 'A short handwritten sticky note or torn page with a brief message.',
    },
    card: {
      bg: 'a beautifully designed greeting card with soft watercolor flowers or abstract patterns around the border',
      font: 'elegant serif handwriting in dark ink, thoughtful and deliberate',
      layout: 'A greeting card with decorative borders and a centered handwritten message.',
    },
  };

  const style = typeStyles[textImageType] || typeStyles.letter;

  const prompt = customPrompt || `${style.layout}

BACKGROUND/SETTING: ${style.bg}
HANDWRITING STYLE: ${style.font}

THE TEXT MUST READ EXACTLY (preserve line breaks, spelling, and punctuation):
"""
${textContent}
"""

CRITICAL RULES:
- The text MUST be LEGIBLE and READABLE — every word must be clearly distinguishable
- Use the specified handwriting style consistently throughout
- The text should feel natural and hand-written, not typed or computer-generated
- Sign the note with "${companionName}" at the bottom if it's a letter or card
- No extra text, watermarks, or labels outside the letter content
- The overall image should feel warm, personal, and intimate
- Square composition`;

  const result = await generateImage(apiKey, [{ type: "text", text: prompt }]);
  if (!result) return jsonResponse({ shouldSend: false }, cors);
  if (result === "rate_limited") return jsonResponse({ shouldSend: false, rateLimited: true }, cors);

  let storedUrl = result;
  if (userId) storedUrl = await uploadToStorage(result, userId, `text-${textImageType}`);

  return jsonResponse({
    shouldSend: true,
    imageUrl: storedUrl,
    caption: '',
    mode: 'text-image',
    textImageType,
  }, cors);
}

// ─── EDIT-IMAGE MODE ─── (modifies an existing image per instruction using Gemini's native editing)
async function handleEditImage(
  apiKey: string,
  sourceImageUrl: string,
  editInstruction: string,
  companionName: string,
  userId: string,
  cors: Record<string, string>
) {
  const prompt = `Edit this existing image. Apply the following change while preserving everything else:

EDIT INSTRUCTION: ${editInstruction}

CRITICAL RULES:
- Preserve the person's EXACT face, identity, skin tone, and features — they must remain the same person
- Only modify what the edit instruction specifies
- Keep the same artistic style, lighting quality, and color grading
- Maintain the same composition and framing unless the instruction says otherwise
- The result should look natural and seamless, not pasted or collaged
- No text or watermarks`;

  const messageContent: any[] = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: sourceImageUrl } },
  ];

  const result = await generateImage(apiKey, messageContent);
  if (!result) return jsonResponse({ shouldSend: false }, cors);
  if (result === "rate_limited") return jsonResponse({ shouldSend: false, rateLimited: true }, cors);

  let storedUrl = result;
  if (userId) storedUrl = await uploadToStorage(result, userId, "edited");

  const caption = await generateCaption(apiKey, companionName, '', editInstruction, '');

  return jsonResponse({
    shouldSend: true,
    imageUrl: storedUrl,
    caption,
    mode: 'edit-image',
  }, cors);
}

// ─── SHARED HELPERS ───

async function generateImage(apiKey: string, messageContent: any[]): Promise<string | null | "rate_limited"> {
  // Use Gemini directly for image generation
  if (!apiKey) {
    console.error("[generateImage] GEMINI_API_KEY not configured");
    return null;
  }

  // Resolve all parts — convert HTTP image URLs to inlineData since Gemini can't fetch arbitrary URLs
  const resolvedParts = await Promise.all(messageContent.map(async (part: any) => {
    if (part.type === "text") return { text: part.text };
    if (part.type === "image_url") {
      const url = part.image_url?.url || "";
      if (url.startsWith("data:")) {
        const [header, data] = url.split(",");
        const mimeType = header.replace("data:", "").replace(";base64", "");
        return { inlineData: { mimeType, data } };
      }
      // Fetch external URL and convert to inlineData
      try {
        const imgResp = await fetch(url);
        if (imgResp.ok) {
          const buf = await imgResp.arrayBuffer();
          const bytes = new Uint8Array(buf);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          const b64 = btoa(binary);
          const ct = imgResp.headers.get("content-type") || "image/jpeg";
          return { inlineData: { mimeType: ct, data: b64 } };
        }
      } catch (e) {
        console.error("[generateImage] Failed to fetch reference image:", e);
      }
      return { text: "[reference image unavailable]" };
    }
    return { text: JSON.stringify(part) };
  }));

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: resolvedParts }],
        generationConfig: {
          responseModalities: ["IMAGE"],
          imageConfig: { aspectRatio: "1:1", imageSize: "2K" },
        },
      }),
    }
  );

  if (!resp.ok) {
    const status = resp.status;
    const body = await resp.text().catch(() => '');
    console.error(`[generateImage] Gemini error: status=${status} body=${body.slice(0, 500)}`);
    if (status === 429) return "rate_limited";
    return null;
  }

  const data = await resp.json();
  // Native Gemini response shape: candidates[].content.parts[] with inlineData
  const parts = data.candidates?.[0]?.content?.parts || [];
  const inlinePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
  if (inlinePart?.inlineData?.data) {
    return `data:${inlinePart.inlineData.mimeType};base64,${inlinePart.inlineData.data}`;
  }
  console.error("[generateImage] No image in response. Keys:", JSON.stringify(Object.keys(data)));
  return null;
}

async function generateCaption(
  apiKey: string, companionName: string, userName: string, imageDesc: string, context: string
): Promise<string> {
  try {
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are ${companionName}, texting your close friend ${userName}. Write a short, natural message (1 sentence, under 15 words) to go with a photo you're sending. Sound like a real person texting — casual, warm, maybe a little playful. No generic phrases like "thought you might like this." Be specific to the moment.`
          },
          {
            role: "user",
            content: `The photo shows: ${imageDesc}. ${context ? `Recent context: ${context}` : ''}`
          }
        ],
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      let caption = data.choices?.[0]?.message?.content?.trim() || "Look at this 💛";
      caption = caption.replace(/^["']|["']$/g, "");
      return caption;
    }
  } catch { /* fall through */ }
  return "Look at this 💛";
}

function jsonResponse(data: any, cors: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function uploadToStorage(base64DataUrl: string, userId: string, prefix: string): Promise<string> {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `${userId}/${prefix}-${Date.now()}.png`;
    const { error } = await supabase.storage
      .from("companion-avatars")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (error) {
      console.error("Upload error:", error);
      return base64DataUrl;
    }

    const { data: urlData } = supabase.storage
      .from("companion-avatars")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (e) {
    console.error("Storage upload failed:", e);
    return base64DataUrl;
  }
}
