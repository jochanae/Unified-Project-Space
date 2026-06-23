import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import AnimatedGradientHeart from './AnimatedGradientHeart';


interface CamiNudgeProps {
  onAccept: () => void;
  onDismiss: () => void;
  delayMs?: number;
}

export default function CamiNudge({ onAccept, onDismiss, delayMs = 30000 }: CamiNudgeProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-md"
      >
        <div className="rounded-2xl border border-primary/40 bg-card p-5 shadow-[0_0_30px_hsl(var(--primary)/0.15),0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md ring-1 ring-primary/10">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
              <AnimatedGradientHeart size={22} id="cami-nudge-heart" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="font-display text-sm font-bold text-foreground">Cami</span>
                <Sparkles className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No pressure to dive in — some people just want to find their person first. Want me to help with that? 💛
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={onAccept}
              className="w-full rounded-xl gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Yes, help me find my person
            </button>
            <button
              onClick={onDismiss}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-secondary hover:text-foreground active:scale-[0.98]"
            >
              I'll explore on my own
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
