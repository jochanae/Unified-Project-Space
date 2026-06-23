import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Permanently deletes the authenticated user's auth record.
 * RLS-protected user data cascades or is orphaned per policy.
 * Caller must pass exact confirmation string "DELETE".
 */
export const deleteOwnAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { confirm: string }) => {
    if (input?.confirm !== "DELETE") {
      throw new Error("Confirmation phrase must be exactly 'DELETE'.");
    }
    return input;
  })
  .handler(async ({ context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("[deleteOwnAccount] failed", error);
      throw new Error(error.message || "Could not delete account.");
    }
    return { ok: true as const };
  });
