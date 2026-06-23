// Stewardship Directory: open helpers + preset metadata.
// Per-user destinations live in the `user_payment_links` table.

export type PaymentKind = "cashapp" | "venmo" | "paypal" | "zelle" | "custom";

export type PaymentLink = {
  id?: string;
  kind: PaymentKind;
  label: string;
  handle?: string | null;
  url: string;
};

export type PresetDef = {
  kind: Exclude<PaymentKind, "custom">;
  name: string;
  /** Tiny help text shown under the input. */
  hint: string;
  /** Placeholder shown in the handle input. */
  placeholder: string;
  /** Build the final URL from the cleaned handle. */
  toUrl: (handle: string) => string;
  /** Optional native scheme tried first on mobile. */
  toAppScheme?: (handle: string) => string;
  /** Strip leading $/@ etc. so we store a normalized handle. */
  normalize: (input: string) => string;
};

export const PRESETS: readonly PresetDef[] = [
  {
    kind: "cashapp",
    name: "Cash App",
    hint: "Your $cashtag",
    placeholder: "yourcashtag",
    normalize: (s) => s.trim().replace(/^\$/, ""),
    toUrl: (h) => `https://cash.app/$${h}`,
    toAppScheme: (h) => `https://cash.app/$${h}`,
  },
  {
    kind: "venmo",
    name: "Venmo",
    hint: "Your @username",
    placeholder: "your-venmo",
    normalize: (s) => s.trim().replace(/^@/, ""),
    toUrl: (h) => `https://venmo.com/u/${h}`,
    toAppScheme: (h) => `venmo://paycharge?txn=pay&recipients=${h}`,
  },
  {
    kind: "paypal",
    name: "PayPal",
    hint: "Your paypal.me handle",
    placeholder: "yourpaypal",
    normalize: (s) =>
      s
        .trim()
        .replace(/^@/, "")
        .replace(/^https?:\/\/(www\.)?paypal\.me\//i, ""),
    toUrl: (h) => `https://paypal.me/${h}`,
  },
  {
    kind: "zelle",
    name: "Zelle",
    hint: "Recipient email",
    placeholder: "you@example.com",
    normalize: (s) => s.trim(),
    toUrl: () => "https://www.zellepay.com/get-started",
  },
] as const;

export function getPreset(kind: PaymentKind): PresetDef | null {
  return PRESETS.find((p) => p.kind === kind) ?? null;
}

/** Try native app scheme on mobile; fall back to web URL. */
export function openPaymentLink(link: PaymentLink) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const preset = link.kind !== "custom" ? getPreset(link.kind) : null;
  const appScheme = preset?.toAppScheme && link.handle ? preset.toAppScheme(link.handle) : null;

  if (isMobile && appScheme) {
    const fallbackTimer = window.setTimeout(() => {
      window.location.href = link.url;
    }, 500);
    window.location.href = appScheme;
    window.addEventListener("pagehide", () => window.clearTimeout(fallbackTimer), { once: true });
    return;
  }
  window.open(link.url, "_blank", "noopener,noreferrer");
}

/** Validate a custom URL — only http/https accepted from user input. */
export function validateCustomUrl(
  raw: string,
): { ok: true; url: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, error: "Enter a URL" };
  if (trimmed.length > 500) return { ok: false, error: "URL is too long" };
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "Must be a valid URL (https://...)" };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, error: "Only https:// links are allowed" };
  }
  return { ok: true, url: parsed.toString() };
}
