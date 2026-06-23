// AwakeningScreen — Cinematic "Hold to Awaken" orb gate before CompanionRevealCard
// Orb shatters into a particle burst + expanding ring, then gold flash reveals the card
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ShatterBurst from './awakening/ShatterBurst';

const HOLD_DURATION = 2000; // ms

interface Props {
  onComplete: () => void;
  avatarReady?: boolean;
}

function haptic(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* */ }
}

export default function AwakeningScreen({ onComplete, avatarReady = false }: Props) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'shatter' | 'flash' | 'waiting' | 'done'>('idle');
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTime = useRef(0);
  const orbRef = useRef<HTMLDivElement>(null);

  const clearHold = useCallback(() => {
    if (holdTimer.current) {
      clearInterval(holdTimer.current);
      holdTimer.current = null;
    }
  }, []);

  const handleHoldStart = useCallback(() => {
    if (phase !== 'idle') return;
    setHolding(true);
    startTime.current = Date.now();
    haptic(10);

    holdTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / HOLD_DURATION, 1);
      setHoldProgress(progress);

      if (progress >= 1) {
        clearHold();
        setPhase('shatter');
        haptic([30, 60, 30, 60, 80]);

        // Shatter → flash → wait for avatar or proceed
        setTimeout(() => setPhase('flash'), 600);
        setTimeout(() => {
          if (avatarReady) {
            setPhase('done');
            onComplete();
          } else {
            setPhase('waiting');
          }
        }, 1100);
      }
    }, 16);
  }, [phase, clearHold, onComplete, avatarReady]);

  // When avatar becomes ready during 'waiting' phase, complete
  useEffect(() => {
    if (phase === 'waiting' && avatarReady) {
      setPhase('done');
      onComplete();
    }
  }, [phase, avatarReady, onComplete]);

  const handleHoldEnd = useCallback(() => {
    if (phase !== 'idle') return;
    setHolding(false);
    clearHold();
    setHoldProgress(0);
  }, [phase, clearHold]);

  // Trap Android back button
  useEffect(() => {
    let removeListener: (() => void) | undefined;
    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const listener = await App.addListener('backButton', () => {});
        removeListener = () => listener.remove();
      } catch { /* web */ }
    })();
    return () => removeListener?.();
  }, []);

  useEffect(() => clearHold, [clearHold]);

  if (phase === 'done') return null;

  const orbScale = 1 + holdProgress * 0.6;
  const orbGlow = 40 + holdProgress * 80;
  const ringCircumference = 2 * Math.PI * 54;
  const ringOffset = ringCircumference * (1 - holdProgress);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed inset-0 z-[9998] flex flex-col items-center justify-between bg-background overflow-hidden select-none"
      style={{ touchAction: 'none' }}
    >
      {/* Gold flash overlay */}
      <AnimatePresence>
        {phase === 'flash' && (
          <motion.div
            key="flash"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 z-50"
            style={{ background: 'hsl(var(--primary))' }}
          />
        )}
      </AnimatePresence>

      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, hsl(var(--primary) / 0.08) 0%, transparent 70%)`,
        }}
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Orb + Shatter */}
      <div ref={orbRef} className="relative flex items-center justify-center">
        {/* Shatter ring + particles — rendered on top when phase is 'shatter' or 'flash' */}
        <AnimatePresence>
          {(phase === 'shatter' || phase === 'flash') && (
            <ShatterBurst key="shatter" />
          )}
        </AnimatePresence>

        {/* The orb itself — hidden during shatter */}
        {phase === 'idle' && (
          <motion.div
            animate={
              holding
                ? { scale: orbScale, opacity: 1 }
                : { scale: [1, 1.12, 1], opacity: [0.75, 1, 0.75] }
            }
            transition={
              holding
                ? { duration: 0.1 }
                : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
            }
            className="rounded-full"
            style={{
              width: 120,
              height: 120,
              background: `radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--primary) / 0) 70%)`,
              boxShadow: `0 0 ${orbGlow}px hsl(var(--primary) / 0.45)`,
            }}
          />
        )}

        {/* Progress ring */}
        {holding && phase === 'idle' && (
          <svg
            className="absolute"
            width={120}
            height={120}
            viewBox="0 0 120 120"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle cx="60" cy="60" r="54" fill="none" stroke="hsl(var(--primary) / 0.25)" strokeWidth="3" />
            <circle
              cx="60" cy="60" r="54" fill="none"
              stroke="hsl(var(--primary))" strokeWidth="3"
              strokeDasharray={ringCircumference} strokeDashoffset={ringOffset}
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Content — hidden during shatter */}
      {phase === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-start pt-10 px-6 gap-6">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-xl font-semibold text-foreground tracking-wide text-center"
          >
            Your companion awaits
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-sm text-muted-foreground text-center max-w-[280px]"
          >
            Hold to bring them to life
          </motion.p>

          {/* Hold to Awaken */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="relative mt-4"
          >
            <button
              onPointerDown={handleHoldStart}
              onPointerUp={handleHoldEnd}
              onPointerLeave={handleHoldEnd}
              onPointerCancel={handleHoldEnd}
              className={`
                relative px-8 py-3.5 rounded-full text-sm font-semibold tracking-wide
                transition-all duration-200 select-none
                ${holding
                  ? 'bg-primary text-primary-foreground scale-95 shadow-[0_0_30px_hsl(var(--primary)/0.4)]'
                  : 'bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20'
                }
              `}
            >
              {holding ? 'Awakening…' : 'Hold to Awaken'}
            </button>
          </motion.div>
        </div>
      )}

      {/* Waiting for avatar generation */}
      {phase === 'waiting' && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-full"
            style={{
              background: `radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--primary) / 0) 70%)`,
              boxShadow: '0 0 40px hsl(var(--primary) / 0.3)',
            }}
          />
          <p className="text-sm text-muted-foreground text-center animate-pulse">
            Bringing them to life…
          </p>
        </div>
      )}

      {phase !== 'idle' && phase !== 'waiting' && <div className="flex-1" />}

      {/* Bottom safe area */}
      <div className="h-12" />
    </motion.div>
  );
}
