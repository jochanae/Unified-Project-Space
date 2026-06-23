/**
 * StrategistModeAura — ambient visual signal that Strategist Mode is active.
 *
 * - Deeper obsidian frosted-glass wash across the chat container
 * - Thin gold ring along the bottom edge (anchors the input area)
 * - Subtle animated gold spark in the bottom-right corner
 * - "Strategist Mode" chip rendered separately by the consumer (header)
 *
 * All HSL via design tokens. Theme-respecting. No popup, no banner.
 * Fires for every user, free or paid — pure ambient validation.
 */

import { motion, AnimatePresence } from 'framer-motion';

interface StrategistModeAuraProps {
  active: boolean;
}

export default function StrategistModeAura({ active }: StrategistModeAuraProps) {
  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Deeper obsidian wash — sits above the regular background */}
          <motion.div
            key="strategist-obsidian"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 30%, hsl(var(--primary) / 0.04) 0%, hsl(0 0% 0% / 0.45) 60%, hsl(0 0% 0% / 0.55) 100%)',
              backdropFilter: 'blur(2px)',
            }}
          />

          {/* Gold ring along the bottom — anchors the input area */}
          <motion.div
            key="strategist-bottom-ring"
            initial={{ opacity: 0, scaleX: 0.6 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0.6 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-px origin-center"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.45) 50%, transparent 100%)',
              boxShadow: '0 0 12px hsl(var(--primary) / 0.35)',
            }}
          />

          {/* Subtle spark in bottom-right corner */}
          <motion.div
            key="strategist-spark"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0.45, 0.15] }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="pointer-events-none fixed bottom-6 right-6 z-10 h-1.5 w-1.5 rounded-full"
            style={{
              background: 'hsl(var(--primary))',
              boxShadow: '0 0 12px hsl(var(--primary) / 0.6), 0 0 24px hsl(var(--primary) / 0.3)',
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * StrategistModeChip — the visible label that fades in beside the
 * companion's name in the header. Separate component so the consumer
 * can place it precisely.
 */
export function StrategistModeChip({ active }: { active: boolean }) {
  return (
    <AnimatePresence>
      {active && (
        <motion.span
          initial={{ opacity: 0, scale: 0.85, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 2 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="ml-1.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.15em]"
          style={{
            color: 'hsl(var(--primary))',
            borderColor: 'hsl(var(--primary) / 0.3)',
            background: 'hsl(var(--primary) / 0.08)',
            textShadow: '0 0 8px hsl(var(--primary) / 0.4)',
          }}
        >
          <span className="inline-block h-1 w-1 rounded-full" style={{ background: 'hsl(var(--primary))' }} />
          Strategist
        </motion.span>
      )}
    </AnimatePresence>
  );
}
