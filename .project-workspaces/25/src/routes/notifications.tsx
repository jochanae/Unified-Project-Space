import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, Check, CheckCheck, Moon, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { NotificationsSkeleton } from "@/components/ui/page-skeletons";
import { DeliveryRecap } from "@/components/notifications/DeliveryRecap";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { supabase } from "@/integrations/supabase/client";
import {
  isQuietHours,
  type NotificationCategory,
  type SanctumNotification,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notification Center — SanctumIQ" },
      {
        name: "description",
        content:
          "Browse your recent sanctuary notifications. Mark as read or clear them when you're ready.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationCenterPage,
});

const CATEGORY_META: Record<NotificationCategory, { label: string; tone: string }> = {
  sacred: { label: "Sacred", tone: "text-gold border-gold/40 bg-gold/10" },
  personal: {
    label: "Personal",
    tone: "text-gold-soft border-gold/25 bg-gold/5",
  },
  community: {
    label: "Community",
    tone: "text-foreground/80 border-border/60 bg-muted/20",
  },
};

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function NotificationCenterPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading: settingsLoading } = useNotificationSettings();
  const [items, setItems] = useState<SanctumNotification[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select(
        "id, user_id, category, title, body, silent, priority, action_url, scheduled_for, delivered_at, read_at, meta, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("notifications load failed:", error);
      toast.error("Could not load notifications.");
      setItems([]);
      return;
    }
    setItems((data ?? []) as SanctumNotification[]);
  }, [user]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  // Realtime: refresh when new notifications arrive while page is open.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-center:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refresh]);

  const unreadCount = useMemo(() => (items ?? []).filter((n) => !n.read_at).length, [items]);

  const inQuietHours = useMemo(() => {
    if (!settings) return false;
    return isQuietHours(settings.quiet_hours_start, settings.quiet_hours_end);
  }, [settings]);

  const markRead = async (id: string) => {
    if (!user) return;
    setItems((prev) =>
      prev
        ? prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        : prev,
    );
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Could not mark as read.");
      void refresh();
    }
  };

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    setBusy(true);
    const stamp = new Date().toISOString();
    setItems((prev) => (prev ? prev.map((n) => (n.read_at ? n : { ...n, read_at: stamp })) : prev));
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: stamp })
      .eq("user_id", user.id)
      .is("read_at", null);
    setBusy(false);
    if (error) {
      toast.error("Could not mark all as read.");
      void refresh();
    } else {
      toast.success("All caught up.");
    }
  };

  const clearAll = async () => {
    if (!user || !items || items.length === 0) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("Clear all notifications? This cannot be undone.")
    ) {
      return;
    }
    setBusy(true);
    const prev = items;
    setItems([]);
    const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
    setBusy(false);
    if (error) {
      toast.error("Could not clear notifications.");
      setItems(prev);
    } else {
      toast.success("Sanctuary cleared.");
    }
  };

  if (authLoading || (user && (items === null || settingsLoading))) {
    return (
      <LoadingAppShell pageTitle="Notifications">
        <NotificationsSkeleton text="Fetching your notifications…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Notifications"
        title="Your Notification Center"
        description="Sign in to view your recent sanctuary notifications."
        redirectTo="/notifications"
      />
    );
  }

  const list = items ?? [];

  return (
    <AppShell pageTitle="Notifications">
      <div className="mx-auto max-w-2xl px-6 py-12 space-y-8">
        <header className="space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-sm text-muted-foreground/90">
              {unreadCount > 0 ? `${unreadCount} new` : "All caught up"}
            </p>
            <Link
              to="/settings/notifications"
              className="text-xs text-gold-soft underline-offset-2 hover:underline shrink-0"
            >
              Settings
            </Link>
          </div>
          <p className="text-sm text-muted-foreground/80">
            A quiet record of what SanctumIQ has shared with you. Never an interruption.
          </p>
        </header>

        {/* 7-day delivery recap */}
        <DeliveryRecap />

        {/* Quiet-hours banner */}
        {settings && inQuietHours && (
          <div
            role="status"
            className="hairline rounded-xl bg-obsidian-elevated/50 px-4 py-3 flex items-start gap-3"
          >
            <Moon className="h-4 w-4 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
            <div className="min-w-0 text-sm">
              <p className="font-display text-gold-soft">Quiet hours are in effect</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                New notifications will be recorded silently until{" "}
                {formatHour(settings.quiet_hours_end)}. You can still review them here.
              </p>
            </div>
          </div>
        )}

        {/* Master-mute banner */}
        {settings && !settings.enabled && (
          <div
            role="status"
            className="hairline rounded-xl bg-obsidian-elevated/50 px-4 py-3 flex items-start gap-3"
          >
            <BellOff className="h-4 w-4 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
            <div className="min-w-0 text-sm">
              <p className="font-display text-gold-soft">The Sanctuary is silenced</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">
                No new notifications will arrive.{" "}
                <Link
                  to="/settings/notifications"
                  className="text-gold-soft underline-offset-2 hover:underline"
                >
                  Adjust posture
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {list.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={markAllRead}
              disabled={busy || unreadCount === 0}
              className="inline-flex items-center gap-1.5 rounded-md hairline bg-obsidian-elevated/40 px-3 py-1.5 text-xs text-gold-soft hover:bg-gold/8 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
              Mark all as read
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md hairline bg-obsidian-elevated/40 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-gold/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              Clear all
            </button>
          </div>
        )}

        {/* List */}
        {list.length === 0 ? (
          <div className="hairline rounded-xl bg-obsidian-elevated/30 py-16 text-center">
            <Bell className="mx-auto h-6 w-6 text-gold/60" strokeWidth={1.5} />
            <p className="mt-4 font-display text-sm text-gold-soft">Nothing to surface</p>
            <p className="mt-1 text-xs text-muted-foreground/70 max-w-xs mx-auto">
              When SanctumIQ has something for you — a finished Deep Dive, a weekly Selah — it will
              appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {list.map((n) => {
              const meta =
                CATEGORY_META[n.category as NotificationCategory] ?? CATEGORY_META.sacred;
              const unread = !n.read_at;
              return (
                <li key={n.id}>
                  <article
                    className={cn(
                      "hairline rounded-xl p-4 transition-colors",
                      unread ? "bg-obsidian-elevated/50" : "bg-obsidian-elevated/20",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          unread ? "bg-gold" : "bg-border/50",
                        )}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.22em]",
                              meta.tone,
                            )}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-muted-foreground/60">
                            {formatRelative(n.created_at)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "font-display text-sm",
                            unread ? "text-foreground" : "text-gold-soft",
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground/80 leading-relaxed">
                            {n.body}
                          </p>
                        )}
                        <div className="flex items-center gap-3 pt-1">
                          {n.action_url && (
                            <a
                              href={n.action_url}
                              className="text-[11px] text-gold underline-offset-2 hover:underline"
                              target={n.action_url.startsWith("http") ? "_blank" : undefined}
                              rel={
                                n.action_url.startsWith("http") ? "noopener noreferrer" : undefined
                              }
                              onClick={() => {
                                if (unread) void markRead(n.id);
                              }}
                            >
                              Open
                            </a>
                          )}
                          {unread && (
                            <button
                              type="button"
                              onClick={() => void markRead(n.id)}
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-gold-soft transition-colors"
                            >
                              <Check className="h-3 w-3" strokeWidth={1.5} />
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
