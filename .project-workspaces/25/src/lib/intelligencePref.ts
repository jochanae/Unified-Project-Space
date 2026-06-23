/**
 * Intelligence Preference — central resolver for which AI provider
 * (ChatGPT or Perplexity) handles a given Deep Dive surface.
 *
 * - "smart" (default): we pick per-surface based on the SURFACE_DEFAULTS map.
 *   Linguistic/citation work → Perplexity. Practical/creative → ChatGPT.
 * - "chatgpt" | "perplexity": user override; always wins regardless of surface.
 *
 * Stored on `profiles.preferred_ai_provider` so it follows the user across
 * devices.
 */

import type { DeepDiveProvider } from "@/lib/deepDive";

export type IntelligencePref = "smart" | "chatgpt" | "perplexity";

/**
 * Surface IDs are stable strings. Keep in sync with callsites:
 *   - "blueprint:passage"          → primary Deep Dive on a Blueprint passage
 *   - "blueprint:linguistic"       → linguistic root chip inside a Blueprint
 *   - "reader:verse-menu"          → per-verse Deep Dive in the reader
 *   - "reader:header-tray"         → header passage Deep Dive
 *   - "reader:custom-inquiry"      → user-typed Seek Wisdom prompt
 */
export type DeepDiveSurface =
  | "blueprint:passage"
  | "blueprint:linguistic"
  | "reader:verse-menu"
  | "reader:header-tray"
  | "reader:custom-inquiry";

const SURFACE_DEFAULTS: Record<DeepDiveSurface, DeepDiveProvider> = {
  // Linguistic/scholarly work → Perplexity (better citations).
  "blueprint:linguistic": "Perplexity",
  // Creative/practical synthesis → ChatGPT.
  "blueprint:passage": "ChatGPT",
  "reader:custom-inquiry": "ChatGPT",
  // Reader surfaces stay on ChatGPT to match historical UX.
  "reader:verse-menu": "ChatGPT",
  "reader:header-tray": "ChatGPT",
};

export function resolveProvider(
  pref: IntelligencePref | null | undefined,
  surface: DeepDiveSurface,
): DeepDiveProvider {
  if (pref === "chatgpt") return "ChatGPT";
  if (pref === "perplexity") return "Perplexity";
  return SURFACE_DEFAULTS[surface];
}

export function isIntelligencePref(value: unknown): value is IntelligencePref {
  return value === "smart" || value === "chatgpt" || value === "perplexity";
}
