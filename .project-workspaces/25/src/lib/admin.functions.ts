import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminAccessToken } from "@/lib/admin.server";
import { safeRun, type SafeResult } from "@/lib/server-fn-safe";

const errorLogSchema = z.object({
  message: z.string().min(1).max(1200),
  source: z.string().min(1).max(80),
  route: z.string().max(240).optional(),
  stackTrace: z.string().max(12000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const adminAccessSchema = z.object({
  accessToken: z.string().min(1),
});

const premiumToggleSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.string().uuid(),
  premium: z.boolean(),
});

const banToggleSchema = z.object({
  accessToken: z.string().min(1),
  userId: z.string().uuid(),
  banned: z.boolean(),
  reason: z.string().max(500).optional(),
});

export type AdminHubUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  isAdmin: boolean;
  isPremium: boolean;
  isBanned: boolean;
  roles: string[];
};

async function assertAdminFromToken(accessToken: string) {
  return requireAdminAccessToken(accessToken);
}

export const listAdminHubUsers = createServerFn({ method: "POST" })
  .inputValidator(adminAccessSchema)
  .handler(
    async ({ data }): Promise<SafeResult<{ users: AdminHubUser[] }>> =>
      safeRun(async () => {
        await assertAdminFromToken(data.accessToken);

        const [authUsersResult, profilesResult, rolesResult, bansResult] = await Promise.all([
          supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 }),
          supabaseAdmin.from("profiles").select("id, display_name"),
          supabaseAdmin.from("user_roles").select("user_id, role"),
          supabaseAdmin.from("banned_users").select("user_id"),
        ]);

        const { data: authUsers, error: authError } = authUsersResult;
        const { data: profiles, error: profilesError } = profilesResult;
        const { data: roleRows, error: rolesError } = rolesResult;
        const { data: banRows, error: bansError } = bansResult;

        if (authError) throw new Error(`Could not load auth users: ${authError.message}`);
        if (profilesError) throw new Error(`Could not load profiles: ${profilesError.message}`);
        if (rolesError) throw new Error(`Could not load roles: ${rolesError.message}`);
        if (bansError) throw new Error(`Could not load bans: ${bansError.message}`);

        const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
        const bannedSet = new Set((banRows ?? []).map((row) => row.user_id));
        const rolesMap = new Map<string, string[]>();

        for (const row of roleRows ?? []) {
          const current = rolesMap.get(row.user_id) ?? [];
          current.push(row.role);
          rolesMap.set(row.user_id, current);
        }

        const users: AdminHubUser[] = (authUsers?.users ?? [])
          .map((user) => {
            const roles = rolesMap.get(user.id) ?? [];
            const profile = profileMap.get(user.id);
            return {
              id: user.id,
              email: user.email ?? "No email",
              displayName:
                profile?.display_name ||
                (typeof user.user_metadata?.display_name === "string"
                  ? user.user_metadata.display_name
                  : "") ||
                user.email?.split("@")[0] ||
                "Unknown user",
              createdAt: user.created_at,
              isAdmin: roles.includes("admin"),
              isPremium: roles.includes("minister") || roles.includes("church_partner"),
              isBanned: bannedSet.has(user.id),
              roles,
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        return { users };
      }),
  );

export const updateUserPremiumStatus = createServerFn({ method: "POST" })
  .inputValidator(premiumToggleSchema)
  .handler(
    async ({ data }): Promise<SafeResult<{ success: true; role: string }>> =>
      safeRun(async () => {
        await assertAdminFromToken(data.accessToken);

        const { data: existingRoles, error: roleError } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", data.userId);

        if (roleError) throw new Error(`Could not inspect target user: ${roleError.message}`);

        const roles = (existingRoles ?? []).map((entry) => entry.role);
        if (roles.includes("admin")) {
          throw new Error("Admin accounts cannot be changed here");
        }

        const preserveChurchPartner = data.premium && roles.includes("church_partner");
        const nextRole = preserveChurchPartner
          ? "church_partner"
          : data.premium
            ? "minister"
            : "free";
        const rolesToRemove = data.premium
          ? ["free", "minister"]
          : ["free", "minister", "church_partner"];

        const { error: deleteError } = await supabaseAdmin
          .from("user_roles")
          .delete()
          .eq("user_id", data.userId)
          .in("role", rolesToRemove as ("free" | "minister" | "church_partner")[]);

        if (deleteError) throw new Error(`Could not update access: ${deleteError.message}`);

        if (!roles.includes(nextRole)) {
          const { error: insertError } = await supabaseAdmin.from("user_roles").insert({
            user_id: data.userId,
            role: nextRole,
          });

          if (insertError) throw new Error(`Could not save role change: ${insertError.message}`);
        }

        return { success: true as const, role: nextRole };
      }),
  );

export const updateUserBannedStatus = createServerFn({ method: "POST" })
  .inputValidator(banToggleSchema)
  .handler(
    async ({ data }): Promise<SafeResult<{ success: true; banned: boolean }>> =>
      safeRun(async () => {
        const { userId: adminId } = await assertAdminFromToken(data.accessToken);

        if (adminId === data.userId) {
          throw new Error("You cannot ban your own account.");
        }

        const { data: targetRoles, error: roleError } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", data.userId);

        if (roleError) throw new Error(`Could not inspect target user: ${roleError.message}`);
        if ((targetRoles ?? []).some((r) => r.role === "admin")) {
          throw new Error("Admin accounts cannot be banned.");
        }

        if (data.banned) {
          const { error } = await supabaseAdmin.from("banned_users").upsert(
            {
              user_id: data.userId,
              banned_by: adminId,
              reason: data.reason ?? null,
            },
            { onConflict: "user_id" },
          );
          if (error) throw new Error(`Could not ban user: ${error.message}`);
        } else {
          const { error } = await supabaseAdmin
            .from("banned_users")
            .delete()
            .eq("user_id", data.userId);
          if (error) throw new Error(`Could not unban user: ${error.message}`);
        }

        return { success: true as const, banned: data.banned };
      }),
  );

export const logClientError = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(errorLogSchema)
  .handler(
    async ({ data, context }): Promise<SafeResult<{ success: true }>> =>
      safeRun(async () => {
        const { error } = await supabaseAdmin.from("app_error_logs").insert({
          message: data.message,
          source: data.source,
          route: data.route ?? null,
          stack_trace: data.stackTrace ?? null,
          metadata: { ...(data.metadata ?? {}), user_id: context.userId },
        });

        if (error) {
          throw new Error(`Could not write application error log: ${error.message}`);
        }

        return { success: true as const };
      }),
  );
