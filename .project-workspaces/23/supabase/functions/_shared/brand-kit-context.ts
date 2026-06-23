// Shared helper to load + summarize the active brand kit for an org.
// MarQ AI edge functions call this so generated copy & images respect
// the user's brand voice, palette, and visual identity.
//
// Returns a compact context block ready to inline into a system prompt,
// or null if no kit exists.

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export interface BrandKitContext {
  name: string;
  voice?: string;          // tone of voice, e.g. "warm authority"
  audience?: string;
  positioning?: string;
  taglines?: string[];
  bannedWords?: string[];
  primaryColor?: string;   // hex
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontHeading?: string;
  fontBody?: string;
  logoUrl?: string;
  visualStyle?: string;    // e.g. "cinematic, high-contrast, obsidian"
  promptBlock: string;     // formatted text block to inject into LLM system prompt
}

/**
 * Load the active brand kit for an org. Prefers the default kit; falls back
 * to the most recently updated kit. Returns null if none exist.
 */
export async function loadBrandKitContext(
  supabaseUrl: string,
  supabaseKey: string,
  authHeader: string,
  orgId?: string,
): Promise<BrandKitContext | null> {
  if (!orgId) return null;

  try {
    const sb = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data, error } = await sb
      .from("brand_kits")
      .select("name, kit, is_default, updated_at")
      .eq("org_id", orgId)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const row = data[0] as any;
    const kit = (row.kit ?? {}) as Record<string, any>;

    // The kit JSONB schema is loose — pluck whatever the user has filled in.
    const ctx: BrandKitContext = {
      name: row.name || "Brand",
      voice: kit.voice || kit.tone || kit.voiceTone,
      audience: kit.audience || kit.targetAudience,
      positioning: kit.positioning || kit.valueProp,
      taglines: Array.isArray(kit.taglines) ? kit.taglines.slice(0, 3) : undefined,
      bannedWords: Array.isArray(kit.bannedWords) ? kit.bannedWords.slice(0, 12) : undefined,
      primaryColor: kit.primaryColor || kit.colors?.primary,
      accentColor: kit.accentColor || kit.colors?.accent,
      backgroundColor: kit.backgroundColor || kit.colors?.background,
      textColor: kit.textColor || kit.colors?.text,
      fontHeading: kit.fontHeading || kit.fonts?.heading,
      fontBody: kit.fontBody || kit.fonts?.body,
      logoUrl: kit.logoUrl || kit.logo?.url,
      visualStyle: kit.visualStyle || kit.aesthetic,
      promptBlock: "",
    };

    ctx.promptBlock = formatBrandKitPrompt(ctx);
    return ctx;
  } catch (e) {
    console.error("loadBrandKitContext error:", e);
    return null;
  }
}

/**
 * Format the kit into a tight brand-voice block for an LLM system prompt.
 * Keep it short — every token here is paid attention.
 */
export function formatBrandKitPrompt(ctx: BrandKitContext): string {
  const lines: string[] = [
    `## Active Brand Kit: "${ctx.name}" — every line of copy MUST sound like this brand.`,
  ];
  if (ctx.voice) lines.push(`- Voice/Tone: ${ctx.voice}`);
  if (ctx.positioning) lines.push(`- Positioning: ${ctx.positioning}`);
  if (ctx.audience) lines.push(`- Audience: ${ctx.audience}`);
  if (ctx.taglines?.length) lines.push(`- Reference taglines: ${ctx.taglines.join(" | ")}`);
  if (ctx.bannedWords?.length) lines.push(`- Banned words/phrases (NEVER use): ${ctx.bannedWords.join(", ")}`);
  if (ctx.visualStyle) lines.push(`- Visual style: ${ctx.visualStyle}`);

  const palette: string[] = [];
  if (ctx.primaryColor) palette.push(`primary ${ctx.primaryColor}`);
  if (ctx.accentColor) palette.push(`accent ${ctx.accentColor}`);
  if (ctx.backgroundColor) palette.push(`bg ${ctx.backgroundColor}`);
  if (ctx.textColor) palette.push(`text ${ctx.textColor}`);
  if (palette.length) lines.push(`- Palette: ${palette.join(", ")}`);

  const fonts: string[] = [];
  if (ctx.fontHeading) fonts.push(`heading ${ctx.fontHeading}`);
  if (ctx.fontBody) fonts.push(`body ${ctx.fontBody}`);
  if (fonts.length) lines.push(`- Fonts: ${fonts.join(", ")}`);

  return lines.join("\n");
}
