/**
 * POST /api/public/notifications/mark-read
 *
 * Called by the service worker when the user taps the "Mark read" action on
 * a push notification. The body carries `{ id, sig }` where `sig` is an
 * HMAC-SHA256 of the notification id signed with the same shared secret used
 * by send-push (`app_settings.push_trigger_secret`). This means only
 * notifications we actually delivered can be marked read via this endpoint —
 * no auth cookie required, since the SW context has no session.
 *
 * Stamps `read_at` on the notification row (if not already set).
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function safeEqHex(aHex: string, bHex: string): boolean {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/notifications/mark-read")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as {
            id?: string;
            sig?: string;
          } | null;
          if (!body?.id || !body.sig) {
            return new Response(JSON.stringify({ error: "missing id or sig" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          const { data: secretRow } = await supabaseAdmin
            .from("app_settings")
            .select("setting_value")
            .eq("setting_key", "push_trigger_secret")
            .maybeSingle();
          const secret = (secretRow?.setting_value as { value?: string } | null)?.value ?? null;
          if (!secret) {
            return new Response(JSON.stringify({ error: "not configured" }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          const expected = createHmac("sha256", secret).update(body.id).digest("hex");
          if (!safeEqHex(expected, body.sig)) {
            return new Response(JSON.stringify({ error: "bad signature" }), {
              status: 401,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          await supabaseAdmin
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("id", body.id)
            .is("read_at", null);

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (err) {
          console.error("mark-read fatal", err);
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
