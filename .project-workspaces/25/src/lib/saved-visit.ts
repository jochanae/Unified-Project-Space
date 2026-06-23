/**
 * Tracks the user's last visit to /saved so we can mark items as
 * "new since last visit" with a soft gold dot.
 *
 * - Solid dot: created_at > lastVisit (brand new entry)
 * - Ring:      updated_at > lastVisit AND created_at <= lastVisit (edited since)
 *
 * Storage is per-browser (localStorage). The previous timestamp is read on
 * mount and held in memory for the session, then bumped on tab open so the
 * dots can fade out without flickering back.
 */

const KEY = "sanctumiq:saved:last-visit";

export function readLastVisit(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function bumpLastVisit(now = Date.now()) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, String(now));
  } catch {
    /* ignore */
  }
}

export type FreshnessState = "new" | "updated" | "none";

export function freshnessOf(
  createdAt: string | undefined,
  updatedAt: string | undefined,
  lastVisit: number,
): FreshnessState {
  if (!lastVisit) return "none";
  const c = createdAt ? Date.parse(createdAt) : 0;
  const u = updatedAt ? Date.parse(updatedAt) : c;
  if (c && c > lastVisit) return "new";
  if (u && u > lastVisit) return "updated";
  return "none";
}
