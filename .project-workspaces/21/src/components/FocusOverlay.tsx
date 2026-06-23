import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getAtmosphereTheme } from '@/hooks/useSanctuaryTheme';
import { useState, useEffect } from 'react';
import type { SanctuaryAtmosphere } from '@/hooks/useSanctuaryTheme';

interface FocusOverlayProps {
  active: boolean;
}

/**
 * Full-screen atmospheric overlay for Focus / Flight Mode.
 * Uses breathing mesh gradients driven by the selected Sanctuary Atmosphere.
 * Portaled to document.body so it sits above GlobalBackdrop.
 */
export default function FocusOverlay({ active }: FocusOverlayProps) {
  // Listen for atmosphere changes
  const [atmosphere, setAtmosphere] = useState<SanctuaryAtmosphere | undefined>();
  useEffect(() => {
    const stored = localStorage.getItem('compani-sanctuary-atmosphere') as SanctuaryAtmosphere | null;
    if (stored) setAtmosphere(stored);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) setAtmosphere(detail);
    };
    window.addEventListener('sanctuary-atmosphere-change', handler);
    return () => window.removeEventListener('sanctuary-atmosphere-change', handler);
  }, []);

  const theme = getAtmosphereTheme(atmosphere);

  return createPortal(
    <AnimatePresence>
      {active && (
        <motion.div
          key="focus-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 3, ease: 'easeInOut' }}
          className="fixed inset-0 z-[2] pointer-events-none"
          aria-hidden
        >
          {/* Deep base gradient */}
          <div
            className="absolute inset-0"
            style={{ background: theme.base }}
          />

          {/* Breathing mesh gradient layers */}
          {theme.meshLayers.map((layer, i) => (
            <motion.div
              key={`mesh-${theme.id}-${i}`}
              className="absolute inset-0"
              animate={{
                opacity: [layer.opacityRange[0], layer.opacityRange[1], layer.opacityRange[0]],
              }}
              transition={{
                duration: layer.duration,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: layer.delay ?? 0,
              }}
              style={{ background: layer.gradient }}
            />
          ))}

          {/* Subtle moving mesh — slow position drift for "living" feel */}
          <motion.div
            className="absolute inset-0"
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
            }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              backgroundSize: '200% 200%',
              background: `
                radial-gradient(ellipse at 30% 70%, hsl(${theme.accentHsl} / 0.04) 0%, transparent 50%),
                radial-gradient(ellipse at 70% 30%, hsl(${theme.accentHsl} / 0.03) 0%, transparent 50%)
              `,
              opacity: 0.6,
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
