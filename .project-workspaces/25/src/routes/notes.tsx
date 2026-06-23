import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Feather,
  Pen,
  Type,
  Undo2,
  Eraser,
  Save,
  Trash2,
  BookOpen,
  Loader2,
  Check,
  NotebookPen,
  Sparkles,
  X,
  Search as SearchIcon,
  FileText,
  ImageIcon,
  Anchor as AnchorIcon,
  ArrowUpDown,
  Bookmark,
  Plus,
  Link2,
  Pin,
} from "lucide-react";
import { addBoardItem } from "@/lib/boards";
import { poemPreview } from "@/lib/poems";
import {
  parseNotesQuery,
  matchesParsedQuery,
  loadSavedViews,
  saveSavedViews,
  type SortKey,
  type SavedView,
} from "@/lib/notes-search";
import {
  decodeViewFromSearch,
  syncViewToUrl,
  buildShareUrl,
  copyShareLink,
} from "@/lib/share-view";
import {
  PoemEditor,
  deserialisePoem,
  type PoemData,
  poemPreviewText,
} from "@/components/notes/PoemEditor";
import { PoemEntryPicker, type PoemSeed } from "@/components/notes/PoemEntryPicker";
import { PoemDeepDivePanel } from "@/components/notes/PoemDeepDivePanel";
import {
  createPoem,
  updatePoem,
  getPoem,
  recordToPoemData,
  listPoems,
  type PoemRecord,
} from "@/lib/poems";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { NotesSkeleton } from "@/components/ui/page-skeletons";
import { InkCanvas, type InkCanvasHandle, type InkStroke } from "@/components/notes/InkCanvas";
import { SearchHintsPopover } from "@/components/search/SearchHintsPopover";
import { SmartEmptyState, buildNotesSuggestions } from "@/components/search/SmartEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useSelah } from "@/hooks/useSelah";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useTextScale } from "@/hooks/useTextScale";

type NotesSearch = {
  poem?: 1;
  newPoem?: 1;
  poemId?: string;
  scripture?: string;
  scriptureText?: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
};

export const Route = createFileRoute("/notes")({
  validateSearch: (raw: Record<string, unknown>): NotesSearch => {
    const num = (v: unknown): number | undefined => {
      const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
      return Number.isFinite(n) ? n : undefined;
    };
    const str = (v: unknown): string | undefined =>
      typeof v === "string" && v.length ? v : undefined;
    return {
      poem: raw.poem === 1 || raw.poem === "1" ? 1 : undefined,
      newPoem: raw.newPoem === 1 || raw.newPoem === "1" ? 1 : undefined,
      poemId: str(raw.poemId),
      scripture: str(raw.scripture),
      scriptureText: str(raw.scriptureText),
      book: str(raw.book),
      chapter: num(raw.chapter),
      verseStart: num(raw.verseStart),
      verseEnd: num(raw.verseEnd),
    };
  },
  head: () => ({
    meta: [
      { title: "Notes — SanctumIQ" },
      {
        name: "description",
        content:
          "Verse-anchored notes with typed and stylus capture. Auto-saved to your private sanctuary.",
      },
      { property: "og:title", content: "Notes — SanctumIQ" },
      {
        property: "og:description",
        content: "Verse-anchored notes with typed and stylus capture.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotesPage,
});

type Anchor = { book: string | null; chapter: number | null; verse: number | null };
type Mode = "type" | "draw" | "poem";
type SaveState = "idle" | "saving" | "saved";

// Ink palette — Noir & Gold-friendly. Hex values are read directly by InkCanvas.
const INK_COLORS = [
  { id: "gold", label: "Gold", hex: "#c9a84c" },
  { id: "ivory", label: "Ivory", hex: "#f0e9d8" },
  { id: "crimson", label: "Crimson", hex: "#b9444c" },
  { id: "sage", label: "Sage", hex: "#8fa68a" },
] as const;
type InkColorId = (typeof INK_COLORS)[number]["id"];

// Two pen weights: fine for annotation, marker for highlighting/underlining.
const PEN_SIZES = [
  { id: "fine", label: "Fine", width: 1.6 },
  { id: "marker", label: "Marker", width: 4.5 },
] as const;
type PenSizeId = (typeof PEN_SIZES)[number]["id"];

type NoteRow = {
  id: string;
  body_text: string;
  ink_strokes: InkStroke[] | null;
  scripture_ref: string | null;
  book: string | null;
  chapter: number | null;
  verse: number | null;
  updated_at: string;
};

const AUTOSAVE_DELAY_MS = 1500;

function buildRef(a: Anchor): string | null {
  if (!a.book || !a.chapter) return null;
  return a.verse ? `${a.book} ${a.chapter}:${a.verse}` : `${a.book} ${a.chapter}`;
}

function readAnchor(): Anchor {
  if (typeof window === "undefined") return { book: null, chapter: null, verse: null };
  try {
    const raw = localStorage.getItem("sanctumiq:reader:anchor");
    if (!raw) return { book: null, chapter: null, verse: null };
    const parsed = JSON.parse(raw);
    return {
      book: typeof parsed.book === "string" ? parsed.book : null,
      chapter: typeof parsed.chapter === "number" ? parsed.chapter : null,
      verse: typeof parsed.verse === "number" ? parsed.verse : null,
    };
  } catch {
    return { book: null, chapter: null, verse: null };
  }
}

function NotesPage() {
  const routeSearch = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const { style: textStyle } = useTextScale();
  const [anchor, setAnchor] = useState<Anchor>(() => readAnchor());
  const [selahOpen, setSelahOpen] = useState(false);
  const { reflect, reflection, status: selahStatus, reset: resetSelah } = useSelah();
  const [mode, setMode] = useState<Mode>("type");
  const [bodyText, setBodyText] = useState("");
  const [poemData, setPoemData] = useState<PoemData | null>(null);
  const [poemInspiration, setPoemInspiration] = useState("");
  const [strokes, setStrokes] = useState<InkStroke[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  // When the user is editing a poem, autosave targets the dedicated `poems`
  // table instead of `notes`. Tracked separately so switching between modes
  // never cross-contaminates IDs.
  const [activePoemId, setActivePoemId] = useState<string | null>(null);
  // Full poem row — needed by PoemDeepDivePanel which reads template-aware
  // fields and the cached `deep_dive` JSONB. Kept in sync with edits via the
  // autosave path so re-running Deep Dive uses the user's latest words.
  const [activePoemRecord, setActivePoemRecord] = useState<PoemRecord | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [poemsList, setPoemsList] = useState<PoemRecord[]>([]);
  const [kindFilter, setKindFilter] = useState<"all" | "notes" | "poems">("all");
  const [loadingList, setLoadingList] = useState(false);
  const [boardRefIds, setBoardRefIds] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "draft" | "sketch" | "anchored" | "mixed"
  >("all");
  const [bookFilter, setBookFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("updated_desc");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [viewsMenuOpen, setViewsMenuOpen] = useState(false);

  // Hydrate saved views on mount (client-only — avoids SSR mismatch).
  useEffect(() => {
    setSavedViews(loadSavedViews());
  }, []);

  // ── Reader → Notes handoff ───────────────────────────────────────────────
  // When the user taps "Create Poem from {ref}" in the Reader's Quantum menu,
  // we land here with /notes?poem=1&scripture=...&book=...&chapter=...&verseStart=...
  // Carry that selection straight into the PoemEditor as a scripture chip so
  // the user never has to re-type the reference.
  useEffect(() => {
    // poemId → hydrate editor from the poems table
    if (routeSearch.poemId) {
      const id = routeSearch.poemId;
      void (async () => {
        try {
          const record = await getPoem(id);
          if (!record) {
            toast.error("Poem not found");
            return;
          }
          setMode("poem");
          setActivePoemId(record.id);
          setActivePoemRecord(record);
          setActiveNoteId(null);
          setPoemData(recordToPoemData(record));
          setPoemInspiration(record.inspiration ?? "");
          dirtyRef.current = false;
          setSaveState("idle");
        } catch {
          toast.error("Could not open poem");
        }
      })();
    }
    // newPoem=1 → open the entry-point picker
    if (routeSearch.newPoem === 1) {
      setPickerOpen(true);
    }
    // poem=1 (legacy reader handoff) → seed scripture and open in poem mode
    if (routeSearch.poem === 1) {
      if (routeSearch.book && routeSearch.chapter) {
        setAnchor({
          book: routeSearch.book,
          chapter: routeSearch.chapter,
          verse: routeSearch.verseStart ?? null,
        });
      }
      setMode("poem");
      setPoemData((prev) => prev ?? { template: "heart_cry", body: "" });
      if (routeSearch.scripture) {
        setPoemInspiration((prev) => (prev?.trim() ? prev : routeSearch.scripture!));
      }
    }
    // Clear params from the URL so a refresh doesn't re-trigger the seed.
    if (
      typeof window !== "undefined" &&
      (routeSearch.poem || routeSearch.newPoem || routeSearch.poemId)
    ) {
      const url = new URL(window.location.href);
      [
        "poem",
        "newPoem",
        "poemId",
        "scripture",
        "scriptureText",
        "book",
        "chapter",
        "verseStart",
        "verseEnd",
      ].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    }
    // Run once on initial mount with these params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydrate filter state from URL on mount (shareable view links).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = decodeViewFromSearch(window.location.search);
    if (v.q !== undefined) setQuery(v.q);
    if (v.s) {
      const allowed: SortKey[] = ["updated_desc", "updated_asc", "created_desc", "alpha"];
      if (allowed.includes(v.s as SortKey)) setSortKey(v.s as SortKey);
    }
    if (v.b) setBookFilter(v.b);
    if (v.st) {
      const allowed = ["all", "draft", "sketch", "anchored", "mixed"] as const;
      if ((allowed as readonly string[]).includes(v.st)) {
        setStatusFilter(v.st as (typeof allowed)[number]);
      }
    }
  }, []);

  // Keep URL in sync with current filters.
  useEffect(() => {
    if (typeof window === "undefined") return;
    syncViewToUrl("/notes", {
      q: query || undefined,
      s: sortKey !== "updated_desc" ? sortKey : undefined,
      b: bookFilter,
      st: statusFilter !== "all" ? statusFilter : undefined,
    });
  }, [query, sortKey, bookFilter, statusFilter]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [inkColorId, setInkColorId] = useState<InkColorId>(() => {
    if (typeof window === "undefined") return "gold";
    const v = localStorage.getItem("sanctumiq:notes:inkColor");
    return INK_COLORS.some((c) => c.id === v) ? (v as InkColorId) : "gold";
  });
  const [penSizeId, setPenSizeId] = useState<PenSizeId>(() => {
    if (typeof window === "undefined") return "fine";
    const v = localStorage.getItem("sanctumiq:notes:penSize");
    return PEN_SIZES.some((p) => p.id === v) ? (v as PenSizeId) : "fine";
  });

  // Persist pen preferences across sessions.
  useEffect(() => {
    try {
      localStorage.setItem("sanctumiq:notes:inkColor", inkColorId);
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [inkColorId]);
  useEffect(() => {
    try {
      localStorage.setItem("sanctumiq:notes:penSize", penSizeId);
    } catch {
      /* ignore */
    }
  }, [penSizeId]);

  // Draw tool — "pen" lays ink, "eraser" removes intersecting strokes on drag.
  // Not persisted: a fresh session always starts in pen mode (safer default).
  const [drawTool, setDrawTool] = useState<"pen" | "eraser">("pen");

  // Keyboard shortcuts (draw mode only): P = pen, E = eraser, Cmd/Ctrl+Z = undo last stroke.
  // Ignored when focus is in a text input/textarea/contenteditable so typing is never hijacked.
  useEffect(() => {
    if (mode !== "draw") return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || t?.isContentEditable) return;

      if ((e.metaKey || e.ctrlKey) && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
        e.preventDefault();
        canvasRef.current?.undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        setDrawTool("pen");
      } else if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setDrawTool("eraser");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  const inkColor = INK_COLORS.find((c) => c.id === inkColorId)!.hex;
  const penWidth = PEN_SIZES.find((p) => p.id === penSizeId)!.width;

  const canvasRef = useRef<InkCanvasHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);

  // Refresh anchor whenever this tab regains focus (user came back from /reader).
  useEffect(() => {
    const onFocus = () => setAnchor(readAnchor());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const reference = useMemo(() => buildRef(anchor), [anchor]);

  // Compute status from a note row (mirrors the visual tag logic)
  const noteStatus = (n: NoteRow): "draft" | "sketch" | "anchored" | "mixed" => {
    const inkArr = (n.ink_strokes ?? []) as unknown as InkStroke[];
    const hasInk = Array.isArray(inkArr) && inkArr.length > 0;
    const hasText = (n.body_text ?? "").trim().length > 0;
    if (hasInk && hasText) return "mixed";
    if (hasInk) return "sketch";
    if (n.scripture_ref) return "anchored";
    return "draft";
  };

  // Distinct books present in the user's notes — drives the book filter chips
  const availableBooks = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) if (n.book) set.add(n.book);
    return Array.from(set).sort();
  }, [notes]);

  // Filter notes locally — chips + advanced query operators (book:, status:, "phrase")
  const filteredNotes = useMemo(() => {
    const parsed = parseNotesQuery(query);
    const filtered = notes.filter((n) => {
      const status = noteStatus(n);
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (bookFilter && n.book !== bookFilter) return false;
      return matchesParsedQuery(
        { body_text: n.body_text, scripture_ref: n.scripture_ref, book: n.book, status },
        parsed,
      );
    });
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "updated_asc":
          return a.updated_at.localeCompare(b.updated_at);
        case "created_desc":
          // We don't load created_at; fall back to updated_at desc as a stable proxy.
          return b.updated_at.localeCompare(a.updated_at);
        case "alpha": {
          const ax = (a.scripture_ref || a.body_text || "").toLowerCase();
          const bx = (b.scripture_ref || b.body_text || "").toLowerCase();
          return ax.localeCompare(bx);
        }
        case "updated_desc":
        default:
          return b.updated_at.localeCompare(a.updated_at);
      }
    });
    return sorted;
  }, [notes, query, statusFilter, bookFilter, sortKey]);

  // Filter poems against the same search query (lightweight, client-side)
  const filteredPoems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = poemsList.filter((p) => {
      if (!q) return true;
      const hay = [
        p.title ?? "",
        p.body,
        p.praise,
        p.anchor,
        p.line,
        p.inspiration ?? "",
        ...(p.tags ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    list.sort((a, b) => {
      switch (sortKey) {
        case "updated_asc":
          return a.updated_at.localeCompare(b.updated_at);
        case "alpha":
          return (a.title ?? "").toLowerCase().localeCompare((b.title ?? "").toLowerCase());
        default:
          return b.updated_at.localeCompare(a.updated_at);
      }
    });
    return list;
  }, [poemsList, query, sortKey]);

  // Unified feed merged by kindFilter + recency
  type UnifiedItem =
    | { kind: "note"; id: string; updated_at: string; row: NoteRow }
    | { kind: "poem"; id: string; updated_at: string; row: PoemRecord };
  const unifiedItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];
    if (kindFilter !== "poems") {
      for (const n of filteredNotes)
        items.push({ kind: "note", id: n.id, updated_at: n.updated_at, row: n });
    }
    if (kindFilter !== "notes") {
      for (const p of filteredPoems)
        items.push({ kind: "poem", id: p.id, updated_at: p.updated_at, row: p });
    }
    items.sort((a, b) => {
      if (sortKey === "updated_asc") return a.updated_at.localeCompare(b.updated_at);
      if (sortKey === "alpha") return 0; // already sorted within their groups
      return b.updated_at.localeCompare(a.updated_at);
    });
    return items;
  }, [kindFilter, filteredNotes, filteredPoems, sortKey]);

  const totalCount = notes.length + poemsList.length;
  const totalFilteredCount = unifiedItems.length;

  const filtersActive =
    query.trim() !== "" ||
    statusFilter !== "all" ||
    bookFilter !== null ||
    sortKey !== "updated_desc" ||
    kindFilter !== "all";

  const applyView = (v: SavedView) => {
    setQuery(v.query);
    setStatusFilter(v.status);
    setBookFilter(v.book);
    setSortKey(v.sort);
    setActiveViewId(v.id);
    setViewsMenuOpen(false);
  };

  const saveCurrentView = () => {
    const name = window.prompt("Name this view")?.trim();
    if (!name) return;
    const view: SavedView = {
      id: `v_${Date.now().toString(36)}`,
      name,
      query,
      status: statusFilter,
      book: bookFilter,
      sort: sortKey,
    };
    const next = [view, ...savedViews].slice(0, 10);
    setSavedViews(next);
    saveSavedViews(next);
    setActiveViewId(view.id);
    setViewsMenuOpen(false);
    toast.success(`Saved view “${name}”`);
  };

  const deleteView = (id: string) => {
    const next = savedViews.filter((v) => v.id !== id);
    setSavedViews(next);
    saveSavedViews(next);
    if (activeViewId === id) setActiveViewId(null);
  };

  const shareCurrentView = async () => {
    const url = buildShareUrl("/notes", {
      q: query || undefined,
      s: sortKey !== "updated_desc" ? sortKey : undefined,
      b: bookFilter,
      st: statusFilter !== "all" ? statusFilter : undefined,
    });
    const ok = await copyShareLink(url);
    if (ok) toast.success("Share link copied to clipboard");
    else toast.error("Couldn't copy — copy from the address bar");
    setViewsMenuOpen(false);
  };

  // Load notes + poems list
  const loadNotes = useCallback(async () => {
    if (!user) return;
    setLoadingList(true);
    const [notesRes, poemsRes, boardRes] = await Promise.all([
      supabase
        .from("notes")
        .select("id, body_text, ink_strokes, scripture_ref, book, chapter, verse, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50),
      listPoems(user.id).catch(() => [] as PoemRecord[]),
      supabase
        .from("board_items")
        .select("ref_id")
        .eq("user_id", user.id)
        .in("kind", ["note", "poem"])
        .not("ref_id", "is", null),
    ]);
    setLoadingList(false);
    if (notesRes.error) {
      toast.error("Could not load notes");
      return;
    }
    setNotes((notesRes.data ?? []) as NoteRow[]);
    setPoemsList(poemsRes ?? []);
    const ids = new Set<string>();
    for (const r of boardRes.data ?? []) if (r.ref_id) ids.add(r.ref_id);
    setBoardRefIds(ids);
  }, [user]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Auto-save (debounced) — only when the user has typed or drawn something.
  const persist = useCallback(async () => {
    if (!user) return;

    // ── Poem mode → write to dedicated `poems` table ──
    // Poems get their own row shape (template + structured fields) so this
    // path bypasses the notes table entirely. The notes-side activeNoteId is
    // intentionally untouched.
    if (mode === "poem") {
      if (!poemData) {
        setSaveState("idle");
        return;
      }
      const isEmpty =
        (poemData.template === "heart_cry" && !poemData.body.trim()) ||
        (poemData.template === "psalm" && !poemData.praise.trim() && !poemData.anchor.trim()) ||
        (poemData.template === "proverb" && !poemData.line.trim());
      if (isEmpty) {
        setSaveState("idle");
        return;
      }
      setSaveState("saving");
      try {
        if (activePoemId) {
          const updated = await updatePoem({
            id: activePoemId,
            data: poemData,
            inspiration: poemInspiration || null,
          });
          setActivePoemRecord(updated);
        } else {
          const created = await createPoem({
            userId: user.id,
            data: poemData,
            inspiration: poemInspiration || undefined,
          });
          setActivePoemId(created.id);
          setActivePoemRecord(created);
        }
        dirtyRef.current = false;
        setSaveState("saved");
        setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1400);
      } catch {
        toast.error("Auto-save failed");
        setSaveState("idle");
      }
      return;
    }

    // ── Type / Draw modes → notes table (unchanged) ──
    const trimmed = bodyText.trim();
    const hasInk = strokes.length > 0;
    if (!trimmed && !hasInk) {
      setSaveState("idle");
      return;
    }
    setSaveState("saving");
    const payload = {
      user_id: user.id,
      body_text: bodyText,
      ink_strokes: hasInk ? (strokes as unknown as never) : null,
      scripture_ref: reference,
      book: anchor.book,
      chapter: anchor.chapter,
      verse: anchor.verse,
    };
    if (activeNoteId) {
      const { error } = await supabase
        .from("notes")
        .update(payload)
        .eq("id", activeNoteId)
        .eq("user_id", user.id);
      if (error) {
        toast.error("Auto-save failed");
        setSaveState("idle");
        return;
      }
    } else {
      const { data, error } = await supabase.from("notes").insert(payload).select("id").single();
      if (error || !data) {
        toast.error("Auto-save failed");
        setSaveState("idle");
        return;
      }
      setActiveNoteId(data.id);
    }
    dirtyRef.current = false;
    setSaveState("saved");
    setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 1400);
    loadNotes();
  }, [
    user,
    bodyText,
    poemData,
    poemInspiration,
    mode,
    strokes,
    reference,
    anchor,
    activeNoteId,
    activePoemId,
    loadNotes,
  ]);

  // Schedule debounced save when text or strokes change
  useEffect(() => {
    if (!user) return;
    if (!dirtyRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persist();
    }, AUTOSAVE_DELAY_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [bodyText, strokes, poemData, poemInspiration, persist, user]);

  // Save on tab close / hide
  useEffect(() => {
    const flush = () => {
      if (dirtyRef.current) persist();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
    };
  }, [persist]);

  const handleNew = () => {
    setActiveNoteId(null);
    setActivePoemId(null);
    setActivePoemRecord(null);
    setBodyText("");
    setPoemData(null);
    setPoemInspiration("");
    setStrokes([]);
    canvasRef.current?.clear();
    dirtyRef.current = false;
    setSaveState("idle");
    setAnchor(readAnchor());
  };

  // Apply a PoemSeed selection from the entry-point picker.
  // Each seed shape decides what the editor opens with and whether the
  // inspiration field gets pre-filled.
  const handlePoemSeed = (seed: PoemSeed) => {
    setActiveNoteId(null);
    setActivePoemId(null);
    setActivePoemRecord(null);
    setBodyText("");
    setStrokes([]);
    setPoemData({ template: "heart_cry", body: "" });
    if (seed.kind === "blank") setPoemInspiration("");
    else if (seed.kind === "theme") setPoemInspiration(seed.theme);
    else setPoemInspiration(seed.reference);
    setMode("poem");
    setSaveState("idle");
    dirtyRef.current = false;
    setPickerOpen(false);
  };

  const handleOpenNote = (n: NoteRow) => {
    setActiveNoteId(n.id);
    const rawText = n.body_text ?? "";
    const poem = deserialisePoem(rawText);
    if (poem) {
      setPoemData(poem.data);
      setPoemInspiration(poem.inspiration);
      setBodyText(rawText);
      setMode("poem");
    } else {
      setBodyText(rawText);
      setPoemData(null);
      setPoemInspiration("");
    }
    const ink = (n.ink_strokes ?? []) as InkStroke[];
    setStrokes(ink);
    setAnchor({ book: n.book, chapter: n.chapter, verse: n.verse });
    dirtyRef.current = false;
    setSaveState("idle");
    // Switch to draw mode if note has ink and no poem
    if (!poem && ink.length > 0) {
      setMode("draw");
      setTimeout(() => canvasRef.current?.setStrokes(ink), 80);
    } else if (!poem) {
      setMode("type");
    }
    // On mobile the editor is above the list; scroll it into view.
    requestAnimationFrame(() =>
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const { error } = await supabase.from("notes").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast.error("Could not delete note");
      return;
    }
    if (id === activeNoteId) handleNew();
    toast.success("Note removed");
    loadNotes();
  };

  const handlePinned = useCallback((id: string) => {
    setBoardRefIds((prev) => new Set(prev).add(id));
  }, []);

  if (authLoading) {
    return (
      <LoadingAppShell pageTitle="Notes">
        <NotesSkeleton text="Fetching your notes…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        icon={NotebookPen}
        eyebrow="Notes Sanctuary"
        title="A private place to think"
        description="Every verse you sit with deserves a place to breathe. Save notes, reflections, and stylus sketches — private to you, always."
        redirectTo="/notes"
        features={[
          "Verse-anchored notes that link back to scripture",
          "Typed and stylus capture",
          "Auto-saved. Fully private.",
        ]}
        showReaderLink
      />
    );
  }

  return (
    <AppShell pageTitle="Notes">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Editor column */}
        <section ref={editorRef} className="min-w-0">
          {/* Anchor banner */}
          <div className="hairline rounded-lg bg-obsidian-elevated/60 backdrop-blur-sm px-4 py-3 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <BookOpen className="h-4 w-4 text-gold shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {reference ? "Anchored to" : "Free reflection"}
                </p>
                <p className="text-sm text-foreground truncate">
                  {reference ?? (
                    <span className="text-muted-foreground italic">
                      No scripture — anchor anytime from the Sanctuary
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {reference && (
                <button
                  type="button"
                  onClick={() => {
                    setAnchor({ book: null, chapter: null, verse: null });
                    try {
                      localStorage.removeItem("sanctumiq:reader:anchor");
                    } catch {
                      /* ignore */
                    }
                  }}
                  aria-label="Detach scripture anchor"
                  className="inline-flex items-center justify-center min-h-11 min-w-11 -mr-2 text-muted-foreground hover:text-gold-soft transition-colors"
                  title="Detach anchor"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <Link
                to="/reader"
                className="text-xs text-gold-soft hover:text-gold transition-colors"
              >
                {reference ? "Open Sanctuary →" : "Anchor →"}
              </Link>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex hairline rounded-md p-0.5 bg-obsidian-elevated/60">
              <ToolbarTab active={mode === "type"} onClick={() => setMode("type")} icon={Type}>
                Type
              </ToolbarTab>
              <ToolbarTab active={mode === "draw"} onClick={() => setMode("draw")} icon={Pen}>
                Draw
              </ToolbarTab>
              <ToolbarTab
                active={mode === "poem"}
                onClick={() => {
                  // First entry into poem mode for a fresh editor → open the
                  // entry-point picker (Blank / Theme / Scripture). If the
                  // user is already mid-poem, just stay in poem mode.
                  if (mode !== "poem" && !poemData) {
                    setPickerOpen(true);
                  } else {
                    setMode("poem");
                    if (!poemData) setPoemData({ template: "heart_cry", body: "" });
                  }
                }}
                icon={Feather}
              >
                Poem
              </ToolbarTab>
            </div>

            <div className="flex items-center gap-2">
              <SaveBadge state={saveState} />
              <button
                onClick={() => {
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  void persist();
                }}
                disabled={saveState === "saving"}
                className="inline-flex items-center gap-1 text-xs text-gold-soft hover:text-gold transition-colors px-2 py-1 disabled:opacity-50"
                title="Save now"
              >
                <Save className="h-3.5 w-3.5" />
                Save
              </button>
              <button
                onClick={handleNew}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              >
                New
              </button>
            </div>
          </div>

          {/* Canvas / Editor */}
          {mode === "type" ? (
            <>
              <textarea
                value={bodyText}
                onChange={(e) => {
                  dirtyRef.current = true;
                  setBodyText(e.target.value);
                }}
                placeholder="Begin a thought… your note will save itself."
                style={{
                  fontSize: textStyle.fontSize,
                  lineHeight: textStyle.lineHeight,
                  letterSpacing: textStyle.letterSpacing,
                }}
                className="w-full min-h-[60vh] hairline rounded-lg bg-obsidian-elevated/40 backdrop-blur-sm p-5 text-foreground font-sans placeholder:text-muted-foreground/60 focus:outline-none focus:border-gold/40 caret-gold resize-y"
                spellCheck
              />

              {/* Selah — contextual reflection on this note */}
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelahOpen(true);
                    void reflect(bodyText || reference || "", reference || "", "notes");
                  }}
                  disabled={!bodyText.trim() && !reference}
                  className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors disabled:opacity-30"
                >
                  <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Ask Selah about this note
                </button>
              </div>

              {/* Selah response panel */}
              {selahOpen && (
                <div className="mt-3 hairline rounded-lg bg-obsidian-elevated/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-gold/70" strokeWidth={1.5} />
                      <span className="text-[10px] uppercase tracking-[0.28em] text-gold/70">
                        Selah
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelahOpen(false);
                        resetSelah();
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {selahStatus === "loading" && (
                    <div className="flex gap-1.5 py-2">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="inline-block h-1.5 w-1.5 rounded-full bg-gold/50"
                          style={{
                            animation: "pulse 1.4s ease-in-out infinite",
                            animationDelay: `${i * 0.2}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {selahStatus === "done" && reflection && (
                    <blockquote
                      className="font-display italic text-sm leading-relaxed text-foreground/90"
                      style={{ lineHeight: "1.65" }}
                    >
                      {reflection}
                    </blockquote>
                  )}
                  {selahStatus === "error" && (
                    <p className="text-sm italic text-muted-foreground/70">
                      Reflection unavailable right now.
                    </p>
                  )}
                </div>
              )}

              {/* Pin to Reflections — only when note has been saved + has content */}
              {activeNoteId && bodyText.trim() && user && (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <PinNoteToReflectionsButton
                    noteId={activeNoteId}
                    userId={user.id}
                    bodyText={bodyText}
                    scriptureRef={reference}
                    alreadyPinned={boardRefIds.has(activeNoteId)}
                    onPinned={handlePinned}
                  />
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/50">
                    Saved · share to your public Board
                  </span>
                </div>
              )}
            </>
          ) : mode === "poem" ? (
            <>
              <div className="hairline rounded-lg bg-obsidian-elevated/40 backdrop-blur-sm p-5 min-h-[40vh]">
                <PoemEditor
                  initialData={poemData}
                  initialInspiration={poemInspiration}
                  scriptureRef={reference}
                  onChange={(data, insp) => {
                    dirtyRef.current = true;
                    setPoemData(data);
                    setPoemInspiration(insp);
                  }}
                />
              </div>

              {/* Deep Dive — only available once the poem has been saved at
                  least once. Until then, the user keeps writing; the panel
                  appears as soon as autosave produces a record. */}
              {activePoemRecord && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <PinPoemToBoardButton
                      poem={activePoemRecord}
                      alreadyPinned={boardRefIds.has(activePoemRecord.id)}
                      onPinned={handlePinned}
                    />
                    <Link
                      to="/vault"
                      hash="poems"
                      className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors py-1"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      View in Poem Library
                    </Link>
                    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/50">
                      Saved · searchable in your Vault
                    </span>
                  </div>
                  <PoemDeepDivePanel
                    poem={activePoemRecord}
                    onUpdated={(rec) => setActivePoemRecord(rec)}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="relative hairline rounded-lg bg-obsidian-elevated/40 backdrop-blur-sm overflow-hidden h-[60vh]">
              <InkCanvas
                ref={canvasRef}
                color={inkColor}
                baseWidth={penWidth}
                eraseMode={drawTool === "eraser"}
                onChange={(s) => {
                  dirtyRef.current = true;
                  setStrokes([...s]);
                }}
              />
              <div className="pointer-events-none absolute top-3 left-3 text-[10px] uppercase tracking-widest text-muted-foreground/70">
                {drawTool === "eraser"
                  ? "Erase — drag across strokes to remove"
                  : strokes.length === 0
                    ? "Sketch with finger or stylus"
                    : `${strokes.length} stroke${strokes.length === 1 ? "" : "s"}`}
              </div>

              {/* Pen / Eraser / Undo tool group (top-left, below status) */}
              <div className="absolute top-10 left-3 flex items-center gap-2 pointer-events-auto">
                <div
                  className="hairline rounded-full bg-obsidian/70 backdrop-blur p-0.5 flex items-center"
                  role="radiogroup"
                  aria-label="Drawing tool"
                >
                  <button
                    onClick={() => setDrawTool("pen")}
                    role="radio"
                    aria-checked={drawTool === "pen"}
                    title="Pen (P)"
                    className={cn(
                      "inline-flex items-center justify-center h-7 w-9 rounded-full transition-colors",
                      drawTool === "pen"
                        ? "bg-gold/15 text-gold-soft"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Pen className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDrawTool("eraser")}
                    role="radio"
                    aria-checked={drawTool === "eraser"}
                    title="Eraser — drag to remove strokes (E)"
                    className={cn(
                      "inline-flex items-center justify-center h-7 w-9 rounded-full transition-colors",
                      drawTool === "eraser"
                        ? "bg-gold/15 text-gold-soft"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Explicit Undo — for touch users with no keyboard. */}
                <button
                  onClick={() => canvasRef.current?.undo()}
                  disabled={strokes.length === 0}
                  title="Undo last stroke (⌘/Ctrl+Z)"
                  aria-label="Undo last stroke"
                  className={cn(
                    "hairline inline-flex items-center justify-center h-8 w-8 rounded-full bg-obsidian/70 backdrop-blur transition-colors",
                    strokes.length === 0
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:text-gold-soft hover:bg-gold/10",
                  )}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>

                {/* Keyboard shortcut hint — discoverability. */}
                <span
                  className="hidden sm:inline-flex items-center gap-1 rounded-full bg-obsidian/50 backdrop-blur px-2.5 py-1 text-[10px] tracking-widest text-muted-foreground/70 hairline"
                  aria-hidden
                >
                  P · E · ⌘Z
                </span>
              </div>

              {/* Color + pen-size palette (top-right) */}
              <div
                className={cn(
                  "absolute top-3 right-3 flex items-center gap-2 pointer-events-auto transition-opacity",
                  drawTool === "eraser" && "opacity-40 pointer-events-none",
                )}
              >
                <div
                  className="hairline rounded-full bg-obsidian/70 backdrop-blur px-1.5 py-1 flex items-center gap-1"
                  role="radiogroup"
                  aria-label="Ink color"
                >
                  {INK_COLORS.map((c) => {
                    const active = c.id === inkColorId;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setInkColorId(c.id)}
                        role="radio"
                        aria-checked={active}
                        aria-label={c.label}
                        title={c.label}
                        className={cn(
                          "h-5 w-5 rounded-full transition-all border",
                          active
                            ? "ring-2 ring-gold/70 ring-offset-1 ring-offset-obsidian border-white/20 scale-110"
                            : "border-white/10 hover:scale-105",
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    );
                  })}
                </div>
                <div
                  className="hairline rounded-full bg-obsidian/70 backdrop-blur p-0.5 flex items-center"
                  role="radiogroup"
                  aria-label="Pen size"
                >
                  {PEN_SIZES.map((p) => {
                    const active = p.id === penSizeId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setPenSizeId(p.id)}
                        role="radio"
                        aria-checked={active}
                        title={p.label}
                        className={cn(
                          "inline-flex items-center justify-center h-7 w-9 rounded-full transition-colors",
                          active
                            ? "bg-gold/15 text-gold-soft"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span
                          className="block rounded-full"
                          style={{
                            backgroundColor: inkColor,
                            width: `${Math.min(14, p.width * 2.2)}px`,
                            height: `${Math.min(14, p.width * 2.2)}px`,
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 pointer-events-auto">
                <CanvasTool
                  onClick={() => {
                    canvasRef.current?.undo();
                    dirtyRef.current = true;
                    setStrokes([...(canvasRef.current?.getStrokes() ?? [])]);
                  }}
                  label="Undo last stroke"
                >
                  <Undo2 className="h-4 w-4" />
                </CanvasTool>
                <CanvasTool
                  onClick={() => {
                    canvasRef.current?.clear();
                    dirtyRef.current = true;
                    setStrokes([]);
                  }}
                  label="Clear canvas"
                >
                  <Eraser className="h-4 w-4" />
                </CanvasTool>
              </div>
            </div>
          )}

          {/* Manual save (mostly redundant with auto-save but reassuring) */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                persist();
              }}
              disabled={saveState === "saving"}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-gold-soft transition-colors disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              Save now
            </button>
          </div>
        </section>

        {/* Notes + Poems index */}
        <aside className="min-w-0">
          <div className="flex items-baseline justify-between mb-2">
            <h2 className="text-xs uppercase tracking-[0.3em] text-gold">
              {kindFilter === "poems"
                ? "Your Poems"
                : kindFilter === "notes"
                  ? "Your Notes"
                  : "Your Library"}
            </h2>
            <span className="text-[10px] text-muted-foreground">
              {filtersActive ? `${totalFilteredCount}/${totalCount}` : totalCount}
            </span>
          </div>

          {/* Kind toggle: All · Notes · Poems */}
          <div className="mb-2 inline-flex hairline rounded-md p-0.5 bg-obsidian-elevated/40 text-[10px] uppercase tracking-[0.18em]">
            {(["all", "notes", "poems"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className={cn(
                  "px-2.5 py-1 rounded transition-colors",
                  kindFilter === k
                    ? "bg-gold/15 text-gold-soft"
                    : "text-muted-foreground/70 hover:text-foreground",
                )}
              >
                {k === "all"
                  ? `All (${notes.length + poemsList.length})`
                  : k === "notes"
                    ? `Notes (${notes.length})`
                    : `Poems (${poemsList.length})`}
              </button>
            ))}
          </div>

          {/* Frosted-glass search bar */}
          <div className="relative mb-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveViewId(null);
              }}
              placeholder='Search… try book:John status:draft "exact phrase"'
              className="w-full hairline rounded-md bg-obsidian-elevated/50 backdrop-blur-md pl-9 pr-16 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-gold/40"
              aria-label="Search… try book:John status:draft "
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
                label="Notes search operators"
                hints={[
                  { token: "book:John", description: "Filter by book name (contains match)." },
                  {
                    token: "status:draft",
                    description: "Filter by status: draft, sketch, anchored, mixed.",
                  },
                  {
                    token: '"exact phrase"',
                    description: "Match phrase in body or scripture reference.",
                  },
                  {
                    token: "mercy",
                    description: "Plain words AND-match across body, ref, and book.",
                  },
                ]}
                onInsert={(token) => {
                  setQuery((q) => (q ? `${q.trim()} ${token}` : token));
                  setActiveViewId(null);
                }}
              />
            </div>
          </div>

          {/* Sort + Saved Views row */}
          <div className="flex items-center justify-between gap-2 mb-2 relative">
            {/* Sort menu */}
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
                {sortKey === "updated_desc"
                  ? "Newest"
                  : sortKey === "updated_asc"
                    ? "Oldest"
                    : sortKey === "alpha"
                      ? "A–Z"
                      : "Created"}
              </button>
              {sortMenuOpen && (
                <div className="absolute z-20 mt-1 left-0 hairline rounded-md bg-obsidian-elevated/95 backdrop-blur-md p-1 min-w-[140px] shadow-lg">
                  {(
                    [
                      ["updated_desc", "Newest first"],
                      ["updated_asc", "Oldest first"],
                      ["alpha", "Alphabetical"],
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

            {/* Saved views menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setViewsMenuOpen((v) => !v);
                  setSortMenuOpen(false);
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] px-2 py-1 hairline rounded-md transition-colors",
                  activeViewId
                    ? "bg-gold/15 text-gold-soft border-gold/40"
                    : "text-muted-foreground hover:text-gold-soft bg-obsidian-elevated/40",
                )}
              >
                <Bookmark className="h-3 w-3" />
                {activeViewId
                  ? (savedViews.find((v) => v.id === activeViewId)?.name ?? "Views")
                  : "Views"}
              </button>
              {viewsMenuOpen && (
                <div className="absolute z-20 mt-1 right-0 hairline rounded-md bg-obsidian-elevated/95 backdrop-blur-md p-1 min-w-[200px] shadow-lg">
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

          {/* Status filter chips */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <FilterChip
              active={statusFilter === "all"}
              onClick={() => {
                setStatusFilter("all");
                setActiveViewId(null);
              }}
            >
              All
            </FilterChip>
            <FilterChip
              active={statusFilter === "draft"}
              onClick={() => {
                setStatusFilter("draft");
                setActiveViewId(null);
              }}
            >
              Draft
            </FilterChip>
            <FilterChip
              active={statusFilter === "anchored"}
              onClick={() => {
                setStatusFilter("anchored");
                setActiveViewId(null);
              }}
            >
              Anchored
            </FilterChip>
            <FilterChip
              active={statusFilter === "sketch"}
              onClick={() => {
                setStatusFilter("sketch");
                setActiveViewId(null);
              }}
            >
              Sketch
            </FilterChip>
            <FilterChip
              active={statusFilter === "mixed"}
              onClick={() => {
                setStatusFilter("mixed");
                setActiveViewId(null);
              }}
            >
              Mixed
            </FilterChip>
          </div>

          {/* Book filter chips — only render when there are anchored books */}
          {availableBooks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 max-h-20 overflow-y-auto">
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
            <button
              onClick={() => {
                setStatusFilter("all");
                setBookFilter(null);
                setQuery("");
                setSortKey("updated_desc");
                setActiveViewId(null);
              }}
              className="text-[10px] uppercase tracking-widest text-muted-foreground/60 hover:text-gold-soft transition-colors mb-2"
            >
              Clear filters
            </button>
          )}

          {loadingList ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : totalCount === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nothing here yet. Your first thought will land at the top.
            </p>
          ) : unifiedItems.length === 0 ? (
            <SmartEmptyState
              query={query}
              suggestions={buildNotesSuggestions({ bookFilter, statusFilter, availableBooks })}
              onApply={(q) => {
                setQuery(q);
                setActiveViewId(null);
              }}
              onClearFilters={() => {
                setStatusFilter("all");
                setBookFilter(null);
                setQuery("");
                setSortKey("updated_desc");
                setKindFilter("all");
                setActiveViewId(null);
              }}
            />
          ) : (
            <ul className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {unifiedItems.map((item) => {
                if (item.kind === "note") {
                  const n = item.row;
                  const active = n.id === activeNoteId;
                  const inkArr = (n.ink_strokes ?? []) as unknown as InkStroke[];
                  const hasInk = Array.isArray(inkArr) && inkArr.length > 0;
                  const hasText = (n.body_text ?? "").trim().length > 0;
                  const preview =
                    (n.body_text || "").trim().slice(0, 90) || (hasInk ? "✎ Sketch" : "(empty)");
                  const poemParsed = deserialisePoem((n.body_text || "").trim());
                  const displayPreview = poemParsed ? poemPreviewText(poemParsed.data) : preview;
                  const tag = poemParsed
                    ? { label: "Poem", Icon: Feather }
                    : hasInk && hasText
                      ? { label: "Mixed", Icon: Pen }
                      : hasInk
                        ? { label: "Sketch", Icon: ImageIcon }
                        : n.scripture_ref
                          ? { label: "Anchored", Icon: AnchorIcon }
                          : { label: "Draft", Icon: FileText };
                  return (
                    <li key={`note-${n.id}`}>
                      <div
                        className={cn(
                          "group hairline rounded-md p-3 transition-colors cursor-pointer",
                          active
                            ? "bg-gold/10 border-gold/50"
                            : "bg-obsidian-elevated/40 hover:bg-obsidian-elevated/70",
                        )}
                        onClick={() => handleOpenNote(n)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-[10px] uppercase tracking-widest text-gold-soft truncate">
                            {n.scripture_ref ?? "Unanchored"}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(n.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                            aria-label="Delete note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-sm text-foreground/85 line-clamp-2">{displayPreview}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">
                            <tag.Icon className="h-2.5 w-2.5" />
                            {tag.label}
                          </span>
                          <span className="flex items-center gap-2">
                            {boardRefIds.has(n.id) && (
                              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-gold/60">
                                <Pin className="h-2.5 w-2.5" />
                                On Board
                              </span>
                            )}
                            <RelativeTime iso={n.updated_at} />
                          </span>
                        </div>
                      </div>
                    </li>
                  );
                }
                const p = item.row;
                const active = p.id === activePoemId;
                const previewText = poemPreview(p);
                return (
                  <li key={`poem-${p.id}`}>
                    <div
                      className={cn(
                        "group hairline rounded-md p-3 transition-colors cursor-pointer",
                        active
                          ? "bg-gold/10 border-gold/50"
                          : "bg-obsidian-elevated/40 hover:bg-obsidian-elevated/70",
                      )}
                      onClick={() => {
                        setMode("poem");
                        setActivePoemId(p.id);
                        setActivePoemRecord(p);
                        setActiveNoteId(null);
                        setPoemData(recordToPoemData(p));
                        setPoemInspiration(p.inspiration ?? "");
                        dirtyRef.current = false;
                        setSaveState("idle");
                        requestAnimationFrame(() =>
                          editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
                        );
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] uppercase tracking-widest text-gold-soft truncate">
                          {p.title || p.inspiration || "Untitled poem"}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/85 line-clamp-2 font-display italic">
                        {previewText}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-gold/60">
                          <Feather className="h-2.5 w-2.5" />
                          Poem · {p.template.replace("_", " ")}
                        </span>
                        <span className="flex items-center gap-2">
                          {boardRefIds.has(p.id) && (
                            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.18em] text-gold/60">
                              <Pin className="h-2.5 w-2.5" />
                              On Board
                            </span>
                          )}
                          <RelativeTime iso={p.updated_at} />
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <PoemEntryPicker
        open={pickerOpen}
        scriptureRef={reference}
        onClose={() => setPickerOpen(false)}
        onSelect={handlePoemSeed}
      />
    </AppShell>
  );
}

function RelativeTime({ iso }: { iso: string }) {
  const label = useMemo(() => {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const m = Math.round(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [iso]);
  return (
    <time
      dateTime={iso}
      className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/60"
    >
      {label}
    </time>
  );
}

function ToolbarTab({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded transition-colors",
        active ? "bg-gold/15 text-gold-soft" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

function CanvasTool({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center h-8 w-8 hairline rounded-md bg-obsidian/70 backdrop-blur text-muted-foreground hover:text-gold-soft hover:bg-obsidian transition-colors"
    >
      {children}
    </button>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-gold-soft">
        <Check className="h-3 w-3" />
        Saved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground/60">
      Auto-save on
    </span>
  );
}

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

/**
 * Pin a saved poem to the user's public Board. Idempotent at the UX level —
 * shows a success toast each time, and links to /account/board so the user
 * can manage / publish from there.
 */
function PinPoemToBoardButton({
  poem,
  alreadyPinned,
  onPinned,
}: {
  poem: PoemRecord;
  alreadyPinned: boolean;
  onPinned: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  if (alreadyPinned) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gold/60 py-1">
        <Pin className="h-3.5 w-3.5" />
        On Board
      </span>
    );
  }
  const handle = async () => {
    setBusy(true);
    try {
      await addBoardItem({
        user_id: poem.user_id,
        kind: "poem",
        ref_id: poem.id,
        title: poem.title || "Untitled poem",
        caption: poemPreview(poem),
        thumbnail_url: null,
        external_url: null,
      });
      onPinned(poem.id);
      toast.success("Pinned to your Board", {
        description: "Manage or publish from /account/board.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add to Board.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors py-1 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pin className="h-3.5 w-3.5" />}
      Pin to Board
    </button>
  );
}

/**
 * Publish a saved Note to the public Board's Reflections stack.
 * Inserts a board_items row with kind=note + subkind=note. The Reflections
 * section on the @handle board renders both poems and notes vertically.
 */
function PinNoteToReflectionsButton({
  noteId,
  userId,
  bodyText,
  scriptureRef,
  alreadyPinned,
  onPinned,
}: {
  noteId: string;
  userId: string;
  bodyText: string;
  scriptureRef: string | null;
  alreadyPinned: boolean;
  onPinned: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  if (alreadyPinned) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-gold/60 py-1">
        <Pin className="h-3.5 w-3.5" />
        On Board
      </span>
    );
  }
  const handle = async () => {
    setBusy(true);
    try {
      const trimmed = bodyText.trim();
      const firstLine = trimmed.split(/\r?\n/)[0]?.trim() ?? "";
      const title =
        firstLine.length > 0 && firstLine.length <= 80 ? firstLine : (scriptureRef ?? "Reflection");
      await addBoardItem({
        user_id: userId,
        kind: "note",
        subkind: "note",
        ref_id: noteId,
        title,
        caption: trimmed,
        thumbnail_url: null,
        external_url: null,
      });
      onPinned(noteId);
      toast.success("Pinned to Reflections", {
        description: "Manage or publish from /account/board.",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add to Reflections.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold-soft transition-colors py-1 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pin className="h-3.5 w-3.5" />}
      Pin to Reflections
    </button>
  );
}
