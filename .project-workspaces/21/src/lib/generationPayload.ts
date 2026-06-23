/**
 * generationPayload — single source of truth for every generate-avatar call.
 *
 * Rules:
 * - pathType ('face' | 'abstract') is the HARD SWITCH — never inferred from keywords
 * - visualStyle is always explicit — never silently defaulted
 * - appearanceDescription is always meaningful — never a generic phrase that triggers bias
 * - referenceImageUrl when present means "preserve this person's features"
 * - mode: 'full' = generate from scratch or with reference, 'restyle' = change outfit/details only
 * - mode: 'upload' = user uploaded a photo — use it as reference, preserve likeness
 */

import type { Connection, Profile } from '@/hooks/useProfile';

export type GenerationPathType = 'face' | 'abstract';
export type GenerationMode = 'full' | 'restyle' | 'upload' | 'text-image' | 'edit-image';

export const ABSTRACT_STYLES = new Set([
  'abstract', 'ai generated', 'ai-generated', 'cosmic / energy',
  'cosmic', 'energy',
]);

export function isAbstractStyle(style?: string | null): boolean {
  if (!style) return false;
  return ABSTRACT_STYLES.has(style.toLowerCase().trim());
}

/**
 * Derive pathType and visualStyle from a connection record.
 * Used when regenerating from chat or auto-generation.
 */
export function deriveStyleFromConnection(
  connection: Connection,
  profile?: Profile | null
): { pathType: GenerationPathType; visualStyle: string } {
  const imageStyle = connection.imageStyle || profile?.imageStyle || 'photorealistic';
  return {
    pathType: isAbstractStyle(imageStyle) ? 'abstract' : 'face',
    visualStyle: imageStyle,
  };
}

/**
 * Safe appearance description — never returns a bias-triggering generic phrase.
 */
export function safeAppearanceDescription(
  description: string | undefined | null,
  pathType: GenerationPathType,
  fallbackHint?: string
): string {
  if (description?.trim()) return description.trim();

  if (pathType === 'abstract') {
    return fallbackHint || 'A warm luminous energy presence — flowing light, rich colors, no human features';
  }

  return fallbackHint || 'A warm and approachable person with authentic features and a genuine expression.';
}

export interface GenerationPayload {
  appearanceDescription: string;
  userId: string;
  visualStyle: string;
  pathType: GenerationPathType;
  mode: GenerationMode;
  memberId?: string;
  referenceImageUrl?: string;
  equippedGiftModifiers?: string;
  changedDetails?: string;
  /** When true, generate-avatar skips non-mature clothing guardrails for gift modifiers */
  matureMode?: boolean;
  companionRole?: string;
}

interface BuildPayloadOptions {
  userId: string;
  pathType?: GenerationPathType;       // if omitted, derived from visualStyle
  visualStyle?: string | null;
  appearanceDescription?: string | null;
  memberId?: string | null;
  referenceImageUrl?: string | null;
  equippedGiftModifiers?: string | null;
  mode?: GenerationMode;
  changedDetails?: string | null;
  matureMode?: boolean | null;
  companionRole?: string | null;
}

export function buildGenerationPayload(opts: BuildPayloadOptions): GenerationPayload {
  const visualStyle = opts.visualStyle || 'photorealistic';
  const pathType = opts.pathType ?? (isAbstractStyle(visualStyle) ? 'abstract' : 'face');
  const mode = opts.mode || 'full';
  const appearanceDescription = safeAppearanceDescription(opts.appearanceDescription, pathType);

  return {
    appearanceDescription,
    userId: opts.userId,
    visualStyle,
    pathType,
    mode,
    ...(opts.memberId ? { memberId: opts.memberId } : {}),
    ...(opts.referenceImageUrl ? { referenceImageUrl: opts.referenceImageUrl } : {}),
    ...(opts.equippedGiftModifiers ? { equippedGiftModifiers: opts.equippedGiftModifiers } : {}),
    ...(opts.changedDetails ? { changedDetails: opts.changedDetails } : {}),
    ...(typeof opts.matureMode === 'boolean' ? { matureMode: opts.matureMode } : {}),
    ...(opts.companionRole !== undefined && opts.companionRole !== null ? { companionRole: opts.companionRole } : {}),
  };
}
