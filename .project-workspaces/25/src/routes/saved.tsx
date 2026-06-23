import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  Highlighter,
  NotebookPen,
  BookOpen,
  Trash2,
  Loader2,
  Search as SearchIcon,
  X,
  ArrowUpDown,
  BookmarkPlus,
  Plus,
  Link2,
  Download,
  FileJson,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SavedSkeleton } from "@/components/ui/page-skeletons";
import { SearchHintsPopover } from "@/components/search/SearchHintsPopover";
import { SmartEmptyState, buildSavedSuggestions } from "@/components/search/SmartEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  parseSavedQuery,
  matchesSavedQuery,
  sortSavedItems,
  loadSavedPageViews,
  saveSavedPageViews,
  type SavedSortKey,
  type SavedPageView,
  type SavedTab,
} from "@/lib/saved-search";
import {
  decodeViewFromSearch,
  syncViewToUrl,
  buildShareUrl,
  copyShareLink,
} from "@/lib/share-view";
import { readLastVisit, bumpLastVisit, freshnessOf, type FreshnessState } from "@/lib/saved-visit";
import { buildJson, buildCsv, buildMarkdown, downloadFile } from "@/lib/saved-export";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved & Highlights — SanctumIQ" },
      { name: "description", content: "Your bookmarked verses, highlights, and notes." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SavedPage,
});

const FETCH_CAP = 500;

type BookmarkRow = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  version: string;
  created_at: string;
};

type HighlightRow = {
  id: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  version: string;
  tone: string;
  created_at: string;
};

type NoteRow = {
  id: string;
  book: string | null;
  chapter: number | null;
  verse: number | null;
  scripture_ref: string | null;
  body_text: string;
  updated_at: string;
};

function SavedPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <LoadingAppShell pageTitle="Saved">
        <SavedSkeleton text="Fetching your saved verses…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Saved & Highlights"
        title="Your verses, gathered"
        description="Sign in to see the scriptures you've saved and highlighted."
        redirectTo="/saved"
        showReaderLink
      />
    );
  }

  return (
    <AppShell pageTitle="Saved & Highlights">
      <SavedContent userId={user.id} />
    </AppShell>
  );
}

function SavedContent({ userId }: { userId: string }) {
  const [tab, setTab] = useState<SavedTab>("bookmarks");
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([]);
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [bookFilter, setBookFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SavedSortKey>("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedPageView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  // "New since last visit" — read once on mount, hold for the session,
  // then bump localStorage so subsequent visits start fresh. Dots fade after 1.5s.
  const [lastVisit, setLastVisit] = useState(0);
  const [dotsVisible, setDotsVisible] = useState(true);
  useEffect(() => {
    setLastVisit(readLastVisit());
    bumpLastVisit();
    const t = window.setTimeout(() => setDotsVisible(false), 1500);
    return () => window.clearTimeout(t);
  }, []);

  // Hydrate views client-side to avoid SSR mismatch.
  useEffect(() => {
    setSavedViews(loadSavedPageViews());
  }, []);

  // Hydrate filter state from URL on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = decodeViewFromSearch(window.location.search);
    if (v.q !== undefined) setQuery(v.q);
    if (v.s) {
      const allowed: SavedSortKey[] = ["newest", "oldest", "alpha_book"];
      if (allowed.includes(v.s as SavedSortKey)) setSortKey(v.s as SavedSortKey);
    }
    if (v.b) setBookFilter(v.b);
    if (v.t) {
      const allowed: SavedTab[] = ["bookmarks", "highlights", "notes"];
      if (allowed.includes(v.t as SavedTab)) setTab(v.t as SavedTab);
    }
  }, []);

  // Keep URL in sync.
  useEffect(() => {
    if (typeof window === "undefined") return;
    syncViewToUrl("/saved", {
      q: query || undefined,
      s: sortKey !== "newest" ? sortKey : undefined,
      b: bookFilter,
      t: tab !== "bookmarks" ? tab : undefined,
    });
  }, [query, sortKey, bookFilter, tab]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([
      supabase
        .from("bookmarks")
        .select("id, book, chapter, verse, version, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(FETCH_CAP),
      supabase
        .from("verse_highlights")
        .select("id, book, chapter, verse_start, verse_end, version, tone, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(FETCH_CAP),
      supabase
        .from("notes")
        .select("id, book, chapter, verse, scripture_ref, body_text, updated_at")
        .eq("user_id", userId)
        .not("body_text", "eq", "")
        .order("updated_at", { ascending: false })
        .limit(FETCH_CAP),
    ]).then(([bRes, hRes, nRes]) => {
      if (!active) return;
      setBookmarks((bRes.data ?? []) as BookmarkRow[]);
      setHighlights((hRes.data ?? []) as HighlightRow[]);
      setNotes((nRes.data ?? []) as NoteRow[]);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [userId]);

  const removeBookmark = async (id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const { enqueue } = await import("@/lib/offline-queue");
      await enqueue({ kind: "bookmark.delete", payload: { id } });
      toast("Bookmark removed (will sync when online).");
      return;
    }
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) {
      const { enqueue } = await import("@/lib/offline-queue");
      await enqueue({ kind: "bookmark.delete", payload: { id } });
    }
    toast("Bookmark removed.");
  };

  const removeHighlight = async (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const { enqueue } = await import("@/lib/offline-queue");
      await enqueue({ kind: "highlight.delete", payload: { id } });
      toast("Highlight removed (will sync when online).");
      return;
    }
    const { error } = await supabase.from("verse_highlights").delete().eq("id", id);
    if (error) {
      const { enqueue } = await import("@/lib/offline-queue");
      await enqueue({ kind: "highlight.delete", payload: { id } });
    }
    toast("Highlight removed.");
  };

  // ── Load older: page beyond the FETCH_CAP using created_at as a cursor.
  const loadOlder = async () => {
    if (loadingOlder) return;
    setLoadingOlder(true);
    try {
      if (tab === "bookmarks") {
        const cursor = bookmarks[bookmarks.length - 1]?.created_at;
        if (!cursor) return;
        const { data, error } = await supabase
          .from("bookmarks")
          .select("id, book, chapter, verse, version, created_at")
          .eq("user_id", userId)
          .lt("created_at", cursor)
          .order("created_at", { ascending: false })
          .limit(FETCH_CAP);
        if (error) throw error;
        if (data && data.length > 0) {
          setBookmarks((prev) => [...prev, ...(data as BookmarkRow[])]);
          toast.success(`Loaded ${data.length} older bookmark${data.length === 1 ? "" : "s"}`);
        } else toast("No older bookmarks.");
      } else if (tab === "highlights") {
        const cursor = highlights[highlights.length - 1]?.created_at;
        if (!cursor) return;
        const { data, error } = await supabase
          .from("verse_highlights")
          .select("id, book, chapter, verse_start, verse_end, version, tone, created_at")
          .eq("user_id", userId)
          .lt("created_at", cursor)
          .order("created_at", { ascending: false })
          .limit(FETCH_CAP);
        if (error) throw error;
        if (data && data.length > 0) {
          setHighlights((prev) => [...prev, ...(data as HighlightRow[])]);
          toast.success(`Loaded ${data.length} older highlight${data.length === 1 ? "" : "s"}`);
        } else toast("No older highlights.");
      } else {
        const cursor = notes[notes.length - 1]?.updated_at;
        if (!cursor) return;
        const { data, error } = await supabase
          .from("notes")
          .select("id, book, chapter, verse, scripture_ref, body_text, updated_at")
          .eq("user_id", userId)
          .not("body_text", "eq", "")
          .lt("updated_at", cursor)
          .order("updated_at", { ascending: false })
          .limit(FETCH_CAP);
        if (error) throw error;
        if (data && data.length > 0) {
          setNotes((prev) => [...prev, ...(data as NoteRow[])]);
          toast.success(`Loaded ${data.length} older note${data.length === 1 ? "" : "s"}`);
        } else toast("No older notes.");
      }
    } catch {
      toast.error("Couldn't load older items.");
    } finally {
      setLoadingOlder(false);
    }
  };

  // ── Export: pull everything (capped at 5k per kind), then download one file.
  const runExport = async (kind: "json" | "csv" | "md") => {
    setExportMenuOpen(false);
    const tid = toast.loading("Preparing export…");
    try {
      const HARD_CAP = 5000;
      const [bRes, hRes, nRes] = await Promise.all([
        supabase
          .from("bookmarks")
          .select("id, book, chapter, verse, version, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(HARD_CAP),
        supabase
          .from("verse_highlights")
          .select("id, book, chapter, verse_start, verse_end, version, tone, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(HARD_CAP),
        supabase
          .from("notes")
          .select("id, book, chapter, verse, scripture_ref, body_text, updated_at")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(HARD_CAP),
      ]);
      const payload = {
        bookmarks: (bRes.data ?? []) as never,
        highlights: (hRes.data ?? []) as never,
        notes: (nRes.data ?? []) as never,
      };
      const file =
        kind === "json"
          ? buildJson(payload)
          : kind === "csv"
            ? buildCsv(payload)
            : buildMarkdown(payload);
      downloadFile(file);
      toast.success(`Downloaded ${file.filename}`, { id: tid });
    } catch {
      toast.error("Export failed.", { id: tid });
    }
  };

  // Adapt the active tab's rows into the shared SavedItem shape for filtering.
  type Adapted<T> = { row: T; book: string | null; ref: string; body: string; created_at: string };

  const adaptedBookmarks = useMemo<Adapted<BookmarkRow>[]>(
    () =>
      bookmarks.map((b) => ({
        row: b,
        book: b.book,
        ref: `${b.book} ${b.chapter}:${b.verse}`,
        body: "",
        created_at: b.created_at,
      })),
    [bookmarks],
  );

  const adaptedHighlights = useMemo<Adapted<HighlightRow>[]>(
    () =>
      highlights.map((h) => ({
        row: h,
        book: h.book,
        ref:
          h.verse_start === h.verse_end
            ? `${h.book} ${h.chapter}:${h.verse_start}`
            : `${h.book} ${h.chapter}:${h.verse_start}–${h.verse_end}`,
        body: "",
        created_at: h.created_at,
      })),
    [highlights],
  );

  const adaptedNotes = useMemo<Adapted<NoteRow>[]>(
    () =>
      notes.map((n) => ({
        row: n,
        book: n.book,
        ref: n.scripture_ref ?? (n.book ? `${n.book} ${n.chapter ?? ""}` : ""),
        body: n.body_text,
        created_at: n.updated_at,
      })),
    [notes],
  );

  const activeAdapted =
    tab === "bookmarks"
      ? adaptedBookmarks
      : tab === "highlights"
        ? adaptedHighlights
        : adaptedNotes;
  const activeTotal = activeAdapted.length;

  // Books available in the active tab (drives chip row).
  const availableBooks = useMemo(() => {
    const set = new Set<string>();
    for (const a of activeAdapted) if (a.book) set.add(a.book);
    return Array.from(set).sort();
  }, [activeAdapted]);

  const filteredAdapted = useMemo(() => {
    const parsed = parseSavedQuery(query);
    const filtered = activeAdapted.filter((a) => {
      if (bookFilter && a.book !== bookFilter) return false;
      return matchesSavedQuery(
        { book: a.book, ref: a.ref, body: a.body, created_at: a.created_at },
        parsed,
      );
    });
    return sortSavedItems(filtered, sortKey);
  }, [activeAdapted, query, bookFilter, sortKey]);

  const filtersActive = query.trim() !== "" || bookFilter !== null || sortKey !== "newest";

  /* ─── Infinite scroll: render in 50-item pages ─── */
  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset visible window whenever the underlying list or filters change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [tab, query, bookFilter, sortKey, activeTotal]);

  // Observe sentinel; bump the window when it enters the viewport.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    if (visibleCount >= filteredAdapted.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisibleCount((n) => Math.min(n + PAGE_SIZE, filteredAdapted.length));
          }
        }
      },
      { rootMargin: "320px 0px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visibleCount, filteredAdapted.length]);

  const visibleAdapted = useMemo(
    () => filteredAdapted.slice(0, visibleCount),
    [filteredAdapted, visibleCount],
  );
  const hasMore = visibleCount < filteredAdapted.length;

  const tabs: { key: SavedTab; label: string; icon: typeof Bookmark; count: number }[] = [
    { key: "bookmarks", label: "Bookmarks", icon: Bookmark, count: bookmarks.length },
    { key: "highlights", label: "Highlights", icon: Highlighter, count: highlights.length },
    { key: "notes", label: "Notes", icon: NotebookPen, count: notes.length },
  ];

  const applyView = (v: SavedPageView) => {
    setTab(v.tab);
    setQuery(v.query);
    setBookFilter(v.bookFilter);
    setSortKey(v.sort);
    setActiveViewId(v.id);
    setViewsMenuOpen(false);
  };

  const saveCurrentView = () => {
    const name = window.prompt("Name this view")?.trim();
    if (!name) return;
    const view: SavedPageView = {
      id: `sv_${Date.now().toString(36)}`,
      name,
      tab,
      query,
      bookFilter,
      sort: sortKey,
    };
    const next = [view, ...savedViews].slice(0, 10);
    setSavedViews(next);
    saveSavedPageViews(next);
    setActiveViewId(view.id);
    setViewsMenuOpen(false);
    toast.success(`Saved view “${name}”`);
  };

  const deleteView = (id: string) => {
    const next = savedViews.filter((v) => v.id !== id);
    setSavedViews(next);
    saveSavedPageViews(next);
    if (activeViewId === id) setActiveViewId(null);
  };

  const shareCurrentView = async () => {
    const url = buildShareUrl("/saved", {
      q: query || undefined,
      s: sortKey !== "newest" ? sortKey : undefined,
      b: bookFilter,
      t: tab !== "bookmarks" ? tab : undefined,
    });
    const ok = await copyShareLink(url);
    if (ok) toast.success("Share link copied to clipboard");
    else toast.error("Couldn't copy — copy from the address bar");
    setViewsMenuOpen(false);
  };

  // Reset book filter when switching tabs (book lists differ).
  const switchTab = (next: SavedTab) => {
    setTab(next);
    setBookFilter(null);
    setActiveViewId(null);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Saved & Highlights</p>
        <h1 className="font-display text-3xl text-foreground">The verses that found you</h1>
        <p className="text-sm text-muted-foreground/70">
          Bookmarks, highlights, and notes — kept quietly here.
        </p>
      </div>

      {/* Tab bar */}
      <div className="grid grid-cols-3 gap-1 rounded-xl hairline bg-obsidian-elevated/30 p-1">
        {tabs.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs uppercase tracking-[0.18em] transition-colors",
              tab === key
                ? "bg-gold/15 text-gold-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
            {label}
            {count > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
                  tab === key ? "bg-gold/25 text-gold-soft" : "bg-muted/40 text-muted-foreground",
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveViewId(null);
            }}
            placeholder='Search… try book:John testament:new "in the beginning"'
            className="w-full hairline rounded-md bg-obsidian-elevated/50 backdrop-blur-md pl-9 pr-16 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
            aria-label="Search… try book:John testament:new "
          />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setActiveViewId(null);
                }}
                aria-label="Clear search"
                className="p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <SearchHintsPopover
              label="Saved search operators"
              hints={[
                { token: "book:John", description: "Filter by book name (contains match)." },
                { token: "testament:new", description: "Limit to old or new testament books." },
                { token: '"exact phrase"', description: "Match phrase in reference or note body." },
                {
                  token: "grace",
                  description: "Plain words AND-match across ref, body, and book.",
                },
              ]}
              onInsert={(token) => {
                setQuery((q) => (q ? `${q.trim()} ${token}` : token));
                setActiveViewId(null);
              }}
            />
          </div>
        </div>

        {/* Sort + Saved Views */}
        <div className="flex items-center justify-between gap-2 relative">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setSortMenuOpen((v) => !v);
                setViewsMenuOpen(false);
              }}
              className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold-soft transition-colors px-2 py-1 hairline rounded-md bg-obsidian-elevated/40"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortKey === "newest" ? "Newest" : sortKey === "oldest" ? "Oldest" : "By book"}
            </button>
            {sortMenuOpen && (
              <div className="absolute z-20 mt-1 left-0 hairline rounded-md bg-obsidian-elevated/95 backdrop-blur-md p-1 min-w-[140px] shadow-lg">
                {(
                  [
                    ["newest", "Newest first"],
                    ["oldest", "Oldest first"],
                    ["alpha_book", "By book"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      setSortKey(k);
                      setSortMenuOpen(false);
                      setActiveViewId(null);
                    }}
                    className={cn(
                      "block w-full text-left px-2.5 py-1.5 text-[11px] rounded transition-colors",
                      sortKey === k
                        ? "bg-gold/15 text-gold-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-obsidian/60",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 relative">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setExportMenuOpen((v) => !v);
                  setViewsMenuOpen(false);
                  setSortMenuOpen(false);
                }}
                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-2 py-1 hairline rounded-md transition-colors text-muted-foreground hover:text-gold-soft bg-obsidian-elevated/40"
                aria-label="Export saved items"
              >
                <Download className="h-3 w-3" />
                Export
              </button>
              {exportMenuOpen && (
                <div className="absolute z-20 mt-1 right-0 hairline rounded-md bg-obsidian-elevated/95 backdrop-blur-md p-1 min-w-[200px] shadow-lg">
                  <button
                    type="button"
                    onClick={() => runExport("json")}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] text-foreground/85 hover:bg-obsidian/60 rounded transition-colors"
                  >
                    <FileJson className="h-3.5 w-3.5 text-gold/70" />
                    <span className="flex-1 text-left">
                      JSON <span className="text-muted-foreground/60">· full fidelity</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runExport("csv")}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] text-foreground/85 hover:bg-obsidian/60 rounded transition-colors"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-gold/70" />
                    <span className="flex-1 text-left">
                      CSV <span className="text-muted-foreground/60">· spreadsheet</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runExport("md")}
                    className="flex items-center gap-2 w-full px-2.5 py-1.5 text-[11px] text-foreground/85 hover:bg-obsidian/60 rounded transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 text-gold/70" />
                    <span className="flex-1 text-left">
                      Markdown <span className="text-muted-foreground/60">· readable digest</span>
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setViewsMenuOpen((v) => !v);
                  setSortMenuOpen(false);
                  setExportMenuOpen(false);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-2 py-1 hairline rounded-md transition-colors",
                  activeViewId
                    ? "bg-gold/15 text-gold-soft border-gold/40"
                    : "text-muted-foreground hover:text-gold-soft bg-obsidian-elevated/40",
                )}
              >
                <BookmarkPlus className="h-3 w-3" />
                {activeViewId
                  ? (savedViews.find((v) => v.id === activeViewId)?.name ?? "Views")
                  : "Views"}
              </button>
              {viewsMenuOpen && (
                <div className="absolute z-20 mt-1 right-0 hairline rounded-md bg-obsidian-elevated/95 backdrop-blur-md p-1 min-w-[220px] shadow-lg">
                  {savedViews.length === 0 && (
                    <p className="px-2.5 py-2 text-[11px] text-muted-foreground italic">
                      No saved views yet.
                    </p>
                  )}
                  {savedViews.map((v) => (
                    <div key={v.id} className="group flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyView(v)}
                        className={cn(
                          "flex-1 text-left px-2.5 py-1.5 text-[11px] rounded transition-colors truncate",
                          activeViewId === v.id
                            ? "bg-gold/15 text-gold-soft"
                            : "text-foreground/85 hover:bg-obsidian/60",
                        )}
                      >
                        {v.name}
                        <span className="ml-1 text-muted-foreground/60">· {v.tab}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteView(v.id)}
                        aria-label="Delete view"
                        className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-border/40 mt-1 pt-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={saveCurrentView}
                      disabled={!filtersActive}
                      className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-[11px] text-gold-soft hover:bg-obsidian/60 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-3 w-3" />
                      Save current as view
                    </button>
                    <button
                      type="button"
                      onClick={shareCurrentView}
                      className="flex items-center gap-1.5 w-full px-2.5 py-1.5 text-[11px] text-foreground/85 hover:bg-obsidian/60 rounded transition-colors"
                    >
                      <Link2 className="h-3 w-3" />
                      Copy share link
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Book chips */}
        {availableBooks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            <FilterChip
              active={bookFilter === null}
              onClick={() => {
                setBookFilter(null);
                setActiveViewId(null);
              }}
            >
              Any book
            </FilterChip>
            {availableBooks.map((b) => (
              <FilterChip
                key={b}
                active={bookFilter === b}
                onClick={() => {
                  setBookFilter(bookFilter === b ? null : b);
                  setActiveViewId(null);
                }}
              >
                {b}
              </FilterChip>
            ))}
          </div>
        )}

        {filtersActive && (
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground/60">
            <span>
              {filteredAdapted.length}/{activeTotal} match
            </span>
            <button
              onClick={() => {
                setQuery("");
                setBookFilter(null);
                setSortKey("newest");
                setActiveViewId(null);
              }}
              className="hover:text-gold-soft transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      ) : (
        <>
          {/* BOOKMARKS */}
          {tab === "bookmarks" && (
            <div className="space-y-2">
              {activeTotal === 0 ? (
                <EmptyState
                  icon={Bookmark}
                  message="No bookmarks yet."
                  hint="Tap a verse in the reader, then choose Bookmark from the menu."
                />
              ) : filteredAdapted.length === 0 ? (
                <EmptyMatch
                  query={query}
                  bookFilter={bookFilter}
                  availableBooks={availableBooks}
                  tab={tab}
                  onApply={(q) => {
                    setQuery(q);
                    setActiveViewId(null);
                  }}
                  onClear={() => {
                    setQuery("");
                    setBookFilter(null);
                    setSortKey("newest");
                    setActiveViewId(null);
                  }}
                />
              ) : (
                <>
                  {visibleAdapted.map((a) => {
                    const b = a.row as BookmarkRow;
                    return (
                      <VerseRow
                        key={b.id}
                        reference={a.ref}
                        sub={b.version}
                        onDelete={() => removeBookmark(b.id)}
                        freshness={
                          dotsVisible ? freshnessOf(b.created_at, b.created_at, lastVisit) : "none"
                        }
                      />
                    );
                  })}
                  <PaginationFooter
                    visible={visibleAdapted.length}
                    total={filteredAdapted.length}
                    hasMore={hasMore}
                    onLoadMore={() =>
                      setVisibleCount((n) => Math.min(n + PAGE_SIZE, filteredAdapted.length))
                    }
                    sentinelRef={sentinelRef}
                    capped={bookmarks.length >= FETCH_CAP}
                    onLoadOlder={loadOlder}
                    loadingOlder={loadingOlder}
                  />
                </>
              )}
            </div>
          )}

          {/* HIGHLIGHTS */}
          {tab === "highlights" && (
            <div className="space-y-2">
              {activeTotal === 0 ? (
                <EmptyState
                  icon={Highlighter}
                  message="No highlights yet."
                  hint="Tap a verse in the reader and choose Highlight to mark it gold."
                />
              ) : filteredAdapted.length === 0 ? (
                <EmptyMatch
                  query={query}
                  bookFilter={bookFilter}
                  availableBooks={availableBooks}
                  tab={tab}
                  onApply={(q) => {
                    setQuery(q);
                    setActiveViewId(null);
                  }}
                  onClear={() => {
                    setQuery("");
                    setBookFilter(null);
                    setSortKey("newest");
                    setActiveViewId(null);
                  }}
                />
              ) : (
                <>
                  {visibleAdapted.map((a) => {
                    const h = a.row as HighlightRow;
                    return (
                      <VerseRow
                        key={h.id}
                        reference={a.ref}
                        sub={h.version}
                        accent="gold"
                        onDelete={() => removeHighlight(h.id)}
                        freshness={
                          dotsVisible ? freshnessOf(h.created_at, h.created_at, lastVisit) : "none"
                        }
                      />
                    );
                  })}
                  <PaginationFooter
                    visible={visibleAdapted.length}
                    total={filteredAdapted.length}
                    hasMore={hasMore}
                    onLoadMore={() =>
                      setVisibleCount((n) => Math.min(n + PAGE_SIZE, filteredAdapted.length))
                    }
                    sentinelRef={sentinelRef}
                    capped={highlights.length >= FETCH_CAP}
                    onLoadOlder={loadOlder}
                    loadingOlder={loadingOlder}
                  />
                </>
              )}
            </div>
          )}

          {/* NOTES */}
          {tab === "notes" && (
            <div className="space-y-2">
              {activeTotal === 0 ? (
                <EmptyState
                  icon={NotebookPen}
                  message="No notes yet."
                  hint="Open Notes from the nav and start writing — notes save automatically."
                />
              ) : filteredAdapted.length === 0 ? (
                <EmptyMatch
                  query={query}
                  bookFilter={bookFilter}
                  availableBooks={availableBooks}
                  tab={tab}
                  onApply={(q) => {
                    setQuery(q);
                    setActiveViewId(null);
                  }}
                  onClear={() => {
                    setQuery("");
                    setBookFilter(null);
                    setSortKey("newest");
                    setActiveViewId(null);
                  }}
                />
              ) : (
                <>
                  {visibleAdapted.map((a) => {
                    const n = a.row as NoteRow;
                    return (
                      <NoteRow
                        key={n.id}
                        note={n}
                        freshness={
                          dotsVisible ? freshnessOf(n.updated_at, n.updated_at, lastVisit) : "none"
                        }
                      />
                    );
                  })}
                  <PaginationFooter
                    visible={visibleAdapted.length}
                    total={filteredAdapted.length}
                    hasMore={hasMore}
                    onLoadMore={() =>
                      setVisibleCount((n) => Math.min(n + PAGE_SIZE, filteredAdapted.length))
                    }
                    sentinelRef={sentinelRef}
                    capped={notes.length >= FETCH_CAP}
                    onLoadOlder={loadOlder}
                    loadingOlder={loadingOlder}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Reader shortcut */}
      <div className="text-center pt-4">
        <Link to="/reader" className="text-xs text-gold/60 hover:text-gold-soft transition-colors">
          <BookOpen className="inline h-3.5 w-3.5 mr-1 -mt-0.5" strokeWidth={1.5} />
          Open the Reader
        </Link>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   VERSE ROW
   ───────────────────────────────────────────────────────────── */
function FreshnessDot({ state }: { state: FreshnessState }) {
  if (state === "none") return null;
  return (
    <span
      aria-label={state === "new" ? "New since last visit" : "Updated since last visit"}
      title={state === "new" ? "New since last visit" : "Updated since last visit"}
      className={cn(
        "h-1.5 w-1.5 rounded-full shrink-0 transition-opacity duration-700",
        state === "new"
          ? "bg-gold shadow-[0_0_6px_var(--gold)]"
          : "border border-gold bg-transparent",
      )}
    />
  );
}

function VerseRow({
  reference,
  sub,
  accent,
  onDelete,
  freshness = "none",
}: {
  reference: string;
  sub?: string;
  accent?: "gold";
  onDelete: () => void;
  freshness?: FreshnessState;
}) {
  return (
    <div className="group flex items-center gap-3 hairline rounded-xl bg-obsidian-elevated/30 px-4 py-3.5 hover:bg-gold/5 transition-colors">
      {accent === "gold" && <span className="h-3 w-1 rounded-full bg-gold/70 shrink-0" />}
      <Link to="/reader" className="flex-1 min-w-0 flex items-center gap-2">
        <FreshnessDot state={freshness} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-base text-gold-soft truncate">{reference}</p>
          {sub && (
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60 mt-0.5">
              {sub}
            </p>
          )}
        </div>
      </Link>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Remove"
        className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-muted-foreground transition-all"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NOTE ROW
   ───────────────────────────────────────────────────────────── */
function NoteRow({ note, freshness = "none" }: { note: NoteRow; freshness?: FreshnessState }) {
  const ref = note.scripture_ref ?? (note.book ? `${note.book} ${note.chapter}` : null);
  const preview = note.body_text.slice(0, 120).trim();

  return (
    <Link
      to="/notes"
      className="block hairline rounded-xl bg-obsidian-elevated/30 px-4 py-4 hover:bg-gold/5 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <FreshnessDot state={freshness} />
        {ref && <p className="text-[11px] uppercase tracking-[0.2em] text-gold/70">{ref}</p>}
      </div>
      <p className="text-sm text-foreground/85 leading-relaxed line-clamp-2">
        {preview}
        {note.body_text.length > 120 && "…"}
      </p>
      <p className="text-[11px] text-muted-foreground/40 mt-2">
        {new Date(note.updated_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────
   FILTER CHIP / EMPTY STATES
   ───────────────────────────────────────────────────────────── */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.18em] transition-colors hairline",
        active
          ? "bg-gold/15 text-gold-soft border-gold/40"
          : "bg-obsidian-elevated/40 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  message,
  hint,
}: {
  icon: typeof Bookmark;
  message: string;
  hint: string;
}) {
  return (
    <div className="hairline rounded-xl border-dashed bg-obsidian/30 px-6 py-10 text-center space-y-2">
      <Icon className="h-6 w-6 text-gold/25 mx-auto" strokeWidth={1.5} />
      <p className="text-sm text-muted-foreground/70">{message}</p>
      <p className="text-xs text-muted-foreground/45 leading-relaxed max-w-xs mx-auto">{hint}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PAGINATION FOOTER — sentinel for IO + manual fallback button
   ───────────────────────────────────────────────────────────── */
function PaginationFooter({
  visible,
  total,
  hasMore,
  onLoadMore,
  sentinelRef,
  capped,
  onLoadOlder,
  loadingOlder,
}: {
  visible: number;
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  capped?: boolean;
  onLoadOlder?: () => void;
  loadingOlder?: boolean;
}) {
  if (total <= 50 && !capped) return null;
  return (
    <div className="pt-3 pb-2 flex flex-col items-center gap-2">
      {hasMore ? (
        <>
          <button
            type="button"
            onClick={onLoadMore}
            className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground hover:text-gold-soft transition-colors px-3 py-1.5 hairline rounded-md bg-obsidian-elevated/40"
          >
            Load more
          </button>
          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
        </>
      ) : (
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
          End of list · {total} items
        </p>
      )}
      <p className="text-[10px] text-muted-foreground/40">
        Showing {visible} of {total}
      </p>
      {capped && (
        <>
          <p className="text-[10px] uppercase tracking-[0.18em] text-gold-soft/60">
            Displaying latest {FETCH_CAP} items · older entries archived
          </p>
          {onLoadOlder && (
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={loadingOlder}
              className="mt-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-gold-soft hover:text-gold transition-colors px-3 py-1.5 hairline rounded-md bg-gold/5 border-gold/30 disabled:opacity-50"
            >
              {loadingOlder ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {loadingOlder ? "Loading…" : "Load older from archive"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function EmptyMatch({
  query,
  bookFilter,
  availableBooks,
  tab,
  onApply,
  onClear,
}: {
  query: string;
  bookFilter: string | null;
  availableBooks: string[];
  tab: SavedTab;
  onApply: (q: string) => void;
  onClear: () => void;
}) {
  return (
    <SmartEmptyState
      query={query}
      suggestions={buildSavedSuggestions({ bookFilter, availableBooks, tab })}
      onApply={onApply}
      onClearFilters={onClear}
    />
  );
}
