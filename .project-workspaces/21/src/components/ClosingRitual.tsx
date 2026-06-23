// ClosingRitual — The "Indigo Fade" evening bookend to the Opening Envelope.
// Triggered after extended inactivity on Home after 9 PM, or when user taps a "rest" action.
// Sequence: Padlock draw → Whisper text → Ambient fade-out → Reverse heartbeat haptic → Dismiss
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { closingRitualHaptic } from '@/lib/sanctuaryHaptics';

const LS_LAST_CLOSING = 'compani-closing-ritual-date';

/** Has the user already seen the closing ritual tonight? */
export function hasSeenClosingTonight(): boolean {
  const last = localStorage.getItem(LS_LAST_CLOSING);
  if (!last) return false;
  const today = new Date().toDateString();
  return last === today;
}

function markClosingSeen() {
  localStorage.setItem(LS_LAST_CLOSING, new Date().toDateString());
}

// ── Padlock SVG (wireframe draw — mirrors the Golden Key) ──
function GoldenPadlock({ animate }: { animate: boolean }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className="mx-auto">
      {/* Shackle */}
      <motion.path
        d="M15 18 V14 C15 9.03 18.03 6 22 6 C25.97 6 29 9.03 29 14 V18"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={animate ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))' }}
      />
      {/* Body */}
      <motion.rect
        x="12" y="18" width="20" height="16" rx="3"
        stroke="hsl(var(--primary))"
        strokeWidth="1"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={animate ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.4))' }}
      />
      {/* Keyhole */}
      <motion.circle
        cx="22" cy="26" r="2"
        stroke="hsl(var(--primary))"
        strokeWidth="0.8"
        fill="none"
        initial={{ scale: 0, opacity: 0 }}
        animate={animate ? { scale: 1, opacity: 1 } : {}}
        transition={{ delay: 1.6, duration: 0.4 }}
        style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.5))' }}
      />
      {/* Shimmer pulse after draw */}
      {animate && (
        <motion.rect
          x="12" y="18" width="20" height="16" rx="3"
          stroke="hsl(var(--primary))"
          strokeWidth="0.4"
          fill="none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0] }}
          transition={{ delay: 2.5, duration: 2, repeat: Infinity, repeatDelay: 4 }}
          style={{ filter: 'drop-shadow(0 0 10px hsl(var(--primary) / 0.5))' }}
        />
      )}
    </svg>
  );
}

interface ClosingRitualProps {
  userName: string;
  companionName?: string;
  /** Optional contextual whisper — e.g. if user shared a win today */
  customWhisper?: string;
  onComplete: () => void;
}

export default function ClosingRitual({ userName, companionName = 'Cami', customWhisper, onComplete }: ClosingRitualProps) {
  const [phase, setPhase] = useState<'entering' | 'padlock' | 'whisper' | 'fading'>('entering');

  useEffect(() => {
    // Phase 1 → Padlock draw
    const t1 = setTimeout(() => setPhase('padlock'), 600);
    // Phase 2 → Whisper text
    const t2 = setTimeout(() => setPhase('whisper'), 3200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleDismiss = useCallback(() => {
    setPhase('fading');
    markClosingSeen();
    closingRitualHaptic();
    setTimeout(onComplete, 1200);
  }, [onComplete]);

  // Auto-dismiss after whisper lingers
  useEffect(() => {
    if (phase === 'whisper') {
      const t = setTimeout(handleDismiss, 6000);
      return () => clearTimeout(t);
    }
  }, [phase, handleDismiss]);

  const whisperText = customWhisper || `The day is held, ${userName}. Sleep well.`;

  return (
    <AnimatePresence>
      {phase !== 'fading' ? (
        <motion.div
          key="closing-ritual"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(16px)' }}
          transition={{ duration: 1.2 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
          onClick={handleDismiss}
          style={{
            background: 'radial-gradient(ellipse at center, hsl(255 30% 7%) 0%, hsl(255 20% 3%) 100%)',
          }}
        >
          {/* Indigo ambient glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2 }}
            style={{
              background: 'radial-gradient(circle at 50% 40%, hsl(255 40% 18% / 0.3) 0%, transparent 55%), radial-gradient(circle at 60% 70%, hsl(270 30% 12% / 0.2) 0%, transparent 45%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-6 px-8">
            {/* Padlock animation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <GoldenPadlock animate={phase === 'padlock' || phase === 'whisper'} />
            </motion.div>

            {/* "Space Secured" label */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: phase === 'padlock' || phase === 'whisper' ? 0.4 : 0, y: 0 }}
              transition={{ delay: 2, duration: 0.6 }}
              className="text-[9px] uppercase tracking-[0.25em]"
              style={{ color: 'hsl(var(--primary) / 0.5)', fontFamily: 'Georgia, serif' }}
            >
              Space Secured
            </motion.p>

            {/* Whisper text */}
            <AnimatePresence>
              {phase === 'whisper' && (
                <motion.p
                  key="whisper"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  className="text-[13px] leading-[1.8] text-center max-w-[260px]"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#E5E4E2',
                    textShadow: '0 1px 4px rgba(0,0,0,0.6)',
                  }}
                >
                  {whisperText}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Cami sign-off */}
            <AnimatePresence>
              {phase === 'whisper' && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                  className="text-[11px]"
                  style={{ fontFamily: 'Georgia, serif', color: 'hsl(var(--primary) / 0.7)' }}
                >
                  — {companionName}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}