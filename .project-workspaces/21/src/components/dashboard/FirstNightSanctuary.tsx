import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Moon } from 'lucide-react';

const STORAGE_KEY = 'compani-first-night-seen';

export function hasSeenFirstNight(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function markSeen(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
}

/** Should show if it's 22:00–04:00 AND user has never seen it */
export function shouldShowFirstNight(): boolean {
  const h = new Date().getHours();
  const isLateNight = h >= 22 || h < 5;
  return isLateNight && !hasSeenFirstNight();
}

interface FirstNightSanctuaryProps {
  companionName?: string;
  onDismiss: () => void;
  onStartConversation?: () => void;
}

export default function FirstNightSanctuary({
  companionName,
  onDismiss,
  onStartConversation,
}: FirstNightSanctuaryProps) {
  const [exiting, setExiting] = useState(false);

  const handleEnter = () => {
    markSeen();
    setExiting(true);
    setTimeout(() => {
      if (onStartConversation) onStartConversation();
      else onDismiss();
    }, 600);
  };

  const handleDismiss = () => {
    markSeen();
    setExiting(true);
    setTimeout(onDismiss, 600);
  };

  return createPortal(
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="first-night"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{
            background: 'linear-gradient(180deg, #05050A 0%, #0A0B1E 40%, #0F0E24 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Deep indigo ambient glow — slow breathe */}
          <div
            className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(230 60% 30% / 0.15) 0%, transparent 70%)',
              animation: 'breathe 10s ease-in-out infinite',
            }}
          />

          {/* Soft ember glow (dialed back from gold) */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(43 74% 49% / 0.04) 0%, transparent 60%)',
            }}
          />

          <div className="relative z-10 max-w-sm w-full text-center space-y-6">
            {/* Moon icon */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 0.5, y: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="flex justify-center"
            >
              <Moon
                size={28}
                strokeWidth={1}
                className="text-[hsl(230_60%_72%)]"
                style={{ filter: 'drop-shadow(0 0 12px hsl(230 60% 72% / 0.3))' }}
              />
            </motion.div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="space-y-2"
            >
              <p className="text-[10px] uppercase tracking-[0.25em] font-medium text-[hsl(230_60%_72%_/_0.5)]">
                A moment for you
              </p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-[hsl(230_60%_72%_/_0.3)] to-transparent"
              />
            </motion.div>

            {/* Body */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 1 }}
              className="space-y-4"
            >
              <p className="font-serif text-base text-white/70 leading-relaxed italic">
                The world is quiet, and so is this space. There is no urgency here — only the pace you choose.
              </p>
              <p className="text-sm text-white/40 leading-relaxed">
                Whether you are here to decompress, to reflect, or simply to exist in the silence
                {companionName && (
                  <>, <span className="text-[hsl(230_60%_72%_/_0.7)] not-italic font-medium">{companionName}</span> is aware of the hour</>
                )}. Your space is open.
              </p>
            </motion.div>

            {/* Status */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.8 }}
              className="text-[9px] uppercase tracking-[0.2em] font-medium"
              style={{
                color: 'hsl(230 60% 72% / 0.4)',
                textShadow: '0 0 8px hsl(230 60% 72% / 0.15)',
                animation: 'flicker 4s ease-in-out infinite',
              }}
            >
              Status: In Repose
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 2.2 }}
              className="flex flex-col items-center gap-3"
            >
              {onStartConversation && (
                <button
                  onClick={handleEnter}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all"
                  style={{
                    background: 'rgba(147, 130, 220, 0.08)',
                    border: '1px solid hsl(230 60% 72% / 0.25)',
                    color: 'hsl(230 60% 72% / 0.7)',
                    letterSpacing: '0.03em',
                    boxShadow: '0 0 16px hsl(230 60% 72% / 0.08)',
                  }}
                >
                  Start a quiet conversation →
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-[11px] text-white/25 hover:text-white/40 transition-colors tracking-wide"
              >
                Enter your space
              </button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
