import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Color presets ──
const BLOOM_COLORS = {
  premium: { ring: 'rgba(212,175,55,0.7)', particle: '#D4AF37', glow: 'rgba(212,175,55,0.3)' },
  moment:  { ring: 'rgba(168,85,247,0.6)', particle: '#A855F7', glow: 'rgba(168,85,247,0.25)' },
} as const;

type BloomVariant = keyof typeof BLOOM_COLORS;

interface CelestialBloomProps {
  active: boolean;
  variant?: BloomVariant;
  onComplete?: () => void;
}

// Generate deterministic particle trajectories
function makeParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const distance = 140 + Math.random() * 180;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      delay: Math.random() * 0.3,
      size: 3 + Math.random() * 4,
    };
  });
}

const PARTICLES = makeParticles(14);

export default function CelestialBloom({ active, variant = 'premium', onComplete }: CelestialBloomProps) {
  const colors = BLOOM_COLORS[variant];

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Backdrop dim */}
          <motion.div
            key="bloom-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6 } }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[60] pointer-events-none"
            style={{ background: 'radial-gradient(circle at 50% 60%, rgba(10,10,30,0.6) 0%, rgba(0,0,0,0.4) 100%)' }}
          />

          {/* Shockwave rings */}
          <div className="fixed inset-0 z-[61] pointer-events-none flex items-center justify-center">
            {[0, 0.15, 0.3].map((delay, idx) => (
              <motion.div
                key={`ring-${idx}`}
                initial={{ scale: 0.1, opacity: 0.9 }}
                animate={{ scale: 3.5 + idx * 0.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4 + idx * 0.2, delay, ease: 'easeOut' }}
                className="absolute rounded-full"
                style={{
                  width: 120,
                  height: 120,
                  border: `${2 - idx * 0.5}px solid ${colors.ring}`,
                  boxShadow: `0 0 ${20 - idx * 4}px ${colors.glow}`,
                }}
              />
            ))}

            {/* Central flash */}
            <motion.div
              key="flash"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute rounded-full"
              style={{
                width: 60,
                height: 60,
                background: `radial-gradient(circle, ${colors.particle} 0%, transparent 70%)`,
              }}
            />

            {/* Traveling particles */}
            {PARTICLES.map((p) => (
              <motion.div
                key={`particle-${p.id}`}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.2 }}
                transition={{ duration: 1.6, delay: 0.2 + p.delay, ease: 'circOut' }}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  backgroundColor: colors.particle,
                  filter: 'blur(1px)',
                  boxShadow: `0 0 8px ${colors.particle}`,
                }}
              />
            ))}
          </div>

          {/* Avatar pulse ring — targets center-bottom area where avatar typically is */}
          <motion.div
            key="avatar-pulse"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.3, 1.5] }}
            transition={{ duration: 1.2, delay: 1.0, ease: 'easeOut' }}
            onAnimationComplete={() => {
              // Haptic feedback on mobile
              if (navigator?.vibrate) navigator.vibrate([30, 20, 60]);
              onComplete?.();
            }}
            className="fixed z-[62] pointer-events-none rounded-full"
            style={{
              width: 80,
              height: 80,
              top: '30%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: `3px solid ${colors.particle}`,
              boxShadow: `0 0 30px ${colors.glow}, inset 0 0 20px ${colors.glow}`,
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ── Hook for easy triggering ──
export function useCelestialBloom() {
  const [bloomState, setBloomState] = useState<{ active: boolean; variant: BloomVariant }>({
    active: false,
    variant: 'premium',
  });
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const triggerBloom = useCallback((variant: BloomVariant = 'premium') => {
    // Haptic on trigger
    if (navigator?.vibrate) navigator.vibrate([10, 5, 40]);

    setBloomState({ active: true, variant });

    // Auto-dismiss after animation completes
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setBloomState({ active: false, variant: 'premium' });
    }, 2800);
  }, []);

  const dismissBloom = useCallback(() => {
    setBloomState({ active: false, variant: 'premium' });
  }, []);

  return { bloomState, triggerBloom, dismissBloom };
}
