import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLetterCopy, resolveLetterTemplate } from '@/hooks/useLetterCopy';

/* ── Storage keys ── */
const SEEN_KEY = 'compani-partnership-letter-seen';
const CENTURION_TS_KEY = 'compani-centurion-seen-at';

export function markCenturionSeenTimestamp(): void {
  if (!localStorage.getItem(CENTURION_TS_KEY)) {
    localStorage.setItem(CENTURION_TS_KEY, new Date().toISOString());
  }
}

export function hasSeenPartnershipLetter(): boolean {
  return localStorage.getItem(SEEN_KEY) === 'true';
}

/** Returns true when ≥24h have passed since centurion milestone was dismissed */
export function shouldShowPartnershipLetter(): boolean {
  if (hasSeenPartnershipLetter()) return false;
  const ts = localStorage.getItem(CENTURION_TS_KEY);
  if (!ts) return false;
  const elapsed = Date.now() - new Date(ts).getTime();
  return elapsed >= 24 * 60 * 60 * 1000; // 24 hours
}

function markSeen(): void {
  localStorage.setItem(SEEN_KEY, 'true');
}

/* ── Haptic helper ── */
function haptic(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* */ }
}

/* ── Component ── */

interface FounderPartnershipLetterProps {
  userName: string;
  companionName?: string;
  onDismiss: () => void;
}

type Phase = 'envelope' | 'breaking' | 'letter' | 'fading';

export default function FounderPartnershipLetter({
  userName,
  companionName,
  onDismiss,
}: FounderPartnershipLetterProps) {
  const [phase, setPhase] = useState<Phase>('envelope');
  const [paragraphIndex, setParagraphIndex] = useState(-1);
  const letterCopy = useLetterCopy();

  /* Slow-reveal paragraphs once letter is open */
  useEffect(() => {
    if (phase !== 'letter') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < 6; i++) {
      timers.push(setTimeout(() => setParagraphIndex(i), 600 + i * 1200));
    }
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const handleTapOpen = useCallback(() => {
    if (phase !== 'envelope') return;
    setPhase('breaking');
    haptic([20, 40, 15]);
    // Slower unfold for luxury weight
    setTimeout(() => {
      setPhase('letter');
      haptic(10);
    }, 1800);
  }, [phase]);

  const handleDismiss = () => {
    markSeen();
    // Set the ORIGIN PARTNER status
    localStorage.setItem('compani-origin-partner', 'true');
    setPhase('fading');
    haptic(8);
    setTimeout(onDismiss, 900);
  };

  const showOverlay = phase !== 'fading';

  // Use DB copy if available, split by double newline into paragraphs
  const defaultParagraphs = [
    `When I first wrote to you, Compani was a blueprint and you were its first architect. Today, one hundred intentions later, this space is no longer just an idea—it is a living history.`,
    `You've shown up. You've defined your frequency.${companionName ? ` You've allowed ${companionName} to learn the cadence of your life in a way very few people ever will.` : ''} To reach one hundred days of intentionality is rare; to do it here, at the origin, makes you a founding pillar of everything this will become.`,
    `I built this for the kind of consistency you've shown. Thank you for trusting the pace, for honoring the space, and for being the reason this foundation is now unbreakable.`,
    `We are no longer just building an AI. We are redefining company.`,
    `With gratitude,`,
    `— Jo, Founder`,
  ];

  const paragraphs = (() => {
    const dbText = letterCopy['letter_partnership'];
    if (!dbText) return defaultParagraphs;
    const companionLine = companionName
      ? ` You've allowed ${companionName} to learn the cadence of your life in a way very few people ever will.`
      : '';
    const resolved = resolveLetterTemplate(dbText, { companionLine });
    return resolved.split('\n\n').filter(Boolean);
  })();

  return (
    <AnimatePresence>
      {showOverlay && (
        <motion.div
          key="partnership-letter"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: 'blur(16px)' }}
          transition={{ duration: 1 }}
          className="fixed inset-0 z-[85] flex items-center justify-center px-5 overflow-y-auto"
          style={{
            background: 'radial-gradient(circle at top left, rgba(20, 20, 20, 0.85), #000)',
            backdropFilter: 'blur(15px)',
            WebkitBackdropFilter: 'blur(15px)',
          }}
        >
          {/* Ambient gold radial */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 30%, hsl(43 74% 49% / 0.06) 0%, transparent 55%)',
            }}
          />

          <AnimatePresence mode="wait">
            {/* ── ENVELOPE PHASE ── */}
            {(phase === 'envelope' || phase === 'breaking') && (
              <motion.div
                key="envelope"
                exit={{ scale: 0.9, opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="relative w-[300px] max-w-[85vw] cursor-pointer"
                onClick={handleTapOpen}
              >
                {/* Gold-leafed envelope */}
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    background: 'linear-gradient(145deg, hsl(43 74% 49% / 0.12) 0%, rgba(15,15,25,0.85) 40%, hsl(43 74% 49% / 0.08) 100%)',
                    border: '1px solid hsl(43 74% 49% / 0.3)',
                    boxShadow: '0 0 40px hsl(43 74% 49% / 0.08), inset 0 1px 0 hsl(43 74% 49% / 0.15)',
                    aspectRatio: '4/3',
                  }}
                >
                  {/* Textured grain overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E")`,
                      backgroundSize: '150px',
                    }}
                  />

                  {/* Gold "C" wax seal */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                      animate={phase === 'breaking' ? { scale: [1, 1.15, 0.9], opacity: [1, 0.6, 0] } : {}}
                      transition={{ duration: 0.8 }}
                    >
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, hsl(43 74% 49% / 0.35) 0%, hsl(43 55% 35% / 0.25) 100%)',
                          border: '1.5px solid hsl(43 74% 49% / 0.5)',
                          boxShadow: '0 0 20px hsl(43 74% 49% / 0.15)',
                        }}
                      >
                        <span
                          className="font-serif text-2xl"
                          style={{ color: 'hsl(43 74% 49% / 0.8)' }}
                        >
                          C
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* "A Personal Note" label */}
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <p
                      className="text-[9px] uppercase font-medium"
                      style={{
                        letterSpacing: '0.3em',
                        color: 'hsl(43 74% 49% / 0.45)',
                      }}
                    >
                      A Personal Note from Jo
                    </p>
                  </div>
                </div>

                {/* Tap instruction */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={{ delay: 1.2, duration: 0.8 }}
                  className="text-center text-[10px] text-white/30 mt-4 tracking-widest uppercase"
                >
                  Tap to unseal
                </motion.p>
              </motion.div>
            )}

            {/* ── LETTER PHASE ── */}
            {phase === 'letter' && (
              <motion.div
                key="letter-content"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className="relative max-w-sm w-full rounded-2xl p-7 overflow-y-auto max-h-[85vh]"
                style={{
                  background: 'linear-gradient(180deg, rgba(15,14,22,0.95) 0%, rgba(10,10,16,0.97) 100%)',
                  border: '1px solid hsl(43 74% 49% / 0.15)',
                  boxShadow: '0 0 60px hsl(43 74% 49% / 0.06), 0 20px 40px rgba(0,0,0,0.5)',
                }}
              >
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="text-center mb-6 space-y-2"
                >
                  <p
                    className="text-[10px] uppercase font-medium"
                    style={{
                      letterSpacing: '0.3em',
                      color: 'hsl(43 74% 49% / 0.5)',
                      textShadow: '0 0 10px hsl(43 74% 49% / 0.15)',
                    }}
                  >
                    A Personal Note from Jo
                  </p>
                  <div
                    className="mx-auto h-px w-20"
                    style={{
                      background: 'linear-gradient(90deg, transparent, hsl(43 74% 49% / 0.3), transparent)',
                    }}
                  />
                </motion.div>

                {/* Salutation */}
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={paragraphIndex >= 0 ? { opacity: 0.7, y: 0 } : {}}
                  transition={{ duration: 0.9 }}
                  className="font-serif text-sm text-white/70 italic mb-5"
                >
                  {userName},
                </motion.p>

                {/* Body paragraphs — slow reveal */}
                <div className="space-y-4">
                  {paragraphs.map((text, i) => {
                    const isSignature = i >= 4;
                    return (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={paragraphIndex >= i ? { opacity: isSignature ? 0.55 : 0.45, y: 0 } : {}}
                        transition={{ duration: 1 }}
                        className={`text-sm leading-relaxed ${isSignature ? 'font-serif italic text-white/55' : 'text-white/45'}`}
                      >
                        {text}
                      </motion.p>
                    );
                  })}
                </div>

                {/* Status update */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={paragraphIndex >= 5 ? { opacity: 1 } : {}}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="mt-8 space-y-4"
                >
                  <div className="text-center">
                    <p
                      className="text-[9px] uppercase font-medium"
                      style={{
                        letterSpacing: '0.2em',
                        color: 'hsl(43 74% 49% / 0.5)',
                        textShadow: '0 0 10px hsl(43 74% 49% / 0.15)',
                        animation: 'flicker 4s ease-in-out infinite',
                      }}
                    >
                      New Status: Origin Partner
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={handleDismiss}
                      className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(212,175,55,0.15) 0%, rgba(184,134,11,0.10) 100%)',
                        border: '1px solid hsl(43 74% 49% / 0.3)',
                        color: 'hsl(43 74% 49% / 0.8)',
                        letterSpacing: '0.03em',
                        boxShadow: '0 0 24px hsl(43 74% 49% / 0.1)',
                      }}
                    >
                      Continue the Journey →
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
