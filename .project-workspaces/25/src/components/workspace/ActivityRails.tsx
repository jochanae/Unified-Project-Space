/**
 * ActivityRails — Saved-work surfaces for /workspace.
 *
 * Two horizontal rails so the page stops feeling like a black hole:
 *   1. Recent Sermons — last 5 from `sermons` table
 *   2. Saved Plans — upcoming events grouped from `plan_events` table
 *
 * Pure presentation. Reads from Supabase via RLS; no writes.
 * Refreshes when the `workspace:rails-refresh` window event fires.
 */

import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Calendar, ChevronRight, FileText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type SermonRow = {
  id: string;
  title: string;
  scripture_ref: string | null;
  updated_at: string;
  status: string;
};

type PlanEventRow = {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  description: string | null;
};

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatEventDate(iso: string): { day: string; month: string; time: string } {
  const d = new Date(iso);
  return {
    day: String(d.getDate()),
    month: d.toLocaleString(undefined, { month: "short" }).toUpperCase(),
    time: d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
  };
}

export function ActivityRails({ userId }: { userId: string }) {
  const [sermons, setSermons] = useState<SermonRow[] | null>(null);
  const [events, setEvents] = useState<PlanEventRow[] | null>(null);

  const refresh = useCallback(async () => {
    const [sermonRes, eventRes] = await Promise.all([
      supabase
        .from("sermons")
        .select("id, title, scripture_ref, updated_at, status")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(5),
      supabase
        .from("plan_events")
        .select("id, title, category, starts_at, description")
        .eq("user_id", userId)
        .gte("starts_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
        .order("starts_at", { ascending: true })
        .limit(8),
    ]);
    setSermons((sermonRes.data ?? []) as SermonRow[]);
    setEvents((eventRes.data ?? []) as PlanEventRow[]);
  }, [userId]);

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener("workspace:rails-refresh", handler);
    return () => window.removeEventListener("workspace:rails-refresh", handler);
  }, [refresh]);

  return (
    <div className="space-y-8 mb-10">
      <SermonsRail sermons={sermons} />
      <PlansRail events={events} />
    </div>
  );
}

/* ─────────────────── Sermons rail ─────────────────── */

function SermonsRail({ sermons }: { sermons: SermonRow[] | null }) {
  return (
    <section aria-labelledby="rail-sermons">
      <RailHeader
        id="rail-sermons"
        eyebrow="Manuscript Library"
        title="Recent sermons"
        action={{ to: "/workspace/sermons/new", label: "Open composer" }}
      />
      {sermons === null ? (
        <RailSkeleton />
      ) : sermons.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No sermons yet"
          body="Your manuscripts appear here the moment they're saved."
          ctaLabel="Compose your first sermon"
          ctaTo="/workspace/sermons/new"
        />
      ) : (
        <ScrollRow>
          {sermons.map((s) => (
            <SermonCard key={s.id} sermon={s} />
          ))}
          <NewCard label="New sermon" to="/workspace/sermons/new" />
        </ScrollRow>
      )}
    </section>
  );
}

function SermonCard({ sermon }: { sermon: SermonRow }) {
  return (
    <Link
      to="/workspace/sermons/$sermonId"
      params={{ sermonId: sermon.id }}
      className={cn(
        "group relative shrink-0 w-[260px] snap-start",
        "rounded-2xl border border-gold/15 bg-obsidian-elevated/40 backdrop-blur-xl",
        "p-5 transition-all duration-300",
        "hover:border-gold/35 hover:bg-obsidian-elevated/60 hover:-translate-y-0.5",
        "shadow-[0_4px_24px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_32px_rgba(201,168,76,0.12)]",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent"
      />
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold/70">
        <FileText className="h-3 w-3" strokeWidth={1.5} />
        {sermon.status === "draft" ? "Draft" : sermon.status}
      </div>
      <h3 className="mt-3 font-display text-base text-foreground line-clamp-2 leading-snug">
        {sermon.title || "Untitled sermon"}
      </h3>
      {sermon.scripture_ref && (
        <p className="mt-2 text-xs text-gold-soft/80 truncate">{sermon.scripture_ref}</p>
      )}
      <p className="mt-4 text-[11px] text-muted-foreground/70">
        Edited {formatRelative(sermon.updated_at)}
      </p>
    </Link>
  );
}

/* ─────────────────── Plans rail ─────────────────── */

function PlansRail({ events }: { events: PlanEventRow[] | null }) {
  return (
    <section aria-labelledby="rail-plans">
      <RailHeader
        id="rail-plans"
        eyebrow="The Plan Vault"
        title="Upcoming events"
        action={{ to: "/account", label: "Calendar sync" }}
      />
      {events === null ? (
        <RailSkeleton />
      ) : events.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No saved plans yet"
          body="Generate a series below — events you save land here and sync to your calendar."
        />
      ) : (
        <ScrollRow>
          {events.map((e) => (
            <PlanCard key={e.id} event={e} />
          ))}
        </ScrollRow>
      )}
    </section>
  );
}

function PlanCard({ event }: { event: PlanEventRow }) {
  const { day, month, time } = formatEventDate(event.starts_at);
  return (
    <div
      className={cn(
        "group relative shrink-0 w-[240px] snap-start",
        "rounded-2xl border border-gold/12 bg-obsidian-elevated/35 backdrop-blur-xl",
        "p-5 transition-all duration-300",
        "hover:border-gold/30 hover:bg-obsidian-elevated/55 hover:-translate-y-0.5",
        "shadow-[0_4px_24px_rgba(0,0,0,0.2)]",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg border border-gold/20 bg-obsidian/60 px-2.5 py-1.5 text-center">
          <div className="font-display text-lg leading-none text-gold">{day}</div>
          <div className="mt-0.5 text-[9px] tracking-[0.2em] text-gold/65">{month}</div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.24em] text-gold/60">
            {event.category}
          </div>
          <h4 className="mt-1 text-sm text-foreground line-clamp-2 leading-snug">{event.title}</h4>
          <p className="mt-2 text-[11px] text-muted-foreground/75">{time}</p>
        </div>
      </div>
      {event.description && (
        <p className="mt-3 text-[11px] text-muted-foreground/70 line-clamp-2">
          {event.description}
        </p>
      )}
    </div>
  );
}

/* ─────────────────── Building blocks ─────────────────── */

function RailHeader({
  id,
  eyebrow,
  title,
  action,
}: {
  id: string;
  eyebrow: string;
  title: string;
  action?: { to: string; label: string };
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">{eyebrow}</p>
        <h2 id={id} className="mt-1 font-display text-xl text-foreground">
          {title}
        </h2>
      </div>
      {action && (
        <Link
          to={action.to}
          className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-gold-soft"
        >
          {action.label}
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

function ScrollRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative -mx-6">
      <div className="px-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
        <div className="flex gap-4 pb-2 pr-10">{children}</div>
      </div>
      {/* Right-edge fade — signals more content to swipe to */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-obsidian via-obsidian/70 to-transparent"
      />
      {/* Chevron peek — subtle swipe affordance, mobile-first */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gold/60 sm:hidden"
      >
        <ChevronRight className="h-4 w-4 animate-pulse" strokeWidth={1.5} />
      </div>
    </div>
  );
}

function RailSkeleton() {
  return (
    <ScrollRow>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="shrink-0 w-[260px] h-[148px] rounded-2xl border border-gold/10 bg-obsidian-elevated/30 animate-pulse"
        />
      ))}
    </ScrollRow>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  ctaLabel,
  ctaTo,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gold/15 bg-obsidian-elevated/20 backdrop-blur-xl px-6 py-8 text-center">
      <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-gold/25 bg-obsidian/60 text-gold/80">
        <Icon className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <p className="font-display text-base text-foreground">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground/80 leading-relaxed">
        {body}
      </p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10 px-4 py-1.5 text-[11px] uppercase tracking-[0.2em] text-gold-soft transition-colors hover:bg-gold/20"
        >
          <Sparkles className="h-3 w-3" strokeWidth={1.5} />
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}

function NewCard({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "group shrink-0 w-[260px] snap-start",
        "rounded-2xl border border-dashed border-gold/25 bg-obsidian-elevated/20 backdrop-blur-xl",
        "flex flex-col items-center justify-center gap-2 p-5 min-h-[148px]",
        "transition-all duration-300 hover:border-gold/45 hover:bg-gold/5",
      )}
    >
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gold/35 bg-obsidian/70 text-gold transition-transform group-hover:scale-110">
        <Sparkles className="h-4 w-4" strokeWidth={1.5} />
      </div>
      <span className="text-[11px] uppercase tracking-[0.24em] text-gold-soft">{label}</span>
    </Link>
  );
}
