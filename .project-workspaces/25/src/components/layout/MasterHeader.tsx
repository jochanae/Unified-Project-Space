import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, Search, Sunrise } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDailyWord } from "@/components/reader/DailyWordProvider";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { useAuth } from "@/hooks/useAuth";
import { useQuickSearch } from "@/components/QuickSearchProvider";
import { ThemeToggleButton } from "@/components/layout/ThemeToggleButton";

/**
 * Fixed header height in px (content row only — does NOT include
 * iOS safe-area-inset-top, which is added on top of these heights).
 * Exported so pages can offset their top padding deterministically.
 *
 * For full offset, use:  calc(env(safe-area-inset-top) + <height>px)
 */
export const MASTER_HEADER_HEIGHT = { base: 56, sm: 64, md: 76 } as const;

/**
 * MasterHeader — locked, persistent reader-style chrome.
 *
 * Layout: [left cluster] · [centered title that shrinks] · [right cluster]
 * - Side clusters use intrinsic width (auto) so 3 vs 4 icons both fit.
 * - Title gets min-w-0 + truncate so it never pushes icons off-screen.
 * - Gap between icons is 8px on narrow phones (<400px) and 10px from 400px up.
 * - All icons render gold on obsidian — no background pills.
 *
 * iOS safe area: the header reserves padding-top equal to env(safe-area-inset-top)
 * so its content sits below the notch / Dynamic Island on iPhone X+ and the
 * status bar in PWA standalone mode. Border + background extend up under the
 * notch for a seamless look (because viewport-fit=cover is set).
 */
export function MasterHeader({
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

/** Reusable icon-button styled to match the master header. */
export function MasterHeaderIconButton({
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
    // 44px minimum tap target on phones (iOS/Android guideline), tighter on larger screens.
    "inline-flex h-11 w-8 min-[400px]:w-9 sm:h-10 sm:w-10 md:h-9 md:w-9 shrink-0 items-center justify-center rounded-full bg-transparent transition-colors",
    "touch-manipulation select-none",
    active ? "text-gold" : "text-gold-soft hover:text-gold",
    // Immediate touch feedback so first tap always registers visually (defeats sticky :hover on iOS).
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

/**
 * Default left cluster used by non-reader pages (e.g. /search):
 * Back · Daily Word · Global Search.
 */
export function MasterHeaderDefaultLeft({
  activeSearch = false,
}: {
  activeSearch?: boolean;
  /** @deprecated Daily Word moved to right cluster. Kept for prop compatibility. */
  onDailyWordClick?: () => void;
}) {
  const { setOpen: setQuickSearchOpen } = useQuickSearch();
  return (
    <>
      <MasterHeaderIconButton icon={ChevronLeft} label="Back to reader" to="/reader" />
      <MasterHeaderIconButton
        icon={Search}
        label="Quick search scripture (⌘K)"
        onClick={() => setQuickSearchOpen(true)}
        active={activeSearch}
      />
    </>
  );
}

/**
 * Default right cluster for all non-reader inner pages:
 * Daily Word (Sunrise) · ThemeToggle · Avatar (when signed in).
 * Sunrise lives on the right to balance the cluster and keep the title centered.
 */
export function MasterHeaderDefaultRight({
  onDailyWordClick,
}: {
  onDailyWordClick?: () => void;
} = {}) {
  const { user } = useAuth();
  const { open: openDailyWord } = useDailyWord();
  const handleDailyWord = onDailyWordClick ?? openDailyWord;
  return (
    <>
      <MasterHeaderIconButton icon={Sunrise} label="Daily Word" onClick={handleDailyWord} />
      <ThemeToggleButton />
      {user && <AvatarMenu />}
    </>
  );
}
