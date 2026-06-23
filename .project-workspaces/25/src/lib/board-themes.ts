/**
 * Board theme variants — colors used by the public board page and the OG share card.
 * Keep in sync with the DB check constraint on `boards.theme`.
 */

export type BoardThemeId =
  | "obsidian-gold"
  | "midnight-ivory"
  | "emerald-gold"
  | "parchment-ink"
  | "slate-pearl"
  | "burgundy-rose";

export interface BoardThemeTokens {
  id: BoardThemeId;
  label: string;
  description: string;
  // Hex values used both in CSS-in-JS for the public page and in the OG SVG.
  bg: string;
  surface: string;
  hairline: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  /**
   * Outer-edge color used by the page-level radial gradient.
   * For dark themes: a slightly deeper shade of bg (subtle vignette).
   * For light themes: a slightly warmer/cooler shade of bg (NEVER black).
   * Hardcoding #050505 here was bleeding a black halo over light themes.
   */
  vignette: string;
  /** True for light-mode themes — used for any conditional contrast logic. */
  isLight?: boolean;
}

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeTokens> = {
  "obsidian-gold": {
    id: "obsidian-gold",
    label: "Obsidian & Gold",
    description: "Deep black with warm gold — the SanctumIQ default.",
    bg: "#0a0a0a",
    surface: "#141414",
    hairline: "#2a2418",
    text: "#f5f1e8",
    textMuted: "#a39884",
    accent: "#c9a84c",
    accentSoft: "#e0c574",
    vignette: "#050505",
  },
  "midnight-ivory": {
    id: "midnight-ivory",
    label: "Midnight & Ivory",
    description: "Indigo night with ivory and soft silver.",
    bg: "#0d1124",
    surface: "#171b35",
    hairline: "#2d3358",
    text: "#f4f1e6",
    textMuted: "#a8aac8",
    accent: "#e8e2cf",
    accentSoft: "#bfc6e0",
    vignette: "#04060f",
  },
  "emerald-gold": {
    id: "emerald-gold",
    label: "Emerald & Gold",
    description: "Forest emerald grounded in old gold.",
    bg: "#070d0a",
    surface: "#0c1612",
    hairline: "#23362c",
    text: "#f1ebd8",
    textMuted: "#a8b8af",
    accent: "#c9a84c",
    accentSoft: "#dcc97a",
    vignette: "#020503",
  },
  "parchment-ink": {
    id: "parchment-ink",
    label: "Parchment & Ink",
    description: "Warm parchment with deep ink and gold — daylight sanctuary.",
    bg: "#f5efe1",
    surface: "#ebe2cd",
    hairline: "#cdbf9d",
    text: "#1a1814",
    textMuted: "#5a5343",
    accent: "#8a6a1f",
    accentSoft: "#a98439",
    // Light theme: vignette is a slightly DEEPER parchment — never black.
    vignette: "#e3d8bd",
    isLight: true,
  },
  "slate-pearl": {
    id: "slate-pearl",
    label: "Slate & Pearl",
    description: "Cool blue-slate with pearl text and silver — contemplative dusk.",
    bg: "#0c1119",
    surface: "#161d2a",
    hairline: "#2a3548",
    text: "#eef1f6",
    textMuted: "#9ca8bd",
    accent: "#c8d2e2",
    accentSoft: "#9bb0d0",
    vignette: "#04070c",
  },
  "burgundy-rose": {
    id: "burgundy-rose",
    label: "Burgundy & Rose Gold",
    description: "Deep wine grounded in warm rose gold — devotional warmth.",
    bg: "#180a0d",
    surface: "#261116",
    hairline: "#42202a",
    text: "#f6ecdf",
    textMuted: "#c2a094",
    accent: "#d49a7a",
    accentSoft: "#e6b89a",
    vignette: "#080304",
  },
};

export const DEFAULT_THEME: BoardThemeId = "obsidian-gold";

export function resolveTheme(id: string | null | undefined): BoardThemeTokens {
  if (id && id in BOARD_THEMES) return BOARD_THEMES[id as BoardThemeId];
  return BOARD_THEMES[DEFAULT_THEME];
}

export function themeToCssVars(t: BoardThemeTokens): React.CSSProperties {
  return {
    // Local CSS custom properties — scoped to the board container.
    ["--bt-bg" as string]: t.bg,
    ["--bt-surface" as string]: t.surface,
    ["--bt-hairline" as string]: t.hairline,
    ["--bt-text" as string]: t.text,
    ["--bt-text-muted" as string]: t.textMuted,
    ["--bt-accent" as string]: t.accent,
    ["--bt-accent-soft" as string]: t.accentSoft,
  } as React.CSSProperties;
}
