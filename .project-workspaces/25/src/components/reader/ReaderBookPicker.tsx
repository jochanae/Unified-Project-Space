import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { VERSION_LABELS, type Version } from "@/lib/scripture";

const AVAILABLE_VERSIONS: Version[] = ["KJV", "ASV"];

type Step = 0 | 1 | 2; // 0 = Books, 1 = Chapters, 2 = Verses

export default function ReaderBookPicker({
  books,
  currentBook,
  currentChapter,
  continueReference,
  version,
  onVersionChange,
  getVerseCount,
  onPick,
  onClose,
}: {
  books: { name: string; chapterCount: number }[];
  currentBook: number;
  currentChapter: number;
  continueReference: string;
  version: Version;
  onVersionChange: (version: Version) => void;
  getVerseCount?: (bookIndex: number, chapter: number) => number;
  onPick: (book: number, chapter: number, verse?: number) => void;
  onClose: () => void;
}) {
  const [stagedBook, setStagedBook] = useState(currentBook);
  const [stagedChapter, setStagedChapter] = useState<number | null>(null);
  const [step, setStep] = useState<Step>(0);
  const chapterCount = books[stagedBook].chapterCount;
  const otBooks = useMemo(() => books.slice(0, 39), [books]);
  const ntBooks = useMemo(() => books.slice(39), [books]);

  // Reset staged chapter when the staged book changes.
  useEffect(() => {
    setStagedChapter(null);
  }, [stagedBook]);

  const verseCount = stagedChapter && getVerseCount ? getVerseCount(stagedBook, stagedChapter) : 0;

  const handlePickBook = (idx: number) => {
    setStagedBook(idx);
    setStep(1);
  };

  const handlePickChapter = (c: number) => {
    if (getVerseCount) {
      setStagedChapter(c);
      setStep(2);
    } else {
      onPick(stagedBook, c);
    }
  };

  const stepLabel =
    step === 0
      ? "Select Book"
      : step === 1
        ? books[stagedBook].name
        : `${books[stagedBook].name} ${stagedChapter ?? ""}`.trim();

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()} shouldScaleBackground={false}>
      <DrawerContent className="flex h-[92svh] max-h-[92svh] flex-col overflow-hidden border-white/10 bg-[rgba(10,10,10,0.8)] px-0 pb-0 text-foreground backdrop-blur-2xl backdrop-saturate-150 shadow-[0_-24px_80px_rgba(0,0,0,0.58)]">
        <DrawerHeader className="shrink-0 border-b border-white/10 px-4 pb-3 pt-2 text-left sm:px-5 sm:pb-4 sm:pt-3">
          <div className="mb-2 flex items-center justify-center sm:mb-4">
            <span className="h-1.5 w-14 rounded-full bg-white/15" aria-hidden />
          </div>
          <button
            onClick={() => onPick(currentBook, currentChapter)}
            className="mb-3 w-full rounded-md border border-gold/25 bg-gold/10 px-3 py-2 text-left transition-colors hover:bg-gold/15 sm:mb-4 sm:px-4 sm:py-3"
          >
            <span className="block text-[10px] uppercase tracking-[0.24em] text-gold">
              Continue
            </span>
            <span className="mt-0.5 block font-display text-base text-gold-soft sm:mt-1 sm:text-lg">
              Continue reading {continueReference}
            </span>
          </button>

          {/* Mobile: dynamic step title + breadcrumb back. Desktop: static title. */}
          <div className="md:hidden">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
                disabled={step === 0}
                aria-label="Back one step"
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  step === 0
                    ? "opacity-30 pointer-events-none text-muted-foreground"
                    : "text-gold-soft hover:bg-gold/10 active:bg-gold/15",
                )}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1 text-center">
                <DrawerTitle className="font-display text-xl text-gold-soft">
                  {stepLabel}
                </DrawerTitle>
                <p className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-gold/70">
                  Step {step + 1} of {getVerseCount ? 3 : 2}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close passage picker"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground/50 hover:bg-gold/10 hover:text-gold-soft transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="hidden md:block">
            <DrawerTitle className="font-display text-xl text-gold-soft sm:text-2xl">
              Book · Chapter · Verse
            </DrawerTitle>
            <DrawerDescription className="mt-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground sm:text-xs sm:tracking-[0.24em]">
              Pick a book, then a chapter — then jump straight to a verse.
            </DrawerDescription>
          </div>

          <div
            role="radiogroup"
            aria-label="Bible version"
            className="relative mt-3 flex flex-wrap items-center gap-2 sm:mt-4"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 -m-3 sm:-m-6 md:-m-10 blur-[6px] sm:blur-[10px] md:blur-[14px]"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0) 70%)",
                zIndex: 0,
              }}
            />
            <span className="relative z-10 text-[10px] uppercase tracking-[0.24em] text-gold/70">
              Version
            </span>
            <div className="relative z-10 inline-flex rounded-md border border-gold/18 bg-background/30 p-0.5">
              {AVAILABLE_VERSIONS.map((v) => {
                const active = v === version;
                return (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onVersionChange(v)}
                    className={cn(
                      "rounded px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition-colors",
                      active
                        ? "bg-gold/20 text-gold-soft"
                        : "text-muted-foreground hover:text-gold-soft",
                    )}
                    title={VERSION_LABELS[v]}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>
        </DrawerHeader>

        {/* Mobile: step wizard slider (single panel visible at a time) */}
        <div className="min-h-0 flex-1 overflow-hidden md:hidden">
          <div
            className="flex h-full w-[300%] transition-transform duration-[400ms] ease-in-out motion-reduce:transition-none"
            style={{ transform: `translateX(-${step * (100 / 3)}%)` }}
          >
            {/* Books panel */}
            <div className="h-full w-1/3 overflow-y-auto px-4 py-4">
              <BookGroup
                label="Old Testament"
                books={otBooks}
                offset={0}
                stagedBook={stagedBook}
                onPick={handlePickBook}
              />
              <BookGroup
                label="New Testament"
                books={ntBooks}
                offset={39}
                stagedBook={stagedBook}
                onPick={handlePickBook}
              />
            </div>

            {/* Chapters panel */}
            <div className="h-full w-1/3 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4">
              <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-gold/70">Chapter</p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c, i) => {
                  const isCurrent = stagedBook === currentBook && c === currentChapter;
                  const isStaged = c === stagedChapter;
                  return (
                    <button
                      key={c}
                      onClick={() => handlePickChapter(c)}
                      style={{
                        animationDelay: step === 1 ? `${Math.min(i * 12, 240)}ms` : undefined,
                        animationFillMode: "both",
                      }}
                      className={cn(
                        "aspect-square rounded-md border text-sm transition-colors",
                        step === 1 && "animate-fade-in",
                        isStaged
                          ? "border-gold/70 bg-gold/25 text-gold-soft font-medium"
                          : isCurrent
                            ? "border-gold/55 bg-gold/15 text-gold-soft"
                            : "border-white/10 bg-white/[0.03] text-foreground hover:border-gold/35 hover:bg-gold/10 hover:text-gold-soft",
                      )}
                      title={`${books[stagedBook].name} ${c}`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
              {/* Resume shortcut: open the book at chapter 1 without picking a verse. */}
              <button
                type="button"
                onClick={() => onPick(stagedBook, 1)}
                className="mt-4 w-full rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold-soft transition-colors hover:bg-gold/20"
              >
                Start reading {books[stagedBook].name} 1
              </button>
            </div>

            {/* Verses panel */}
            <div className="h-full w-1/3 overflow-y-auto px-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-4">
              {!stagedChapter || !getVerseCount ? (
                <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Pick a chapter to choose a verse
                </div>
              ) : (
                <>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-gold/70">Verse</p>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {Array.from({ length: verseCount }, (_, i) => i + 1).map((v, i) => (
                      <button
                        key={v}
                        onClick={() => onPick(stagedBook, stagedChapter, v)}
                        style={{
                          animationDelay: step === 2 ? `${Math.min(i * 10, 240)}ms` : undefined,
                          animationFillMode: "both",
                        }}
                        className={cn(
                          "aspect-square rounded-md border border-white/10 bg-white/[0.03] text-sm text-foreground transition-colors hover:border-gold/45 hover:bg-gold/10 hover:text-gold-soft",
                          step === 2 && "animate-fade-in",
                        )}
                        title={`${books[stagedBook].name} ${stagedChapter}:${v}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPick(stagedBook, stagedChapter)}
                    className="mt-4 w-full rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold-soft transition-colors hover:bg-gold/20"
                  >
                    Start reading {books[stagedBook].name} {stagedChapter}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: original 3-column layout */}
        <div className="hidden min-h-0 flex-1 overflow-hidden md:grid md:grid-cols-[1fr_0.7fr_0.7fr]">
          <div className="min-h-0 overflow-y-auto border-r border-white/10 px-5 py-5">
            <BookGroup
              label="Old Testament"
              books={otBooks}
              offset={0}
              stagedBook={stagedBook}
              onPick={setStagedBook}
            />
            <BookGroup
              label="New Testament"
              books={ntBooks}
              offset={39}
              stagedBook={stagedBook}
              onPick={setStagedBook}
            />
          </div>
          <div className="min-h-0 overflow-y-auto border-r border-white/10 px-5 py-5">
            <p className="mb-4 font-display text-lg text-gold-soft">{books[stagedBook].name}</p>
            <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-gold/70">Chapter</p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: chapterCount }, (_, i) => i + 1).map((c) => {
                const isCurrent = stagedBook === currentBook && c === currentChapter;
                const isStaged = c === stagedChapter;
                return (
                  <button
                    key={c}
                    onClick={() => {
                      if (getVerseCount) {
                        setStagedChapter(c);
                      } else {
                        onPick(stagedBook, c);
                      }
                    }}
                    onDoubleClick={() => onPick(stagedBook, c)}
                    className={cn(
                      "aspect-square rounded-md border text-sm transition-colors",
                      isStaged
                        ? "border-gold/70 bg-gold/25 text-gold-soft font-medium"
                        : isCurrent
                          ? "border-gold/55 bg-gold/15 text-gold-soft"
                          : "border-white/10 bg-white/[0.03] text-foreground hover:border-gold/35 hover:bg-gold/10 hover:text-gold-soft",
                    )}
                    title={`${books[stagedBook].name} ${c}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
            {getVerseCount && (
              <button
                type="button"
                onClick={() => stagedChapter && onPick(stagedBook, stagedChapter)}
                disabled={!stagedChapter}
                className="mt-4 w-full rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold-soft transition-colors hover:bg-gold/20 disabled:opacity-40"
              >
                {stagedChapter
                  ? `Open ${books[stagedBook].name} ${stagedChapter}`
                  : "Pick a chapter to continue"}
              </button>
            )}
          </div>
          <div className="min-h-0 overflow-y-auto px-5 py-5">
            {!stagedChapter || !getVerseCount ? (
              <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Pick a chapter to choose a verse
              </div>
            ) : (
              <>
                <p className="mb-4 font-display text-lg text-gold-soft">
                  {books[stagedBook].name} {stagedChapter}
                </p>
                <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-gold/70">Verse</p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: verseCount }, (_, i) => i + 1).map((v) => (
                    <button
                      key={v}
                      onClick={() => onPick(stagedBook, stagedChapter, v)}
                      className="aspect-square rounded-md border border-white/10 bg-white/[0.03] text-sm text-foreground transition-colors hover:border-gold/45 hover:bg-gold/10 hover:text-gold-soft"
                      title={`${books[stagedBook].name} ${stagedChapter}:${v}`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function BookGroup({
  label,
  books,
  offset,
  stagedBook,
  onPick,
}: {
  label: string;
  books: { name: string }[];
  offset: number;
  stagedBook: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="relative mb-4 last:mb-0">
      <span
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 h-10 -mx-2 sm:-mx-4 md:-mx-6 blur-[6px] sm:blur-[10px] md:blur-[14px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(212,175,55,0.15) 0%, rgba(212,175,55,0) 70%)",
          zIndex: 0,
        }}
      />
      <p className="relative z-10 mb-3 px-1 font-display text-base text-gold-soft">{label}</p>
      <div className="relative z-10 grid grid-cols-2 gap-1">
        {books.map((book, i) => {
          const idx = offset + i;
          const active = idx === stagedBook;
          return (
            <button
              key={book.name}
              onClick={() => onPick(idx)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors",
                active
                  ? "border-gold/45 bg-gold/12 text-gold-soft"
                  : "border-transparent text-foreground/85 hover:border-white/10 hover:bg-white/[0.03] hover:text-gold-soft",
              )}
            >
              <span className="mr-2 text-[10px] uppercase tracking-[0.24em] text-gold/70">
                {book.name.slice(0, 1)}
              </span>
              {book.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
