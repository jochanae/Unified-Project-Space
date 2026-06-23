/**
 * Shareable view links — encode/decode filter state in URL search params.
 *
 * Used by /notes, /saved, /vault to make any saved view (or current
 * filter combo) shareable across devices via URL.
 *
 * Keys are intentionally short to keep URLs compact:
 *   q     → query string
 *   s     → sort key
 *   b     → book filter (saved/notes)
 *   st    → status filter (notes)
 *   t     → tab (saved)
 *   c     → color filter (vault)
 */

export type ShareableView = {
  q?: string;
  s?: string;
  b?: string | null;
  st?: string;
  t?: string;
  c?: string | null;
};

export function encodeViewToParams(v: ShareableView): URLSearchParams {
  const params = new URLSearchParams();
  if (v.q) params.set("q", v.q);
  if (v.s) params.set("s", v.s);
  if (v.b) params.set("b", v.b);
  if (v.st) params.set("st", v.st);
  if (v.t) params.set("t", v.t);
  if (v.c) params.set("c", v.c);
  return params;
}

export function decodeViewFromSearch(search: string): ShareableView {
  const params = new URLSearchParams(search);
  const out: ShareableView = {};
  const q = params.get("q");
  if (q) out.q = q;
  const s = params.get("s");
  if (s) out.s = s;
  const b = params.get("b");
  if (b) out.b = b;
  const st = params.get("st");
  if (st) out.st = st;
  const t = params.get("t");
  if (t) out.t = t;
  const c = params.get("c");
  if (c) out.c = c;
  return out;
}

/** Build a full shareable URL for the given path + view state. */
export function buildShareUrl(pathname: string, view: ShareableView): string {
  if (typeof window === "undefined") return pathname;
  const params = encodeViewToParams(view);
  const qs = params.toString();
  return `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`;
}

/** Replace current URL with the encoded view (no history entry). */
export function syncViewToUrl(pathname: string, view: ShareableView) {
  if (typeof window === "undefined") return;
  const params = encodeViewToParams(view);
  const qs = params.toString();
  const next = `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

/** Copy a share URL to clipboard with a toast-friendly result. */
export async function copyShareLink(url: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
