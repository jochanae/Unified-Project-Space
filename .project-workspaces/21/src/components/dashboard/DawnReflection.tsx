import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun } from 'lucide-react';

const STORAGE_KEY = 'compani-dawn-reflection-seen';
const COUNT_KEY = 'compani-dawn-reflection-count';

export function hasSeenDawnReflection(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function markSeen(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
}

function getDawnCount(): number {
  return parseInt(localStorage.getItem(COUNT_KEY) || '0', 10);
}

function incrementDawnCount(): number {
  const next = getDawnCount() + 1;
  localStorage.setItem(COUNT_KEY, String(next));
  return next;
}

/** Should show if it's 05:00–08:00 AND user has never seen it */
export function shouldShowDawnReflection(): boolean {
  const h = new Date().getHours();
  const isMorning = h >= 5 && h < 8;
  return isMorning && !hasSeenDawnReflection();
}

const HINT_SEEN_KEY = 'compani-dawn-settings-hint-seen';

interface DawnReflectionProps {
  companionName?: string;
  onDismiss: () => void;
  onSetIntent?: () => void;
}

export default function DawnReflection({
  companionName,
  onDismiss,
  onSetIntent,
}: DawnReflectionProps) {
  const [exiting, setExiting] = useState(false);
  const [showHint] = useState(() => {
    const count = incrementDawnCount();
    const hintSeen = localStorage.getItem(HINT_SEEN_KEY) === 'true';
    return count >= 3 && !hintSeen;
  });

  const handleSetIntent = () => {
    markSeen();
    if (showHint) localStorage.setItem(HINT_SEEN_KEY, 'true');
    setExiting(true);
    setTimeout(() => {
      if (onSetIntent) onSetIntent();
      else onDismiss();
    }, 600);
  };

  const handleDismiss = () => {
    markSeen();
    if (showHint) localStorage.setItem(HINT_SEEN_KEY, 'true');
    setExiting(true);
    setTimeout(onDismiss, 600);
  };

  return createPortal(
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="dawn-reflection"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{
            background: 'linear-gradient(180deg, #0D0B08 0%, #1A150D 30%, #1F1810 60%, #0F0D08 100%)',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {/* Sunrise radial — champagne amber */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2, ease: 'easeOut' }}
            className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(43 74% 49% / 0.10) 0%, hsl(43 74% 49% / 0.04) 40%, transparent 70%)',
            }}
          />

          {/* Secondary warm horizon line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 0.3 }}
            transition={{ duration: 1.5, delay: 0.5 }}
            className="absolute top-[55%] left-0 right-0 h-px pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 5%, hsl(43 74% 49% / 0.25) 50%, transparent 95%)',
            }}
          />

          <div className="relative z-10 max-w-sm w-full text-center space-y-6">
            {/* Sun icon */}
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3 }}
              className="flex justify-center"
            >
              <Sun
                size={28}
                strokeWidth={1}
                className="text-[hsl(43_74%_49%)]"
                style={{ filter: 'drop-shadow(0 0 14px hsl(43 74% 49% / 0.35))' }}
              />
            </motion.div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="space-y-2"
            >
              <p
                className="text-[10px] uppercase font-medium"
                style={{
                  letterSpacing: '0.25em',
                  color: 'hsl(43 74% 49% / 0.5)',
                }}
              >
                A moment for you
              </p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.9 }}
                className="mx-auto h-px w-16"
                style={{
                  background: 'linear-gradient(90deg, transparent, hsl(43 74% 49% / 0.3), transparent)',
                }}
              />
            </motion.div>

            {/* Body */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 1.1 }}
              className="space-y-4"
            >
              <p className="font-serif text-base text-white/70 leading-relaxed italic">
                The light is new, and the space is clear. This is the quiet before the world begins its noise.
              </p>
              <p className="text-sm text-white/40 leading-relaxed">
                As a Genesis Architect, your first act today is simply to decide the frequency you wish to carry.
                {companionName && (
                  <> <span className="text-[hsl(43_74%_49%_/_0.7)] not-italic font-medium">{companionName}</span> is present and ready to hold that intent with you.</>
                )}
              </p>
            </motion.div>

            {/* Status */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.9 }}
              className="text-[9px] uppercase font-medium"
              style={{
                letterSpacing: '0.2em',
                color: 'hsl(43 74% 49% / 0.4)',
                textShadow: '0 0 8px hsl(43 74% 49% / 0.15)',
                animation: 'flicker 4s ease-in-out infinite',
              }}
            >
              Status: Awakening
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 2.3 }}
              className="flex flex-col items-center gap-3"
            >
              {onSetIntent && (
                <button
                  onClick={handleSetIntent}
                  className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(184,134,11,0.08) 100%)',
                    border: '1px solid hsl(43 74% 49% / 0.25)',
                    color: 'hsl(43 74% 49% / 0.75)',
                    letterSpacing: '0.03em',
                    boxShadow: '0 0 20px hsl(43 74% 49% / 0.08)',
                  }}
                >
                  Set Today's Intent →
                </button>
              )}
              <button
                onClick={handleDismiss}
                className="text-[11px] text-white/25 hover:text-white/40 transition-colors tracking-wide"
              >
                Enter your space
              </button>
              {/* Subtle settings hint — appears on 3rd+ viewing */}
              {showHint && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 3 }}
                  className="text-[10px] text-white/20 tracking-wide mt-1"
                >
                  You can adjust morning rituals in Settings
                </motion.p>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
