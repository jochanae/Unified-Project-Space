import { useState, useEffect, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X } from 'lucide-react';
import { useConfetti } from '@/hooks/useConfetti';

const PWAInstallCelebration = forwardRef(function PWAInstallCelebration() {
  const [show, setShow] = useState(false);
  const firedRef = useRef(false);
  const { burst } = useConfetti();

  useEffect(() => {
    const handler = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      setShow(true);
      setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.3), 300);
    };

    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
  }, [burst]);

  return (
    <AnimatePresence>
      {show && <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setShow(false)}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', damping: 20 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-xs rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
          >
            <Smartphone className="h-8 w-8 text-primary" />
          </motion.div>

          <h2 className="font-display text-lg font-bold text-foreground mb-2">
            Compani installed! 🌟
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Find your new icon on your home screen for instant access. Tap it anytime to jump right in.
          </p>

          <button
            onClick={() => setShow(false)}
            className="w-full rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Got it!
          </button>

          <button
            onClick={() => setShow(false)}
            className="absolute top-3 right-3 p-1 rounded-full hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  );
});

export default PWAInstallCelebration;
