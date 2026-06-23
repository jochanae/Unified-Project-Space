/**
 * Shared AI access gate — verifies the caller, blocks banned users, and
 * enforces a per-user hourly rate limit before any AI provider call.
 *
 * Limits (enforced server-side via public.check_ai_access):
 *   - Free tier: 60 calls/hour
 *   - minister / church_partner / admin: 300 calls/hour
 *
 * Usage inside an edge function:
 *
 *   const gate = await checkAiAccess(req, "selah");
 *   if (!gate.ok) return gate.response;
 *   // ...proceed with the AI call
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type GateResult =
  | { ok: true; userId: string; limit: number; count: number }
  | { ok: false; response: Response };

function jsonError(status: number, error: string, extra?: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ error, ...extra }), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export async function checkAiAccess(req: Request, functionName: string): Promise<GateResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { ok: false, response: jsonError(401, "Sign in to continue.") };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { ok: false, response: jsonError(401, "Sign in to continue.") };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return { ok: false, response: jsonError(500, "Server not configured.") };
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user?.id) {
    return { ok: false, response: jsonError(401, "Session expired. Sign in again.") };
  }
  const userId = userData.user.id;

  const { data: accessData, error: accessErr } = await admin.rpc("check_ai_access", {
    _user_id: userId,
    _function: functionName,
  });

  if (accessErr) {
    console.error("check_ai_access RPC error:", accessErr);
    return { ok: false, response: jsonError(500, "Could not verify access.") };
  }

  const access = (accessData ?? {}) as {
    allowed?: boolean;
    reason?: string;
    limit?: number;
    count?: number;
  };

  if (!access.allowed) {
    if (access.reason === "banned") {
      return {
        ok: false,
        response: jsonError(403, "Your account has been suspended."),
      };
    }
    if (access.reason === "rate_limit") {
      return {
        ok: false,
        response: jsonError(429, "Hourly AI limit reached. Try again later.", {
          limit: access.limit,
          count: access.count,
        }),
      };
    }
    return { ok: false, response: jsonError(403, "Access denied.") };
  }

  return {
    ok: true,
    userId,
    limit: access.limit ?? 0,
    count: access.count ?? 0,
  };
}
