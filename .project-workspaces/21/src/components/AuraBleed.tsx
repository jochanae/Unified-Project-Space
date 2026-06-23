/**
 * AuraBleed — fullscreen radial glow transition when switching companions.
 * Creates a cinematic "atmospheric shift" that bleeds the new companion's
 * signature color across the viewport.
 */

import { motion, AnimatePresence } from 'framer-motion';

interface AuraBleedProps {
  /** Whether the transition is active */
  active: boolean;
  /** CSS color string for the incoming companion's aura */
  color: string;
}

export default function AuraBleed({ active, color }: AuraBleedProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={color}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.18, scale: 1.3 }}
          exit={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[60] pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
            filter: 'blur(80px)',
          }}
        />
      )}
    </AnimatePresence>
  );
}

/** Map personality/connection traits to an aura color */
export function getCompanionAuraColor(connection?: {
  personality?: string | null;
  connectionMode?: string;
  gender?: string | null;
}): string {
  if (!connection) return 'hsl(45 80% 55%)'; // default gold

  const mode = connection.connectionMode || '';
  const personality = (connection.personality || '').toLowerCase();

  // Partner / romantic → warm rose-gold
  if (mode === 'partner' || mode === 'romantic') return 'hsl(350 60% 60%)';
  // Mentor → deep indigo
  if (mode === 'mentor') return 'hsl(262 55% 62%)';
  // Playful personalities → cyan
  if (personality.includes('playful') || personality.includes('witty')) return 'hsl(185 70% 55%)';
  // Gentle / nurturing → soft violet
  if (personality.includes('gentle') || personality.includes('nurturing')) return 'hsl(280 50% 60%)';
  // Default → gold (signature Compani)
  return 'hsl(45 80% 55%)';
}
