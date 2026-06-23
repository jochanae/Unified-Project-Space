import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hasSeenSunriseToday, isSunriseWindow } from './MorningSunrise';

const LS_KEY = 'compani-morning-wake-date';

function hasSeenWakeToday(): boolean {
  const last = localStorage.getItem(LS_KEY);
  return last === new Date().toDateString();
}

function markWakeSeen() {
  localStorage.setItem(LS_KEY, new Date().toDateString());
}

/** Should the dawn overlay fire? Morning window + not yet seen today */
export function shouldShowMorningWake(): boolean {
  return isSunriseWindow() && !hasSeenWakeToday();
}

export default function MorningWake({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    markWakeSeen();
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 600);
    }, 3200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="morning-wake"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-[60] pointer-events-none"
        >
          {/* Brightness / saturation lift */}
          <motion.div
            className="absolute inset-0"
            initial={{ filter: 'brightness(0.4) saturate(0.5)' }}
            animate={{ filter: 'brightness(1.1) saturate(1.2)' }}
            transition={{ duration: 3, ease: 'easeOut' }}
          />

          {/* Gold sunrise flare — top-left radial */}
          <motion.div
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
              filter: 'blur(120px)',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.25, scale: 1.3 }}
            transition={{ duration: 4, delay: 0.5, ease: 'easeOut' }}
          />

          {/* "First Light" sweep — gold gradient sliding across */}
          <motion.div
            className="absolute inset-0 skew-x-12"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.1) 45%, hsl(var(--primary) / 0.15) 50%, hsl(var(--primary) / 0.1) 55%, transparent 100%)',
            }}
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.3 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
