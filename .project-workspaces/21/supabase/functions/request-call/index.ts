import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Ring the calling user (in-app incoming call).
 * Body: { memberId: string, openerLine?: string, reason?: string, targetUserId?: string }
 *
 * - When called by a regular authenticated user, ALWAYS rings themselves
 *   (used for testing and for Marcus's "call_me" tool which runs server-side
 *   with the user's session).
 * - Reads the companion display info from the user's `connections` row so we
 *   never expose another user's data.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const memberId = String(body?.memberId || "").trim();
    const openerLine = body?.openerLine ? String(body.openerLine).slice(0, 280) : null;
    const reason = body?.reason ? String(body.reason).slice(0, 120) : null;

    if (!memberId) {
      return new Response(JSON.stringify({ error: "memberId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Look up companion from this user's connection
    const { data: conn, error: connErr } = await admin
      .from("connections")
      .select("name, avatar_url, member_id")
      .eq("user_id", userId)
      .eq("member_id", memberId)
      .maybeSingle();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "Companion not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callId, error: rpcErr } = await admin.rpc("request_incoming_call", {
      p_user_id: userId,
      p_member_id: memberId,
      p_companion_name: conn.name || "Companion",
      p_companion_avatar_url: conn.avatar_url || null,
      p_opener_line: openerLine,
      p_reason: reason,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: rpcErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, callId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
