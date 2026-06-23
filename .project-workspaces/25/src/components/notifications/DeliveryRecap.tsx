/**
 * DeliveryRecap — 7-day summary of notifications activity.
 *
 * Shows total/read counts plus a tiny per-day sparkline. Pulls from the
 * `notifications` table (user-scoped via RLS). Quiet — no chart libs.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sanctum:delivery-recap:open";

type DayBucket = { day: string; total: number; read: number };

const DAYS = 7;

function bucketKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function shortDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2);
}

export function DeliveryRecap() {
  const { user } = useAuth();
  const [buckets, setBuckets] = useState<DayBucket[] | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - (DAYS - 1));
    since.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("notifications")
      .select("created_at, read_at")
      .eq("user_id", user.id)
      .gte("created_at", since.toISOString())
      .limit(1000);

    if (error) {
      console.warn("DeliveryRecap load failed", error);
      setBuckets([]);
      return;
    }

    const map = new Map<string, DayBucket>();
    for (let i = 0; i < DAYS; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      const key = bucketKey(d);
      map.set(key, { day: key, total: 0, read: 0 });
    }

    for (const row of data ?? []) {
      const key = bucketKey(new Date(row.created_at));
      const b = map.get(key);
      if (!b) continue;
      b.total += 1;
      if (row.read_at) b.read += 1;
    }

    setBuckets(Array.from(map.values()));
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: refresh on INSERT/UPDATE of this user's notifications.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`recap:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const stats = useMemo(() => {
    if (!buckets) return null;
    const total = buckets.reduce((a, b) => a + b.total, 0);
    const read = buckets.reduce((a, b) => a + b.read, 0);
    const max = Math.max(1, ...buckets.map((b) => b.total));
    return { total, read, max };
  }, [buckets]);

  if (!buckets || !stats || stats.total === 0) return null;

  const readPct = stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0;

  return <RecapShell buckets={buckets} stats={stats} readPct={readPct} />;
}

function RecapShell({
  buckets,
  stats,
  readPct,
}: {
  buckets: DayBucket[];
  stats: { total: number; read: number; max: number };
  readPct: number;
}) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === null ? true : saved === "1";
  });

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <section
      className="hairline rounded-xl bg-obsidian-elevated/30 px-5 py-4"
      aria-label="7-day notification recap"
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="delivery-recap-body"
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
          <p className="text-[11px] uppercase tracking-[0.28em] text-gold-soft/80">Last 7 days</p>
          {!open && (
            <span className="ml-2 text-[11px] text-muted-foreground/80">
              · {stats.total} {stats.total === 1 ? "msg" : "msgs"} ·{" "}
              <span className="text-gold-soft">{readPct}% read</span>
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gold/60 transition-transform duration-300",
            open ? "rotate-0" : "-rotate-90",
          )}
          strokeWidth={1.5}
        />
      </button>

      {open && (
        <div
          id="delivery-recap-body"
          className="mt-3 flex items-start justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div>
            <p className="font-display text-base text-foreground">
              {stats.total} {stats.total === 1 ? "message" : "messages"} ·{" "}
              <span className="text-gold-soft">{readPct}% read</span>
            </p>
          </div>
          <div
            className="flex items-end gap-1 h-10"
            role="img"
            aria-label={`Daily activity sparkline, ${stats.total} total`}
          >
            {buckets.map((b) => {
              const h = b.total === 0 ? 2 : Math.max(4, (b.total / stats.max) * 40);
              return (
                <div
                  key={b.day}
                  className="flex flex-col items-center gap-1"
                  title={`${shortDay(b.day)}: ${b.total} sent, ${b.read} read`}
                >
                  <div
                    className={cn(
                      "w-2 rounded-sm transition-colors",
                      b.total === 0 ? "bg-border/30" : "bg-gradient-to-t from-gold/40 to-gold/80",
                    )}
                    style={{ height: `${h}px` }}
                  />
                  <span className="text-[8px] uppercase tracking-wider text-muted-foreground/50">
                    {shortDay(b.day)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
