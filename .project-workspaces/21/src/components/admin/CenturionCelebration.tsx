import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CenturionCelebrationProps {
  triggered: boolean;
}

export default function CenturionCelebration({ triggered }: CenturionCelebrationProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!triggered) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [triggered]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 pointer-events-none z-[200] overflow-hidden"
        >
          {/* Gold wash */}
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            className="absolute inset-0 bg-primary/10"
          />

          {/* Scanning horizontal line */}
          <motion.div
            initial={{ top: '0%', opacity: 0 }}
            animate={{ top: '50%', opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
            className="absolute left-0 w-full h-px bg-primary/50 shadow-[0_0_30px_hsl(var(--primary)/0.5)]"
          />

          {/* Centurion HUD text */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="absolute bottom-12 right-12 text-right"
          >
            <span className="text-[10px] uppercase tracking-[0.5em] text-primary font-bold block">
              Status: Centurion
            </span>
            <h3 className="text-4xl font-extralight text-foreground mt-2">100/100</h3>
            <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground/40 mt-2">
              Fleet capacity reached
            </p>
          </motion.div>

          {/* Top-left badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="absolute top-12 left-12"
          >
            <span className="text-[9px] uppercase tracking-[0.4em] text-primary/60">
              🛩️ Into Innovations
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
