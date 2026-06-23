/**
 * LuminousEntry — First-visit animation wrapper for the Blueprint dashboard.
 * Gold SVG borders "draw" themselves on-screen over 1.5s, then persist.
 * Only plays once per user (stored in localStorage).
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const STORAGE_KEY = 'compani-luminous-entry-seen';

interface LuminousEntryProps {
  children: React.ReactNode;
}

export default function LuminousEntry({ children }: LuminousEntryProps) {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [phase, setPhase] = useState<'tracing' | 'revealing' | 'done'>('tracing');

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      setShouldAnimate(true);
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } else {
      setPhase('done');
    }
  }, []);

  useEffect(() => {
    if (!shouldAnimate) return;
    // Phase 1: gold trace draws (0 → 1.5s)
    // Phase 2: content reveals (1.5s → 2.3s)
    const t1 = setTimeout(() => setPhase('revealing'), 1500);
    const t2 = setTimeout(() => setPhase('done'), 2300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [shouldAnimate]);

  if (!shouldAnimate || phase === 'done') {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Gold inscription trace — SVG path that draws the card borders */}
      {phase === 'tracing' && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
            fill="none"
          >
            {/* Top horizontal inscription line */}
            <motion.line
              x1="40" y1="30" x2="360" y2="30"
              stroke="rgba(212,175,80,0.6)"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
            />
            {/* Right vertical trace */}
            <motion.line
              x1="360" y1="30" x2="360" y2="170"
              stroke="rgba(212,175,80,0.4)"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.4, ease: 'easeInOut' }}
            />
            {/* Bottom horizontal trace */}
            <motion.line
              x1="360" y1="170" x2="40" y2="170"
              stroke="rgba(212,175,80,0.3)"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.8, ease: 'easeInOut' }}
            />
            {/* Left vertical close */}
            <motion.line
              x1="40" y1="170" x2="40" y2="30"
              stroke="rgba(212,175,80,0.2)"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 1.1, ease: 'easeInOut' }}
            />
            {/* Center inscription flourish */}
            <motion.path
              d="M 160 100 Q 200 80 240 100"
              stroke="rgba(212,175,80,0.5)"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.6, ease: 'easeInOut' }}
            />
          </svg>

          {/* Center glow pulse */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: [0, 0.6, 0], scale: [0.5, 1.5, 2] }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="w-32 h-32 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,80,0.25) 0%, transparent 70%)',
            }}
          />

          {/* "Preparing your space…" text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 1.5, times: [0, 0.3, 0.7, 1] }}
            className="absolute bottom-8 text-[10px] tracking-[0.25em] uppercase text-primary/60 font-medium"
            style={{ textShadow: '0 0 10px rgba(212,175,80,0.3)' }}
          >
            Preparing your space…
          </motion.p>
        </div>
      )}

      {/* Content fades in during reveal phase */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase !== 'tracing' ? 1 : 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </div>
  );
}
