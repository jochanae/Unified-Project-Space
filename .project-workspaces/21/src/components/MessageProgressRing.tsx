/**
 * MessageProgressRing — circular progress indicator for remaining free messages.
 * Animates from 0 → value when scrolled into view.
 */

import { useEffect, useRef, useState } from 'react';

export default function MessageProgressRing({ remaining, total }: { remaining: number; total: number }) {
  const used = total - remaining;
  const pct = Math.min(1, used / total);
  const radius = 12;
  const circumference = 2 * Math.PI * radius;

  const [animatedPct, setAnimatedPct] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!ref.current || hasAnimated.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          // Small delay for visual impact
          requestAnimationFrame(() => setAnimatedPct(pct));
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [pct]);

  const offset = circumference * (1 - animatedPct);

  // Color transitions: green → amber → red
  const color = pct < 0.5 ? 'hsl(var(--primary))' : pct < 0.83 ? 'hsl(38 92% 50%)' : 'hsl(var(--destructive))';

  return (
    <div ref={ref} className="mr-1 flex items-center gap-1" title={`${remaining} of ${total} free messages remaining today`}>
      <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0">
        <circle cx="14" cy="14" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
        <circle
          cx="14" cy="14" r={radius} fill="none"
          stroke={color} strokeWidth="2.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 14 14)"
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
        <text x="14" y="14" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[9px] font-bold">
          {remaining}
        </text>
      </svg>
      <span className="text-[9px] font-medium text-muted-foreground leading-tight">left</span>
    </div>
  );
}
