import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * ReaderHeader — DEDICATED, FROZEN header for the Reader route.
 *
 * ⚠️  DO NOT MODIFY THIS FILE TO MAKE GENERAL HEADER CHANGES.
 * The Reader's header layout is intentionally locked. Any tweaks to
 * inner-page headers should go to `MasterHeader.tsx` instead.
 *
 * This is a snapshot of the MasterHeader contract at the moment the
 * Reader's layout was approved. It is decoupled on purpose so future
 * changes to MasterHeader can never break the Reader again.
 *
 * Layout: [left cluster] · [centered title that shrinks] · [right cluster]
 * - Side clusters use intrinsic width so 3 vs 4 icons both fit.
 * - Title slot never shrinks; icons compress instead.
 * - Gap between icons is 8px on narrow phones (<400px) and 10px from 400px up.
 * - All icons render gold on obsidian — no background pills.
 *
 * iOS safe area: header reserves padding-top equal to env(safe-area-inset-top).
 */

export const READER_HEADER_HEIGHT = { base: 56, sm: 64, md: 76 } as const;

export function ReaderHeader({
  left,
  title,
  right,
  className,
}: {
  left: ReactNode;
  title: ReactNode;
  right: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[100] border-b border-white/5 bg-obsidian/85 backdrop-blur-xl backdrop-saturate-150 transition-all duration-500 ease-out motion-reduce:transition-none rounded-b-2xl overflow-hidden",
        className,
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="relative mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-2 sm:h-16 sm:px-4 md:h-[4.75rem] md:px-6 lg:h-[4.5rem] lg:px-6">
        <div className="relative z-10 flex min-w-0 shrink flex-nowrap items-center gap-1 whitespace-nowrap min-[400px]:gap-1.5 sm:gap-2.5">
          {left}
        </div>
        {/*
         * Title slot — never shrinks/truncates; icons compress instead.
         * < 410px: in-flow, left-aligned next to the icon cluster.
         * ≥ 410px: absolutely centered for the cinematic look.
         */}
        <div className="shrink-0 text-left min-[410px]:pointer-events-none min-[410px]:absolute min-[410px]:inset-x-0 min-[410px]:top-1/2 min-[410px]:flex min-[410px]:-translate-y-1/2 min-[410px]:justify-center min-[410px]:px-2 min-[410px]:text-center">
          <div className="min-[410px]:pointer-events-auto min-[410px]:max-w-[55%]">{title}</div>
        </div>
        <div className="relative z-10 flex min-w-0 shrink flex-nowrap items-center gap-1 whitespace-nowrap pr-1 min-[400px]:gap-1.5 sm:gap-2.5 sm:pr-3">
          {right}
        </div>
      </div>
    </header>
  );
}

/** Reusable icon-button styled to match the reader header. Frozen alongside ReaderHeader. */
export function ReaderHeaderIconButton({
  icon: Icon,
  label,
  onClick,
  to,
  active = false,
  disabled = false,
}: {
  icon: typeof Search;
  label: string;
  onClick?: () => void;
  to?: string;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = cn(
    "inline-flex h-11 w-8 min-[400px]:w-9 sm:h-10 sm:w-10 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full bg-transparent transition-colors",
    "touch-manipulation select-none",
    active ? "text-gold" : "text-gold-soft hover:text-gold",
    !disabled && "active:bg-gold/12 active:text-gold",
    disabled && "opacity-40 pointer-events-none",
  );
  const iconClass = "h-5 w-5 md:h-[1.05rem] md:w-[1.05rem]";
  if (to && !disabled) {
    return (
      <Link to={to} aria-label={label} className={className}>
        <Icon className={iconClass} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={className}
    >
      <Icon className={iconClass} />
    </button>
  );
}
