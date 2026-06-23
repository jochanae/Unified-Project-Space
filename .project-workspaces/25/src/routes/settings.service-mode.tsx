import { createFileRoute, Link } from "@tanstack/react-router";
import { Church, ArrowLeft, Calendar, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { SettingsSkeleton } from "@/components/ui/page-skeletons";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import {
  DAY_LABELS,
  computeNextServiceWindow,
  formatHour,
  formatRelative,
} from "@/lib/serviceMode";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings/service-mode")({
  head: () => ({
    meta: [
      { title: "Service Mode — SanctumIQ" },
      {
        name: "description",
        content:
          "Configure your weekly service window so SanctumIQ holds non-sacred notifications quietly while you worship.",
      },
      { property: "og:title", content: "Service Mode — SanctumIQ" },
      {
        property: "og:description",
        content:
          "Set the day and time of your weekly gathering. SanctumIQ will hold gentle messages until afterward.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ServiceModePage,
});

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function ServiceModePage() {
  const { user, loading: authLoading } = useAuth();
  const { settings, loading, update } = useNotificationSettings();
  const [pending, setPending] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // Refresh "next window" preview every minute
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (authLoading || (user && loading)) {
    return (
      <LoadingAppShell pageTitle="Service Mode">
        <SettingsSkeleton text="Fetching service window…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Service Mode"
        title="Configure your weekly window"
        description="Sign in to set the day and time SanctumIQ should hold gentle notifications."
        redirectTo="/settings/service-mode"
      />
    );
  }

  if (!settings) return null;

  const change = async (key: string, fn: () => Promise<void>) => {
    setPending(key);
    try {
      await fn();
    } catch {
      toast.error("Could not save your service window.");
    } finally {
      setPending(null);
    }
  };

  const day = settings.service_window_day;
  const start = settings.service_window_start;
  const end = settings.service_window_end;

  const hasWindow = day !== null && start !== null && end !== null && start !== end;

  // tick is read so the effect re-renders the preview
  void tick;
  const preview = hasWindow
    ? computeNextServiceWindow({ day: day!, start: start!, end: end! })
    : null;

  const clearWindow = () =>
    change("clear", () =>
      update({
        service_window_day: null,
        service_window_start: null,
        service_window_end: null,
      }),
    );

  return (
    <AppShell pageTitle="Service Mode">
      <div className="mx-auto max-w-lg px-6 py-16 space-y-10">
        <header className="space-y-3">
          <Link
            to="/settings/notifications"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.28em] text-muted-foreground hover:text-gold-soft transition-colors"
          >
            <ArrowLeft className="h-3 w-3" strokeWidth={1.5} />
            Notifications
          </Link>
          <p className="text-sm text-muted-foreground/80 max-w-sm">
            Set the day and hours of your weekly gathering. SanctumIQ will quietly hold non-sacred
            notifications during this window.
          </p>
        </header>

        {/* Live preview */}
        <section
          className={cn(
            "hairline rounded-xl p-6 transition-colors",
            preview?.inProgress ? "bg-gold/10 border-gold/40" : "bg-obsidian-elevated/40",
          )}
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <Church
              className={cn(
                "h-5 w-5 mt-0.5",
                preview?.inProgress ? "text-gold" : "text-gold-soft/70",
              )}
              strokeWidth={1.5}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-[0.28em] text-gold-soft/80">
                {preview?.inProgress ? "Active now" : "Next window"}
              </p>
              {preview ? (
                <>
                  <p className="font-display text-base text-foreground mt-1.5">
                    {DAY_LABELS[preview.starts.getDay()]} · {formatHour(preview.starts.getHours())}{" "}
                    → {formatHour(preview.ends.getHours())}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {preview.inProgress
                      ? `Holding gentle messages until ${formatHour(preview.ends.getHours())}.`
                      : `Begins ${formatRelative(preview.starts)}.`}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground/70 mt-1.5">
                  No manual window configured. Calendar events tagged{" "}
                  <span className="text-gold-soft">service</span> still engage Service Mode.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Day picker */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Calendar className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Day of week</p>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const active = day === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={pending === "svc_day"}
                  onClick={() =>
                    change("svc_day", () =>
                      update({
                        service_window_day: i,
                        service_window_start: start === null ? 10 : start,
                        service_window_end: end === null ? 12 : end,
                      }),
                    )
                  }
                  className={cn(
                    "rounded-lg hairline py-2.5 text-[11px] font-display tracking-wide transition-colors",
                    active
                      ? "bg-gold/15 border-gold/50 text-gold"
                      : "bg-obsidian-elevated/40 text-muted-foreground hover:text-foreground hover:bg-gold/5",
                  )}
                  aria-pressed={active}
                  aria-label={label}
                >
                  {label.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </section>

        {/* Hour pickers */}
        <section
          className={cn(
            "space-y-3 transition-opacity",
            day === null && "opacity-50 pointer-events-none",
          )}
        >
          <div className="flex items-center gap-2 px-1">
            <Clock className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Time window</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HourSelect
              label="From"
              value={start ?? 10}
              disabled={pending === "svc_start" || day === null}
              onChange={(h) => change("svc_start", () => update({ service_window_start: h }))}
            />
            <HourSelect
              label="Until"
              value={end ?? 12}
              disabled={pending === "svc_end" || day === null}
              onChange={(h) => change("svc_end", () => update({ service_window_end: h }))}
            />
          </div>
        </section>

        {hasWindow && (
          <button
            type="button"
            onClick={clearWindow}
            disabled={pending === "clear"}
            className="w-full rounded-lg hairline bg-obsidian-elevated/30 px-4 py-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-obsidian-elevated/60 transition-colors disabled:opacity-60"
          >
            {pending === "clear" ? "Clearing…" : "Clear manual window"}
          </button>
        )}

        <p className="text-[11px] text-muted-foreground/60 text-center leading-relaxed">
          During Service Mode, only <span className="text-gold-soft">sacred</span> notifications
          surface. Personal and community messages are recorded silently and delivered afterward.
        </p>
      </div>
    </AppShell>
  );
}

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
