import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Returns whether the given user has any paid role (minister or church_partner).
 * Used by public board pages to decide whether to show the "Built on SanctumIQ" footer.
 */
export const getOwnerIsPaid = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);
    const isPaid = (roles ?? []).some((r) => r.role === "minister" || r.role === "church_partner");
    return { isPaid };
  });
