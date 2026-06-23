/**
 * Deep Dive · Server Functions
 *
 * Server-side mutations for deep_dive_history that run under the authenticated
 * user's context. RLS on the deep_dive_history table restricts deletes to paid
 * roles (minister, church_partner, admin), so the destructive operations here
 * are enforced at the database layer in addition to any client-side gating.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Clears the caller's entire Deep Dive history.
 *
 * Security:
 *  - `requireSupabaseAuth` rejects unauthenticated callers (401).
 *  - The middleware-provided supabase client carries the user's JWT, so the
 *    DELETE statement is filtered by RLS to rows where `user_id = auth.uid()`
 *    AND the user holds a paid role. Free-tier users get 0 rows deleted even
 *    if they bypass the client-side check.
 *  - We additionally scope by user_id to make intent explicit and to fail
 *    fast (rather than silently affecting 0 rows) if RLS is ever loosened.
 */
export const clearDeepDiveHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { error, count } = await supabase
      .from("deep_dive_history")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    if (error) {
      console.error("clearDeepDiveHistory failed:", error);
      return { ok: false as const, error: error.message, cleared: 0 };
    }

    return { ok: true as const, cleared: count ?? 0 };
  });
