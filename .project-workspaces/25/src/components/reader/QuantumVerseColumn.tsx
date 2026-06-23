import { useRef, type ReactNode } from "react";
import { Bookmark, FolderHeart, Sparkles } from "lucide-react";
import { useTextScale } from "@/hooks/useTextScale";
import type { Version } from "@/lib/scripture";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 10;

/** Wrap occurrences of `term` (case-insensitive, whole-text) in a glowing <mark>. */
function renderWithTerm(text: string, term?: string | null): ReactNode {
  const t = (term ?? "").trim();
  if (!t) return text;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(re);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="rounded-sm bg-gold/25 px-0.5 not-italic text-gold-soft shadow-[0_0_12px_rgba(201,168,76,0.35)]"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function QuantumVerseColumn({
  version,
  verses,
  bookmarkedSet,
  vaultedVerses,
  highlightedVerses,
  selectedVerse,
  selectedRange,
  rangeAnchor,
  currentlyReading,
  onActivateVerse,
  onOpenVerseMenu,
  onLongPressOpenVault,
  onShiftExtend,
  pulsingVerse,
  vaultPulseVerse,
  prefetchedVerses,
  bufferingVerses,
  highlightTerm,
  onHoverBookmark,
  onHoverDeepDive,
}: {
  version: Version;
  verses: string[];
  bookmarkedSet: Set<string>;
  vaultedVerses?: Set<number>;
  highlightedVerses: Set<number>;
  selectedVerse: number | null;
  selectedRange: { start: number; end: number } | null;
  rangeAnchor?: number | null;
  currentlyReading?: number | null;
  onActivateVerse: (verse: number) => void;
  onOpenVerseMenu: (verse: number) => void;
  onLongPressOpenVault: (verse: number) => void;
  /** Desktop shift+click: extend from current selection's start to `verse`. */
  onShiftExtend?: (verse: number) => void;
  pulsingVerse?: number | null;
  vaultPulseVerse?: number | null;
  prefetchedVerses?: Set<number>;
  bufferingVerses?: Set<number>;
  highlightTerm?: string | null;
  onHoverBookmark?: (verse: number) => void;
  onHoverDeepDive?: (verse: number) => void;
}) {
  // ── Gesture model (pruned) ──────────────────────────────────────────────
  // One gesture, one intent. We listen for:
  //   • tap         → onActivateVerse (instant; no double-tap delay)
  //   • long-press  → onLongPressOpenVault (Vault picker)
  //   • shift+click → onShiftExtend (desktop range)
  //   • contextmenu → onOpenVerseMenu (right-click / two-finger)
  // Drag-to-select and double-tap-Immersive are intentionally removed —
  // range building lives in the menu's "Extend" / +/− controls instead.
  const longPressTimerRef = useRef<number | null>(null);
  const pressStartRef = useRef<{ x: number; y: number; verse: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const { style: textStyle } = useTextScale();

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const resetGesture = () => {
    clearLongPress();
    pressStartRef.current = null;
  };

  return (
    <section data-reader-zone>
      <div
        className="font-display text-foreground/90"
        style={{
          fontSize: textStyle.fontSize,
          lineHeight: textStyle.lineHeight,
          letterSpacing: textStyle.letterSpacing,
        }}
      >
        {verses.map((text, i) => {
          const verse = i + 1;
          const isSelected = selectedVerse === verse;
          const isInRange = selectedRange
            ? verse >= selectedRange.start && verse <= selectedRange.end
            : false;
          const isBookmarked = bookmarkedSet.has(`${version}:${verse}`);
          const isInVault = vaultedVerses?.has(verse) ?? false;
          const isReading = currentlyReading === verse;
          const isHighlighted = highlightedVerses.has(verse);
          const isPrefetched = prefetchedVerses?.has(verse) ?? false;
          const isBuffering = bufferingVerses?.has(verse) ?? false;
          const extendMode = rangeAnchor != null;
          const isAnchorVerse = extendMode && rangeAnchor === verse;

          return (
            <div key={verse} className="group relative">
              <button
                type="button"
                data-reader-verse={verse}
                data-reader-version={version}
                aria-label={`${version} verse ${verse}`}
                aria-pressed={isSelected}
                onPointerDown={(event) => {
                  if (!event.isPrimary) return;
                  longPressTriggeredRef.current = false;
                  clearLongPress();
                  pressStartRef.current = { x: event.clientX, y: event.clientY, verse };
                  longPressTimerRef.current = window.setTimeout(() => {
                    longPressTriggeredRef.current = true;
                    onLongPressOpenVault(verse);
                  }, LONG_PRESS_MS);
                }}
                onPointerMove={(event) => {
                  const start = pressStartRef.current;
                  if (!start) return;
                  // Cancel long-press once the finger really moves (i.e. user is scrolling).
                  if (
                    Math.abs(event.clientX - start.x) > MOVE_CANCEL_PX ||
                    Math.abs(event.clientY - start.y) > MOVE_CANCEL_PX
                  ) {
                    clearLongPress();
                  }
                }}
                onPointerUp={resetGesture}
                onPointerCancel={resetGesture}
                onContextMenu={(event) => {
                  event.preventDefault();
                  resetGesture();
                  onOpenVerseMenu(verse);
                }}
                onClick={(event) => {
                  if (longPressTriggeredRef.current) {
                    longPressTriggeredRef.current = false;
                    return;
                  }
                  // Desktop shift+click → extend range from current selection.
                  if (event.shiftKey && onShiftExtend) {
                    event.preventDefault();
                    onShiftExtend(verse);
                    return;
                  }
                  onActivateVerse(verse);
                }}
                className={cn(
                  "relative mb-2 block w-full rounded-md px-3 py-3 text-left transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring motion-reduce:transition-none touch-manipulation select-none",
                  pulsingVerse === verse && "verse-bookmark-pulse",
                  vaultPulseVerse === verse && "verse-vault-bloom",
                  isReading &&
                    "border border-gold/35 bg-gold/10 text-gold-soft shadow-[0_0_22px_rgba(201,168,76,0.14)]",
                  isHighlighted && "bg-gold/12",
                  isInRange && "bg-gold/10",
                  isSelected && "quantum-verse-glow bg-gold/16",
                  isAnchorVerse &&
                    "ring-1 ring-gold/60 bg-gold/14 shadow-[0_0_22px_rgba(201,168,76,0.22)]",
                  extendMode &&
                    !isAnchorVerse &&
                    "cursor-crosshair hover:bg-gold/10 hover:ring-1 hover:ring-gold/30",
                  !isReading &&
                    !isSelected &&
                    !extendMode &&
                    "hover:bg-white/[0.03] active:bg-gold/8",
                )}
                style={{ touchAction: "pan-y" }}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute left-0 top-1/2 h-7 w-3 -translate-x-[0.65rem] -translate-y-1/2 rounded-r-sm border border-gold/20 bg-gold/14 opacity-0 shadow-[0_0_18px_rgba(201,168,76,0.14)] transition-all duration-200",
                    isBookmarked && "opacity-100",
                    pulsingVerse === verse && "scale-105 border-gold/45 bg-gold/24",
                  )}
                >
                  <span className="absolute inset-x-0 top-0 h-[78%] rounded-r-sm bg-gold/60" />
                  <span className="absolute bottom-[-1px] left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-b border-r border-gold/35 bg-gold/60" />
                </span>
                <span
                  style={{
                    fontSize: "0.62em",
                    textShadow: "0 0 8px color-mix(in oklab, var(--gold-amber) 28%, transparent)",
                  }}
                  className={cn(
                    "mr-3 inline-flex min-w-[2ch] items-center gap-1 align-baseline font-sans font-medium tracking-[0.16em] tabular-nums text-[var(--gold-amber)] transition-colors",
                  )}
                >
                  {verse}
                  {isInVault && (
                    <FolderHeart
                      aria-label="In Vault"
                      className="h-2.5 w-2.5 text-gold/80 drop-shadow-[0_0_4px_rgba(201,168,76,0.55)]"
                    />
                  )}
                </span>
                <span className="mr-2 inline-flex min-w-4 align-top">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 rounded-full bg-gold/25 transition-all duration-200",
                      isPrefetched && "bg-gold/70 shadow-[0_0_10px_rgba(201,168,76,0.25)]",
                      isBuffering && "animate-pulse bg-gold/45",
                    )}
                  />
                </span>
                <span className="inline text-balance">{renderWithTerm(text, highlightTerm)}</span>
              </button>
              {(onHoverBookmark || onHoverDeepDive) && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-gold/20 bg-obsidian/85 px-1.5 py-1 opacity-0 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100 lg:flex motion-reduce:transition-none"
                >
                  {onHoverBookmark && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHoverBookmark(verse);
                      }}
                      aria-label={`Save verse ${verse} to Vault`}
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-gold-soft transition-colors hover:bg-gold/15 hover:text-gold",
                        isInVault && "text-gold",
                      )}
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {onHoverDeepDive && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onHoverDeepDive(verse);
                      }}
                      aria-label={`Deep Dive on verse ${verse}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full text-gold-soft transition-colors hover:bg-gold/15 hover:text-gold"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
