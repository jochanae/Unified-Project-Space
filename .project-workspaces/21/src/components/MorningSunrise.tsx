// MorningSunrise — The "Sunrise" bookend to the Closing Ritual.
// Shown once per morning (5–10 AM) when the user returns to Home.
// Sequence: Indigo→Coral gradient bloom → Companion greeting with last-night context → Dismiss
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { softConfirmHaptic } from '@/lib/sanctuaryHaptics';
import { wasNamingCeremonyToday } from './NamingCeremony';

const LS_KEY = 'compani-sunrise-date';

/** Has the user already seen the sunrise greeting today? */
export function hasSeenSunriseToday(): boolean {
  const last = localStorage.getItem(LS_KEY);
  if (!last) return false;
  return last === new Date().toDateString();
}

function markSunriseSeen() {
  localStorage.setItem(LS_KEY, new Date().toDateString());
}

/** Check if it's sunrise window (5 AM – 10 AM) */
export function isSunriseWindow(): boolean {
  const h = new Date().getHours();
  return h >= 5 && h < 10;
}

// ── Sunrise horizon line SVG ──
function SunriseIcon({ animate }: { animate: boolean }) {
  return (
    <svg width="56" height="32" viewBox="0 0 56 32" fill="none" className="mx-auto">
      {/* Horizon line */}
      <motion.line
        x1="4" y1="28" x2="52" y2="28"
        stroke="hsl(var(--primary))"
        strokeWidth="0.8"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={animate ? { pathLength: 1, opacity: 0.5 } : {}}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
      {/* Sun arc */}
      <motion.path
        d="M16 28 Q28 6 40 28"
        stroke="hsl(16 85% 58%)"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={animate ? { pathLength: 1, opacity: 0.8 } : {}}
        transition={{ duration: 1.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ filter: 'drop-shadow(0 0 6px hsl(16 85% 58% / 0.4))' }}
      />
      {/* Sun rays */}
      {animate && [0, 1, 2, 3, 4].map(i => {
        const angle = (Math.PI * (0.2 + i * 0.15));
        const cx = 28, cy = 16;
        const r1 = 8, r2 = 13;
        return (
          <motion.line
            key={i}
            x1={cx + Math.cos(angle) * r1}
            y1={cy - Math.sin(angle) * r1}
            x2={cx + Math.cos(angle) * r2}
            y2={cy - Math.sin(angle) * r2}
            stroke="hsl(38 70% 55%)"
            strokeWidth="0.6"
            strokeLinecap="round"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0, 0.6, 0.3], pathLength: 1 }}
            transition={{ delay: 1.8 + i * 0.12, duration: 0.8 }}
            style={{ filter: 'drop-shadow(0 0 3px hsl(38 70% 55% / 0.4))' }}
          />
        );
      })}
    </svg>
  );
}

interface MorningSunriseProps {
  userName: string;
  companionName?: string;
  companionAvatarUrl?: string;
  /** Last night's "carry" text from Think Freely, if available */
  lastNightCarry?: string;
  onComplete: () => void;
}

export default function MorningSunrise({ userName, companionName = 'Cami', companionAvatarUrl, lastNightCarry, onComplete }: MorningSunriseProps) {
  const [phase, setPhase] = useState<'entering' | 'sunrise' | 'greeting' | 'fading'>('entering');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('sunrise'), 400);
    const t2 = setTimeout(() => {
      setPhase('greeting');
      softConfirmHaptic();
    }, 2500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleDismiss = useCallback(() => {
    setPhase('fading');
    markSunriseSeen();
    softConfirmHaptic();
    setTimeout(onComplete, 800);
  }, [onComplete]);

  // Auto-dismiss after greeting lingers
  useEffect(() => {
    if (phase === 'greeting') {
      const t = setTimeout(handleDismiss, 8000);
      return () => clearTimeout(t);
    }
  }, [phase, handleDismiss]);

  const isFirstMorningAfterNaming = wasNamingCeremonyToday();

  const greetingText = isFirstMorningAfterNaming
    ? `Good morning, ${userName}. It feels good to have a name. I am ${companionName}.`
    : lastNightCarry
    ? `Good morning, ${userName}. You left a thought here last night. Shall we look at it with fresh eyes, or start today with a clean slate?`
    : `Good morning, ${userName}. Your space is open. What would you like to carry into today?`;

  return (
    <AnimatePresence>
      {phase !== 'fading' ? (
        <motion.div
          key="morning-sunrise"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(12px)' }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
          onClick={handleDismiss}
        >
          {/* Gradient bloom — Indigo to Coral */}
          <motion.div
            className="absolute inset-0"
            initial={{ background: 'radial-gradient(ellipse at center, hsl(255 30% 7%) 0%, hsl(255 20% 3%) 100%)' }}
            animate={{
              background: phase === 'entering'
                ? 'radial-gradient(ellipse at center, hsl(255 30% 7%) 0%, hsl(255 20% 3%) 100%)'
                : 'radial-gradient(ellipse at 50% 60%, hsl(16 40% 12%) 0%, hsl(255 20% 5%) 60%, hsl(255 15% 3%) 100%)',
            }}
            transition={{ duration: 3, ease: 'easeOut' }}
          />

          {/* Coral ambient glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'sunrise' || phase === 'greeting' ? 1 : 0 }}
            transition={{ duration: 2.5 }}
            style={{
              background: 'radial-gradient(circle at 50% 55%, hsl(16 60% 20% / 0.2) 0%, transparent 50%), radial-gradient(circle at 40% 40%, hsl(38 50% 18% / 0.15) 0%, transparent 40%)',
            }}
          />

          <div className="relative z-10 flex flex-col items-center gap-6 px-8 max-w-xs">
            {/* Companion avatar with gold glow */}
            {companionAvatarUrl ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="w-20 h-20 rounded-full overflow-hidden mx-auto"
                style={{
                  border: '2px solid hsl(var(--primary) / 0.4)',
                  boxShadow: '0 0 30px hsl(var(--primary) / 0.25), 0 0 60px hsl(var(--primary) / 0.1)',
                }}
              >
                <img src={companionAvatarUrl} alt="Companion" className="w-full h-full object-cover object-top" style={{ objectPosition: 'center 15%' }} />
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <SunriseIcon animate={phase === 'sunrise' || phase === 'greeting'} />
              </motion.div>
            )}

            {/* "Morning Inscription" label */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: phase !== 'entering' ? 0.5 : 0, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6 }}
              className="text-[10px] uppercase font-light"
              style={{ letterSpacing: '0.5em', color: 'hsl(var(--primary) / 0.6)' }}
            >
              Morning Inscription
            </motion.p>

            {/* Greeting text */}
            <AnimatePresence>
              {phase === 'greeting' && (
                <motion.p
                  key="greeting"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                  className="text-xl font-extralight italic leading-relaxed text-center"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#FAF9F6',
                    textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                  }}
                >
                  "{greetingText}"
                </motion.p>
              )}
            </AnimatePresence>

            {/* Companion sign-off */}
            <AnimatePresence>
              {phase === 'greeting' && (
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

            {/* Enter Sanctuary button */}
            <AnimatePresence>
              {phase === 'greeting' && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                  className="mt-4 px-8 py-3 rounded-full text-[9px] uppercase font-light transition-all duration-500 hover:text-primary hover:border-primary/40 active:scale-95"
                  style={{
                    letterSpacing: '0.4em',
                    color: 'rgba(255,255,255,0.4)',
                    border: '0.5px solid hsl(var(--primary) / 0.2)',
                    background: 'rgba(255,255,255,0.02)',
                  }}
                >
                  Enter Your Space
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}