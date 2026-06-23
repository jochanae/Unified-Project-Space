import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Copy,
  Download,
  RefreshCw,
  Check,
  BookOpen,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type FeedKey = "plans" | "selah" | "events";
const ALL_FEEDS: FeedKey[] = ["plans", "selah", "events"];

type PreviewItem = {
  id: string;
  title: string;
  startsAt: string;
  source: "events";
};

const COMMON_TZS = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

export function CalendarSync({
  userId,
  showFeedControls = false,
}: {
  userId: string;
  showFeedControls?: boolean;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tz, setTz] = useState<string>("UTC");
  const [savingTz, setSavingTz] = useState(false);
  const [feeds, setFeeds] = useState<Set<FeedKey>>(new Set(ALL_FEEDS));
  const [preview, setPreview] = useState<PreviewItem[]>([]);

  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Token
      const { data: existing } = await supabase
        .from("calendar_tokens")
        .select("token")
        .eq("user_id", userId)
        .maybeSingle();
      let value = existing?.token ?? null;
      if (!value) {
        const { data: created, error } = await supabase
          .from("calendar_tokens")
          .insert({ user_id: userId })
          .select("token")
          .single();
        if (!error) value = created?.token ?? null;
      }
      // Timezone
      const { data: pref } = await supabase
        .from("notification_preferences")
        .select("timezone")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      setToken(value);
      setTz(pref?.timezone || browserTz);

      if (showFeedControls) {
        const { data: upcoming } = await supabase
          .from("plan_events")
          .select("id, title, starts_at")
          .eq("user_id", userId)
          .gte("ends_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(5);
        if (!cancelled && upcoming) {
          setPreview(
            upcoming.map((e) => ({
              id: e.id,
              title: e.title,
              startsAt: e.starts_at,
              source: "events" as const,
            })),
          );
        }
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, browserTz, showFeedControls]);

  const feedQuery = useMemo(() => {
    if (feeds.size === ALL_FEEDS.length) return "";
    const keys = ALL_FEEDS.filter((k) => feeds.has(k));
    return keys.length ? `?feeds=${keys.join(",")}` : "?feeds=none";
  }, [feeds]);

  const httpsUrl = token ? `${window.location.origin}/hooks/calendar/${token}/ics${feedQuery}` : "";
  const webcalUrl = token ? httpsUrl.replace(/^https?:\/\//, "webcal://") : "";

  const toggleFeed = (key: FeedKey) => {
    setFeeds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const tzOptions = useMemo(() => {
    const set = new Set<string>(COMMON_TZS);
    if (browserTz) set.add(browserTz);
    if (tz) set.add(tz);
    return Array.from(set).sort();
  }, [browserTz, tz]);

  const copy = async () => {
    if (!httpsUrl) return;
    try {
      await navigator.clipboard.writeText(httpsUrl);
      setCopied(true);
      toast.success("Subscribe URL copied", { description: "Paste it into your calendar app." });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy. Long-press the URL to copy manually.");
    }
  };

  const download = () => {
    if (!httpsUrl) return;
    const a = document.createElement("a");
    a.href = httpsUrl;
    a.download = "sanctumiq.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const rotate = async () => {
    setRotating(true);
    try {
      // Delete then reinsert to trigger default token regen.
      await supabase.from("calendar_tokens").delete().eq("user_id", userId);
      const { data, error } = await supabase
        .from("calendar_tokens")
        .insert({ user_id: userId })
        .select("token")
        .single();
      if (error) throw error;
      setToken(data?.token ?? null);
      toast.success("Subscription resynced", {
        description: "Old URL revoked. Re-add the new URL in your calendar.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resync.");
    } finally {
      setRotating(false);
    }
  };

  const saveTz = async (next: string) => {
    setTz(next);
    setSavingTz(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: userId, timezone: next }, { onConflict: "user_id" });
      if (error) throw error;
      toast.success("Timezone saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save timezone.");
    } finally {
      setSavingTz(false);
    }
  };

  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg border border-gold/20 flex items-center justify-center"
          style={{ background: "oklch(0.74 0.115 85 / 0.08)" }}
        >
          <Calendar className="h-5 w-5 text-gold" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">Calendar Sync</p>
          <p className="font-display text-lg text-foreground">
            Subscribe in Apple, Google, Outlook
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground/85 leading-relaxed">
        Add this URL to your calendar app once. Reading plans, Selah reminders, and Workspace events
        will appear and update automatically.
      </p>

      {/* Timezone */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-[0.22em] text-gold/70">Timezone</label>
        <div className="flex items-center gap-2">
          <select
            value={tz}
            onChange={(e) => saveTz(e.target.value)}
            disabled={loading || savingTz}
            className="flex-1 rounded-md border border-gold/20 bg-obsidian/60 px-3 py-2 text-sm text-foreground outline-none focus:border-gold/45 transition-colors disabled:opacity-60"
          >
            {tzOptions.map((z) => (
              <option key={z} value={z}>
                {z}
                {z === browserTz ? "  (device)" : ""}
              </option>
            ))}
          </select>
          {tz !== browserTz && (
            <button
              type="button"
              onClick={() => saveTz(browserTz)}
              className="text-[11px] uppercase tracking-[0.18em] text-gold/70 hover:text-gold-soft transition-colors px-2"
            >
              Use device
            </button>
          )}
        </div>
      </div>

      {/* Subscribe URL */}
      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-[0.22em] text-gold/70">
          Subscribe URL
        </label>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={loading ? "Loading…" : httpsUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="flex-1 rounded-md border border-gold/20 bg-obsidian/60 px-3 py-2 text-xs text-foreground/90 outline-none font-mono"
            aria-label="Input"
          />
          <button
            type="button"
            onClick={copy}
            disabled={loading || !httpsUrl}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gold/25 bg-gold/10 text-gold-soft hover:bg-gold/15 transition-colors disabled:opacity-50"
            title="Copy"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <a
          href={loading ? undefined : webcalUrl}
          aria-disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gold/40 bg-gold/15 text-gold-soft text-sm font-medium hover:bg-gold/20 transition-colors px-3"
        >
          <Calendar className="h-4 w-4" />
          Add to Calendar
        </a>
        <button
          type="button"
          onClick={download}
          disabled={loading || !httpsUrl}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gold/25 text-gold-soft text-sm hover:bg-gold/8 transition-colors px-3 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download .ics
        </button>
        <button
          type="button"
          onClick={rotate}
          disabled={loading || rotating}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gold/25 text-gold-soft text-sm hover:bg-gold/8 transition-colors px-3 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${rotating ? "animate-spin" : ""}`} />
          Resync now
        </button>
      </div>

      {showFeedControls && (
        <div className="space-y-3 pt-2 border-t border-gold/10">
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/70">What's flowing in</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <FeedToggle
              active={feeds.has("plans")}
              onClick={() => toggleFeed("plans")}
              icon={<BookOpen className="h-3.5 w-3.5" />}
              label="Reading Plans"
            />
            <FeedToggle
              active={feeds.has("selah")}
              onClick={() => toggleFeed("selah")}
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Selah Rhythms"
            />
            <FeedToggle
              active={feeds.has("events")}
              onClick={() => toggleFeed("events")}
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              label="Workspace Events"
            />
          </div>
          {preview.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-gold/50">Next up</p>
              <ul className="space-y-1">
                {preview.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-foreground/85 truncate">{p.title}</span>
                    <span className="text-muted-foreground/60 shrink-0 font-mono text-[10px]">
                      {new Date(p.startsAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
        Tip: tapping <span className="text-gold-soft">Add to Calendar</span> on iOS/macOS opens the
        native subscribe dialog. On Google Calendar, paste the URL into{" "}
        <span className="text-gold-soft">Other calendars → From URL</span>. Resync revokes the old
        URL and issues a new one.
      </p>
    </div>
  );
}

function FeedToggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
        active
          ? "border-gold/45 bg-gold/12 text-gold-soft"
          : "border-border/40 bg-obsidian/40 text-muted-foreground/60 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
