/**
 * Server-side entitlement check for the Board.
 *
 * Returns the caller's roles + a *serializable* entitlement summary. Use this
 * before any write that needs to know paid/free status. RLS still scopes
 * everything to auth.uid(); this is layered enforcement, not the only line of
 * defense.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  entitlementFor,
  FREE_ALLOWED_KINDS,
  FREE_ITEM_LIMIT,
  FREE_THEMES,
} from "@/lib/board-entitlements";
import type { BoardItemKind } from "@/lib/boards";
import type { BoardThemeId } from "@/lib/board-themes";

export interface BoardEntitlementResult {
  roles: string[];
  isPaid: boolean;
  itemLimit: number | null;
  itemCount: number;
  allowedThemes: BoardThemeId[] | "all";
  allowedKinds: BoardItemKind[] | "all";
  showSanctumFooter: boolean;
}

export const getBoardEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BoardEntitlementResult> => {
    const { supabase, userId } = context;

    const [rolesRes, countRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("board_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const roles = (rolesRes.data ?? []).map((r) => r.role as string);
    const ent = entitlementFor(roles);

    return {
      roles,
      isPaid: ent.isPaid,
      itemLimit: ent.itemLimit,
      itemCount: countRes.count ?? 0,
      allowedThemes: ent.isPaid ? "all" : Array.from(FREE_THEMES),
      allowedKinds: ent.isPaid ? "all" : Array.from(FREE_ALLOWED_KINDS),
      showSanctumFooter: ent.showSanctumFooter,
    };
  });

/* Re-export the constant so callers don't need two imports. */
export { FREE_ITEM_LIMIT };
