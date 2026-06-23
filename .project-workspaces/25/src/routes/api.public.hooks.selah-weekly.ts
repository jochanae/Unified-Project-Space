/**
 * POST /api/public/hooks/selah-weekly
 *
 * Weekly Selah summary trigger. Called by pg_cron each Sunday morning.
 * Inserts a `sacred` notification for every user who has notifications enabled.
 * The DB trigger on `notifications` then fans out web-push delivery.
 *
 * Security: shared secret in `app_settings` (key: `cron_secret`). Sent in
 * the JSON body so this works behind /api/public/* (which bypasses auth).
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const TITLE = "Selah · your week in the Word";
const BODY = "A quiet space to look back. Tap to enter your Journey.";
const ACTION_URL = "/journey";

export const Route = createFileRoute("/api/public/hooks/selah-weekly")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => null)) as { secret?: string } | null;

          // Verify shared secret
          const { data: secretRow } = await supabaseAdmin
            .from("app_settings")
            .select("setting_value")
            .eq("setting_key", "cron_secret")
            .maybeSingle();
          const expected = (secretRow?.setting_value as { value?: string } | null)?.value ?? null;
          if (!expected || !body?.secret || body.secret !== expected) {
            return new Response(JSON.stringify({ error: "unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          // Find every user who has notifications enabled. We do NOT filter
          // by mode here — `sacred` is allowed in every mode by design.
          const { data: settings, error: settingsErr } = await supabaseAdmin
            .from("user_notification_settings")
            .select("user_id, enabled")
            .eq("enabled", true);

          if (settingsErr) {
            console.error("selah-weekly: settings query failed", settingsErr);
            return new Response(JSON.stringify({ error: settingsErr.message }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          const userIds = (settings ?? []).map((s) => s.user_id);
          if (userIds.length === 0) {
            return new Response(JSON.stringify({ ok: true, inserted: 0 }), {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          // De-duplicate per week: skip users who already received a
          // selah_weekly notification in the last 6 days.
          const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
          const { data: recent } = await supabaseAdmin
            .from("notifications")
            .select("user_id, meta")
            .eq("category", "sacred")
            .gte("created_at", sixDaysAgo);

          const alreadySent = new Set(
            (recent ?? [])
              .filter((r) => {
                const m = r.meta as { kind?: string } | null;
                return m?.kind === "selah_weekly";
              })
              .map((r) => r.user_id),
          );

          const rows = userIds
            .filter((uid) => !alreadySent.has(uid))
            .map((uid) => ({
              user_id: uid,
              category: "sacred" as const,
              title: TITLE,
              body: BODY,
              action_url: ACTION_URL,
              silent: false,
              priority: "low" as const,
              meta: { kind: "selah_weekly" } as never,
            }));

          if (rows.length === 0) {
            return new Response(
              JSON.stringify({ ok: true, inserted: 0, skipped: userIds.length }),
              { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
            );
          }

          const { error: insertErr } = await supabaseAdmin.from("notifications").insert(rows);

          if (insertErr) {
            console.error("selah-weekly: insert failed", insertErr);
            return new Response(JSON.stringify({ error: insertErr.message }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          return new Response(
            JSON.stringify({
              ok: true,
              inserted: rows.length,
              skipped: userIds.length - rows.length,
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
          );
        } catch (err) {
          console.error("selah-weekly fatal", err);
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
