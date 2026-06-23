import { useNavigate } from 'react-router-dom';
import { Sparkles, X, ArrowRight, AlertTriangle, Trophy } from 'lucide-react';
import { useContextualSignals } from '@/hooks/use-contextual-signals';
import { cn } from '@/lib/utils';

/**
 * QuinnContextChip
 * ----------------
 * Floating glass chip above the global footer that surfaces ONE
 * route-aware nudge from MarQ. Dismissable; respects 24h cooldown.
 * Hidden on /workspace (CinematicDock owns that space).
 */
export function QuinnContextChip() {
  const { nudge, dismiss } = useContextualSignals();
  const navigate = useNavigate();

  if (!nudge) return null;

  const Icon =
    nudge.severity === 'warn' ? AlertTriangle : nudge.severity === 'win' ? Trophy : Sparkles;

  const accent =
    nudge.severity === 'warn'
      ? 'border-amber-400/30 text-amber-200'
      : nudge.severity === 'win'
        ? 'border-gold/40 text-gold'
        : 'border-primary/30 text-primary';

  const handleAct = () => {
    dismiss();
    navigate(nudge.cta_route);
  };

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[55] pointer-events-auto px-3 w-[min(92vw,520px)]"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)' }}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          'relative flex items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-2xl',
          'bg-background/85 backdrop-blur-xl border shadow-2xl',
          'animate-in fade-in slide-in-from-bottom-2 duration-500',
          accent,
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <p className="text-[12px] sm:text-[13px] leading-snug text-foreground/90 flex-1 min-w-0">
          {nudge.message}
        </p>
        <button
          type="button"
          onClick={handleAct}
          className={cn(
            'shrink-0 flex items-center gap-1 rounded-full px-2.5 py-1',
            'text-[11px] font-semibold uppercase tracking-wider',
            'bg-primary/15 text-primary hover:bg-primary/25 active:scale-95 transition-all',
          )}
        >
          {nudge.cta_label}
          <ArrowRight className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 transition-colors"
          aria-label="Dismiss MarQ nudge"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
