import { LucideIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Primary, single CTA — the only thing the user should do next. */
  ctaLabel: string;
  onCta: () => void;
  /** Optional ghost link rendered below the CTA (e.g. "Learn how"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
  /** Compact = used inline inside cards/feeds. Default = full panel. */
  variant?: 'default' | 'compact';
}

/**
 * Single-CTA empty state. Replaces passive "no data yet" copy with a clear
 * next action so users always have one thing to do — never a dead end.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCta,
  secondaryLabel,
  onSecondary,
  className,
  variant = 'default',
}: EmptyStateProps) {
  const isCompact = variant === 'compact';
  return (
    <div
      className={cn(
        'glass relative overflow-hidden rounded-2xl border border-border/30 text-center',
        isCompact ? 'p-5 sm:p-6' : 'p-7 sm:p-10',
        className,
      )}
    >
      {/* Subtle radial glow behind icon */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 to-transparent" />

      <div className="relative mx-auto flex flex-col items-center">
        <div
          className={cn(
            'flex items-center justify-center rounded-2xl bg-primary/10 text-primary',
            isCompact ? 'h-10 w-10' : 'h-12 w-12',
          )}
        >
          <Icon className={isCompact ? 'h-5 w-5' : 'h-6 w-6'} />
        </div>

        <h3
          className={cn(
            'mt-4 font-serif tracking-tight',
            isCompact ? 'text-base' : 'text-lg sm:text-xl',
          )}
        >
          {title}
        </h3>

        <p className="mt-1.5 max-w-sm text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>

        <button
          onClick={onCta}
          className={cn(
            'mt-5 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground transition-all',
            'hover:bg-primary/90 active:scale-[0.98]',
            'shadow-[0_0_24px_-8px_hsl(var(--primary)/0.6)]',
            isCompact ? 'px-4 py-2 text-xs font-semibold' : 'px-5 py-2.5 text-sm font-semibold',
          )}
        >
          {ctaLabel}
          <ArrowRight className={isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>

        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="mt-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
