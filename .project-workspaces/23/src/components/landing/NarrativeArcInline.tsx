import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Inline 7-Day Narrative Arc — proof-next-to-promise.
 * Renders directly inside the Operator's Edge so the
 * "7-Day Content Calendar" row has its own functional receipt.
 *
 * Pure visual: zero AI calls. Sequenced reveal animates only when scrolled into view.
 */
const ARC_DAYS: Array<{ day: number; role: string; preview: string }> = [
  { day: 1, role: 'Hook', preview: 'Pattern interrupt — call out the silent cost.' },
  { day: 2, role: 'Story', preview: 'Vulnerable origin — the moment it broke.' },
  { day: 3, role: 'Insight', preview: 'The contrarian frame your market missed.' },
  { day: 4, role: 'Proof', preview: 'Receipts — the data, the case, the win.' },
  { day: 5, role: 'Tension', preview: 'Name the objection before they do.' },
  { day: 6, role: 'Vision', preview: 'Paint the after-state in cinematic detail.' },
  { day: 7, role: 'Offer', preview: 'The single CTA that closes the arc.' },
];

export function NarrativeArcInline() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="mt-3 sm:mt-4 rounded-xl border border-primary/25 bg-background/40 p-3 sm:p-4"
      aria-label="7-day narrative arc preview"
    >
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] uppercase tracking-[0.22em] text-primary/80 font-medium">
          Live Preview · The 7-Day Arc
        </span>
      </div>

      {/* Day strip — connected with a thin gold rail */}
      <div className="relative">
        <div className="absolute left-0 right-0 top-3 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="grid grid-cols-7 gap-1 sm:gap-2 relative">
          {ARC_DAYS.map((d, i) => (
            <div
              key={d.day}
              className={cn(
                'flex flex-col items-center text-center transition-all duration-500',
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
              )}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div
                className={cn(
                  'h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-mono font-medium border',
                  'bg-background border-primary/40 text-primary',
                  'shadow-[0_0_10px_hsl(var(--primary)/0.25)]',
                )}
              >
                {d.day}
              </div>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 mt-1.5">
                {d.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rotating preview line — shows the live "voice" of one day at a time */}
      <div
        className={cn(
          'mt-3 sm:mt-4 rounded-lg border border-border/30 bg-background/50 px-3 py-2 transition-opacity duration-700',
          visible ? 'opacity-100' : 'opacity-0',
        )}
      >
        <p className="text-[11px] sm:text-xs text-muted-foreground/90 italic line-clamp-2">
          <span className="text-primary not-italic font-mono mr-1.5">Day 3 · Insight —</span>
          {ARC_DAYS[2].preview}
        </p>
      </div>
    </div>
  );
}
