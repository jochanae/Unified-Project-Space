import { createFileRoute, Link } from "@tanstack/react-router";
import { IOSPushCoach } from "@/components/settings/IOSPushCoach";
import { Bell, BellRing, Church, Moon, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { SettingsSkeleton } from "@/components/ui/page-skeletons";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { MODE_LABELS, type NotificationMode } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — SanctumIQ" },
      {
        name: "description",
        content: "Choose your posture: Sanctuary, Guided, or Connected.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading, update } = useNotificationSettings();
  const push = usePushSubscription();
  const [pending, setPending] = useState<string | null>(null);

  if (authLoading || (user && loading)) {
    return (
      <LoadingAppShell pageTitle="Notification Settings">
        <SettingsSkeleton text="Fetching notification preferences…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Notifications"
        title="Stay close to the Word"
        description="Sign in to set your notification posture and quiet hours."
        redirectTo="/settings/notifications"
      />
    );
  }

  if (!settings) return null;

  const change = async (key: string, fn: () => Promise<void>) => {
    setPending(key);
    try {
      await fn();
    } catch {
      toast.error("Could not save your preference.");
    } finally {
      setPending(null);
    }
  };

  return (
    <AppShell pageTitle="Notification Settings">
      <div className="mx-auto max-w-lg px-6 py-16 space-y-10">
        <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto text-center">
          Never interrupt — only accompany. Choose how SanctumIQ speaks to you.
        </p>

        {/* iOS coaching — auto-hides on non-iOS / installed / preview */}
        <IOSPushCoach />

        {/* Master toggle ---------------------------------------------------- */}
        <section className="hairline rounded-xl bg-obsidian-elevated/40 p-6">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/10">
              <ShieldCheck className="h-4 w-4 text-gold" strokeWidth={1.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm text-gold-soft">Silence the Sanctuary</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                When on, SanctumIQ will not surface any notifications — even Deep Dive completions
                and Selah reflections.
              </p>
            </div>
            <Switch
              checked={!settings.enabled}
              disabled={pending === "enabled"}
              onCheckedChange={(checked) => change("enabled", () => update({ enabled: !checked }))}
              aria-label="Silence the Sanctuary"
            />
          </div>
        </section>

        {/* Mode picker ------------------------------------------------------ */}
        <section
          className={cn(
            "space-y-3 transition-opacity",
            !settings.enabled && "opacity-50 pointer-events-none",
          )}
          aria-disabled={!settings.enabled}
        >
          <div className="flex items-center gap-2 px-1">
            <Bell className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Notification Mode</p>
          </div>

          <div className="space-y-2">
            {(Object.keys(MODE_LABELS) as NotificationMode[]).map((mode) => {
              const meta = MODE_LABELS[mode];
              const active = settings.mode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={pending === "mode"}
                  onClick={() => !active && change("mode", () => update({ mode }))}
                  className={cn(
                    "w-full text-left rounded-xl hairline p-5 transition-colors",
                    active
                      ? "bg-gold/10 border-gold/40"
                      : "bg-obsidian-elevated/30 hover:bg-gold/5",
                  )}
                  aria-pressed={active}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "font-display text-sm",
                          active ? "text-gold" : "text-gold-soft",
                        )}
                      >
                        {meta.title}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">{meta.subtitle}</p>
                    </div>
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full transition-colors",
                        active ? "bg-gold" : "bg-border/50",
                      )}
                      aria-hidden
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Quiet hours ------------------------------------------------------ */}
        <section
          className={cn(
            "hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-4 transition-opacity",
            !settings.enabled && "opacity-50 pointer-events-none",
          )}
          aria-disabled={!settings.enabled}
        >
          <div className="flex items-start gap-3">
            <Moon className="h-4 w-4 text-gold mt-0.5" strokeWidth={1.5} />
            <div className="flex-1">
              <p className="font-display text-sm text-gold-soft">Quiet Hours</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                During this window, notifications are recorded silently and surfaced when the hour
                passes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <HourSelect
              label="From"
              value={settings.quiet_hours_start}
              disabled={pending === "quiet_start"}
              onChange={(h) => change("quiet_start", () => update({ quiet_hours_start: h }))}
            />
            <HourSelect
              label="Until"
              value={settings.quiet_hours_end}
              disabled={pending === "quiet_end"}
              onChange={(h) => change("quiet_end", () => update({ quiet_hours_end: h }))}
            />
          </div>
          <p className="text-[11px] text-muted-foreground/60 text-center">
            Currently quiet from {formatHour(settings.quiet_hours_start)} to{" "}
            {formatHour(settings.quiet_hours_end)}.
          </p>
        </section>

        {/* Push on this device --------------------------------------------- */}
        <section
          className={cn(
            "hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-4 transition-opacity",
            !settings.enabled && "opacity-50 pointer-events-none",
          )}
          aria-disabled={!settings.enabled}
        >
          <div className="flex items-start gap-3">
            <BellRing className="h-4 w-4 text-gold mt-0.5" strokeWidth={1.5} />
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm text-gold-soft">Push on this device</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {push.status === "on" &&
                  "This device will receive sanctuary notifications even when SanctumIQ is closed."}
                {push.status === "off" &&
                  "Allow notifications so the Sanctuary can reach you when the app is closed."}
                {push.status === "denied" &&
                  "Notifications are blocked in your browser settings. Enable them there to continue."}
                {push.status === "unsupported" && "This browser doesn't support Web Push."}
                {push.status === "preview" &&
                  "Push only activates on the published site, not in the editor preview."}
                {push.status === "loading" && "Checking device…"}
              </p>
            </div>
            {push.status === "off" && (
              <button
                type="button"
                onClick={push.subscribe}
                disabled={push.busy}
                className="shrink-0 rounded-lg hairline bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20 disabled:opacity-60"
              >
                {push.busy ? "…" : "Enable"}
              </button>
            )}
            {push.status === "on" && (
              <button
                type="button"
                onClick={push.unsubscribe}
                disabled={push.busy}
                className="shrink-0 rounded-lg hairline bg-obsidian-elevated/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
              >
                {push.busy ? "…" : "Disable"}
              </button>
            )}
          </div>
        </section>

        {/* Service window — link to dedicated route ----------------------- */}
        <section
          className={cn(
            "hairline rounded-xl bg-obsidian-elevated/40 p-6 transition-opacity",
            !settings.enabled && "opacity-50 pointer-events-none",
          )}
          aria-disabled={!settings.enabled}
        >
          <Link to="/settings/service-mode" className="flex items-start gap-3 group">
            <Church
              className="h-4 w-4 text-gold mt-0.5 transition-transform group-hover:scale-110"
              strokeWidth={1.5}
            />
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm text-gold-soft group-hover:text-gold transition-colors">
                Service Mode
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {settings.service_window_day !== null &&
                settings.service_window_start !== null &&
                settings.service_window_end !== null
                  ? `Quietly held every ${DAY_LABELS[settings.service_window_day]} from ${formatHour(settings.service_window_start)} to ${formatHour(settings.service_window_end)}.`
                  : "Configure your weekly service window and preview when notifications will silence."}
              </p>
            </div>
            <span className="text-gold-soft/60 group-hover:text-gold transition-colors" aria-hidden>
              →
            </span>
          </Link>
        </section>

        <p className="text-center text-[11px] text-muted-foreground/60">
          <Link to="/account" className="text-gold-soft underline-offset-2 hover:underline">
            Back to account
          </Link>
        </p>
      </div>
    </AppShell>
  );
}

const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function HourSelect({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled?: boolean;
  onChange: (h: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-[0.28em] text-gold/70 mb-1.5">
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg hairline bg-obsidian-elevated/60 px-3 py-2 text-sm text-foreground focus:outline-none focus:border-gold/40 disabled:opacity-60"
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {formatHour(h)}
          </option>
        ))}
      </select>
    </label>
  );
}
