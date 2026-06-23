/**
 * StrollProgressPill — celestial badge shown at the top of the reader when
 * Bookmark Stroll is active. Mirrors the Study Circuit pill style.
 */

import { Bookmark, X } from "lucide-react";

export function StrollProgressPill({
  current,
  total,
  onExit,
}: {
  current: number;
  total: number;
  onExit: () => void;
}) {
  return (
    <div
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-gold/30 bg-gold/8 px-2.5 py-1 shadow-[0_0_18px_rgba(201,168,76,0.18)] sm:gap-2 sm:px-3 sm:py-1.5"
      role="status"
      aria-live="polite"
    >
      <Bookmark className="h-3 w-3 shrink-0 text-gold drop-shadow-[0_0_6px_rgba(201,168,76,0.7)]" />
      <span className="min-w-0 truncate font-display text-[11px] uppercase tracking-[0.18em] text-gold-soft sm:text-xs">
        Strolling
        <span className="ml-1.5 text-gold/80">
          {current} of {total || "—"}
        </span>
      </span>
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit Bookmark Stroll"
        className="-mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gold/70 transition-colors hover:bg-gold/15 hover:text-gold"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
