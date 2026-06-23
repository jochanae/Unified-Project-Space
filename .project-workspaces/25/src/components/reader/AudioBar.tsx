import {
  ChevronDown,
  Headphones,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Sparkles,
  X,
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export type AudioBarMode = "expanded" | "retracted";

export function AudioBar({
  status,
  currentVerse,
  totalVerses,
  reference,
  voiceLabel,
  availability,
  errorMessage,
  mode = "expanded",
  onPlay,
  onPause,
  onResume,
  onStop,
  onRetract,
  onExpand,
  onSkipNext,
  onSkipPrev,
}: {
  status: "idle" | "loading" | "playing" | "paused";
  currentVerse: number | null;
  totalVerses: number;
  reference: string;
  voiceLabel: string;
  availability: "ready" | "unavailable";
  errorMessage: string | null;
  mode?: AudioBarMode;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRetract?: () => void;
  onExpand?: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
}) {
  const progress = currentVerse && totalVerses > 0 ? (currentVerse / totalVerses) * 100 : 0;
  const mobileBottomOffset = "calc(env(safe-area-inset-bottom) + clamp(5.5rem, 11svh, 7rem))";

  const playPause = () => {
    if (status === "loading") return;
    if (status === "playing") return onPause();
    if (status === "paused") return onResume();
    onPlay();
  };

  // Retracted: a tiny floating chip; audio keeps playing.
  if (mode === "retracted") {
    return (
      <div
        className="fixed right-3 z-40 md:bottom-5 lg:bottom-4"
        style={{ bottom: mobileBottomOffset }}
        data-audio-bar="retracted"
      >
        <div className="hairline flex items-center gap-1 rounded-full bg-obsidian-elevated/80 px-1.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.5)] ring-1 ring-gold/25 backdrop-blur-2xl">
          <button
            type="button"
            onClick={playPause}
            aria-label={status === "playing" ? "Pause" : "Play"}
            disabled={status === "loading"}
            className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-gold text-obsidian transition-transform active:scale-95 disabled:opacity-80"
          >
            {status === "loading" ? (
              <LoadingSpinner context="button" className="scale-[0.5] text-obsidian" />
            ) : status === "playing" ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="ml-0.5 h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand audio controls"
            className="flex h-11 touch-manipulation items-center gap-1.5 px-2 text-[10px] uppercase tracking-[0.18em] text-gold-soft transition-colors active:bg-gold/10 active:text-gold rounded-md"
          >
            <Headphones className="h-3.5 w-3.5" />
            <span className="max-w-[7rem] truncate">
              {reference}
              {currentVerse ? `:${currentVerse}` : ""}
            </span>
          </button>
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop audio"
            className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors active:bg-destructive/15 active:text-destructive"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed left-0 right-0 z-40 md:bottom-5 lg:bottom-4"
      style={{ bottom: mobileBottomOffset }}
      data-audio-bar="expanded"
    >
      <div className="mx-auto max-w-3xl px-3 md:max-w-2xl md:px-6 lg:max-w-3xl">
        <div className="hairline rounded-full bg-obsidian-elevated/72 px-3 py-2 shadow-[0_0_0_1px_rgba(201,168,76,0.14),0_12px_40px_rgba(0,0,0,0.55),0_0_28px_rgba(201,168,76,0.12)] ring-1 ring-gold/20 backdrop-blur-2xl backdrop-saturate-150">
          <div className="flex items-center gap-2">
            <button
              onClick={onSkipPrev}
              aria-label="Previous verse"
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/5 hover:text-gold-soft active:bg-gold/12 active:text-gold"
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={playPause}
              aria-label={
                status === "playing" ? "Pause" : status === "loading" ? "Preparing audio" : "Play"
              }
              disabled={status === "loading"}
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-gold text-obsidian shadow-[0_0_20px_rgba(201,168,76,0.35)] transition-all hover:bg-gold-soft active:scale-95 disabled:cursor-wait disabled:opacity-80"
            >
              {status === "loading" ? (
                <LoadingSpinner context="button" className="scale-[0.55] text-obsidian" />
              ) : status === "playing" ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="ml-0.5 h-4 w-4" />
              )}
            </button>

            <button
              onClick={onSkipNext}
              aria-label="Next verse"
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/5 hover:text-gold-soft active:bg-gold/12 active:text-gold"
            >
              <SkipForward className="h-4 w-4" />
            </button>

            <div className="min-w-0 flex-1 px-1">
              <div className="flex items-baseline gap-2 truncate">
                <span className="shrink-0 text-[10px] uppercase tracking-widest text-gold">
                  {status === "loading"
                    ? "Preparing"
                    : status === "playing"
                      ? "Reading"
                      : status === "paused"
                        ? "Paused"
                        : "Ready"}
                </span>
                <span className="truncate text-xs text-foreground/85">
                  {reference}
                  {currentVerse ? `:${currentVerse}` : ""}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Sparkles className="h-3 w-3 shrink-0 text-gold/70" />
                <span className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {availability === "ready" ? voiceLabel : "Premium voice offline"}
                </span>
              </div>
              {status === "playing" && availability === "ready" ? (
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gold/65">
                  Next verses are warming in the background
                </p>
              ) : null}
              {availability === "unavailable" && errorMessage ? (
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/85">
                  {errorMessage}
                </p>
              ) : null}
              <div className="mt-1.5 h-[2px] w-full overflow-hidden rounded-full bg-gold/15">
                <div
                  className="h-full bg-gold transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {onRetract ? (
              <button
                onClick={onRetract}
                aria-label="Minimize audio controls (keep playing)"
                className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-gold-soft active:bg-gold/12 active:text-gold"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            ) : null}

            <button
              onClick={onStop}
              aria-label="Stop audio"
              className="inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive active:bg-destructive/15 active:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
