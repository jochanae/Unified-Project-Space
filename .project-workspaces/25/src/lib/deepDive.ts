// Shared Deep Dive context + link builders so the header and verse menu
// stay in sync and prompts are cheap to recompute on every scroll tick.

export type DeepDiveContext = {
  book: string;
  chapter: number;
  verseStart: number | null;
  verseEnd: number | null;
};

export type DeepDiveProvider = "ChatGPT" | "Perplexity";

export type DeepDiveLink = {
  label: DeepDiveProvider;
  /** Canonical web URL with the prompt prefilled. */
  href: string;
  /** Native app URI scheme (e.g. `chatgpt://...`) — try first on mobile. */
  nativeHref: string;
  /**
   * Reserved for providers that ignore URL query params and need a clipboard
   * handoff (none currently). Kept on the type so the UI handoff logic
   * remains intact if such a provider is added back later.
   */
  requiresClipboardHandoff?: boolean;
  /** The prompt text — also what gets copied when handoff is required. */
  prompt: string;
};

export function formatPassageReference(context: DeepDiveContext): string {
  if (!context.book) return "";
  if (context.verseStart) {
    const range =
      context.verseEnd && context.verseEnd !== context.verseStart
        ? `${context.verseStart}-${context.verseEnd}`
        : `${context.verseStart}`;
    return `${context.book} ${context.chapter}:${range}`;
  }
  return `${context.book} ${context.chapter}`;
}

/**
 * Canonical builder for the prefilled "Deep Dive" prompt that the provider
 * buttons send. Used by both the verse menu and the header tray.
 */
export function buildDeepDivePrompt(
  reference: string,
  verseText: string,
  context: DeepDiveContext,
): string {
  const passage = formatPassageReference(context) || reference;
  const parts = [
    `Research this Bible passage with precise context: ${passage}.`,
    `Reference label: ${reference}.`,
  ];
  if (verseText) parts.push(`Quoted text: "${verseText}"`);
  parts.push(
    "Include historical context, literary context, key themes, and major cross-references.",
  );
  return parts.join(" ");
}

/**
 * Canonical builder for the user-authored "Seek Wisdom" inquiry prompt.
 * Single source of truth shared by the verse menu and header tray composers.
 */
export function buildDeepDiveCustomPrompt({
  reference,
  verseText,
  context,
  question,
}: {
  reference: string;
  verseText?: string;
  context: DeepDiveContext;
  question: string;
}): string {
  const passage = formatPassageReference(context) || reference;
  const parts: string[] = [`Context passage: ${passage}.`];
  if (verseText) parts.push(`Quoted text: "${verseText}"`);
  parts.push(`My question: ${question}`);
  return parts.join(" ");
}

function buildLinkPair(provider: DeepDiveProvider, prompt: string) {
  const encoded = encodeURIComponent(prompt);
  if (provider === "ChatGPT") {
    return {
      // Native iOS/Android ChatGPT app deep link with prompt prefill.
      nativeHref: `chatgpt://?q=${encoded}`,
      href: `https://chatgpt.com/?q=${encoded}`,
    };
  }
  // Perplexity native scheme (iOS/Android app).
  return {
    nativeHref: `perplexity://search?q=${encoded}`,
    href: `https://www.perplexity.ai/search?q=${encoded}`,
  };
}

export function buildDeepDiveLinks(prompt: string): DeepDiveLink[] {
  return (["ChatGPT", "Perplexity"] as const).map((label) => {
    const { href, nativeHref } = buildLinkPair(label, prompt);
    return { label, href, nativeHref, prompt };
  });
}

/**
 * Build a single provider link from a custom prompt — used by the
 * "Seek Wisdom" composer so it shares the exact same link contract.
 */
export function buildDeepDiveLink(provider: DeepDiveProvider, prompt: string): DeepDiveLink {
  const { href, nativeHref } = buildLinkPair(provider, prompt);
  return { label: provider, href, nativeHref, prompt };
}

/**
 * Bible translations offered as one-tap version chips next to the standard
 * Deep Dive buttons. The user is reading KJV/ASV in-app; these chips ask the
 * destination AI to surface the passage in a different translation. Cost to
 * us is $0 — the link-out pattern is unchanged.
 */
export const DEEP_DIVE_VERSION_CHIPS = ["NIV", "NKJV", "ESV", "NLT", "MSG", "AMP"] as const;
export type DeepDiveVersionChip = (typeof DEEP_DIVE_VERSION_CHIPS)[number];

/**
 * Prompt for a single-version lens. Asks the destination AI to render the
 * passage in the chosen translation and explain how its phrasing differs
 * from the KJV the reader is studying.
 */
export function buildDeepDiveVersionPrompt(
  reference: string,
  context: DeepDiveContext,
  version: DeepDiveVersionChip,
): string {
  const passage = formatPassageReference(context) || reference;
  return [
    `Show me ${passage} in the ${version} translation.`,
    `Quote the passage verbatim, then explain in 2–3 sentences how its wording differs from the KJV and what nuance that change brings out.`,
    `End with 3 short follow-up questions I could ask you next to dig deeper (e.g. about the original Greek/Hebrew, historical context, or cross-references).`,
  ].join(" ");
}

/**
 * Prompt for the "Compare All" chip. Explicitly asks for a Markdown table so
 * the response is scannable across translations.
 */
export function buildDeepDiveCompareAllPrompt(reference: string, context: DeepDiveContext): string {
  return buildDeepDiveCompareSubsetPrompt(reference, context, [
    "KJV",
    "NIV",
    "NKJV",
    "ESV",
    "NLT",
    "MSG",
    "AMP",
  ]);
}

/**
 * Prompt for comparing a user-chosen subset of translations. Same table-first
 * format as Compare All, but only the picked versions appear.
 */
export function buildDeepDiveCompareSubsetPrompt(
  reference: string,
  context: DeepDiveContext,
  versions: string[],
): string {
  const passage = formatPassageReference(context) || reference;
  const list = versions.join(", ");
  return [
    `Compare the verse ${passage} across ${list}.`,
    `Format your answer as a clean Markdown table with exactly two columns — "Translation" and "Text" — one row per translation in that order. Quote each translation verbatim on a single line; do not add footnotes, asterisks, or extra columns.`,
    `Below the table, add a short paragraph (3–5 sentences) explaining why the phrasing differs and which nuance each translation emphasizes.`,
    `Finish with 3 short follow-up questions I could ask you next to keep exploring this verse.`,
  ].join(" ");
}
