/**
 * DailyWordSheet
 *
 * Three zones:
 *   Zone 1 — Today's Word: verse of the day + refresh
 *   Zone 2 — What's on your heart: feeling → scripture map (zero AI)
 *   Zone 3 — Reflect with Selah: one Haiku call, daily-limited
 *
 * Actions: Copy · Share · Save · Open in Reader
 * History: last 7 verses, account required, stored in localStorage
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useSelah } from "@/hooks/useSelah";
import { supabase } from "@/integrations/supabase/client";
import { CURATED_VERSES, getVerseOfTheDay } from "@/lib/verseOfTheDay";
import { useVersionedVerse } from "@/hooks/useVersionedVerse";
import {
  matchFeelingToVerses,
  getAllMatchingVerses,
  getVersesByCategory,
  type FeelingVerse,
} from "@/lib/feelingVerses";

/* ─── Storage ─────────────────────────────────────────────────────────────── */
const HISTORY_KEY = "sanctumiq:dailyword:history";

type HistoryEntry = {
  ref: string;
  text: string;
  date: string;
  bookIndex?: number;
  chapter?: number;
  verse?: number;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function pushToHistory(entry: {
  ref: string;
  text: string;
  bookIndex?: number;
  chapter?: number;
  verse?: number;
}) {
  try {
    const today = todayString();
    const prev = loadHistory().filter((h) => h.date !== today);
    const next = [{ ...entry, date: today }, ...prev].slice(0, 7);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* noop */
  }
}

/* ─── Types ───────────────────────────────────────────────────────────────── */
type ActiveVerse = {
  ref: string;
  text: string;
  bookIndex?: number;
  chapter?: number;
  verse?: number;
};

type Props = {
  onClose: () => void;
  onNavigateToVerse: (bookIndex: number, chapter: number, verse?: number) => void;
};

/* ─── Component ───────────────────────────────────────────────────────────── */
export function DailyWordSheet({ onClose, onNavigateToVerse }: Props) {
  const { user } = useAuth();
  const {
    reflect,
    reflection,
    status: selahStatus,
    reset: resetSelah,
    usageToday,
    dailyLimit,
  } = useSelah();

  // ── Verse state ────────────────────────────────────────────────────────────
  const todayVerse = getVerseOfTheDay();
  const [activeVerse, setActiveVerse] = useState<ActiveVerse>({
    ref: todayVerse.ref,
    text: todayVerse.text,
  });

  // Resolve active verse text in the user's preferred version
  const { text: versionedText, version: activeVersion } = useVersionedVerse(
    activeVerse.ref,
    activeVerse.text,
  );
  // Use versioned text for display and Selah — fall back to stored text while loading
  const displayText = versionedText;
  const [curatedIndex, setCuratedIndex] = useState(() =>
    CURATED_VERSES.findIndex((v) => v.ref === todayVerse.ref),
  );

  // ── Feeling state ──────────────────────────────────────────────────────────
  const [feeling, setFeeling] = useState("");
  const [feelingVerses, setFeelingVerses] = useState<FeelingVerse[]>([]);
  const [feelingIndex, setFeelingIndex] = useState(0);
  const feelingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [selahOpen, setSelahOpen] = useState(false);

  // ── Computed ───────────────────────────────────────────────────────────────
  const selahRemaining = dailyLimit === Infinity ? null : Math.max(0, dailyLimit - usageToday);
  const isFromFeeling = feelingVerses.length > 0;

  // ── On mount: push today's verse to history ────────────────────────────────
  useEffect(() => {
    pushToHistory({ ref: todayVerse.ref, text: todayVerse.text });
    setHistory(loadHistory());
  }, []);

  // ── Feeling input handler ──────────────────────────────────────────────────
  const handleFeelingChange = useCallback(
    (val: string) => {
      setFeeling(val);
      if (feelingTimer.current) clearTimeout(feelingTimer.current);

      if (!val.trim()) {
        setFeelingVerses([]);
        setFeelingIndex(0);
        const v = CURATED_VERSES[curatedIndex] ?? todayVerse;
        setActiveVerse({ ref: v.ref, text: v.text });
        resetSelah();
        setSelahOpen(false);
        setSaved(false);
        return;
      }

      feelingTimer.current = setTimeout(async () => {
        // First try keyword match (instant, free)
        const matches = getAllMatchingVerses(val);
        if (matches.length > 0) {
          setFeelingVerses(matches);
          setFeelingIndex(0);
          const first = matches[0];
          setActiveVerse({
            ref: first.ref,
            text: first.text,
            bookIndex: first.bookIndex,
            chapter: first.chapter,
            verse: first.verse,
          });
          resetSelah();
          setSelahOpen(false);
          setSaved(false);
          pushToHistory({
            ref: first.ref,
            text: first.text,
            bookIndex: first.bookIndex,
            chapter: first.chapter,
            verse: first.verse,
          });
          setHistory(loadHistory());
          return;
        }

        // No keyword match — use AI classifier (~$0.000015 per call)
        try {
          const { data, error } = await supabase.functions.invoke("daily-word-match", {
            body: { input: val.trim() },
          });
          if (!error && data?.category) {
            const aiMatches = getVersesByCategory(data.category);
            if (aiMatches && aiMatches.length > 0) {
              setFeelingVerses(aiMatches);
              setFeelingIndex(0);
              const first = aiMatches[0];
              setActiveVerse({
                ref: first.ref,
                text: first.text,
                bookIndex: first.bookIndex,
                chapter: first.chapter,
                verse: first.verse,
              });
              resetSelah();
              setSelahOpen(false);
              setSaved(false);
              pushToHistory({
                ref: first.ref,
                text: first.text,
                bookIndex: first.bookIndex,
                chapter: first.chapter,
                verse: first.verse,
              });
              setHistory(loadHistory());
              return;
            }
          }
        } catch {
          /* AI unavailable — fall through to current verse */
        }

        // Graceful fallback — keep showing today's verse
        setFeelingVerses([]);
      }, 400);
    },
    [curatedIndex, todayVerse, resetSelah],
  );

  // ── Cycle feeling verses ───────────────────────────────────────────────────
  const goFeelingPrev = () => {
    const i = (feelingIndex - 1 + feelingVerses.length) % feelingVerses.length;
    setFeelingIndex(i);
    const v = feelingVerses[i];
    setActiveVerse({
      ref: v.ref,
      text: v.text,
      bookIndex: v.bookIndex,
      chapter: v.chapter,
      verse: v.verse,
    });
    resetSelah();
    setSelahOpen(false);
    setSaved(false);
  };
  const goFeelingNext = () => {
    const i = (feelingIndex + 1) % feelingVerses.length;
    setFeelingIndex(i);
    const v = feelingVerses[i];
    setActiveVerse({
      ref: v.ref,
      text: v.text,
      bookIndex: v.bookIndex,
      chapter: v.chapter,
      verse: v.verse,
    });
    resetSelah();
    setSelahOpen(false);
    setSaved(false);
  };

  // ── Refresh (cycle curated pool) ───────────────────────────────────────────
  const handleRefresh = () => {
    if (isFromFeeling) {
      goFeelingNext();
      return;
    }
    const next = (curatedIndex + 1) % CURATED_VERSES.length;
    setCuratedIndex(next);
    const v = CURATED_VERSES[next];
    setActiveVerse({ ref: v.ref, text: v.text });
    resetSelah();
    setSelahOpen(false);
    setSaved(false);
    pushToHistory({ ref: v.ref, text: v.text });
    setHistory(loadHistory());
  };

  // ── Copy ───────────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    const text = `${activeVerse.ref} — "${displayText}" (${activeVersion})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  // ── Share ──────────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const text = `${activeVerse.ref}\n\n"${displayText}"\n\n— ${activeVersion} via SanctumIQ`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* cancelled */
      }
    } else {
      await handleCopy();
    }
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) {
      toast("Sign in to save verses to your library.", {
        action: {
          label: "Sign In",
          onClick: () => {
            onClose();
            window.location.href = "/auth";
          },
        },
      });
      return;
    }
    try {
      const bookName = activeVerse.ref.split(" ").slice(0, -1).join(" ") || activeVerse.ref;
      await supabase.from("bookmarks").upsert({
        user_id: user.id,
        book: bookName,
        chapter: activeVerse.chapter ?? 1,
        verse: activeVerse.verse ?? 1,
        version: activeVersion,
      });
      setSaved(true);
      toast.success("Saved to your library");
    } catch {
      toast.error("Could not save");
    }
  };

  // ── Open in reader ─────────────────────────────────────────────────────────
  const handleOpen = () => {
    if (activeVerse.bookIndex !== undefined && activeVerse.chapter) {
      onNavigateToVerse(activeVerse.bookIndex, activeVerse.chapter, activeVerse.verse);
      onClose();
    } else {
      toast("Open the reader and search for this passage.");
      onClose();
    }
  };

  // ── Selah ──────────────────────────────────────────────────────────────────
  const handleSelah = () => {
    if (selahStatus === "idle") {
      setSelahOpen(true);
      void reflect(displayText, activeVerse.ref, "open");
    } else {
      setSelahOpen((v) => !v);
    }
  };

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-2xl border border-gold/18 bg-[rgba(10,10,10,0.97)] backdrop-blur-2xl shadow-[0_-8px_64px_rgba(0,0,0,0.65)]"
        style={{
          maxHeight: "88svh",
          overflowY: "auto",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-gold/20" />

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">Daily Word</p>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className={cn(
                  "text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full border transition-colors",
                  showHistory
                    ? "border-gold/35 bg-gold/12 text-gold-soft"
                    : "border-gold/15 text-muted-foreground/60 hover:text-gold-soft",
                )}
              >
                This Week
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground/50 hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── History panel ─────────────────────────────────────────────── */}
        {showHistory && (
          <div className="px-5 pb-5 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/50 mb-3">Last 7 Days</p>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground/40 italic text-center py-6">
                Nothing yet. Come back tomorrow.
              </p>
            ) : (
              history.map((h, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActiveVerse({
                      ref: h.ref,
                      text: h.text,
                      bookIndex: h.bookIndex,
                      chapter: h.chapter,
                      verse: h.verse,
                    });
                    setFeeling("");
                    setFeelingVerses([]);
                    setShowHistory(false);
                    resetSelah();
                    setSelahOpen(false);
                    setSaved(false);
                  }}
                  className="w-full text-left hairline rounded-xl bg-white/[0.03] hover:bg-gold/6 px-4 py-3 transition-colors"
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] text-gold/55 mb-1">
                    {h.ref} · {h.date}
                  </p>
                  <p className="font-display italic text-sm text-foreground/80 line-clamp-2">
                    {h.text}
                  </p>
                </button>
              ))
            )}
          </div>
        )}

        {!showHistory && (
          <div className="px-5 space-y-5 pb-2">
            {/* ── Zone 1: Today's Word ──────────────────────────────────── */}
            <div className="relative hairline rounded-2xl bg-white/[0.03] p-5">
              {/* Refresh */}
              <button
                type="button"
                onClick={handleRefresh}
                aria-label="Get a different verse"
                className="absolute top-3 right-3 p-1.5 text-muted-foreground/30 hover:text-gold-soft transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>

              {/* Reference */}
              <p className="text-[10px] uppercase tracking-[0.26em] text-gold/60 mb-3">
                {activeVerse.ref} · {activeVersion}
                {isFromFeeling && feelingVerses.length > 1 && (
                  <span className="ml-2 text-muted-foreground/40">
                    ({feelingIndex + 1}/{feelingVerses.length})
                  </span>
                )}
              </p>

              {/* Verse text */}
              <p
                className="font-display italic leading-relaxed text-foreground/90"
                style={{ fontSize: "clamp(1rem, 4vw, 1.2rem)", lineHeight: "1.75" }}
              >
                &ldquo;{displayText}&rdquo;
              </p>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gold/10">
                <div className="flex items-center gap-0.5">
                  <IconBtn onClick={handleCopy} label="Copy">
                    {copied ? (
                      <Check className="h-4 w-4 text-gold" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </IconBtn>
                  <IconBtn onClick={handleShare} label="Share">
                    <Share2 className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn onClick={handleSave} label="Save to library">
                    {saved ? (
                      <BookmarkCheck className="h-4 w-4 text-gold" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </IconBtn>
                </div>
                <button
                  type="button"
                  onClick={handleOpen}
                  className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-gold/55 hover:text-gold-soft transition-colors"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Open in reader
                </button>
              </div>
            </div>

            {/* ── Zone 2: What's on your heart ─────────────────────────── */}
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-gold/50 mb-2">
                What&apos;s on your heart?
              </p>
              <div className="relative">
                <input
                  type="text"
                  value={feeling}
                  onChange={(e) => handleFeelingChange(e.target.value)}
                  placeholder="A word, a feeling, a situation…"
                  className="w-full hairline rounded-xl bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/35 outline-none focus:border-gold/35 transition-colors"
                  autoCorrect="off"
                  autoComplete="off"
                  aria-label="A word, a feeling, a situation…"
                />
                {feeling && (
                  <button
                    type="button"
                    onClick={() => handleFeelingChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/35 hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Cycle arrows when multiple feeling matches */}
              {isFromFeeling && feelingVerses.length > 1 && (
                <div className="flex items-center justify-end gap-1 mt-2">
                  <button
                    type="button"
                    onClick={goFeelingPrev}
                    className="p-1 text-muted-foreground/40 hover:text-gold-soft transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] text-muted-foreground/35">
                    {feelingIndex + 1} / {feelingVerses.length}
                  </span>
                  <button
                    type="button"
                    onClick={goFeelingNext}
                    className="p-1 text-muted-foreground/40 hover:text-gold-soft transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* No match hint — shown only if AI also found nothing */}
              {feeling.trim().length >= 3 && feelingVerses.length === 0 && (
                <p className="text-[11px] text-muted-foreground/40 mt-2 px-1 leading-relaxed">
                  Today&apos;s verse is above. Tap &ldquo;Reflect with Selah&rdquo; to bring exactly
                  what you typed into your reflection.
                </p>
              )}
            </div>

            {/* ── Zone 3: Reflect with Selah ────────────────────────────── */}
            <div className="pb-1">
              <button
                type="button"
                onClick={handleSelah}
                disabled={selahStatus === "loading"}
                className={cn(
                  "w-full flex items-center justify-between hairline rounded-xl px-4 py-3.5 transition-colors",
                  selahOpen ? "border-gold/30 bg-gold/10" : "bg-white/[0.03] hover:bg-gold/5",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles
                    className={cn("h-4 w-4", selahOpen ? "text-gold" : "text-gold/50")}
                    strokeWidth={1.5}
                  />
                  <span
                    className={cn(
                      "text-sm",
                      selahOpen ? "text-gold-soft" : "text-muted-foreground/70",
                    )}
                  >
                    Reflect with Selah
                  </span>
                </div>
                {selahRemaining !== null && (
                  <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/35">
                    {selahRemaining} left today
                  </span>
                )}
              </button>

              {/* Selah response */}
              {selahOpen && (
                <div className="mt-2 hairline rounded-xl bg-white/[0.03] px-4 py-4">
                  {selahStatus === "loading" && (
                    <div className="flex gap-1.5 py-2">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-gold/40"
                          style={{
                            animation: "pulse 1.4s ease-in-out infinite",
                            animationDelay: `${i * 0.18}s`,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {selahStatus === "done" && reflection && (
                    <>
                      <blockquote
                        className="font-display italic text-base leading-relaxed text-foreground/88"
                        style={{ lineHeight: "1.7" }}
                      >
                        {reflection}
                      </blockquote>
                      <button
                        type="button"
                        onClick={() => {
                          resetSelah();
                          void reflect(displayText, activeVerse.ref, "open");
                        }}
                        className="mt-3 text-xs text-muted-foreground/35 hover:text-gold-soft transition-colors"
                      >
                        ↺ Reflect again
                      </button>
                    </>
                  )}
                  {selahStatus === "error" && (
                    <p className="text-sm italic text-muted-foreground/50">
                      Reflection unavailable right now.
                    </p>
                  )}
                  {selahStatus === "limit_reached" && (
                    <p className="text-sm text-foreground/75">
                      You&apos;ve reached today&apos;s reflections.{" "}
                      <a
                        href="/pricing"
                        onClick={onClose}
                        className="text-gold/75 underline underline-offset-2"
                      >
                        Upgrade for unlimited.
                      </a>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({
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
      type="button"
      onClick={onClick}
      aria-label={label}
      className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground/45 hover:text-gold-soft hover:bg-gold/8 transition-colors"
    >
      {children}
    </button>
  );
}
