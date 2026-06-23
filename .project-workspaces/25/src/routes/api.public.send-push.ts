/**
 * POST /api/public/send-push
 *
 * Called by the DB trigger immediately after a notification row is inserted.
 * Body: { notification_id: string, secret: string }
 *
 * Security model: shared secret stored in `app_settings` (key: `push_trigger_secret`),
 * the SAME value is configured on the DB trigger. We verify it before fanning
 * out so this endpoint can't be abused even though it lives under /api/public.
 *
 * Behavior:
 *   1. Load notification by id (service role).
 *   2. Re-check posture: enabled, mode allows category, not in quiet hours.
 *   3. Fan out to every push_subscriptions row for that user.
 *   4. Prune subscriptions that return 404/410 (gone for good).
 *   5. Stamp delivered_at if it wasn't already.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHmac, createHash } from "crypto";
import webpush from "web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Mode = "sanctuary" | "guided" | "connected";
type Category = "sacred" | "personal" | "community";

function hashEndpoint(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex").slice(0, 16);
}

interface PushEvent {
  event_type: "sent" | "failed" | "pruned" | "silenced" | "retried";
  notification_id?: string | null;
  user_id?: string | null;
  endpoint_hash?: string | null;
  status_code?: number | null;
  error?: string | null;
  meta?: Record<string, unknown>;
}

async function logPushEvents(events: PushEvent[]): Promise<void> {
  if (events.length === 0) return;
  try {
    await supabaseAdmin.from("push_events").insert(
      events.map((e) => ({
        event_type: e.event_type,
        notification_id: e.notification_id ?? null,
        user_id: e.user_id ?? null,
        endpoint_hash: e.endpoint_hash ?? null,
        status_code: e.status_code ?? null,
        error: e.error ?? null,
        meta: (e.meta ?? {}) as never,
      })),
    );
  } catch (err) {
    console.error("push_events log failed", err);
  }
}

async function sendWithRetry(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
): Promise<{ ok: true } | { ok: false; status?: number; err: unknown; retried: boolean }> {
  let retried = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await webpush.sendNotification(sub, payload);
      return { ok: true };
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // Retry once on transient 5xx / 429
      if (attempt === 0 && status !== undefined && (status >= 500 || status === 429)) {
        retried = true;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      return { ok: false, status, err, retried };
    }
  }
  return { ok: false, err: new Error("unreachable"), retried };
}

function isCategoryAllowed(category: Category, mode: Mode): boolean {
  if (mode === "sanctuary") return category === "sacred";
  if (mode === "guided") return category !== "community";
  return true;
}

function isQuietHours(start: number, end: number, now = new Date()): boolean {
  if (start === end) return false;
  const h = now.getHours();
  return start < end ? h >= start && h < end : h >= start || h < end;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export const Route = createFileRoute("/api/public/send-push")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        try {
          const publicKey = process.env.VAPID_PUBLIC_KEY;
          const privateKey = process.env.VAPID_PRIVATE_KEY;
          const subject = process.env.VAPID_SUBJECT || "mailto:admin@sanctumiq.app";
          if (!publicKey || !privateKey) {
            return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          webpush.setVapidDetails(subject, publicKey, privateKey);

          const body = (await request.json().catch(() => null)) as {
            notification_id?: string;
            secret?: string;
          } | null;
          if (!body?.notification_id || !body.secret) {
            return new Response(JSON.stringify({ error: "missing notification_id or secret" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          // Verify shared secret
          const { data: secretRow } = await supabaseAdmin
            .from("app_settings")
            .select("setting_value")
            .eq("setting_key", "push_trigger_secret")
            .maybeSingle();
          const expected = (secretRow?.setting_value as { value?: string } | null)?.value ?? null;
          if (!expected || expected !== body.secret) {
            return new Response(JSON.stringify({ error: "unauthorized" }), {
              status: 401,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          // Load the notification
          const { data: notif, error: notifErr } = await supabaseAdmin
            .from("notifications")
            .select(
              "id, user_id, category, title, body, action_url, silent, priority, delivered_at",
            )
            .eq("id", body.notification_id)
            .maybeSingle();
          if (notifErr || !notif) {
            return new Response(JSON.stringify({ error: "notification not found" }), {
              status: 404,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          // Posture check (defense in depth — insertion already checked)
          const { data: settings } = await supabaseAdmin
            .from("user_notification_settings")
            .select(
              "mode, enabled, quiet_hours_start, quiet_hours_end, service_window_day, service_window_start, service_window_end",
            )
            .eq("user_id", notif.user_id)
            .maybeSingle();
          if (settings) {
            const skipReason = (() => {
              if (!settings.enabled) return "muted";
              if (!isCategoryAllowed(notif.category as Category, settings.mode as Mode))
                return "category_not_allowed";
              if (isQuietHours(settings.quiet_hours_start, settings.quiet_hours_end))
                return "quiet_hours";
              return null;
            })();

            if (skipReason) {
              await logPushEvents([
                {
                  event_type: "silenced",
                  notification_id: notif.id,
                  user_id: notif.user_id,
                  meta: { reason: skipReason },
                },
              ]);
              return new Response(JSON.stringify({ ok: true, skipped: skipReason }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...CORS },
              });
            }

            // Service Mode — check calendar event OR manual window.
            // Sacred passes through; personal/community are held.
            if (notif.category !== "sacred") {
              const nowIso = new Date().toISOString();
              const { data: liveService } = await supabaseAdmin
                .from("plan_events")
                .select("id")
                .eq("user_id", notif.user_id)
                .eq("category", "service")
                .lte("starts_at", nowIso)
                .gte("ends_at", nowIso)
                .limit(1);
              const calendarActive = (liveService?.length ?? 0) > 0;

              const day = settings.service_window_day;
              const start = settings.service_window_start;
              const end = settings.service_window_end;
              let manualActive = false;
              if (day !== null && start !== null && end !== null && start !== end) {
                const now = new Date();
                if (now.getDay() === day) {
                  const h = now.getHours();
                  manualActive = start < end ? h >= start && h < end : h >= start || h < end;
                }
              }

              if (calendarActive || manualActive) {
                await logPushEvents([
                  {
                    event_type: "silenced",
                    notification_id: notif.id,
                    user_id: notif.user_id,
                    meta: {
                      reason: "service_mode",
                      source: calendarActive ? "calendar" : "manual",
                    },
                  },
                ]);
                return new Response(JSON.stringify({ ok: true, skipped: "service_mode" }), {
                  status: 200,
                  headers: { "Content-Type": "application/json", ...CORS },
                });
              }
            }
          }

          // Load every subscription for this user
          const { data: subs } = await supabaseAdmin
            .from("push_subscriptions")
            .select("id, endpoint, subscription")
            .eq("user_id", notif.user_id);

          // HMAC-sign the notification id so the SW's "Mark read" action can
          // hit /api/public/notifications/mark-read without an auth session.
          const sig = createHmac("sha256", expected).update(notif.id).digest("hex");

          const payload = JSON.stringify({
            id: notif.id,
            title: notif.title,
            body: notif.body,
            url: notif.action_url || "/notifications",
            silent: notif.silent,
            tag: notif.id,
            sig,
          });

          let sent = 0;
          let pruned = 0;
          let failed = 0;
          let retried = 0;
          const events: PushEvent[] = [];

          await Promise.all(
            (subs ?? []).map(async (s) => {
              const sub = s.subscription as unknown as {
                endpoint: string;
                keys: { p256dh: string; auth: string };
              };
              const endpointHash = hashEndpoint(s.endpoint);
              const result = await sendWithRetry(sub, payload);

              if (result.ok) {
                sent++;
                events.push({
                  event_type: "sent",
                  notification_id: notif.id,
                  user_id: notif.user_id,
                  endpoint_hash: endpointHash,
                });
                return;
              }

              if (result.retried) retried++;
              const status = result.status;

              if (status === 404 || status === 410) {
                await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
                pruned++;
                events.push({
                  event_type: "pruned",
                  notification_id: notif.id,
                  user_id: notif.user_id,
                  endpoint_hash: endpointHash,
                  status_code: status,
                });
              } else {
                failed++;
                const errMsg = (result.err as Error)?.message?.slice(0, 500) ?? "unknown";
                console.error("web-push failed", status, errMsg);
                events.push({
                  event_type: "failed",
                  notification_id: notif.id,
                  user_id: notif.user_id,
                  endpoint_hash: endpointHash,
                  status_code: status ?? null,
                  error: errMsg,
                  meta: { retried: result.retried },
                });
                // Mirror persistent failures into app_error_logs for admin view.
                try {
                  await supabaseAdmin.from("app_error_logs").insert({
                    source: "push",
                    message: `web-push send failed (status=${status ?? "n/a"})`,
                    metadata: {
                      notification_id: notif.id,
                      endpoint_hash: endpointHash,
                      retried: result.retried,
                    } as never,
                    stack_trace: errMsg,
                  });
                } catch {
                  /* swallow */
                }
              }
            }),
          );

          await logPushEvents(events);

          if (sent > 0 && !notif.delivered_at) {
            await supabaseAdmin
              .from("notifications")
              .update({ delivered_at: new Date().toISOString() })
              .eq("id", notif.id)
              .is("delivered_at", null);
          }

          return new Response(JSON.stringify({ ok: true, sent, pruned, failed, retried }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (err) {
          console.error("send-push fatal", err);
          return new Response(JSON.stringify({ error: (err as Error).message }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
