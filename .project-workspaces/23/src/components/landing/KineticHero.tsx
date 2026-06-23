import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * KineticHero — pure CSS/SVG kinetic typography loop for the landing hero.
 *
 * Why CSS/SVG and not MP4:
 * - Instant load (no video buffering)
 * - Crisp at any resolution
 * - Autoplays everywhere (no Safari iOS / Low Power Mode blocks)
 *
 * The loop cycles three "promises" — Strategize, Brand, Distribute — mirroring
 * the Trinity in the Welcome Overlay and the consolidated Marketing Studio.
 */
const PHRASES = [
  { kicker: 'Strategize', word: 'Signals', accent: 'Sharpen the hook.' },
  { kicker: 'Brand', word: 'Identity', accent: 'Lock the look.' },
  { kicker: 'Distribute', word: 'Funnels', accent: 'Ship the proof.' },
] as const;

const ROTATE_MS = 2600;

export function KineticHero({ className }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % PHRASES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const current = PHRASES[index];

  return (
    <div
      className={cn(
        'relative mx-auto w-full max-w-2xl select-none',
        'aspect-[16/7] overflow-hidden rounded-3xl',
        'border border-primary/20 bg-card/30 backdrop-blur-md',
        className,
      )}
      style={{
        boxShadow:
          '0 30px 80px -30px hsl(var(--primary) / 0.25), inset 0 1px 0 hsl(var(--primary) / 0.08)',
      }}
      aria-label="IntoIQ kinetic preview: Strategize, Brand, Produce"
    >
      {/* Obsidian gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 30% 30%, hsl(var(--primary) / 0.18) 0%, transparent 55%), radial-gradient(circle at 70% 70%, hsl(var(--primary) / 0.10) 0%, transparent 60%)',
        }}
      />

      {/* Slow-rotating gold ring */}
      <svg
        viewBox="0 0 400 200"
        className="absolute inset-0 h-full w-full opacity-40"
        aria-hidden
      >
        <defs>
          <linearGradient id="kinetic-gold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle
          cx="200"
          cy="100"
          r="78"
          fill="none"
          stroke="url(#kinetic-gold)"
          strokeWidth="0.6"
          className={reduceMotion ? '' : 'kinetic-ring'}
        />
        <circle
          cx="200"
          cy="100"
          r="62"
          fill="none"
          stroke="hsl(var(--primary) / 0.25)"
          strokeWidth="0.4"
          strokeDasharray="2 6"
        />
      </svg>

      {/* Phrase stack */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
        <p
          key={`kicker-${index}`}
          className="kinetic-fade mb-3 text-[10px] uppercase tracking-[0.32em] text-primary/80 sm:text-xs"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          {current.kicker}
        </p>
        <h2
          key={`word-${index}`}
          className="kinetic-rise font-serif text-4xl leading-none sm:text-6xl md:text-7xl"
          style={{
            background:
              'linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--primary)) 60%, hsl(var(--foreground)) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 4px 18px hsl(var(--primary) / 0.25))',
          }}
        >
          {current.word}
        </h2>
        <p
          key={`accent-${index}`}
          className="kinetic-fade mt-4 text-xs italic text-muted-foreground sm:text-sm"
        >
          {current.accent}
        </p>

        {/* Progress dots */}
        <div className="mt-6 flex items-center gap-1.5">
          {PHRASES.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 rounded-full transition-all duration-500',
                i === index ? 'w-6 bg-primary' : 'w-1.5 bg-primary/25',
              )}
            />
          ))}
        </div>
      </div>

      {/* Scanlines for cinema texture */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.06]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0 2px, hsl(var(--foreground)) 2px 3px)',
        }}
      />

      <style>{`
        @keyframes kinetic-ring-spin {
          from { transform: rotate(0deg); transform-origin: 200px 100px; }
          to   { transform: rotate(360deg); transform-origin: 200px 100px; }
        }
        .kinetic-ring { animation: kinetic-ring-spin 14s linear infinite; }

        @keyframes kinetic-rise {
          0%   { opacity: 0; transform: translateY(14px) scale(0.98); letter-spacing: -0.04em; }
          60%  { opacity: 1; transform: translateY(0) scale(1); letter-spacing: -0.01em; }
          100% { opacity: 1; transform: translateY(0) scale(1); letter-spacing: -0.01em; }
        }
        .kinetic-rise { animation: kinetic-rise 700ms cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes kinetic-fade {
          0%   { opacity: 0; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .kinetic-fade { animation: kinetic-fade 600ms ease-out both; }
      `}</style>
    </div>
  );
}
