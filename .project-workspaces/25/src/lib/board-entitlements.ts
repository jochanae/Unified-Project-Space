/**
 * board-entitlements.ts — Soft freemium gates for the public Board.
 *
 * Single source of truth for what Free vs Paid (Scribe / Sanctuary) can do.
 * Enforced in:
 *   - the Board editor UI (account_.board.tsx)
 *   - server functions (board-entitlements.functions.ts)
 *   - the public board page (free → "Built on SanctumIQ" footer)
 *
 * NOT enforced via DB triggers in v1 — server functions are the authoritative
 * write path for board items; RLS already scopes everything to auth.uid().
 */

import type { BoardItemKind } from "@/lib/boards";
import type { BoardThemeId } from "@/lib/board-themes";

export type AppRoleLike = string;

/** True if the user holds any role that unlocks paid Board features. */
export function isPaidBoardTier(roles: readonly AppRoleLike[]): boolean {
  return roles.some((r) => r === "minister" || r === "church_partner" || r === "admin");
}

/* ─── Limits ──────────────────────────────────────────────── */

export const FREE_ITEM_LIMIT = 5;

/** Themes available on the Free tier. Everything else is paid. */
export const FREE_THEMES: ReadonlySet<BoardThemeId> = new Set(["obsidian-gold"]);

/** Item kinds allowed on Free. Video & audio are paid. */
export const FREE_ALLOWED_KINDS: ReadonlySet<BoardItemKind> = new Set<BoardItemKind>([
  "link",
  "poem",
  "scripture",
]);

/* ─── Entitlement object ──────────────────────────────────── */

export interface BoardEntitlement {
  isPaid: boolean;
  itemLimit: number | null; // null = unlimited
  allowedThemes: "all" | ReadonlySet<BoardThemeId>;
  allowedKinds: "all" | ReadonlySet<BoardItemKind>;
  showSanctumFooter: boolean;
}

export function entitlementFor(roles: readonly AppRoleLike[]): BoardEntitlement {
  if (isPaidBoardTier(roles)) {
    return {
      isPaid: true,
      itemLimit: null,
      allowedThemes: "all",
      allowedKinds: "all",
      showSanctumFooter: false,
    };
  }
  return {
    isPaid: false,
    itemLimit: FREE_ITEM_LIMIT,
    allowedThemes: FREE_THEMES,
    allowedKinds: FREE_ALLOWED_KINDS,
    showSanctumFooter: true,
  };
}

/* ─── Predicates ──────────────────────────────────────────── */

export function canAddAnotherItem(ent: BoardEntitlement, currentCount: number): boolean {
  return ent.itemLimit === null || currentCount < ent.itemLimit;
}

export function canUseTheme(ent: BoardEntitlement, theme: BoardThemeId): boolean {
  return ent.allowedThemes === "all" || ent.allowedThemes.has(theme);
}

export function canUseKind(ent: BoardEntitlement, kind: BoardItemKind): boolean {
  return ent.allowedKinds === "all" || ent.allowedKinds.has(kind);
}

/* ─── Copy ────────────────────────────────────────────────── */

export const PAID_GATE_COPY = {
  itemLimit: (limit: number) => `Free boards hold ${limit} items. Upgrade to Scribe for unlimited.`,
  themeLock: "This theme is part of Scribe. Upgrade to unlock the full palette.",
  kindLock: (kind: BoardItemKind) =>
    `${kind === "video" ? "Video" : "Audio"} is a Scribe feature. Upgrade to share rich media.`,
} as const;
