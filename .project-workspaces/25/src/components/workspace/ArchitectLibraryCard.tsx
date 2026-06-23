/**
 * ArchitectLibraryCard
 *
 * Library section for the Workspace Command Center. Lists the user's
 * sermon drafts as compact rows; each row links into the unified editor
 * at /workspace/sermons/$sermonId. When the library is empty, three
 * ghost cards stand in to set the visual rhythm and invite the first draft.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ScrollText, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { MiniProgressBeats } from "@/components/workspace/MiniProgressBeats";

interface SermonRow {
  id: string;
  title: string;
  theme: string | null;
  scripture_ref: string | null;
  manuscript: string;
  current_version: number;
  updated_at: string;
}

interface Props {
  userId: string;
  /** Bumped externally to force a refetch after a save elsewhere. */
  refreshKey?: number;
  /** Cap rows shown in the card; rest are accessed via "View all". */
  limit?: number;
}

export function ArchitectLibraryCard({ userId, refreshKey = 0, limit = 5 }: Props) {
  const [rows, setRows] = useState<SermonRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("sermons")
        .select("id, title, theme, scripture_ref, manuscript, current_version, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })
        .limit(limit);
      if (!active) return;
      if (error) {
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data ?? []) as SermonRow[]);
    })();
    return () => {
      active = false;
    };
  }, [userId, limit, refreshKey]);

  return (
    <section
      aria-label="Sermon library"
      className="mb-8 rounded-2xl border border-gold/20 bg-obsidian-elevated/40 backdrop-blur-xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
    >
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="h-3.5 w-3.5 text-gold/70" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-[0.28em] text-gold/70">
            Architect Library
          </span>
        </div>
        {rows && rows.length > 0 && (
          <Link
            to="/workspace/sermons"
            search={{ page: 1, q: "" }}
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-gold transition-colors"
          >
            View all <ChevronRight className="h-3 w-3" />
          </Link>
        )}
      </header>

      {rows === null && <LibrarySkeleton />}

      {rows !== null && rows.length === 0 && <GhostCards />}

      {rows !== null && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                to="/workspace/sermons/$sermonId"
                params={{ sermonId: s.id }}
                search={{ prefilledScripture: undefined, prefilledTheme: undefined }}
                className="group flex items-center justify-between gap-3 rounded-xl border border-gold/10 bg-obsidian/40 px-4 py-3 transition-all hover:border-gold/30 hover:bg-obsidian/60 touch-manipulation select-none active:scale-[0.99] active:border-gold/45 active:bg-gold/[0.06] motion-reduce:active:scale-100"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-foreground group-hover:text-gold-soft transition-colors">
                    {s.title || "Untitled Sermon"}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="truncate">{s.scripture_ref || s.theme || "—"}</span>
                    <span aria-hidden className="text-gold/30">
                      ·
                    </span>
                    <span className="shrink-0">{new Date(s.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <MiniProgressBeats
                  outlineDone={Boolean(
                    (s.theme && s.theme.trim()) || (s.scripture_ref && s.scripture_ref.trim()),
                  )}
                  manuscriptDone={(s.manuscript ?? "").trim().length >= 80}
                  reviseDone={(s.current_version ?? 1) > 1}
                />
                <ChevronRight className="h-4 w-4 shrink-0 text-gold/40 transition-transform group-hover:translate-x-0.5 group-hover:text-gold/70" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mt-3 text-[11px] italic text-destructive/80">
          Couldn't load library: {error}
        </p>
      )}
    </section>
  );
}

/* ─── Empty-state ghost cards ──────────────────────────────────────────── */

function GhostCards() {
  return (
    <div className="space-y-2">
      <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground/80">
        <Sparkles className="h-3 w-3 text-gold/60" strokeWidth={1.5} />
        Your first sermon draft will land here.
      </p>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden
          className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-gold/15 bg-obsidian/20 px-4 py-3"
          style={{ opacity: 1 - i * 0.25 }}
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-2/3 rounded bg-gold/10" />
            <div className="h-2 w-1/3 rounded bg-gold/5" />
          </div>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gold/15" />
            <span className="h-1.5 w-1.5 rounded-full bg-gold/15" />
            <span className="h-1.5 w-1.5 rounded-full bg-gold/15" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Loading skeleton ─────────────────────────────────────────────────── */

function LibrarySkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          aria-hidden
          className="flex items-center justify-between gap-3 rounded-xl border border-gold/10 bg-obsidian/30 px-4 py-3 animate-pulse"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-1/2 rounded bg-gold/10" />
            <div className="h-2 w-1/4 rounded bg-gold/5" />
          </div>
          <div className="h-3 w-12 rounded bg-gold/10" />
        </div>
      ))}
    </div>
  );
}
