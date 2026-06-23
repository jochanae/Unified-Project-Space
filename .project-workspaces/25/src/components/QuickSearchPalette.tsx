import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BookOpenText, CornerDownLeft, Search, Sparkles, X, Flame } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { loadBible } from "@/lib/scripture";
import { parseReference, suggestBooks } from "@/lib/scripture-search";
import { matchTopics, tokenize, tokenMatch, type Topic } from "@/lib/scripture-topics";
import { useHighlightsEnabled } from "@/hooks/useHighlightsEnabled";

type Bible = Awaited<ReturnType<typeof loadBible>>;
type VerseHit = { bookIndex: number; book: string; chapter: number; verse: number; text: string };
type TopicVerse = {
  topic: Topic;
  bookIndex: number;
  book: string;
  chapter: number;
  verse: number;
  text: string;
};

const RENDER_LIMIT = 40;
const SCAN_LIMIT = 2000;

/**
 * QuickSearchPalette — obsidian/gold sanctuary sheet (⌘K).
 * Tokenized AND-matching, topic curation, direct-to-Reader navigation.
 */
export function QuickSearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [bible, setBible] = useState<Bible | null>(null);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [keywordHits, setKeywordHits] = useState<VerseHit[]>([]);
  const [totalHits, setTotalHits] = useState(0);
  const [topicVerses, setTopicVerses] = useState<TopicVerse[]>([]);
  const featuredRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || bible) return;
    let cancelled = false;
    loadBible().then((b) => {
      if (!cancelled) setBible(b);
    });
    return () => {
      cancelled = true;
    };
  }, [open, bible]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setKeywordHits([]);
      setTotalHits(0);
      setTopicVerses([]);
    } else {
      // Focus after sheet animation
      const t = window.setTimeout(() => inputRef.current?.focus(), 220);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const reference = useMemo(() => parseReference(query), [query]);
  const bookSuggestions = useMemo(
    () => (bible && !reference ? suggestBooks(query, bible.books) : []),
    [bible, query, reference],
  );
  const matchedTopics = useMemo(() => (reference ? [] : matchTopics(query)), [query, reference]);

  // Resolve topic verses from bible
  useEffect(() => {
    if (!bible || matchedTopics.length === 0) {
      setTopicVerses([]);
      return;
    }
    const out: TopicVerse[] = [];
    for (const topic of matchedTopics) {
      for (const ref of topic.refs) {
        const text = bible.KJV[ref.bookIndex]?.chapters?.[ref.chapter - 1]?.[ref.verse - 1];
        if (text) {
          out.push({
            topic,
            bookIndex: ref.bookIndex,
            book: bible.books[ref.bookIndex]?.name ?? "",
            chapter: ref.chapter,
            verse: ref.verse,
            text,
          });
        }
      }
    }
    setTopicVerses(out);
    if (out.length > 0) {
      // Scroll featured verses into view so users see results immediately
      requestAnimationFrame(() => {
        featuredRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [bible, matchedTopics]);

  // Tokenized AND-matching keyword search
  useEffect(() => {
    if (!bible) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const tokens = tokenize(query);
    if (reference || tokens.length === 0 || bookSuggestions.length > 0) {
      setKeywordHits([]);
      setTotalHits(0);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      const out: VerseHit[] = [];
      let total = 0;
      outer: for (let bi = 0; bi < bible.books.length; bi++) {
        const chapters = bible.KJV[bi]?.chapters ?? [];
        for (let ci = 0; ci < chapters.length; ci++) {
          const verses = chapters[ci];
          for (let vi = 0; vi < verses.length; vi++) {
            if (tokenMatch(verses[vi], tokens)) {
              total++;
              if (out.length < RENDER_LIMIT) {
                out.push({
                  bookIndex: bi,
                  book: bible.books[bi].name,
                  chapter: ci + 1,
                  verse: vi + 1,
                  text: verses[vi],
                });
              }
              if (total >= SCAN_LIMIT) break outer;
            }
          }
        }
      }
      setKeywordHits(out);
      setTotalHits(total);
    }, 140);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [bible, query, reference, bookSuggestions.length]);

  const jump = (bookIndex: number, chapter: number, verse?: number, highlight?: string) => {
    onOpenChange(false);
    navigate({
      to: "/reader",
      search: { bookIndex, chapter, verse, highlight: highlight || undefined },
    });
  };

  const fullSearch = (prefill?: string) => {
    onOpenChange(false);
    navigate({ to: "/search", search: { q: prefill ?? "" } });
  };

  const trimmedQuery = query.trim();
  const moreCount = Math.max(0, totalHits - keywordHits.length);
  const tokens = useMemo(() => tokenize(query), [query]);
  const [highlightsEnabled] = useHighlightsEnabled();

  // Highlight tokens within verse text (gated by global highlights toggle)
  const renderHighlighted = (text: string) => {
    if (!highlightsEnabled || tokens.length === 0) return text;
    const re = new RegExp(
      `(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
      "gi",
    );
    const parts = text.split(re);
    return parts.map((p, i) =>
      tokens.some((t) => p.toLowerCase() === t) ? (
        <mark key={i} className="bg-gold/20 text-gold-soft rounded-sm px-0.5">
          {p}
        </mark>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  };

  const showEmpty =
    bible &&
    !reference &&
    trimmedQuery.length >= 2 &&
    bookSuggestions.length === 0 &&
    keywordHits.length === 0 &&
    topicVerses.length === 0;

  const showIdle = bible && trimmedQuery.length === 0;

  // Flat ordered list of activatable rows for keyboard nav (must mirror render order).
  const actions = useMemo(() => {
    const list: Array<() => void> = [];
    if (bible && reference) {
      list.push(() => jump(reference.bookIndex, reference.chapter, reference.verse));
    }
    for (const tv of topicVerses) {
      list.push(() => jump(tv.bookIndex, tv.chapter, tv.verse, trimmedQuery));
    }
    if (bible && !reference) {
      for (const b of bookSuggestions) list.push(() => jump(b.bookIndex, 1));
    }
    if (bible && !reference) {
      for (const hit of keywordHits) {
        list.push(() => jump(hit.bookIndex, hit.chapter, hit.verse, trimmedQuery));
      }
      if (moreCount > 0) list.push(() => fullSearch(trimmedQuery));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bible, reference, topicVerses, bookSuggestions, keywordHits, moreCount, trimmedQuery]);

  const [activeIndex, setActiveIndex] = useState(0);
  // Reset cursor whenever the result set changes
  useEffect(() => {
    setActiveIndex(0);
  }, [actions.length]);

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
      return;
    }
    if (actions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % actions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + actions.length) % actions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      actions[activeIndex]?.();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        data-quick-search-palette
        transparentOverlay
        className={cn(
          "p-0 border-t border-gold/20 shadow-none",
          "bg-background text-foreground",
          "h-[100dvh] sm:h-[80vh] sm:max-w-2xl sm:left-1/2 sm:-translate-x-1/2 sm:rounded-t-3xl",
          "flex flex-col gap-0",
          "[&>button]:hidden", // hide default close — we use custom
        )}
      >
        <SheetTitle className="sr-only">Quick Search Scripture</SheetTitle>
        <SheetDescription className="sr-only">
          Jump to any passage, search by keyword, or browse curated topics. Press Escape to close.
        </SheetDescription>

        {/* Header — top padding clears the floating reader header (safe-area + ~64px) on mobile. */}
        <div
          className="relative border-b border-gold/15 px-5 pb-4 sm:rounded-t-3xl sm:pt-5"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 4.5rem)" }}
        >
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-gold/80 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search scripture, topic, or reference…"
              aria-activedescendant={actions.length > 0 ? `qsp-row-${activeIndex}` : undefined}
              className={cn(
                "flex-1 bg-transparent border-0 outline-none text-base sm:text-lg text-foreground",
                "placeholder:text-muted-foreground/70 font-display",
                "min-h-[44px]",
              )}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Search scripture, topic, or reference…"
            />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close search"
              className="h-10 w-10 flex items-center justify-center rounded-full text-muted-foreground hover:text-gold hover:bg-gold/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 ml-8 text-[11px] uppercase tracking-[0.18em] text-muted-foreground/60">
            e.g. <span className="text-gold/70">John 3:16</span> ·{" "}
            <span className="text-gold/70">love enemies</span> ·{" "}
            <span className="text-gold/70">anxiety</span>
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-4">
          {!bible && (
            <div className="py-12 text-center text-sm text-muted-foreground animate-fade-in">
              Loading scripture…
            </div>
          )}

          {/* Idle: show topic chips */}
          {showIdle && (
            <Section title="Browse by topic">
              <div className="flex flex-wrap gap-2 px-2">
                {[
                  "Anxiety",
                  "Fear",
                  "Peace",
                  "Love",
                  "Hope",
                  "Faith",
                  "Money",
                  "Forgiveness",
                  "Strength",
                  "Wisdom",
                  "Healing",
                  "Purpose",
                ].map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setQuery(label.toLowerCase())}
                    className={cn(
                      "min-h-[44px] px-4 py-2 rounded-full text-sm font-display",
                      "border border-gold/20 bg-gold/5 text-gold-soft",
                      "hover:bg-gold/15 hover:border-gold/40 transition-colors",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Sequential row indices for keyboard nav (must mirror `actions` order). */}
          {(() => {
            let cursor = 0;
            const next = () => cursor++;
            return (
              <>
                {/* Direct passage match */}
                {bible && reference && (
                  <Section title="Passage">
                    <Row
                      rowIndex={next()}
                      activeIndex={activeIndex}
                      onClick={() => jump(reference.bookIndex, reference.chapter, reference.verse)}
                      icon={<BookOpenText className="h-5 w-5 text-gold/80" />}
                      title={`${bible.books[reference.bookIndex]?.name} ${reference.chapter}${reference.verse ? `:${reference.verse}` : ""}${reference.verseEnd ? `-${reference.verseEnd}` : ""}`}
                      trailing={<CornerDownLeft className="h-4 w-4 text-muted-foreground" />}
                    />
                  </Section>
                )}

                {/* Topic featured verses */}
                {topicVerses.length > 0 && (
                  <div ref={featuredRef}>
                    <Section
                      title={`Featured · ${matchedTopics.map((t) => t.label).join(" · ")} · tap a verse to open`}
                      accent
                    >
                      {topicVerses.map((tv) => (
                        <Row
                          key={`topic-${tv.topic.id}-${tv.bookIndex}-${tv.chapter}-${tv.verse}`}
                          rowIndex={next()}
                          activeIndex={activeIndex}
                          onClick={() => jump(tv.bookIndex, tv.chapter, tv.verse, trimmedQuery)}
                          icon={<Flame className="h-5 w-5 text-gold/80 shrink-0" />}
                          title={
                            <span className="text-[11px] uppercase tracking-[0.18em] text-gold/70">
                              {tv.book} {tv.chapter}:{tv.verse}
                            </span>
                          }
                          body={<span className="line-clamp-2">{tv.text}</span>}
                        />
                      ))}
                    </Section>
                  </div>
                )}

                {/* Book suggestions */}
                {bible && !reference && bookSuggestions.length > 0 && (
                  <Section title="Books">
                    {bookSuggestions.map((b) => (
                      <Row
                        key={`book-${b.bookIndex}`}
                        rowIndex={next()}
                        activeIndex={activeIndex}
                        onClick={() => jump(b.bookIndex, 1)}
                        icon={<BookOpenText className="h-5 w-5 text-gold/80" />}
                        title={b.name}
                        trailing={
                          <span className="text-[11px] text-muted-foreground">Chapter 1</span>
                        }
                      />
                    ))}
                  </Section>
                )}

                {/* Keyword AND-matched verses */}
                {bible && !reference && keywordHits.length > 0 && (
                  <Section
                    title={
                      totalHits > 0
                        ? `${totalHits} verse${totalHits === 1 ? "" : "s"} match all terms${keywordHits.length < totalHits ? ` · showing ${keywordHits.length}` : ""}`
                        : `Verses matching "${trimmedQuery}"`
                    }
                  >
                    {keywordHits.map((hit) => (
                      <Row
                        key={`hit-${hit.bookIndex}-${hit.chapter}-${hit.verse}`}
                        rowIndex={next()}
                        activeIndex={activeIndex}
                        onClick={() => jump(hit.bookIndex, hit.chapter, hit.verse, trimmedQuery)}
                        icon={<Search className="h-5 w-5 text-gold/70 shrink-0 mt-0.5" />}
                        title={
                          <span className="text-[11px] uppercase tracking-[0.18em] text-gold/70">
                            {hit.book} {hit.chapter}:{hit.verse}
                          </span>
                        }
                        body={<span className="line-clamp-2">{renderHighlighted(hit.text)}</span>}
                      />
                    ))}
                    {moreCount > 0 && (
                      <Row
                        rowIndex={next()}
                        activeIndex={activeIndex}
                        onClick={() => fullSearch(trimmedQuery)}
                        icon={<Sparkles className="h-5 w-5 text-gold/80" />}
                        title={
                          <span className="text-gold-soft">
                            View all {totalHits} results for &ldquo;{trimmedQuery}&rdquo;
                          </span>
                        }
                        trailing={<CornerDownLeft className="h-4 w-4 text-muted-foreground" />}
                      />
                    )}
                  </Section>
                )}
              </>
            );
          })()}

          {showEmpty && (
            <div className="py-12 text-center text-sm text-muted-foreground animate-fade-in">
              <p className="font-display text-base text-foreground/80">No matches.</p>
              <p className="mt-1 text-xs">Try a single word, topic, or reference like John 3:16.</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="border-t border-gold/15 px-3 py-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => fullSearch(trimmedQuery)}
            className="min-h-[40px] px-3 text-xs font-display text-gold-soft hover:text-gold transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {trimmedQuery ? `Full search "${trimmedQuery}"` : "Full search"}
          </button>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 hidden sm:block">
            ⌘K · esc to close
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- Subcomponents ---------- */

function Section({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="animate-fade-in">
      <div
        className={cn(
          "px-4 pb-1 pt-1 text-[10px] uppercase tracking-[0.22em]",
          accent ? "text-gold" : "text-muted-foreground/70",
        )}
      >
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function Row({
  icon,
  title,
  body,
  trailing,
  onClick,
  rowIndex,
  activeIndex,
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick: () => void;
  rowIndex?: number;
  activeIndex?: number;
}) {
  const isActive = rowIndex !== undefined && rowIndex === activeIndex;
  const ref = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (isActive) ref.current?.scrollIntoView({ block: "nearest" });
  }, [isActive]);
  return (
    <button
      ref={ref}
      id={rowIndex !== undefined ? `qsp-row-${rowIndex}` : undefined}
      role={rowIndex !== undefined ? "option" : undefined}
      aria-selected={rowIndex !== undefined ? isActive : undefined}
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 min-h-[56px]",
        "text-left rounded-xl mx-1",
        "hover:bg-gold/5 active:bg-gold/10 focus-visible:bg-gold/10",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/40",
        "transition-colors",
        isActive && "bg-gold/10 ring-1 ring-gold/40",
      )}
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-display text-foreground">{title}</div>
        {body && <div className="mt-0.5 text-sm text-foreground/85">{body}</div>}
      </div>
      {trailing && <span className="shrink-0 mt-0.5">{trailing}</span>}
    </button>
  );
}
