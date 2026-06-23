import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, X } from "lucide-react";
import { onDeepDiveLaunched, type DeepDiveLaunchEvent } from "@/lib/deepDiveReturnBus";

/**
 * Floating "Return to reading" banner.
 *
 * Appears for ~30s after a Deep Dive launches, anchored above the bottom
 * safe area. One-tap brings focus back to the reader (the SanctumIQ tab/
 * window) and dismisses. Auto-hides if the user scrolls or after the
 * timeout — never lingers.
 *
 * Why it exists: Deep Dive opens an external research tab (ChatGPT /
 * Perplexity). When the user wants to come back, they may have lost the
 * SanctumIQ tab. The banner is the "breadcrumb home" — present the moment
 * they switch back to the SanctumIQ tab/window.
 */
export function ReturnToReadingBanner() {
  const [event, setEvent] = useState<DeepDiveLaunchEvent | null>(null);

  useEffect(() => {
    return onDeepDiveLaunched((next) => {
      setEvent(next);
    });
  }, []);

  // Auto-dismiss 30s after the launch event.
  useEffect(() => {
    if (!event) return;
    const t = window.setTimeout(() => setEvent(null), 30_000);
    return () => window.clearTimeout(t);
  }, [event]);

  if (!event) return null;

  const dismiss = () => setEvent(null);
  const focusReader = () => {
    if (typeof window !== "undefined") {
      window.focus();
    }
    dismiss();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[60] flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
    >
      <div className="pointer-events-auto flex max-w-md items-center gap-2 rounded-full border border-gold/25 bg-popover/95 px-3 py-2 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <button
          type="button"
          onClick={focusReader}
          className="flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1.5 text-xs font-medium text-gold-soft transition-colors hover:bg-gold/25"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          <BookOpen className="h-3.5 w-3.5" strokeWidth={1.75} />
          Return to reading
        </button>
        {event.reference ? (
          <span className="hidden truncate text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
            {event.reference}
          </span>
        ) : null}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-gold/10 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
