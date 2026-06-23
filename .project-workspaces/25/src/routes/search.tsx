import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Search as SearchIcon, BookOpen, X, ChevronRight, Clock, Sparkles } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { AppShell } from "@/components/layout/AppShell";
import {
  MasterHeader,
  MasterHeaderDefaultLeft,
  MasterHeaderDefaultRight,
} from "@/components/layout/MasterHeader";
import { OfflineHint } from "@/components/layout/OfflineHint";
import { DailyWordSheet } from "@/components/reader/DailyWordSheet";
import { loadBible } from "@/lib/scripture";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Search — SanctumIQ" },
      {
        name: "description",
        content:
          "Search scripture by keyword, phrase, or reference. Instant results from the full KJV Bible.",
      },
      { property: "og:title", content: "Search — SanctumIQ" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: SearchPage,
});

type SearchResult = {
  book: string;
  bookIndex: number;
  chapter: number;
  verse: number;
  text: string;
  matchStart: number;
  matchEnd: number;
};

type SearchMode = "exact" | "smart";

const MAX_RESULTS = 800;
const MAX_PER_BOOK = 200;
const HISTORY_KEY = "sanctum.search.history";
const HISTORY_LIMIT = 8;

/* ─────────────────────────────────────────────────────────────
   REFERENCE PARSER
   ───────────────────────────────────────────────────────────── */
const BOOK_ALIASES: Record<string, number> = {
  genesis: 0,
  gen: 0,
  gn: 0,
  exodus: 1,
  ex: 1,
  exo: 1,
  leviticus: 2,
  lev: 2,
  numbers: 3,
  num: 3,
  deuteronomy: 4,
  deut: 4,
  dt: 4,
  joshua: 5,
  josh: 5,
  judges: 6,
  judg: 6,
  ruth: 7,
  "1 samuel": 8,
  "1samuel": 8,
  "1sam": 8,
  "2 samuel": 9,
  "2samuel": 9,
  "2sam": 9,
  "1 kings": 10,
  "1kings": 10,
  "1ki": 10,
  "2 kings": 11,
  "2kings": 11,
  "2ki": 11,
  "1 chronicles": 12,
  "1chr": 12,
  "2 chronicles": 13,
  "2chr": 13,
  ezra: 14,
  nehemiah: 15,
  neh: 15,
  esther: 16,
  esth: 16,
  job: 17,
  psalms: 18,
  psalm: 18,
  ps: 18,
  psa: 18,
  psm: 18,
  proverbs: 19,
  prov: 19,
  pro: 19,
  ecclesiastes: 20,
  eccl: 20,
  ecc: 20,
  "song of solomon": 21,
  song: 21,
  sos: 21,
  isaiah: 22,
  isa: 22,
  jeremiah: 23,
  jer: 23,
  lamentations: 24,
  lam: 24,
  ezekiel: 25,
  ezek: 25,
  daniel: 26,
  dan: 26,
  hosea: 27,
  hos: 27,
  joel: 28,
  amos: 29,
  obadiah: 30,
  obad: 30,
  jonah: 31,
  jon: 31,
  micah: 32,
  mic: 32,
  nahum: 33,
  nah: 33,
  habakkuk: 34,
  hab: 34,
  zephaniah: 35,
  zeph: 35,
  haggai: 36,
  hag: 36,
  zechariah: 37,
  zech: 37,
  malachi: 38,
  mal: 38,
  matthew: 39,
  matt: 39,
  mt: 39,
  mark: 40,
  mk: 40,
  luke: 41,
  lk: 41,
  john: 42,
  jn: 42,
  acts: 43,
  romans: 44,
  rom: 44,
  "1 corinthians": 45,
  "1cor": 45,
  "1co": 45,
  "2 corinthians": 46,
  "2cor": 46,
  "2co": 46,
  galatians: 47,
  gal: 47,
  ephesians: 48,
  eph: 48,
  philippians: 49,
  phil: 49,
  php: 49,
  colossians: 50,
  col: 50,
  "1 thessalonians": 51,
  "1thess": 51,
  "1th": 51,
  "2 thessalonians": 52,
  "2thess": 52,
  "2th": 52,
  "1 timothy": 53,
  "1tim": 53,
  "1ti": 53,
  "2 timothy": 54,
  "2tim": 54,
  "2ti": 54,
  titus: 55,
  tit: 55,
  philemon: 56,
  phlm: 56,
  hebrews: 57,
  hebrew: 57,
  heb: 57,
  james: 58,
  jas: 58,
  "1 peter": 59,
  "1pet": 59,
  "1pe": 59,
  "2 peter": 60,
  "2pet": 60,
  "2pe": 60,
  "1 john": 61,
  "1jn": 61,
  "2 john": 62,
  "2jn": 62,
  "3 john": 63,
  "3jn": 63,
  jude: 64,
  revelation: 65,
  rev: 65,
};

function parseReference(
  query: string,
): { bookIndex: number; chapter: number; verse?: number } | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  const refPattern = /^(\d?\s?[a-z][a-z ]*?)\s*(\d+)(?::(\d+))?$/;
  const match = q.match(refPattern);
  if (!match) return null;
  const bookPart = match[1].trim().replace(/\s+/g, " ");
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;
  const bookIndex = BOOK_ALIASES[bookPart];
  if (bookIndex === undefined) return null;
  return { bookIndex, chapter, verse };
}

/* ─────────────────────────────────────────────────────────────
   SEARCH HISTORY (localStorage, safe)
   ───────────────────────────────────────────────────────────── */
function loadHistory(): string[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(HISTORY_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === "string").slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function saveHistory(items: string[]) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, HISTORY_LIMIT)));
  } catch {
    /* quota or privacy mode — silent */
  }
}

/* ─────────────────────────────────────────────────────────────
   HIGHLIGHTING — supports multi-token (smart mode)
   ───────────────────────────────────────────────────────────── */
type HighlightSegment = { text: string; match: boolean };

function highlightSegments(text: string, tokens: string[]): HighlightSegment[] {
  const valid = tokens.filter((t) => t.length > 0);
  if (valid.length === 0) return [{ text, match: false }];
  const escaped = valid.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(re);
  return parts.map((p) => ({
    text: p,
    match: valid.some((t) => p.toLowerCase() === t.toLowerCase()),
  }));
}

function SearchPage() {
  const navigate = useNavigate();
  const { q: initialQ } = Route.useSearch();
  const [query, setQuery] = useState(initialQ);
  const [mode, setMode] = useState<SearchMode>("exact");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [bibleLoaded, setBibleLoaded] = useState(false);
  const [referenceTarget, setReferenceTarget] = useState<{
    bookIndex: number;
    chapter: number;
    verse?: number;
  } | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [dailyWordOpen, setDailyWordOpen] = useState(false);
  const bibleRef = useRef<Awaited<ReturnType<typeof loadBible>> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoNavRef = useRef<number | null>(null);
  const historyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadBible().then((b) => {
      bibleRef.current = b;
      setBibleLoaded(true);
    });
    setHistory(loadHistory());
    inputRef.current?.focus();
  }, []);

  const recordHistory = useCallback((q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setHistory((prev) => {
      const next = [
        trimmed,
        ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, HISTORY_LIMIT);
      saveHistory(next);
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const removeHistoryItem = useCallback((item: string) => {
    setHistory((prev) => {
      const next = prev.filter((s) => s !== item);
      saveHistory(next);
      return next;
    });
  }, []);

  const runSearch = useCallback(
    (q: string, m: SearchMode) => {
      const bible = bibleRef.current;
      if (!bible || q.trim().length < 2) {
        setResults([]);
        setReferenceTarget(null);
        return;
      }

      setSearching(true);

      setTimeout(() => {
        const trimmed = q.trim();

        // Reference auto-jump
        const ref = parseReference(trimmed);
        if (ref) {
          setReferenceTarget(ref);
          setResults([]);
          setSearching(false);
          if (autoNavRef.current) window.clearTimeout(autoNavRef.current);
          autoNavRef.current = window.setTimeout(() => {
            navigate({
              to: "/reader",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              search: { bookIndex: ref.bookIndex, chapter: ref.chapter } as any,
            });
          }, 350);
          return;
        }
        if (autoNavRef.current) {
          window.clearTimeout(autoNavRef.current);
          autoNavRef.current = null;
        }
        setReferenceTarget(null);

        // Tokens: exact = whole phrase; smart = each word, requires ≥1 token to match
        const tokens =
          m === "smart"
            ? trimmed
                .toLowerCase()
                .split(/\s+/)
                .filter((t) => t.length >= 2)
            : [trimmed.toLowerCase()];

        const found: SearchResult[] = [];

        for (let bi = 0; bi < bible.books.length; bi++) {
          const book = bible.books[bi];
          const chapters = bible.KJV[bi]?.chapters ?? [];
          let bookCount = 0;
          for (let ci = 0; ci < chapters.length; ci++) {
            const verses = chapters[ci];
            for (let vi = 0; vi < verses.length; vi++) {
              const text = verses[vi];
              const textLower = text.toLowerCase();

              let firstIdx = -1;
              let firstLen = 0;
              for (const tok of tokens) {
                const idx = textLower.indexOf(tok);
                if (idx !== -1 && (firstIdx === -1 || idx < firstIdx)) {
                  firstIdx = idx;
                  firstLen = tok.length;
                }
              }

              if (firstIdx !== -1) {
                found.push({
                  book: book.name,
                  bookIndex: bi,
                  chapter: ci + 1,
                  verse: vi + 1,
                  text,
                  matchStart: firstIdx,
                  matchEnd: firstIdx + firstLen,
                });
                bookCount++;
                if (bookCount >= MAX_PER_BOOK) break;
              }
            }
            if (bookCount >= MAX_PER_BOOK) break;
            if (found.length >= MAX_RESULTS) break;
          }
          if (found.length >= MAX_RESULTS) break;
        }

        setResults(found);
        setSearching(false);
      }, 30);
    },
    [navigate],
  );

  useEffect(() => {
    if (!bibleLoaded) return;
    runSearch(query, mode);
  }, [query, mode, bibleLoaded, runSearch]);

  // Debounced history persistence — only save once user stops typing for 1s
  useEffect(() => {
    if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current);
    if (query.trim().length < 2) return;
    historyTimerRef.current = window.setTimeout(() => recordHistory(query), 1000);
    return () => {
      if (historyTimerRef.current) window.clearTimeout(historyTimerRef.current);
    };
  }, [query, recordHistory]);

  const tokens = useMemo(
    () =>
      mode === "smart"
        ? query
            .trim()
            .toLowerCase()
            .split(/\s+/)
            .filter((t: string) => t.length >= 2)
        : [query.trim().toLowerCase()].filter((t: string) => t.length > 0),
    [query, mode],
  );

  const hasQuery = query.trim().length >= 2;
  const showEmpty = hasQuery && !searching && results.length === 0 && !referenceTarget;

  return (
    <AppShell hideTopNav>
      <MasterHeader
        left={
          <MasterHeaderDefaultLeft activeSearch onDailyWordClick={() => setDailyWordOpen(true)} />
        }
        title={
          <span className="block truncate font-display text-base text-gold-soft sm:text-lg md:text-xl">
            Search
          </span>
        }
        right={<MasterHeaderDefaultRight />}
      />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-[calc(56px+1rem)] sm:pt-[calc(64px+1.25rem)] md:pt-[calc(76px+1.5rem)] pb-8">
        <div className="mb-4">
          <OfflineHint message="Scripture you've already opened is available, but live search needs a connection." />
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                recordHistory(query);
                const ref = parseReference(query.trim());
                if (ref) {
                  if (autoNavRef.current) window.clearTimeout(autoNavRef.current);
                  navigate({
                    to: "/reader",
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    search: { bookIndex: ref.bookIndex, chapter: ref.chapter } as any,
                  });
                }
              }
            }}
            placeholder={`Search scripture… try "fear not" or "John 3:16"`}
            className="w-full rounded-xl border border-gold/20 bg-obsidian-elevated/50 pl-11 pr-10 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-gold/45 transition-colors"
            aria-label="Text"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Mode filter — Exact vs Smart */}
        <div className="mb-6 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
            Match
          </span>
          <div
            role="tablist"
            aria-label="Search mode"
            className="inline-flex hairline rounded-full p-0.5 bg-obsidian-elevated/40"
          >
            <button
              role="tab"
              aria-selected={mode === "exact"}
              onClick={() => setMode("exact")}
              className={cn(
                "px-3 py-1 text-[11px] uppercase tracking-[0.18em] rounded-full transition-colors",
                mode === "exact"
                  ? "bg-gold/15 text-gold-soft"
                  : "text-muted-foreground/60 hover:text-foreground",
              )}
            >
              Exact
            </button>
            <button
              role="tab"
              aria-selected={mode === "smart"}
              onClick={() => setMode("smart")}
              className={cn(
                "px-3 py-1 text-[11px] uppercase tracking-[0.18em] rounded-full transition-colors flex items-center gap-1",
                mode === "smart"
                  ? "bg-gold/15 text-gold-soft"
                  : "text-muted-foreground/60 hover:text-foreground",
              )}
            >
              <Sparkles className="h-3 w-3" />
              Smart
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground/40 hidden sm:inline">
            {mode === "smart" ? "Matches any word individually" : "Matches the full phrase"}
          </span>
        </div>

        {/* Loading */}
        {!bibleLoaded && (
          <p className="text-center text-sm text-muted-foreground/60 py-12">Loading scripture…</p>
        )}

        {/* Reference result */}
        {referenceTarget && (
          <ReferenceCard
            bookIndex={referenceTarget.bookIndex}
            chapter={referenceTarget.chapter}
            verse={referenceTarget.verse}
            bookName={bibleRef.current?.books[referenceTarget.bookIndex]?.name ?? ""}
            verseText={
              referenceTarget.verse
                ? bibleRef.current?.KJV[referenceTarget.bookIndex]?.chapters[
                    referenceTarget.chapter - 1
                  ]?.[referenceTarget.verse - 1]
                : undefined
            }
          />
        )}

        {/* Keyword results — grouped by book with verse previews */}
        {results.length > 0 && <GroupedResults results={results} tokens={tokens} />}

        {/* Empty state */}
        {showEmpty && (
          <div className="text-center py-16">
            <p className="text-muted-foreground/60 text-sm">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
            <p className="text-muted-foreground/40 text-xs mt-2">
              {mode === "exact"
                ? "Try Smart mode for individual word matches"
                : "Try a different word or phrase"}
            </p>
          </div>
        )}

        {/* Idle state — recent searches + suggestions */}
        {!hasQuery && bibleLoaded && (
          <div className="py-12 space-y-10">
            {history.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/60 flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> Recent
                  </p>
                  <button
                    onClick={clearHistory}
                    className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/40 hover:text-gold-soft transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((item) => (
                    <span
                      key={item}
                      className="group inline-flex items-center gap-1 hairline rounded-full pl-3 pr-1 py-1 bg-obsidian-elevated/40 hover:border-gold/30 transition-colors"
                    >
                      <button
                        onClick={() => setQuery(item)}
                        className="text-xs text-foreground/80 group-hover:text-gold-soft transition-colors"
                      >
                        {item}
                      </button>
                      <button
                        onClick={() => removeHistoryItem(item)}
                        aria-label={`Remove ${item} from history`}
                        className="ml-0.5 rounded-full p-0.5 text-muted-foreground/40 hover:text-foreground hover:bg-gold/10 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            )}

            <section className="text-center space-y-4">
              <BookOpen className="h-8 w-8 text-gold/20 mx-auto" strokeWidth={1} />
              <p className="font-display italic text-lg text-muted-foreground/50">
                Search the full King James Bible
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-6">
                {["fear not", "love one another", "John 3:16", "Psalm 23", "faith"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuery(s)}
                    className="text-xs hairline rounded-full px-3 py-1.5 text-muted-foreground/60 hover:text-gold-soft hover:border-gold/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
      {dailyWordOpen && (
        <DailyWordSheet
          onClose={() => setDailyWordOpen(false)}
          onNavigateToVerse={(bookIndex, chapter, verse) => {
            setDailyWordOpen(false);
            void navigate({ to: "/reader", search: { bookIndex, chapter } });
          }}
        />
      )}
    </AppShell>
  );
}

/* ─────────────────────────────────────────────────────────────
   GROUPED RESULTS — by book, with verse-preview cards
   ───────────────────────────────────────────────────────────── */
function GroupedResults({ results, tokens }: { results: SearchResult[]; tokens: string[] }) {
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(() => new Set());

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.book]) acc[r.book] = [];
    acc[r.book].push(r);
    return acc;
  }, {});

  const bookNames = Object.keys(grouped);
  const totalBooks = bookNames.length;
  const totalResults = results.length;

  const toggleBook = (book: string) => {
    setExpandedBooks((prev) => {
      const next = new Set(prev);
      if (next.has(book)) next.delete(book);
      else next.add(book);
      return next;
    });
  };

  useEffect(() => {
    if (bookNames.length === 1) {
      setExpandedBooks(new Set(bookNames));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  return (
    <div className="space-y-3">
      <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground/50 mb-3">
        {totalResults} result{totalResults !== 1 ? "s" : ""} across {totalBooks} book
        {totalBooks !== 1 ? "s" : ""}
      </p>
      {bookNames.map((book) => {
        const bookResults = grouped[book];
        const isExpanded = expandedBooks.has(book);
        const preview = bookResults[0];
        return (
          <div key={book} className="hairline rounded-xl overflow-hidden">
            {/* Book header */}
            <button
              type="button"
              onClick={() => toggleBook(book)}
              className="w-full flex items-center justify-between px-4 py-3 bg-obsidian-elevated/40 hover:bg-gold/5 transition-colors"
              aria-expanded={isExpanded}
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-base text-gold-soft">{book}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
                  {bookResults.length} verse{bookResults.length !== 1 ? "s" : ""}
                </span>
              </div>
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground/40 transition-transform",
                  isExpanded && "rotate-90",
                )}
              />
            </button>

            {/* Collapsed preview card — first match teaser */}
            {!isExpanded && preview && (
              <Link
                to="/reader"
                search={
                  {
                    bookIndex: preview.bookIndex,
                    chapter: preview.chapter,
                    verse: preview.verse,
                    highlight: tokens[0] || undefined,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  } as any
                }
                className="block px-4 py-3 bg-obsidian/30 hover:bg-gold/5 transition-colors group"
              >
                <p className="text-[10px] uppercase tracking-[0.2em] text-gold/60 mb-1">
                  {preview.book} {preview.chapter}:{preview.verse}
                </p>
                <p className="text-sm text-foreground/75 leading-relaxed font-display line-clamp-2">
                  <HighlightedText text={preview.text} tokens={tokens} />
                </p>
                {bookResults.length > 1 && (
                  <p className="text-[10px] text-muted-foreground/40 mt-1.5">
                    + {bookResults.length - 1} more — tap book to expand
                  </p>
                )}
              </Link>
            )}

            {/* Expanded — full verse cards */}
            {isExpanded && (
              <div className="divide-y divide-gold/8">
                {bookResults.map((r) => (
                  <Link
                    key={`${r.bookIndex}-${r.chapter}-${r.verse}`}
                    to="/reader"
                    search={
                      {
                        bookIndex: r.bookIndex,
                        chapter: r.chapter,
                        verse: r.verse,
                        highlight: tokens[0] || undefined,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      } as any
                    }
                    className="group block bg-obsidian/30 hover:bg-gold/5 px-4 py-3.5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-gold/70">
                        {r.book} {r.chapter}:{r.verse}
                      </p>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-gold/50 transition-colors shrink-0" />
                    </div>
                    <p className="text-sm text-foreground/85 leading-relaxed font-display">
                      <HighlightedText text={r.text} tokens={tokens} />
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function HighlightedText({ text, tokens }: { text: string; tokens: string[] }) {
  const segs = highlightSegments(text, tokens);
  return (
    <>
      {segs.map((s, i) =>
        s.match ? (
          <mark key={i} className="bg-gold/25 text-gold-soft rounded-sm px-0.5 not-italic">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   REFERENCE CARD
   ───────────────────────────────────────────────────────────── */
function ReferenceCard({
  bookIndex,
  chapter,
  verse,
  bookName,
  verseText,
}: {
  bookIndex: number;
  chapter: number;
  verse?: number;
  bookName: string;
  verseText?: string;
}) {
  return (
    <Link
      to="/reader"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      search={{ bookIndex, chapter } as any}
      className="block hairline rounded-xl bg-obsidian-elevated/50 hover:bg-gold/5 p-5 transition-colors group"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] uppercase tracking-[0.25em] text-gold/70">
          {bookName} {chapter}
          {verse ? `:${verse}` : ""}
        </p>
        <span className="text-xs text-muted-foreground/50 group-hover:text-gold/60 transition-colors flex items-center gap-1">
          Open in reader <ChevronRight className="h-3 w-3" />
        </span>
      </div>
      {verseText && (
        <p className="font-display text-base md:text-lg leading-relaxed text-foreground/90">
          {verseText}
        </p>
      )}
      {!verseText && (
        <p className="text-sm text-muted-foreground/60">
          Tap to open {bookName} {chapter} in the reader
        </p>
      )}
    </Link>
  );
}
