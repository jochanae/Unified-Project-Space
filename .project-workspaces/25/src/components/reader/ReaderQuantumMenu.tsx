import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookMarked,
  Check,
  Feather,
  Highlighter,
  History,
  Library,
  Link2,
  Maximize2,
  Minus,
  PenLine,
  Plus,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useSelah } from "@/hooks/useSelah";
import { useGoogleTtsAudio } from "@/hooks/useGoogleTtsAudio";
import { useReaderVoiceEngine } from "@/hooks/useReaderVoiceEngine";
import { cn } from "@/lib/utils";
import { buildDeepDiveLinks, buildDeepDivePrompt, type DeepDiveContext } from "@/lib/deepDive";
import { openDeepDiveLink } from "@/lib/openDeepDiveLink";
import { DeepDiveCustomInquiry } from "@/components/reader/DeepDiveCustomInquiry";
import { DeepDiveVersionChips } from "@/components/reader/DeepDiveVersionChips";

const SELAH_LOADING_PHRASES = [
  "Sitting with this passage…",
  "Listening for the deeper thread…",
  "Tracing the weight of these verses…",
];

export default function ReaderQuantumMenu({
  reference,
  verseText,
  passageContext,
  verseCount,
  isHighlighted,
  isBookmarked,
  focusMode = false,
  onHighlight,
  onBookmark,
  onClose,
  serviceModeActive,
  onAddToServiceNote,
  onAddToVault,
  onDraftSermon,
  onCreatePoem,
  onToggleImmersive,
  immersiveActive = false,
  extendActive = false,
  onExtendRange,
  onRangeAdjust,
  resumeLastRangeLabel,
  onResumeLastRange,
  onCopyLink,
}: {
  reference: string;
  verseText: string;
  passageContext: DeepDiveContext;
  verseCount: number;
  isHighlighted: boolean;
  isBookmarked: boolean;
  focusMode?: boolean;
  onHighlight: () => void;
  onBookmark: () => void;
  onClose: () => void;
  serviceModeActive?: boolean;
  onAddToServiceNote?: (verseText: string, reference: string) => void;
  onAddToVault?: () => void;
  onDraftSermon?: () => void;
  /** Carry the current selection into PoemEditor as a scripture chip. */
  onCreatePoem?: () => void;
  /** Toggle Immersive reading mode. Replaces the old double-tap gesture. */
  onToggleImmersive?: () => void;
  immersiveActive?: boolean;
  extendActive?: boolean;
  onExtendRange?: () => void;
  /**
   * Adjusts the range end by +1 or -1 verse without closing the menu.
   * When provided, +/− buttons appear in the header instead of the tap-to-extend flow.
   */
  onRangeAdjust?: (delta: 1 | -1) => void;
  resumeLastRangeLabel?: string | null;
  onResumeLastRange?: () => void;
  /** Copy a deep-link to the current verse/range to clipboard. */
  onCopyLink?: () => void;
}) {
  const { reflect, reflection, status: selahStatus, reset: resetSelah } = useSelah();
  const readerVoiceEngine = useReaderVoiceEngine();
  const {
    playText,
    stop: stopVoice,
    status: voiceStatus,
    voiceLabel,
    availability,
    errorMessage,
  } = useGoogleTtsAudio({
    engine: readerVoiceEngine,
  });
  const [phraseIdx] = useState(() => Math.floor(Math.random() * SELAH_LOADING_PHRASES.length));
  const deepDiveLinks = useMemo(
    () => buildDeepDiveLinks(buildDeepDivePrompt(reference, verseText, passageContext)),
    [reference, verseText, passageContext],
  );

  useEffect(() => {
    if (selahStatus !== "done") {
      stopVoice();
    }
  }, [selahStatus, stopVoice]);

  const playReflection = () => {
    if (!reflection) return;
    void playText(reflection, {
      speakingRate: readerVoiceEngine === "system-native" ? 0.85 : focusMode ? 0.9 : 0.95,
      pitch: readerVoiceEngine === "system-native" ? 1.0 : -1.0,
    });
  };

  const handleClose = () => {
    stopVoice();
    resetSelah();
    onClose();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      // Keyboard shortcuts for range adjustment when +/- controls are active
      if (onRangeAdjust && selahStatus === "idle") {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          onRangeAdjust(1);
        }
        if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          onRangeAdjust(-1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRangeAdjust, selahStatus]);

  const dragStartYRef = useRef<number | null>(null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Verse actions for ${reference}`}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 backdrop-blur-sm md:items-center"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-h-[88svh] flex-col overflow-hidden rounded-2xl border border-gold/18 bg-popover/95 pt-2 text-popover-foreground shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl backdrop-saturate-150 md:m-4 md:max-h-[85vh] md:max-w-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Swipe-down handle (mobile) */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Swipe down or press Enter to close"
          className="mx-auto mt-2 mb-1 h-1.5 w-12 shrink-0 rounded-full bg-gold/30 md:hidden"
          onPointerDown={(e) => {
            dragStartYRef.current = e.clientY;
          }}
          onPointerMove={(e) => {
            if (dragStartYRef.current === null) return;
            if (e.clientY - dragStartYRef.current > 56) {
              dragStartYRef.current = null;
              handleClose();
            }
          }}
          onPointerUp={() => {
            dragStartYRef.current = null;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") handleClose();
          }}
        />

        {/* Sticky header */}
        <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-gold/12 bg-popover/95 px-5 py-3 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg text-gold-soft">{reference}</p>

            {/* Range controls: +/− buttons when wired, status text otherwise */}
            <div className="mt-0.5 flex items-center gap-2">
              {onRangeAdjust ? (
                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onRangeAdjust(-1)}
                    aria-label="Remove last verse from selection"
                    title="Shrink selection (−)"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gold/30 text-gold-soft transition-colors hover:border-gold/55 hover:bg-gold/10 active:scale-95"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground min-w-[5rem] text-center">
                    {extendActive
                      ? "tap a verse"
                      : verseCount === 1
                        ? "1 verse"
                        : `${verseCount} verses`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRangeAdjust(1)}
                    aria-label="Add next verse to selection"
                    title="Extend selection (+)"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gold/30 text-gold-soft transition-colors hover:border-gold/55 hover:bg-gold/10 active:scale-95"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                  {extendActive
                    ? "Tap another verse to complete the range"
                    : verseCount === 1
                      ? "Single verse"
                      : `${verseCount} verses selected`}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {/* Extend button — kept only when +/- aren't provided */}
            {onExtendRange && !onRangeAdjust && (
              <button
                type="button"
                onClick={onExtendRange}
                aria-pressed={extendActive}
                aria-label={verseCount > 1 ? "Adjust range" : "Extend selection"}
                title={verseCount > 1 ? "Adjust range" : "Extend selection"}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.18em] transition-colors",
                  extendActive
                    ? "border-gold/60 bg-gold/15 text-gold-soft shadow-[0_0_14px_rgba(201,168,76,0.25)]"
                    : "border-gold/25 text-muted-foreground hover:border-gold/45 hover:bg-gold/10 hover:text-gold-soft",
                )}
              >
                <Maximize2 className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {extendActive ? "Pick verse" : verseCount > 1 ? "Adjust" : "Extend"}
                </span>
              </button>
            )}
            <button
              onClick={handleClose}
              aria-label="Close"
              className="-mr-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.25rem)" }}
        >
          <blockquote className="mb-5 border-l-2 border-gold/40 pl-3 font-display text-base leading-relaxed text-foreground/85">
            {verseText}
          </blockquote>

          {selahStatus === "idle" && (
            <div className="space-y-3">
              {resumeLastRangeLabel && onResumeLastRange && (
                <button
                  type="button"
                  onClick={onResumeLastRange}
                  className="flex w-full items-center justify-between gap-3 rounded-md border border-gold/25 bg-gold/8 px-3 py-2 text-left text-xs text-gold-soft transition-colors hover:border-gold/45 hover:bg-gold/14"
                >
                  <span className="flex items-center gap-2">
                    <History className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Resume last selection
                  </span>
                  <span className="font-display text-[11px] tracking-wide text-muted-foreground">
                    {resumeLastRangeLabel}
                  </span>
                </button>
              )}
              <div className="grid grid-cols-3 gap-2">
                <QuantumAction
                  icon={<Highlighter className={cn("h-4 w-4", isHighlighted && "text-gold")} />}
                  label={isHighlighted ? "Highlighted" : "Highlight"}
                  onClick={onHighlight}
                />
                <QuantumAction
                  icon={
                    <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-gold text-gold")} />
                  }
                  label={isBookmarked ? "Saved" : "Bookmark"}
                  onClick={onBookmark}
                />
                <QuantumAction
                  icon={<Sparkles className="h-4 w-4" />}
                  label="Ask Selah"
                  onClick={() => reflect(verseText, reference)}
                  primary
                />
              </div>

              {onAddToVault && (
                <button
                  onClick={onAddToVault}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-gold/25 bg-gold/8 hover:bg-gold/15 px-4 py-2.5 text-sm text-gold-soft transition-colors"
                >
                  <Library className="h-4 w-4" strokeWidth={1.5} />
                  Add to Vault
                </button>
              )}

              {onCopyLink && (
                <button
                  onClick={onCopyLink}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-gold/20 bg-transparent hover:bg-gold/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-gold-soft/85 transition-colors"
                  aria-label={`Copy share link to ${reference}`}
                >
                  <Link2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Copy verse link
                </button>
              )}

              {onDraftSermon && (
                <button
                  onClick={onDraftSermon}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-gold/30 bg-gold/12 hover:bg-gold/20 px-4 py-2.5 text-sm text-gold-soft transition-colors"
                >
                  <PenLine className="h-4 w-4" strokeWidth={1.5} />
                  Draft Sermon
                </button>
              )}

              {onCreatePoem && (
                <button
                  onClick={onCreatePoem}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-gold/25 bg-gold/8 hover:bg-gold/15 px-4 py-2.5 text-sm text-gold-soft transition-colors"
                >
                  <Feather className="h-4 w-4" strokeWidth={1.5} />
                  Create Poem from {reference}
                </button>
              )}

              {onToggleImmersive && (
                <button
                  onClick={onToggleImmersive}
                  aria-pressed={immersiveActive}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm transition-colors",
                    immersiveActive
                      ? "border-gold/55 bg-gold/16 text-gold-soft shadow-[0_0_18px_rgba(201,168,76,0.22)]"
                      : "border-gold/20 bg-background/20 text-muted-foreground hover:border-gold/40 hover:bg-gold/10 hover:text-gold-soft",
                  )}
                >
                  <Wand2 className="h-4 w-4" strokeWidth={1.5} />
                  {immersiveActive ? "Exit Immersive Mode" : "Immersive Mode"}
                </button>
              )}

              {serviceModeActive && onAddToServiceNote && (
                <button
                  onClick={() => {
                    onAddToServiceNote(verseText, reference);
                    onClose();
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-md border border-gold/25 bg-gold/8 hover:bg-gold/15 px-4 py-2.5 text-sm text-gold-soft transition-colors"
                >
                  <BookMarked className="h-4 w-4" strokeWidth={1.5} />
                  Add to Service Note
                </button>
              )}

              <div className="rounded-md border border-gold/14 bg-background/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.24em] text-gold/70">Deep Dive</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Open this exact passage context in your research tool of choice.
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  {deepDiveLinks.map((provider) => (
                    <button
                      key={provider.label}
                      type="button"
                      onClick={() => {
                        void openDeepDiveLink(provider, { reference });
                      }}
                      aria-label={
                        provider.requiresClipboardHandoff
                          ? `Copy prompt and open ${provider.label} for ${reference}`
                          : `Research ${reference} in ${provider.label}`
                      }
                      title={
                        provider.requiresClipboardHandoff
                          ? `Copies the prompt, then opens ${provider.label} so you can paste.`
                          : undefined
                      }
                      className="inline-flex h-9 min-w-[7rem] items-center justify-center rounded-md border border-gold/18 bg-background/24 px-4 text-[10px] uppercase tracking-[0.18em] text-gold-soft transition-colors hover:bg-gold/10"
                    >
                      {provider.label}
                    </button>
                  ))}
                </div>
                <DeepDiveVersionChips reference={reference} passageContext={passageContext} />
                <div className="mt-4 border-t border-gold/12 pt-3">
                  <DeepDiveCustomInquiry
                    reference={reference}
                    verseText={verseText}
                    passageContext={passageContext}
                  />
                </div>
              </div>
            </div>
          )}

          {selahStatus !== "idle" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-gold/70" strokeWidth={1.5} />
                  <p className="text-[10px] uppercase tracking-[0.28em] text-gold/70">
                    Selah answer
                  </p>
                </div>
                {(selahStatus === "done" ||
                  voiceStatus === "playing" ||
                  voiceStatus === "loading") && (
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {voiceStatus === "loading" ? "Preparing voice" : voiceLabel}
                  </span>
                )}
              </div>

              {selahStatus === "loading" && (
                <div className="space-y-3 py-6 text-center">
                  <div className="flex justify-center gap-1.5">
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
                  <p className="font-display text-sm italic text-muted-foreground/70">
                    {SELAH_LOADING_PHRASES[phraseIdx]}
                  </p>
                </div>
              )}

              {selahStatus === "error" && (
                <p className="py-3 text-sm italic text-muted-foreground/70">
                  Reflection unavailable right now. Try again in a moment.
                </p>
              )}

              {selahStatus === "limit_reached" && (
                <p className="text-sm leading-relaxed text-foreground/80">
                  You&apos;ve reached today&apos;s Selah reflections. Continue without limits as a{" "}
                  <Link
                    to="/pricing"
                    className="text-gold/80 underline underline-offset-2 transition-colors hover:text-gold-soft"
                    onClick={handleClose}
                  >
                    Architect or Church Partner
                  </Link>
                  .
                </p>
              )}

              {selahStatus === "done" && reflection && (
                <div className="space-y-3">
                  <blockquote
                    className="font-display text-base leading-relaxed text-foreground/90 md:text-lg"
                    style={{ lineHeight: "1.65" }}
                  >
                    {reflection}
                  </blockquote>
                  {availability === "unavailable" && errorMessage ? (
                    <p className="rounded-md border border-gold/15 bg-gold/5 px-3 py-2 text-sm leading-relaxed text-muted-foreground">
                      {errorMessage}
                    </p>
                  ) : null}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  onClick={resetSelah}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  ← Back
                </button>
                {selahStatus === "done" && (
                  <div className="flex items-center gap-2">
                    {voiceStatus === "playing" ? (
                      <button
                        onClick={() => stopVoice()}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gold/25 bg-gold/10 px-3 py-2 text-sm text-gold-soft transition-colors hover:bg-gold/15"
                      >
                        <X className="h-4 w-4" />
                        Stop voice
                      </button>
                    ) : (
                      <button
                        onClick={playReflection}
                        disabled={voiceStatus === "loading"}
                        className="inline-flex items-center gap-1.5 rounded-md border border-gold/25 bg-gold/10 px-3 py-2 text-sm text-gold-soft transition-colors hover:bg-gold/15 disabled:opacity-60"
                      >
                        <Sparkles className="h-4 w-4" />
                        {voiceStatus === "loading" ? "Preparing…" : "Play voice"}
                      </button>
                    )}
                    <button
                      onClick={handleClose}
                      className="inline-flex items-center gap-1.5 rounded-md bg-gold/90 px-4 py-2 text-sm font-medium text-obsidian transition-colors hover:bg-gold"
                    >
                      <Check className="h-4 w-4" />
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuantumAction({
  icon,
  label,
  onClick,
  primary = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 text-xs transition-colors",
        primary
          ? "border-gold/40 bg-gold/15 text-gold-soft hover:bg-gold/25"
          : "border-border bg-muted/40 text-foreground hover:border-gold/30 hover:bg-gold/10",
      )}
    >
      <span className={primary ? "text-gold" : "text-gold-soft"}>{icon}</span>
      {label}
    </button>
  );
}
