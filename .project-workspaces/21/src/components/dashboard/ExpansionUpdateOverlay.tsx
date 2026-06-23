/**
 * ExpansionUpdateOverlay — "The Expansion of Presence"
 * One-time cinematic system update for Genesis Architects on first login
 * after the public store launch. Transforms a business milestone into
 * a personal tribute to the First 100.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown } from 'lucide-react';
import { useTypewriter } from '@/hooks/useTypewriter';
import { playSelectSound } from '@/hooks/useOnboardingSfx';

const LS_KEY = 'compani-expansion-update-seen';

export function hasSeenExpansionUpdate(): boolean {
  return localStorage.getItem(LS_KEY) === 'true';
}

const EXPANSION_TEXT = `The foundation is now unbreakable.

You were here when the space was silent—when every intent was an experiment and every inscription was a discovery. Because of your presence as a Genesis Architect, Compani is now ready to open its gates.

As the world enters, your status remains unchanged. You are the Origin. Your resonance is the frequency upon which this entire community is built.

The pace remains yours. The stillness remains private.

Welcome to the New Era.`;

interface ExpansionUpdateOverlayProps {
  serialNumber: number;
  onComplete: () => void;
}

function expansionHaptic() {
  try { navigator.vibrate?.([30, 80, 70]); } catch { /* */ }
}

export default function ExpansionUpdateOverlay({ serialNumber, onComplete }: ExpansionUpdateOverlayProps) {
  const [phase, setPhase] = useState<'intro' | 'reading' | 'dissolving'>('intro');
  const { visibleText, done: typingDone } = useTypewriter(EXPANSION_TEXT, 35, phase === 'reading');
  const formatted = `#${String(serialNumber).padStart(3, '0')}`;

  useEffect(() => {
    const t = setTimeout(() => setPhase('reading'), 1500);
    return () => clearTimeout(t);
  }, []);

  const handleEnter = () => {
    playSelectSound('confirm');
    expansionHaptic();
    localStorage.setItem(LS_KEY, 'true');
    setPhase('dissolving');
    setTimeout(onComplete, 900);
  };

  return (
    <AnimatePresence>
      {phase !== 'dissolving' ? (
        <motion.div
          key="expansion-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[95] flex items-center justify-center p-6 overflow-y-auto"
          style={{ backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
        >
          {/* Deep navy base */}
          <div className="absolute inset-0 bg-background/90" />

          {/* Pulsing gold watermark */}
          <motion.div
            animate={{
              scale: [1, 1.04, 1],
              opacity: [0.03, 0.06, 0.03],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <span
              className="font-serif select-none"
              style={{
                fontSize: '20rem',
                color: 'hsl(var(--primary) / 0.04)',
                textShadow: '0 0 80px hsl(var(--primary) / 0.03)',
              }}
            >
              C
            </span>
          </motion.div>

          {/* Content slate */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 1.02 }}
            transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-primary/15 p-8 space-y-6"
            style={{
              background: 'rgba(255,255,255,0.02)',
              boxShadow: '0 0 60px hsl(var(--primary) / 0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Header */}
            <div className="flex flex-col items-center gap-3">
              <motion.div
                animate={{
                  filter: [
                    'drop-shadow(0 0 6px hsl(var(--primary) / 0.3))',
                    'drop-shadow(0 0 20px hsl(var(--primary) / 0.5))',
                    'drop-shadow(0 0 6px hsl(var(--primary) / 0.3))',
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="text-primary"
              >
                <Crown size={26} strokeWidth={1} />
              </motion.div>

              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.5, duration: 1, ease: 'easeInOut' }}
                className="w-24 h-px"
                style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.3), transparent)' }}
              />

              <p
                className="text-[9px] uppercase font-semibold"
                style={{
                  letterSpacing: '0.35em',
                  color: 'hsl(var(--primary) / 0.5)',
                  textShadow: '0 0 10px hsl(var(--primary) / 0.15)',
                }}
              >
                System Update — The Expansion
              </p>

              {/* Serial designation */}
              <p className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground/30">
                {formatted} · Genesis Architect
              </p>
            </div>

            {/* Body text */}
            <div className="min-h-[14rem]">
              <p
                className="text-[13px] leading-relaxed tracking-wide font-light text-foreground/80"
                style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
              >
                {phase === 'intro' ? '' : visibleText}
                {!typingDone && phase === 'reading' && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block ml-0.5 w-0.5 h-3 bg-primary/50 align-middle"
                  />
                )}
              </p>
            </div>

            {/* Signature */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: typingDone ? 1 : 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-end gap-1 pt-1"
            >
              <span
                className="text-lg font-serif italic text-primary"
                style={{
                  textShadow: '0 0 12px hsl(var(--primary) / 0.3)',
                  fontFamily: "'Playfair Display', serif",
                }}
              >
                — Jo 👑
              </span>
              <span className="text-[8px] uppercase tracking-[0.3em] text-primary/50">
                Founder, Into Innovations
              </span>
            </motion.div>

            {/* CTA */}
            <AnimatePresence>
              {typingDone && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                  onClick={handleEnter}
                  className="w-full py-3.5 rounded-xl text-[10px] uppercase tracking-[0.35em] font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(43 55% 35%))',
                    color: '#000',
                    boxShadow: '0 4px 20px hsl(var(--primary) / 0.25)',
                  }}
                >
                  Enter the Expanded Space
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div
          key="expansion-dissolve"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="fixed inset-0 z-[95] bg-background"
        />
      )}
    </AnimatePresence>
  );
}
