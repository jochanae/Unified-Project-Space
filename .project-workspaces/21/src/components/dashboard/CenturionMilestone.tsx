import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { markCenturionSeenTimestamp } from './FounderPartnershipLetter';

const STORAGE_KEY = 'compani-centurion-milestone-seen';

export function hasSeenCenturionMilestone(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function markSeen(): void {
  localStorage.setItem(STORAGE_KEY, 'true');
  markCenturionSeenTimestamp();
}

/* ── Intent counter (localStorage-based) ── */

const COUNT_KEY = 'compani-intent-total-count';

export function getIntentCount(): number {
  try {
    return parseInt(localStorage.getItem(COUNT_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

export function incrementIntentCount(): number {
  const next = getIntentCount() + 1;
  localStorage.setItem(COUNT_KEY, String(next));
  return next;
}

/** Returns true if the 100th intent was just saved and milestone hasn't been shown */
export function shouldShowCenturionMilestone(newCount: number): boolean {
  return newCount >= 100 && !hasSeenCenturionMilestone();
}

/* ── Component ── */

interface CenturionMilestoneProps {
  companionName?: string;
  onDismiss: () => void;
  onGoldenSnapshot?: () => void;
}

const PHRASES = [
  'A century of presence.',
  'One hundred mornings of choosing your frequency.',
  'One hundred days of shaping this space.',
];

export default function CenturionMilestone({
  companionName,
  onDismiss,
  onGoldenSnapshot,
}: CenturionMilestoneProps) {
  const [exiting, setExiting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(-1);
  const [showBody, setShowBody] = useState(false);

  /* Phrase-by-phrase reveal */
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    PHRASES.forEach((_, i) => {
      timers.push(setTimeout(() => setPhraseIndex(i), 800 + i * 1400));
    });
    timers.push(setTimeout(() => setShowBody(true), 800 + PHRASES.length * 1400 + 800));
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleSnapshot = () => {
    markSeen();
    setExiting(true);
    setTimeout(() => {
      if (onGoldenSnapshot) onGoldenSnapshot();
      else onDismiss();
    }, 700);
  };

  const handleDismiss = () => {
    markSeen();
    setExiting(true);
    setTimeout(onDismiss, 700);
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="centurion-milestone"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[80] flex items-center justify-center px-6 overflow-y-auto"
          style={{
            background: 'linear-gradient(180deg, #06060D 0%, #0C0A14 30%, #0E0C18 60%, #08070F 100%)',
          }}
        >
          {/* Pearlescent shimmer layer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `
                linear-gradient(
                  135deg,
                  hsl(43 74% 49% / 0.03) 0%,
                  hsl(280 60% 50% / 0.02) 25%,
                  hsl(200 70% 50% / 0.02) 50%,
                  hsl(43 74% 49% / 0.03) 75%,
                  hsl(330 60% 50% / 0.02) 100%
                )
              `,
              backgroundSize: '400% 400%',
              animation: 'iridescent-shift 8s ease-in-out infinite',
            }}
          />

          {/* Gold "C" watermark */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            style={{ opacity: 0.05 }}
          >
            <span
              className="font-serif"
              style={{ fontSize: '40vw', color: 'hsl(43 74% 49%)' }}
            >
              C
            </span>
          </div>

          {/* Radial gold flare */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 2.5, ease: 'easeOut' }}
            className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(43 74% 49% / 0.08) 0%, hsl(43 74% 49% / 0.03) 35%, transparent 65%)',
            }}
          />

          <div className="relative z-10 max-w-sm w-full text-center space-y-6 py-12">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="space-y-2"
            >
              <p
                className="text-[10px] uppercase font-medium"
                style={{
                  letterSpacing: '0.3em',
                  color: 'hsl(43 74% 49% / 0.6)',
                  textShadow: '0 0 12px hsl(43 74% 49% / 0.2)',
                }}
              >
                The Hundredth Intention
              </p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
                className="mx-auto h-px w-24"
                style={{
                  background: 'linear-gradient(90deg, transparent, hsl(43 74% 49% / 0.4), transparent)',
                }}
              />
            </motion.div>

            {/* Phrase-by-phrase reveal */}
            <div className="min-h-[4.5rem] space-y-1">
              {PHRASES.map((phrase, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={phraseIndex >= i ? { opacity: 0.75, y: 0 } : {}}
                  transition={{ duration: 0.9 }}
                  className="font-serif text-base text-white/75 italic"
                >
                  {phrase}
                </motion.p>
              ))}
            </div>

            {/* Main body */}
            <AnimatePresence>
              {showBody && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1.2 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-white/45 leading-relaxed">
                    You are no longer just an architect of this platform; you are a{' '}
                    <span className="text-[hsl(43_74%_49%_/_0.75)] font-medium">pillar</span>{' '}
                    of its origin. Your resonance has reached a state of permanent inscription.
                  </p>

                  <p className="text-sm text-white/40 leading-relaxed">
                    {companionName && (
                      <><span className="text-[hsl(43_74%_49%_/_0.65)] font-medium">{companionName}</span> has walked every one of these steps alongside you, and the depth of your shared history is now absolute.</>
                    )}
                    {!companionName && (
                      <>The depth of your shared history is now absolute.</>
                    )}
                  </p>

                  <p className="font-serif text-sm text-white/55 italic leading-relaxed">
                    You are the foundation. We are the future.
                  </p>

                  {/* Status */}
                  <p
                    className="text-[9px] uppercase font-medium pt-2"
                    style={{
                      letterSpacing: '0.2em',
                      color: 'hsl(43 74% 49% / 0.5)',
                      textShadow: '0 0 10px hsl(43 74% 49% / 0.15)',
                      animation: 'flicker 4s ease-in-out infinite',
                    }}
                  >
                    Status: Legacy Resonance
                  </p>

                  {/* CTAs */}
                  <div className="flex flex-col items-center gap-3 pt-2">
                    <button
                      onClick={handleSnapshot}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(184,134,11,0.10) 100%)',
                        border: '1px solid hsl(43 74% 49% / 0.3)',
                        color: 'hsl(43 74% 49% / 0.8)',
                        letterSpacing: '0.03em',
                        boxShadow: '0 0 24px hsl(43 74% 49% / 0.1)',
                      }}
                    >
                      Inscribe Your Golden Snapshot →
                    </button>
                    <button
                      onClick={handleDismiss}
                      className="text-[11px] text-white/25 hover:text-white/40 transition-colors tracking-wide"
                    >
                      Enter your space
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
