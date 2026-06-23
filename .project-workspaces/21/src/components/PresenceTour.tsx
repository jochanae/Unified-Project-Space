import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import camiAvatar from '@/assets/cami-avatar.jpg';

interface PresenceTourProps {
  companionName: string;
  onOpenChat: () => void;
  onSkip?: () => void;
}

const STEPS = [
  {
    id: 'arrival',
    target: null as string | null,
    copy: "Nothing here is by accident. You're exactly where you need to be.",
  },
  {
    id: 'moment',
    target: 'cami-moment-card',
    copy: "This updates with you. It's been paying attention.",
  },
  {
    id: 'checkin',
    target: 'cami-checkin-card',
    copy: "Your day starts here. Meet it as you are.",
  },
  {
    id: 'momentum',
    target: 'cami-momentum-card',
    copy: "This is where things move. It moves when you do.",
  },
  {
    id: 'space',
    target: 'cami-space-card',
    copy: "The quiet part of this place. It's yours.",
  },
  {
    id: 'handoff',
    target: 'cami-companion',
    copy: null as string | null,
  },
];

interface BloomState {
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  visible: boolean;
}

export default function PresenceTour({ companionName, onOpenChat, onSkip }: PresenceTourProps) {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [bloom, setBloom] = useState<BloomState>({
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    radius: 12,
    visible: false,
  });
  const timeoutsRef = useRef<number[]>([]);

  // Decide whether to show on first visit only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('compani-presence-tour-done') === 'true') return;
    localStorage.setItem('compani-presence-tour-done', 'true');
    setMounted(true);
  }, []);

  // Lock background scrolling while the tour is active
  useEffect(() => {
    if (!mounted) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [mounted]);

  const clearTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => window.clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const measureTarget = useCallback((targetId: string) => {
    const el = document.getElementById(targetId);
    if (!el) {
      setBloom((b) => ({ ...b, visible: false }));
      return false;
    }

    const rect = el.getBoundingClientRect();
    const radiusStr = window.getComputedStyle(el).borderRadius;
    const radiusNum = Number.parseFloat(radiusStr);

    setBloom({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      w: rect.width,
      h: rect.height,
      radius: Number.isFinite(radiusNum) ? radiusNum : 16,
      visible: true,
    });

    return true;
  }, []);

  // Scroll + bloom timing whenever step changes
  useEffect(() => {
    if (!mounted) return;
    clearTimers();

    const step = STEPS[stepIndex];

    if (!step.target) {
      setBloom((b) => ({ ...b, visible: false }));
      return;
    }

    setBloom((b) => ({ ...b, visible: false }));

    const isHandoff = step.id === 'handoff';

    const attemptMeasure = (attempt = 0, previousTop?: number, previousLeft?: number) => {
      const el = document.getElementById(step.target!);
      if (!el) {
        if (attempt < 6) {
          const retry = window.setTimeout(() => attemptMeasure(attempt + 1, previousTop, previousLeft), 120);
          timeoutsRef.current.push(retry);
        }
        return;
      }

      const rect = el.getBoundingClientRect();
      const currentTop = Math.round(rect.top);
      const currentLeft = Math.round(rect.left);
      const isStable =
        previousTop !== undefined &&
        previousLeft !== undefined &&
        Math.abs(previousTop - currentTop) <= 1 &&
        Math.abs(previousLeft - currentLeft) <= 1;
      const isOffscreen = rect.bottom <= 0 || rect.top >= window.innerHeight;

      if ((isOffscreen || !isStable) && attempt < 6) {
        const retry = window.setTimeout(() => attemptMeasure(attempt + 1, currentTop, currentLeft), 120);
        timeoutsRef.current.push(retry);
        return;
      }

      measureTarget(step.target!);
    };

    const leadIn = window.setTimeout(() => {
      if (isHandoff) {
        const top = document.getElementById('cami-arrival');
        if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        const el = document.getElementById(step.target!);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const settle = window.setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            attemptMeasure();
          });
        });
      }, isHandoff ? 500 : 700);

      timeoutsRef.current.push(settle);
    }, 400);

    timeoutsRef.current.push(leadIn);

    return () => clearTimers();
  }, [stepIndex, mounted, measureTarget, clearTimers]);

  // Recompute bloom when the mobile viewport shifts
  useEffect(() => {
    if (!mounted) return;

    const onResize = () => {
      const step = STEPS[stepIndex];
      if (!step.target) return;
      requestAnimationFrame(() => {
        measureTarget(step.target!);
      });
    };

    window.addEventListener('resize', onResize);
    window.visualViewport?.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.visualViewport?.removeEventListener('resize', onResize);
    };
  }, [stepIndex, mounted, measureTarget]);

  const handleNext = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem('compani-presence-tour-done', 'true');
    setMounted(false);
    onOpenChat();
  }, [onOpenChat]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('compani-presence-tour-done', 'true');
    setMounted(false);
    onSkip?.();
  }, [onSkip]);

  if (!mounted) return null;

  const currentStep = STEPS[stepIndex];
  const bloomRadiusX = Math.max(bloom.w * 0.8, 170);
  const bloomRadiusY = Math.max(bloom.h * 0.95, 130);

  return (
    <>
      {/* LAYER 1 — Dim layer */}
      <div
        className="fixed inset-0 z-[200]"
        style={{
          background: 'hsl(0 0% 0% / 0.34)',
          backdropFilter: 'blur(12px) brightness(0.32)',
          WebkitBackdropFilter: 'blur(12px) brightness(0.32)',
          pointerEvents: 'none',
        }}
      />

      {/* LAYER 2 — Bloom layer (steps with target only) */}
      {bloom.visible && (
        <>
          <motion.div
            key={`bloom-${stepIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed inset-0 z-[201] pointer-events-none"
            style={{
              background: `radial-gradient(${bloomRadiusX}px ${bloomRadiusY}px at ${bloom.x}px ${bloom.y}px, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.74) 100%)`,
            }}
          />
          {/* Amber glow ring around the target */}
          <motion.div
            key={`ring-${stepIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="fixed z-[201] pointer-events-none"
            style={{
              left: bloom.x - bloom.w / 2,
              top: bloom.y - bloom.h / 2,
              width: bloom.w,
              height: bloom.h,
              borderRadius: bloom.radius,
              animation: 'camiBloomPulse 1.8s ease-in-out infinite',
            }}
          />
        </>
      )}

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="fixed top-5 right-4 z-[203] text-[11px] text-white/35 hover:text-white/60 transition-colors tracking-wide"
      >
        Skip
      </button>

      {/* LAYER 3 — Cami panel */}
      <div className="fixed bottom-6 left-4 right-4 mx-auto max-w-sm z-[202]">
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-white/20 bg-black/60 backdrop-blur-xl px-5 py-4 shadow-[0_0_40px_rgba(212,175,80,0.12)]"
          >
            {/* Cami avatar + name row */}
            <div className="flex items-center gap-3 mb-3">
              <img
                src={camiAvatar}
                alt="Cami"
                className="h-9 w-9 rounded-full object-cover border border-primary/30 shadow-[0_0_12px_rgba(212,175,80,0.2)]"
              />
              <span className="text-[11px] font-semibold tracking-widest uppercase text-primary/70">
                Cami
              </span>
            </div>

            {/* Copy */}
            <p className="text-sm text-white/85 leading-relaxed font-light tracking-wide">
              {currentStep.id === 'handoff'
                ? `You're all set. ${companionName} has been waiting.`
                : currentStep.copy}
            </p>

            {/* Navigation */}
            <div className="mt-4 flex items-center justify-between">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === stepIndex
                        ? 'w-4 h-1.5 bg-primary/70'
                        : i < stepIndex
                        ? 'w-1.5 h-1.5 bg-primary/30'
                        : 'w-1.5 h-1.5 bg-white/15'
                    }`}
                  />
                ))}
              </div>

              {/* Action button */}
              {currentStep.id === 'handoff' ? (
                <button
                  onClick={handleComplete}
                  className="text-xs font-semibold text-primary tracking-wide hover:text-primary/80 transition-colors"
                >
                  Say hello →
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="text-xs font-semibold text-white/70 hover:text-white transition-colors"
                >
                  Continue →
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}
