/**
 * IntentRibbon — sticky top ribbon that displays the user's morning intent
 * word, with an adaptive mode-aware secondary phrase that fades in when
 * the dashboard detects a mode shift (strategic / reflective / creative).
 *
 * Default ('soul'):
 *    ✦ TODAY'S INTENT   Love me too!
 *
 * Mode-active (e.g. 'strategic'):
 *    ✦ TODAY'S INTENT   Love me too!  ·  Strategic Momentum
 *                                     ↑ mode-accent shimmer
 *
 * The morning word stays the user's. The secondary phrase is the space
 * acknowledging the gear shift — the bridge between soul (greeting) and
 * strategy (Strategist tile below).
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { DashboardMode } from '@/hooks/useDashboardMode';

interface IntentRibbonProps {
  todayIntent: string | null;
  mode: DashboardMode;
  onSetIntent?: () => void;
}

const MODE_PHRASES: Record<Exclude<DashboardMode, 'soul'>, string[]> = {
  strategic: ['Strategic Momentum', 'Building', 'Wealth Mode'],
  reflective: ['Inner Stillness', 'Listening Inward'],
  creative: ['In the Studio', 'Shaping'],
};

// Gentle daily rotation within a mode so it feels alive, not stamped.
function pickPhrase(mode: Exclude<DashboardMode, 'soul'>): string {
  const pool = MODE_PHRASES[mode];
  const dayIdx = Math.floor(Date.now() / 86400000);
  return pool[dayIdx % pool.length];
}

export default function IntentRibbon({ todayIntent, mode, onSetIntent }: IntentRibbonProps) {
  const [intentExpanded, setIntentExpanded] = useState(false);

  const h = new Date().getHours();
  const isNight = h >= 22 || h < 5;

  // Base ribbon accent — circadian
  const baseAccentHsl = isNight ? '230 60% 72%' : '43 96% 58%';

  // Mode accent — overrides the secondary phrase color
  const modeAccentHsl = useMemo(() => {
    switch (mode) {
      case 'strategic': return '43 96% 62%';   // gold
      case 'reflective': return '230 60% 72%'; // indigo
      case 'creative': return '280 70% 72%';   // violet
      default: return baseAccentHsl;
    }
  }, [mode, baseAccentHsl]);

  const secondaryPhrase = mode === 'soul' ? null : pickPhrase(mode);

  // No intent set → render a minimal CTA strip
  if (!todayIntent) {
    if (!onSetIntent) return null;
    return (
      <button
        onClick={onSetIntent}
        className="sticky top-0 z-30 w-full overflow-hidden backdrop-blur-xl py-2 px-4 transition-all hover:bg-primary/5 rounded-b-xl"
        style={{
          background: 'linear-gradient(90deg, hsl(43 96% 58% / 0.04), hsl(43 96% 58% / 0.02), hsl(43 96% 58% / 0.04))',
          borderBottom: '1px solid hsl(43 96% 58% / 0.1)',
        }}
      >
        <span className="text-[10px] tracking-[0.15em] uppercase font-medium text-primary/70">
          ✦ Set today's intent
        </span>
      </button>
    );
  }

  const labelColor = `hsl(${baseAccentHsl})`;
  const bgTint = `hsl(${baseAccentHsl} / 0.06)`;
  const bgEdge = `hsl(${baseAccentHsl} / 0.03)`;
  const borderTint = `hsl(${baseAccentHsl} / 0.1)`;
  const isLong = todayIntent.length > 20;

  return (
    <motion.div
      layout
      onClick={() => isLong && setIntentExpanded(prev => !prev)}
      className={cn(
        'sticky top-0 z-30 rounded-b-xl overflow-hidden backdrop-blur-xl transition-all duration-500',
        isLong && 'cursor-pointer',
      )}
      style={{
        background: intentExpanded
          ? `linear-gradient(135deg, hsl(${baseAccentHsl} / 0.08), hsl(${baseAccentHsl} / 0.03))`
          : `linear-gradient(90deg, ${bgTint}, ${bgEdge}, ${bgTint})`,
        borderBottom: `1px solid ${borderTint}`,
        borderLeft: `1px solid ${borderTint}`,
        borderRight: `1px solid ${borderTint}`,
        backdropFilter: intentExpanded ? 'blur(24px)' : 'blur(12px)',
        boxShadow: intentExpanded
          ? `0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 hsl(${baseAccentHsl} / 0.06)`
          : undefined,
      }}
    >
      {/* Collapsed: single-line snapshot with adaptive secondary phrase */}
      <div className={cn(
        'flex items-center justify-center gap-2 py-2 px-4 flex-wrap',
        intentExpanded && 'pb-1',
      )}>
        <span
          className="text-[10px] tracking-[0.15em] uppercase font-medium"
          style={{ color: labelColor }}
        >
          Today's intent
        </span>
        {!intentExpanded && (
          <span className="text-sm font-semibold text-foreground tracking-wide truncate max-w-[200px]">
            {todayIntent}
          </span>
        )}

        {/* Adaptive mode signal — the bridge */}
        <AnimatePresence mode="wait">
          {secondaryPhrase && !intentExpanded && (
            <motion.span
              key={secondaryPhrase}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 4 }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide"
              style={{
                color: `hsl(${modeAccentHsl})`,
                textShadow: `0 0 10px hsl(${modeAccentHsl} / 0.25)`,
              }}
            >
              <span style={{ color: `hsl(${modeAccentHsl} / 0.45)` }}>·</span>
              {secondaryPhrase}
            </motion.span>
          )}
        </AnimatePresence>

        {isLong && (
          <motion.span
            animate={{ rotate: intentExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="text-[10px] ml-1"
            style={{ color: `hsl(${baseAccentHsl} / 0.5)` }}
          >
            ▾
          </motion.span>
        )}
      </div>

      {/* Expanded: full affirmation */}
      <AnimatePresence>
        {intentExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="px-6 pb-3"
          >
            <p
              className="text-base font-semibold text-foreground leading-relaxed text-center tracking-wide"
              style={{
                fontFamily: 'Georgia, serif',
                textShadow: `0 0 20px hsl(${baseAccentHsl} / 0.15)`,
              }}
            >
              {todayIntent}
            </p>
            {secondaryPhrase && (
              <p
                className="mt-2 text-center text-[11px] font-medium tracking-[0.12em] uppercase"
                style={{ color: `hsl(${modeAccentHsl})` }}
              >
                · {secondaryPhrase} ·
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
