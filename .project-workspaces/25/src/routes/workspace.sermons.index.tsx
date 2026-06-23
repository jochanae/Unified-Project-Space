/**
 * Architect Library — paginated browse page for the user's sermon drafts.
 */

import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PenLine,
  ScrollText,
  Search,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { MiniProgressBeats } from "@/components/workspace/MiniProgressBeats";

const PAGE_SIZE = 20;

const searchSchema = z.object({
  page: fallback(z.number().int().min(1), 1).default(1),
  q: fallback(z.string(), "").default(""),
});

interface SermonRow {
  id: string;
  title: string;
  theme: string | null;
  scripture_ref: string | null;
  manuscript: string;
  current_version: number;
  updated_at: string;
}

export const Route = createFileRoute("/workspace/sermons/")({
  validateSearch: zodValidator(searchSchema),
  component: SermonLibraryPage,
});

function SermonLibraryPage() {
  const { user, loading } = useAuth();
  const { hasAnyRole, loading: rolesLoading } = useRoles(user?.id);
  const canUseWorkspace = hasAnyRole(["minister", "church_partner", "admin"]);
  const { page, q } = Route.useSearch();
  const navigate = useNavigate({ from: "/workspace/sermons/" });

  const [rows, setRows] = useState<SermonRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState(q);

  useEffect(() => {
    setQueryInput(q);
  }, [q]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setRows(null);
    setError(null);

    void (async () => {
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("sermons")
        .select("id, title, theme, scripture_ref, manuscript, current_version, updated_at", {
          count: "exact",
        })
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .range(from, to);

      if (q.trim()) {
        const term = `%${q.trim()}%`;
        query = query.or(`title.ilike.${term},scripture_ref.ilike.${term},theme.ilike.${term}`);
      }

      const { data, error: queryError, count } = await query;
      if (!active) return;
      if (queryError) {
        setError(queryError.message);
        setRows([]);
        setTotal(0);
        return;
      }
      setRows((data ?? []) as SermonRow[]);
      setTotal(count ?? 0);
    })();

    return () => {
      active = false;
    };
  }, [user, page, q]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: { page: 1, q: queryInput.trim() } });
  }

  function clearSearch() {
    setQueryInput("");
    navigate({ search: { page: 1, q: "" } });
  }

  if (loading || rolesLoading) {
    return (
      <LoadingAppShell pageTitle="Library">
        <ListSkeleton />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        icon={ScrollText}
        eyebrow="Architect Library"
        title="Where your sermons live"
        description="Browse, search, and revisit every draft you've shaped."
        redirectTo="/workspace/sermons"
        showReaderLink
      />
    );
  }

  if (!canUseWorkspace) {
    return (
      <SanctuaryGate
        icon={ScrollText}
        eyebrow="Architect Library"
        title="Reserved for ministers and church partners"
        description="Sermon drafting tools open at the minister and church partner tiers."
        redirectTo="/pricing"
        showReaderLink
      />
    );
  }

  return (
    <AppShell>
      <div className="relative mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(circle_at_top,rgba(201,168,76,0.08),transparent_70%)]"
        />

        <header className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/workspace"
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-gold transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Command Center
          </Link>
          <Link
            to="/workspace/sermons/choice"
            search={{ scripture: undefined, scriptureText: undefined, path: undefined }}
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-obsidian-elevated/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-gold-soft hover:border-gold/60 hover:text-gold transition-colors"
          >
            <PenLine className="h-3 w-3" /> New Sermon
          </Link>
        </header>

        <div className="mb-6">
          <div className="flex items-center gap-2">
            <ScrollText className="h-3.5 w-3.5 text-gold/70" strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-[0.28em] text-gold/70">
              Architect Library
            </span>
          </div>
          <h1 className="mt-1 font-display text-2xl text-foreground sm:text-3xl">
            Your Sermon Drafts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total === 0
              ? "Nothing in the library yet."
              : `${total} draft${total === 1 ? "" : "s"} in your library.`}
          </p>
        </div>

        <form onSubmit={applySearch} className="mb-5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gold/40" />
            <Input
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Search title, scripture, or theme…"
              className="border-gold/20 bg-obsidian/40 pl-9 text-sm text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-gold/30"
            />
          </div>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-gold/30 text-gold-soft hover:border-gold/60 hover:text-gold"
          >
            Search
          </Button>
          {q && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </form>

        <section
          aria-label="Sermon drafts"
          className="rounded-2xl border border-gold/20 bg-obsidian-elevated/40 p-4 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
        >
          {rows === null && <ListSkeleton />}
          {rows !== null && rows.length === 0 && <EmptyState searching={Boolean(q.trim())} />}
          {rows !== null && rows.length > 0 && (
            <ul className="space-y-2">
              {rows.map((s) => (
                <li key={s.id}>
                  <Link
                    to="/workspace/sermons/$sermonId"
                    params={{ sermonId: s.id }}
                    search={{ prefilledScripture: undefined, prefilledTheme: undefined }}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-gold/10 bg-obsidian/40 px-4 py-3 transition-all hover:border-gold/30 hover:bg-obsidian/60"
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
                        <span className="shrink-0">
                          {new Date(s.updated_at).toLocaleDateString()}
                        </span>
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

        {rows !== null && totalPages > 1 && (
          <nav aria-label="Pagination" className="mt-5 flex items-center justify-between gap-3">
            <Link
              to="/workspace/sermons"
              search={{ page: Math.max(1, page - 1), q }}
              disabled={page <= 1}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                page <= 1
                  ? "pointer-events-none border-gold/10 text-muted-foreground/40"
                  : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-gold"
              }`}
            >
              <ChevronLeft className="h-3 w-3" /> Prev
            </Link>
            <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Link
              to="/workspace/sermons"
              search={{ page: Math.min(totalPages, page + 1), q }}
              disabled={page >= totalPages}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] transition-colors ${
                page >= totalPages
                  ? "pointer-events-none border-gold/10 text-muted-foreground/40"
                  : "border-gold/20 text-muted-foreground hover:border-gold/40 hover:text-gold"
              }`}
            >
              Next <ChevronRight className="h-3 w-3" />
            </Link>
          </nav>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState({ searching }: { searching: boolean }) {
  if (searching) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-muted-foreground">No drafts match that search.</p>
      </div>
    );
  }

  return (
    <div className="py-10 text-center">
      <Sparkles className="mx-auto mb-3 h-5 w-5 text-gold/60" strokeWidth={1.5} />
      <p className="text-sm text-foreground">Your library is quiet.</p>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
        Begin a sermon from a verse in the reader, or start fresh from the Choice portal.
      </p>
      <Link
        to="/workspace/sermons/choice"
        search={{ scripture: undefined, scriptureText: undefined, path: undefined }}
        className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-obsidian-elevated/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.22em] text-gold-soft hover:border-gold/60 hover:text-gold transition-colors"
      >
        <PenLine className="h-3 w-3" /> Begin First Sermon
      </Link>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <li
          key={i}
          aria-hidden
          className="flex items-center justify-between gap-3 rounded-xl border border-gold/10 bg-obsidian/30 px-4 py-3 animate-pulse"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-2.5 w-1/2 rounded bg-gold/10" />
            <div className="h-2 w-1/4 rounded bg-gold/5" />
          </div>
          <div className="h-3 w-12 rounded bg-gold/10" />
        </li>
      ))}
    </ul>
  );
}
