import { Mail, Clock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EmailSequence } from '../hooks/use-email-sequences';

interface SequenceTimelineProps {
  sequences: EmailSequence[];
  onSelect?: (id: string) => void;
  activeId?: string | null;
  className?: string;
}

/**
 * Horizontal Day 1 → Day 3 → Day 7 visualization for email sequences.
 * Renders a scrollable rail of nodes connected by a timeline track,
 * with cumulative day labels derived from each step's delayDays.
 */
export function SequenceTimeline({ sequences, onSelect, activeId, className }: SequenceTimelineProps) {
  if (!sequences.length) return null;

  // Derive cumulative day position for each step
  let cumulative = 0;
  const nodes = sequences.map((s, i) => {
    cumulative += i === 0 ? 0 : s.delayDays;
    const dayLabel = cumulative === 0 ? 'Day 1' : `Day ${cumulative + 1}`;
    return { ...s, dayLabel, index: i };
  });

  return (
    <div className={cn('relative w-full', className)}>
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
          <Zap className="h-3 w-3 text-primary" />
        </div>
        <p className="text-xs font-medium text-foreground">Sequence Timeline</p>
        <span className="text-[10px] text-muted-foreground">
          {nodes.length} step{nodes.length === 1 ? '' : 's'} · spans {cumulative === 0 ? '1 day' : `${cumulative + 1} days`}
        </span>
      </div>

      <div className="relative overflow-x-auto pb-2">
        {/* Connector track */}
        <div
          className="absolute left-0 right-0 top-[42px] h-px bg-gradient-to-r from-primary/30 via-primary/40 to-primary/10"
          style={{ marginLeft: 56, marginRight: 56 }}
          aria-hidden
        />

        <div className="flex items-start gap-3 min-w-max px-1">
          {nodes.map((n, i) => {
            const isActive = activeId === n.id;
            return (
              <div key={n.id} className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onSelect?.(n.id)}
                  className={cn(
                    'group flex flex-col items-center gap-2 w-28 shrink-0 focus:outline-none',
                  )}
                >
                  {/* Day label */}
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wider transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                    )}
                  >
                    {n.dayLabel}
                  </span>

                  {/* Node */}
                  <div
                    className={cn(
                      'relative h-9 w-9 rounded-full border flex items-center justify-center transition-all',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-[0_0_18px_hsl(var(--primary)/0.45)]'
                        : 'bg-card/60 border-border/60 text-muted-foreground group-hover:border-primary/50 group-hover:text-primary',
                    )}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold bg-background border border-border/60 rounded-full h-4 w-4 flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>

                  {/* Subject + purpose */}
                  <div className="text-center w-full">
                    <p
                      className={cn(
                        'text-[11px] font-medium leading-tight line-clamp-2 transition-colors',
                        isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
                      )}
                      title={n.subject}
                    >
                      {n.subject || `Email ${i + 1}`}
                    </p>
                    {n.purpose && (
                      <p className="text-[9px] text-muted-foreground/70 mt-0.5 line-clamp-1">
                        {n.purpose}
                      </p>
                    )}
                  </div>
                </button>

                {/* Arrow / delay between nodes */}
                {i < nodes.length - 1 && (
                  <div className="flex flex-col items-center justify-start pt-[34px] shrink-0">
                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground/70 px-1.5 py-0.5 rounded-full bg-card/40 border border-border/40">
                      <Clock className="h-2.5 w-2.5" />
                      <span>+{sequences[i + 1].delayDays}d</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
