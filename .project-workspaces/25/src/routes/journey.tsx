import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Anchor,
  BookOpen,
  BookmarkCheck,
  Feather,
  Flame,
  Highlighter,
  History,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { useAuth } from "@/hooks/useAuth";
import { JourneySkeleton } from "@/components/ui/page-skeletons";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { deserialisePoem, poemPreviewText } from "@/components/notes/PoemEditor";

export const Route = createFileRoute("/journey")({
  head: () => ({
    meta: [
      { title: "My Journey — SanctumIQ" },
      {
        name: "description",
        content:
          "Your scripture story over time — reading history, reflections, bookmarks, and milestones.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: JourneyPage,
});

// ─── DB row types ─────────────────────────────────────────────────────────────

type HistoryRow = {
  id: string;
  book: string;
  chapter: number;
  verse: number | null;
  visited_at: string;
};

type PlanRow = {
  id: string;
  book: string;
  start_chapter: number;
  target_chapters_per_day: number;
  status: "active" | "complete";
  started_at: string;
};

type ProgressRow = {
  plan_id: string;
  chapter: number;
  completed_at: string;
};

type BookmarkRow = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  created_at: string;
};

type HighlightRow = {
  id: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  tone: string;
  created_at: string;
};

type NoteRow = {
  id: string;
  body_text: string;
  scripture_ref: string | null;
  book: string | null;
  chapter: number | null;
  verse: number | null;
  updated_at: string;
};

// ─── merged timeline event ───────────────────────────────────────────────────

type TimelineEvent =
  | { kind: "reading"; at: string; book: string; chapter: number; verse: number | null }
  | { kind: "bookmark"; at: string; book: string; chapter: number; verse: number }
  | {
      kind: "highlight";
      at: string;
      book: string;
      chapter: number;
      verseStart: number;
      verseEnd: number;
      tone: string;
    }
  | {
      kind: "note";
      at: string;
      ref: string | null;
      preview: string;
      isPoem: boolean;
      noteId: string;
    };

function buildTimeline(
  history: HistoryRow[],
  bookmarks: BookmarkRow[],
  highlights: HighlightRow[],
  notes: NoteRow[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  for (const h of history) {
    events.push({
      kind: "reading",
      at: h.visited_at,
      book: h.book,
      chapter: h.chapter,
      verse: h.verse,
    });
  }
  for (const b of bookmarks) {
    events.push({
      kind: "bookmark",
      at: b.created_at,
      book: b.book,
      chapter: b.chapter,
      verse: b.verse,
    });
  }
  for (const h of highlights) {
    events.push({
      kind: "highlight",
      at: h.created_at,
      book: h.book,
      chapter: h.chapter,
      verseStart: h.verse_start,
      verseEnd: h.verse_end,
      tone: h.tone,
    });
  }
  for (const n of notes) {
    const trimmed = (n.body_text || "").trim();
    if (!trimmed) continue;
    const poem = deserialisePoem(trimmed);
    const preview = poem ? poemPreviewText(poem.data) : trimmed.slice(0, 90);
    events.push({
      kind: "note",
      at: n.updated_at,
      ref: n.scripture_ref,
      preview,
      isPoem: !!poem,
      noteId: n.id,
    });
  }

  return events.sort((a, b) => b.at.localeCompare(a.at));
}

// ─── pages ───────────────────────────────────────────────────────────────────

function JourneyPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <LoadingAppShell pageTitle="My Journey">
        <JourneySkeleton text="Gathering your journey…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="My Journey"
        title="Your scripture story, kept close"
        description="Sign in to see your reading history, reflections, bookmarks, highlights, and plans — your personal record of where the Word has met you."
        redirectTo="/journey"
        showReaderLink
        features={[
          "Chronological timeline of all your engagement",
          "Notes and poems surfaced alongside what they're anchored to",
          "Active reading plans with quiet progress tracking",
        ]}
      />
    );
  }

  return (
    <AppShell pageTitle="My Journey">
      <JourneyContent userId={user.id} />
    </AppShell>
  );
}

// ─── main content ─────────────────────────────────────────────────────────────

type ViewTab = "timeline" | "plans" | "milestones";

function JourneyContent({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tab, setTab] = useState<ViewTab>("timeline");

  useEffect(() => {
    let active = true;
    void (async () => {
      const [histRes, plansRes, progRes, bkRes, hlRes, ntRes] = await Promise.all([
        supabase
          .from("reader_position_history")
          .select("id, book, chapter, verse, visited_at")
          .eq("user_id", userId)
          .order("visited_at", { ascending: false })
          .limit(60),
        supabase
          .from("reading_plans")
          .select("id, book, start_chapter, target_chapters_per_day, status, started_at")
          .eq("user_id", userId)
          .order("started_at", { ascending: false }),
        supabase
          .from("reading_progress")
          .select("plan_id, chapter, completed_at")
          .eq("user_id", userId)
          .order("completed_at", { ascending: false }),
        supabase
          .from("bookmarks")
          .select("id, book, chapter, verse, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("verse_highlights")
          .select("id, book, chapter, verse_start, verse_end, tone, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(40),
        supabase
          .from("notes")
          .select("id, body_text, scripture_ref, book, chapter, verse, updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(40),
      ]);

      if (!active) return;

      const err =
        histRes.error?.message || plansRes.error?.message || progRes.error?.message || null;
      setError(err);
      setHistory((histRes.data ?? []) as HistoryRow[]);
      setPlans((plansRes.data ?? []) as PlanRow[]);
      setProgress((progRes.data ?? []) as ProgressRow[]);
      setBookmarks((bkRes.data ?? []) as BookmarkRow[]);
      setHighlights((hlRes.data ?? []) as HighlightRow[]);
      setNotes((ntRes.data ?? []) as NoteRow[]);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const activePlans = useMemo(() => plans.filter((p) => p.status === "active"), [plans]);
  const completedPlans = useMemo(() => plans.filter((p) => p.status === "complete"), [plans]);
  const streakDays = useMemo(() => calcStreakDays(history), [history]);
  const chaptersRead = useMemo(
    () => new Set(history.map((h) => `${h.book}:${h.chapter}`)).size,
    [history],
  );

  const timeline = useMemo(
    () => buildTimeline(history, bookmarks, highlights, notes),
    [history, bookmarks, highlights, notes],
  );

  if (loading) return <JourneySkeleton text="Gathering your journey…" />;

  const isEmpty = timeline.length === 0 && plans.length === 0;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10 space-y-8">
      {/* Hero */}
      <header className="text-center space-y-3">
        <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">My Journey</p>
        <h1 className="font-display text-2xl text-foreground">Where you've walked</h1>
        <div
          aria-hidden
          className="mx-auto h-px w-20 bg-gradient-to-r from-transparent via-gold/40 to-transparent"
        />
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={Flame}
          label="Streak"
          value={streakDays}
          suffix={streakDays === 1 ? "day" : "days"}
        />
        <StatTile icon={BookOpen} label="Chapters" value={chaptersRead} suffix="read" />
        <StatTile
          icon={BookmarkCheck}
          label="Plans"
          value={completedPlans.length}
          suffix="complete"
        />
      </div>

      {error && (
        <p className="text-xs italic text-muted-foreground/70 text-center">
          Some data couldn't load: {error}
        </p>
      )}

      {/* Tab switcher */}
      <div className="inline-flex hairline rounded-md p-0.5 bg-obsidian-elevated/60">
        {(["timeline", "plans", "milestones"] as ViewTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded capitalize transition-colors",
              tab === t
                ? "bg-gold/15 text-gold-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "timeline" && <History className="h-3.5 w-3.5" />}
            {t === "plans" && <Sparkles className="h-3.5 w-3.5" />}
            {t === "milestones" && <BookmarkCheck className="h-3.5 w-3.5" />}
            {t}
          </button>
        ))}
      </div>

      {/* ── Timeline ── */}
      {tab === "timeline" && (
        <section className="space-y-1">
          {isEmpty && (
            <EmptyLine
              body="Your timeline is quiet. Open the reader, mark a verse, leave a note — each moment of engagement leaves a trace here."
              cta="Open the Reader"
              to="/reader"
            />
          )}
          {timeline.length > 0 && (
            <div className="relative">
              {/* Vertical thread */}
              <div
                aria-hidden
                className="absolute left-[11px] top-3 bottom-3 w-px bg-gradient-to-b from-gold/30 via-gold/15 to-transparent"
              />
              <ul className="space-y-1 pl-7">
                {timeline.map((event, i) => (
                  <TimelineRow key={`${event.kind}-${i}`} event={event} />
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Plans ── */}
      {tab === "plans" && (
        <section className="space-y-4">
          {/* Active */}
          <div className="space-y-2">
            <SectionLabel icon={Sparkles} title="Active Plans" />
            {activePlans.length === 0 ? (
              <EmptyLine body="No active reading plans." cta="Start a plan" to="/workspace" />
            ) : (
              <ul className="space-y-2">
                {activePlans.map((plan) => {
                  const completed = progress.filter((p) => p.plan_id === plan.id).length;
                  return (
                    <li key={plan.id}>
                      <Link
                        to="/reader"
                        className="block hairline rounded-xl bg-obsidian-elevated/40 px-4 py-3 hover:bg-obsidian-elevated/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display text-sm text-gold-soft truncate">
                              {plan.book}
                            </p>
                            <p className="text-[11px] text-muted-foreground/80">
                              {completed} {completed === 1 ? "chapter" : "chapters"} ·{" "}
                              {plan.target_chapters_per_day}/day target
                            </p>
                          </div>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-gold/70">
                            Continue →
                          </span>
                        </div>
                        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-gold/10">
                          <div
                            className="h-full bg-gradient-to-r from-gold/40 to-gold/70 transition-all duration-700"
                            style={{ width: `${Math.min(100, completed * 4)}%` }}
                          />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Completed */}
          {completedPlans.length > 0 && (
            <div className="space-y-2">
              <SectionLabel icon={BookmarkCheck} title="Completed Plans" />
              <ul className="space-y-1.5">
                {completedPlans.map((plan) => (
                  <li
                    key={plan.id}
                    className="hairline rounded-xl bg-obsidian-elevated/30 px-4 py-2.5 flex items-center justify-between gap-3"
                  >
                    <p className="font-display text-sm text-foreground/80">{plan.book}</p>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gold/50">
                      {new Date(plan.started_at).toLocaleDateString(undefined, {
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Milestones ── */}
      {tab === "milestones" && (
        <section className="space-y-3">
          {streakDays === 0 && completedPlans.length === 0 && chaptersRead === 0 ? (
            <p className="text-xs italic text-muted-foreground/70">
              Read a chapter to begin marking your path.
            </p>
          ) : (
            <ul className="space-y-2">
              {streakDays >= 1 && (
                <MilestoneLine
                  title={`${streakDays}-day reading streak`}
                  body="Keep coming back — the rhythm shapes the soul."
                />
              )}
              {chaptersRead >= 1 && (
                <MilestoneLine
                  title={`${chaptersRead} ${chaptersRead === 1 ? "chapter" : "chapters"} visited`}
                  body="Every passage adds to the inheritance."
                />
              )}
              {bookmarks.length >= 1 && (
                <MilestoneLine
                  title={`${bookmarks.length} ${bookmarks.length === 1 ? "verse" : "verses"} bookmarked`}
                  body="The verses you saved are waiting to be revisited."
                />
              )}
              {highlights.length >= 1 && (
                <MilestoneLine
                  title={`${highlights.length} ${highlights.length === 1 ? "passage" : "passages"} highlighted`}
                  body="Light left on what mattered."
                />
              )}
              {notes.filter((n) => (n.body_text || "").trim()).length >= 1 && (
                <MilestoneLine
                  title={`${notes.filter((n) => (n.body_text || "").trim()).length} ${notes.filter((n) => (n.body_text || "").trim()).length === 1 ? "reflection" : "reflections"} written`}
                  body="Thoughts that found a home."
                />
              )}
              {completedPlans.length >= 1 && (
                <MilestoneLine
                  title={`${completedPlans.length} ${completedPlans.length === 1 ? "plan" : "plans"} completed`}
                  body="Finished work is a witness."
                />
              )}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

// ─── timeline row ─────────────────────────────────────────────────────────────

function TimelineRow({ event }: { event: TimelineEvent }) {
  const label = useMemo(() => {
    switch (event.kind) {
      case "reading":
        return `${event.book} ${event.chapter}${event.verse ? `:${event.verse}` : ""}`;
      case "bookmark":
        return `${event.book} ${event.chapter}:${event.verse}`;
      case "highlight":
        return event.verseStart === event.verseEnd
          ? `${event.book} ${event.chapter}:${event.verseStart}`
          : `${event.book} ${event.chapter}:${event.verseStart}–${event.verseEnd}`;
      case "note":
        return event.ref ?? "Unanchored";
    }
  }, [event]);

  const dot = {
    reading: "bg-gold/30",
    bookmark: "bg-gold/60",
    highlight: "bg-amber-400/50",
    note: "bg-gold/40",
  }[event.kind];

  const Icon = {
    reading: BookOpen,
    bookmark: Anchor,
    highlight: Highlighter,
    note: event.kind === "note" && event.isPoem ? Feather : NotebookPen,
  }[event.kind] as React.FC<{ className?: string; strokeWidth?: number }>;

  return (
    <li className="relative group">
      {/* Dot on the thread */}
      <div
        aria-hidden
        className={cn(
          "absolute -left-7 top-3.5 h-2 w-2 rounded-full border border-obsidian transition-all duration-200 group-hover:scale-125",
          dot,
        )}
      />

      <div className="hairline rounded-xl bg-obsidian-elevated/30 hover:bg-obsidian-elevated/50 transition-colors px-4 py-3 flex items-start gap-3">
        <Icon className="h-3.5 w-3.5 text-gold/50 shrink-0 mt-0.5" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold-soft truncate">
              {label}
            </p>
            <time className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/50 shrink-0">
              {formatRelative(event.at)}
            </time>
          </div>
          {event.kind === "note" && (
            <p className="mt-0.5 text-sm text-foreground/75 line-clamp-2 leading-relaxed">
              {event.isPoem && (
                <span className="text-gold/40 mr-1.5 text-[10px] uppercase tracking-widest">
                  poem
                </span>
              )}
              {event.preview}
            </p>
          )}
          {event.kind === "highlight" && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/60 capitalize">
              {event.tone} highlight
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function calcStreakDays(history: HistoryRow[]): number {
  if (!history.length) return 0;
  const days = new Set(history.map((h) => new Date(h.visited_at).toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── presentational ──────────────────────────────────────────────────────────

function StatTile({
  icon: Icon,
  label,
  value,
  suffix,
}: {
  icon: typeof Sparkles;
  label: string;
  value: number;
  suffix: string;
}) {
  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/40 px-3 py-3 text-center">
      <Icon className="mx-auto h-4 w-4 text-gold" strokeWidth={1.5} />
      <p className="mt-1.5 font-display text-xl text-foreground leading-none">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {label} · {suffix}
      </p>
    </div>
  );
}

function SectionLabel({ icon: Icon, title }: { icon: typeof Sparkles; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-gold" strokeWidth={1.5} />
      <h2 className="font-display text-sm tracking-wide text-gold-soft">{title}</h2>
    </div>
  );
}

function EmptyLine({ body, cta, to }: { body: string; cta?: string; to?: string }) {
  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/30 p-5 space-y-2">
      <p className="text-xs text-muted-foreground/80 leading-relaxed">{body}</p>
      {cta && to && (
        <Link
          to={to}
          className="inline-flex text-xs text-gold-soft hover:text-gold transition-colors"
        >
          {cta} →
        </Link>
      )}
    </div>
  );
}

function MilestoneLine({ title, body }: { title: string; body: string }) {
  return (
    <li className="hairline rounded-xl bg-obsidian-elevated/40 px-4 py-3">
      <p className="font-display text-sm text-gold-soft">{title}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground/75">{body}</p>
    </li>
  );
}
