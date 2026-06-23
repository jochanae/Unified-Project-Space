import { useMemo } from 'react';
import { TrendingDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WaterfallStep {
  id: string;
  title: string;
  step_type?: string;
  views: number;
  leads?: number;
}

interface FunnelWaterfallProps {
  steps: WaterfallStep[];
  className?: string;
  onStepClick?: (step: WaterfallStep) => void;
}

/**
 * Classic funnel/waterfall visualization.
 * Renders an SVG with stacked trapezoids — each tier scaled to step views,
 * drop-off bands rendered between tiers, and a side rail with raw + delta numbers.
 */
export function FunnelWaterfall({ steps, className, onStepClick }: FunnelWaterfallProps) {
  const data = useMemo(() => {
    if (!steps.length) return null;
    const top = Math.max(steps[0].views, 1);
    return steps.map((s, i) => {
      const prev = i > 0 ? steps[i - 1].views : null;
      const widthPct = Math.max((s.views / top) * 100, 6);
      const dropPct = prev && prev > 0 ? ((1 - s.views / prev) * 100) : 0;
      const dropAbs = prev !== null ? prev - s.views : 0;
      return { ...s, widthPct, dropPct, dropAbs, prev };
    });
  }, [steps]);

  if (!data) return null;

  const TIER_H = 56; // px
  const GAP = 18; // px between tiers (where drop band sits)

  return (
    <div className={cn('w-full', className)}>
      <div className="relative">
        {data.map((step, i) => {
          const next = data[i + 1];
          return (
            <div key={step.id} className="relative">
              {/* Tier (trapezoid via clip-path) */}
              <div className="flex items-center justify-center" style={{ height: TIER_H }}>
                <button
                  type="button"
                  onClick={() => onStepClick?.(step)}
                  disabled={!onStepClick}
                  className={cn(
                    'relative h-full flex items-center justify-between gap-3 px-4 sm:px-6 transition-all duration-500',
                    onStepClick && 'cursor-pointer hover:scale-[1.02] hover:shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.4)]',
                  )}
                  style={{
                    width: `${step.widthPct}%`,
                    minWidth: 200,
                    background: 'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.08))',
                    border: '1px solid hsl(var(--primary) / 0.25)',
                    borderRadius: 8,
                    boxShadow: '0 4px 24px -8px hsl(var(--primary) / 0.25)',
                  }}
                  title={onStepClick ? `${step.title} — click for details` : step.title}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate text-foreground">{step.title}</p>
                    {step.step_type && (
                      <p className="text-[9px] uppercase tracking-[0.15em] text-muted-foreground/70 mt-0.5">
                        {step.step_type}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-foreground/90 shrink-0">
                    <Users className="h-3 w-3 opacity-60" />
                    <span className="text-sm font-semibold tabular-nums">
                      {step.views.toLocaleString()}
                    </span>
                  </div>
                </button>
              </div>

              {/* Drop-off band */}
              {next && (
                <div className="relative flex items-center justify-center" style={{ height: GAP }}>
                  {/* Trapezoid connector svg */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                  >
                    <defs>
                      <linearGradient id={`drop-${step.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <polygon
                      points={`${50 - step.widthPct / 2},0 ${50 + step.widthPct / 2},0 ${50 + next.widthPct / 2},100 ${50 - next.widthPct / 2},100`}
                      fill={`url(#drop-${step.id})`}
                    />
                  </svg>
                  {next.dropPct > 0 && (
                    <div className="relative z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 backdrop-blur border border-border/40">
                      <TrendingDown className={cn(
                        'h-2.5 w-2.5',
                        next.dropPct > 60 ? 'text-destructive' : next.dropPct > 30 ? 'text-amber-500' : 'text-muted-foreground',
                      )} />
                      <span className={cn(
                        'text-[10px] font-medium tabular-nums',
                        next.dropPct > 60 ? 'text-destructive' : next.dropPct > 30 ? 'text-amber-500' : 'text-muted-foreground',
                      )}>
                        −{next.dropPct.toFixed(0)}% · {next.dropAbs.toLocaleString()} lost
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      {data.length > 1 && (() => {
        const start = data[0].views;
        const end = data[data.length - 1].views;
        const overall = start > 0 ? ((end / start) * 100) : 0;
        const lost = start - end;
        return (
          <div className="mt-4 pt-3 border-t border-border/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              End-to-end conversion
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {overall.toFixed(1)}% · {lost.toLocaleString()} dropped
            </span>
          </div>
        );
      })()}
    </div>
  );
}
