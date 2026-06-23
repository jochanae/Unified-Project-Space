import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ThinkFreelyArrivalBannerProps {
  /** Whether the chat is currently in private (Think Freely) mode */
  privateMode: boolean;
  /** Called when user taps "Exit" — should disable Think Freely (Option A: stay in chat) */
  onExit: () => void;
}

const SESSION_FLAG = 'compani-private-auto-session';
const AUTO_FADE_MS = 8000;

/**
 * A premium frosted-glass banner that quietly confirms the user has arrived
 * in Think Freely via the Post-Focus Bridge. Designed to feel like part of
 * the sanctuary itself — gold hairline, soft serif italic copy, and a
 * gentle exit affordance. Auto-fades after 8s but the underlying private
 * mode UI persists.
 */
export default function ThinkFreelyArrivalBanner({ privateMode, onExit }: ThinkFreelyArrivalBannerProps) {
  const [visible, setVisible] = useState(false);

  // Show only when arriving via the bridge AND private mode actually engaged
  useEffect(() => {
    const isAuto = sessionStorage.getItem(SESSION_FLAG) === 'true';
    if (isAuto && privateMode) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), AUTO_FADE_MS);
      return () => clearTimeout(t);
    }
  }, [privateMode]);

  // If private mode ends (user exited), hide the banner
  useEffect(() => {
    if (!privateMode && visible) {
      setVisible(false);
    }
  }, [privateMode, visible]);

  const handleExit = () => {
    setVisible(false);
    sessionStorage.removeItem(SESSION_FLAG);
    onExit();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="tf-arrival-banner"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="absolute left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-md pointer-events-auto"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }}
        >
          <div
            className="relative overflow-hidden rounded-2xl px-4 py-3 flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(12, 14, 28, 0.78), rgba(8, 10, 22, 0.82))',
              backdropFilter: 'blur(24px) saturate(140%)',
              WebkitBackdropFilter: 'blur(24px) saturate(140%)',
              border: '1px solid hsl(38 70% 50% / 0.22)',
              boxShadow:
                '0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Soft gold halo */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(ellipse at 0% 50%, hsl(38 70% 55% / 0.10) 0%, transparent 60%)',
              }}
            />

            {/* Glyph */}
            <motion.span
              aria-hidden
              className="relative flex h-2 w-2 flex-shrink-0 items-center justify-center"
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: 'hsl(38 70% 62%)',
                  boxShadow: '0 0 10px hsl(38 70% 55% / 0.8)',
                }}
              />
            </motion.span>

            {/* Copy */}
            <div className="relative flex-1 min-w-0">
              <p
                className="text-[12.5px] leading-snug truncate"
                style={{
                  color: 'hsl(38 70% 80%)',
                  fontFamily: 'Georgia, serif',
                  fontStyle: 'italic',
                  letterSpacing: '0.01em',
                }}
              >
                You're in Think Freely.
              </p>
              <p className="text-[10px] tracking-[0.06em] uppercase text-[hsl(38_70%_50%/0.55)] mt-0.5 truncate">
                Nothing here is remembered
              </p>
            </div>

            {/* Exit affordance */}
            <button
              onClick={handleExit}
              className="relative flex-shrink-0 px-3 py-1.5 rounded-full text-[10.5px] font-medium tracking-[0.06em] uppercase transition-colors"
              style={{
                color: 'hsl(38 70% 70%)',
                border: '1px solid hsl(38 70% 50% / 0.22)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              Exit
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
