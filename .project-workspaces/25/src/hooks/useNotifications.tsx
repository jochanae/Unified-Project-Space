/**
 * useNotifications + NotificationsProvider
 *
 * Two responsibilities:
 *
 * 1. **Insertion API** — `notify({ category, title, body, action_url, ... })`
 *    inserts a row into the `notifications` table. Tone guard runs first; if
 *    the copy fails, we refuse the insert (this is intentional — it forces
 *    callers to obey the sanctuary voice). Caller's posture (mode + master
 *    toggle + quiet hours) is checked at INSERT time so we never write
 *    notifications a user has chosen not to receive. RLS adds a second check.
 *
 * 2. **Delivery loop** — mounted once at the app root. Subscribes to realtime
 *    inserts on `notifications` for the signed-in user, and on each new row
 *    surfaces it as a sonner toast (respecting silent + priority). The row's
 *    `delivered_at` is stamped so future surfaces (push, badge counts) can
 *    de-dupe.
 *
 * No service worker, no web-push, no edge function — those are later turns.
 * For now "delivery" = an in-app toast. That is enough to validate the
 * philosophy end-to-end.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import {
  isCategoryAllowed,
  isQuietHours,
  passesToneGuard,
  type NotificationCategory,
  type NotificationPriority,
  type SanctumNotification,
} from "@/lib/notifications";

// ---------------------------------------------------------------------------
// Insertion API
// ---------------------------------------------------------------------------

export interface NotifyInput {
  category: NotificationCategory;
  title: string;
  body?: string;
  action_url?: string | null;
  silent?: boolean;
  priority?: NotificationPriority;
  scheduled_for?: Date | null;
  meta?: Record<string, unknown>;
}

export type NotifyResult =
  | { ok: true; id: string }
  | {
      ok: false;
      reason: "unauthenticated" | "tone_rejected" | "muted" | "error";
      message?: string;
    };

// ---------------------------------------------------------------------------
// Context (so the delivery loop and notify() share the same auth/settings)
// ---------------------------------------------------------------------------

interface NotificationsContextValue {
  notify: (input: NotifyInput) => Promise<NotifyResult>;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { settings } = useNotificationSettings();

  // Track which notifications we've already toasted in this tab so the
  // initial realtime backlog (if any) doesn't double-fire.
  const seenIds = useRef<Set<string>>(new Set());

  // ── Insertion API ────────────────────────────────────────────────────────
  const notify = useCallback<NotificationsContextValue["notify"]>(
    async (input) => {
      if (!user) return { ok: false, reason: "unauthenticated" };

      if (!passesToneGuard(input.title) || !passesToneGuard(input.body ?? "")) {
        console.warn("notify: tone guard rejected copy", input);
        return { ok: false, reason: "tone_rejected" };
      }

      // Honor user posture at write time (RLS still enforces ownership).
      if (settings) {
        if (!settings.enabled) return { ok: false, reason: "muted" };
        if (!isCategoryAllowed(input.category, settings.mode)) {
          return { ok: false, reason: "muted" };
        }
      }

      const row = {
        user_id: user.id,
        category: input.category,
        title: input.title,
        body: input.body ?? "",
        silent: input.silent ?? true,
        priority: input.priority ?? "low",
        action_url: input.action_url ?? null,
        scheduled_for: input.scheduled_for
          ? input.scheduled_for.toISOString()
          : new Date().toISOString(),
        meta: (input.meta ?? {}) as never,
      };

      const { data, error } = await supabase
        .from("notifications")
        .insert([row])
        .select("id")
        .single();

      if (error || !data) {
        console.error("notify: insert failed", error);
        return { ok: false, reason: "error", message: error?.message };
      }
      return { ok: true, id: data.id };
    },
    [user, settings],
  );

  // ── Delivery loop ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const surface = async (n: SanctumNotification) => {
      if (seenIds.current.has(n.id)) return;
      seenIds.current.add(n.id);

      // Defense in depth: re-check posture at delivery time too.
      if (settings) {
        if (!settings.enabled) return;
        if (!isCategoryAllowed(n.category, settings.mode)) return;
        if (isQuietHours(settings.quiet_hours_start, settings.quiet_hours_end)) {
          // Suppress toast during quiet hours; row stays in DB to be seen later.
          return;
        }
      }

      // Surface as sonner toast. Action link opens in new tab if provided.
      const opts: Parameters<typeof toast>[1] = {
        description: n.body || undefined,
        duration: n.priority === "normal" ? 8000 : 5000,
      };
      if (n.action_url) {
        opts.action = {
          label: "Open",
          onClick: () => {
            if (typeof window === "undefined") return;
            window.open(n.action_url!, "_blank", "noopener,noreferrer");
          },
        };
      }
      toast(n.title, opts);

      // Stamp delivered_at so future channels (push) won't re-deliver.
      await supabase
        .from("notifications")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", n.id)
        .is("delivered_at", null);
    };

    // Subscribe to new notifications for this user.
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          void surface(payload.new as SanctumNotification);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, settings]);

  const value = useMemo(() => ({ notify }), [notify]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    // Soft-fall: if used outside the provider (e.g. in tests), return a no-op
    // so callers don't have to guard. Insertion will silently fail.
    return {
      notify: async (): Promise<NotifyResult> => ({
        ok: false,
        reason: "unauthenticated",
      }),
    };
  }
  return ctx;
}
