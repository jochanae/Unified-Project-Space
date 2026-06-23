import { motion } from 'framer-motion';
import { Waves } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSanctuaryTheme } from '@/hooks/useSanctuaryTheme';

interface FocusModeCardProps {
  isFocusActive: boolean;
  elapsed: number;
  onToggle: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 1) return `${s}s`;
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * Dashboard card: Focus / Flight Mode — pure gateway.
 * Single Entrance: tapping anywhere enters Focus Mode. Sound is controlled
 * inside the immersion overlay only. Last-used soundscape fades in over 3s.
 */
export default function FocusModeCard({ isFocusActive, elapsed, onToggle }: FocusModeCardProps) {
  const { theme } = useSanctuaryTheme();

  const accentColor = `hsl(${theme.accentHsl})`;
  const accentBg = `hsl(${theme.accentHsl} / 0.15)`;
  const accentBorder = `hsl(${theme.accentHsl} / 0.25)`;
  const accentGlow = `0 0 18px hsl(${theme.accentHsl} / 0.15)`;
  const accentTextDim = `hsl(${theme.accentHsl} / 0.75)`;
  const accentTextBright = `hsl(${theme.accentHsl})`;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFocusActive ? 'Exit Focus Mode' : 'Enter Focus Mode'}
      className={cn(
        'group w-full text-left rounded-3xl px-4 py-3.5 mb-2 backdrop-blur-xl border-[0.5px] transition-all duration-700 animate-fade-in active:scale-[0.99]',
        isFocusActive
          ? 'shadow-lg'
          : 'bg-white/5 border-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_14px_rgba(212,175,80,0.08)] hover:bg-white/[0.07] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.4),0_0_22px_rgba(212,175,80,0.18)]'
      )}
      style={isFocusActive ? {
        backgroundColor: `hsl(230 30% 8% / 0.85)`,
        borderColor: accentBorder,
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.04), ${accentGlow}`,
      } : undefined}
    >
      {isFocusActive ? (
        // ── Active: status + exit (no sound controls — they live in the overlay) ──
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-semibold tracking-wider uppercase transition-colors duration-700"
              style={{ color: accentTextBright, textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
            >
              Focus Active
            </p>
            <p
              className="text-[11px] mt-0.5 transition-colors duration-700"
              style={{ color: accentTextDim }}
            >
              Deep work · {formatElapsed(elapsed)} · tap to return
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs" title={theme.label}>{theme.emoji}</span>
            <motion.div
              key="active"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: accentBg, border: `1px solid ${accentBorder}` }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full animate-deep-sleep"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="text-[9px] font-medium tracking-wide uppercase"
                style={{ color: accentTextBright }}
              >
                On
              </span>
            </motion.div>
          </div>
        </div>
      ) : (
        // ── Inactive: pure gateway — centered icon + label + tagline ──
        <div className="w-full flex flex-col items-center justify-center gap-2 py-1">
          {/* Muted indigo disc inside prominent breathing gold ring */}
          <div className="relative flex items-center justify-center h-16 w-16 group-hover:scale-[1.02] transition-transform duration-500">
            {/* Outer breathing gold ring — thicker, brighter */}
            <span
              className="absolute inset-0 rounded-full border-2 border-primary/70 pointer-events-none animate-pulse"
              style={{
                animationDuration: '3.5s',
                boxShadow: '0 0 22px rgba(212,175,80,0.45), 0 0 8px rgba(212,175,80,0.3), inset 0 0 6px rgba(212,175,80,0.12)',
              }}
            />
            {/* Inner muted indigo/aubergine disc — recessed */}
            <div
              className="relative flex items-center justify-center h-10 w-10 rounded-full"
              style={{
                background: 'radial-gradient(circle at 50% 40%, hsl(235 22% 20% / 0.95), hsl(240 25% 11% / 0.98))',
                border: '1px solid hsl(235 30% 28% / 0.5)',
                boxShadow: 'inset 0 2px 4px hsl(0 0% 0% / 0.4), inset 0 -1px 2px hsl(235 30% 35% / 0.15)',
              }}
            >
              <Waves className="h-4 w-4 text-primary" strokeWidth={1.75} />
            </div>
          </div>

          <p
            className="text-xs font-semibold tracking-wider uppercase text-white/75 mt-0.5"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
          >
            Focus Mode
          </p>
          <p className="text-[11px] text-white/40 italic">
            Enter the stillness — silence the world
          </p>
        </div>
      )}
    </button>
  );
}
