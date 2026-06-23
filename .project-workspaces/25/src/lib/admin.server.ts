import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function requireAdminAccessToken(accessToken: string): Promise<{ userId: string }> {
  const token = accessToken.trim();

  if (!token) {
    throw new Error("Sign in again to access the admin hub.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(token);

  if (userError || !user?.id) {
    throw new Error("Sign in again to access the admin hub.");
  }

  const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw new Error("Admin access required");
  }

  return { userId: user.id };
}
