import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Haptic: triple-breath (short, medium, long) ── */
function breathHaptic() {
  try { navigator.vibrate?.([15, 60, 30, 60, 50]); } catch { /* */ }
}

/* ── Quality choices ── */
const QUALITIES = [
  { key: 'restorative', label: 'Restorative', micro: 'A soft pulse for a quiet mind.' },
  { key: 'deep-focus', label: 'Deep Focus', micro: 'Sharp edges for clear thinking.' },
  { key: 'stillness', label: 'Stillness', micro: 'The art of doing nothing at all.' },
] as const;

type QualityKey = typeof QUALITIES[number]['key'];

/* ── Storage for last session quality (dashboard can read this) ── */
const LAST_QUALITY_KEY = 'compani-sanctuary-last-quality';

export function getLastSanctuaryQuality(): string | null {
  return localStorage.getItem(LAST_QUALITY_KEY);
}

export function clearLastSanctuaryQuality(): void {
  localStorage.removeItem(LAST_QUALITY_KEY);
}

/* ── Component ── */

interface SanctuaryExitReflectionProps {
  companionName?: string;
  elapsedSeconds?: number;
  onDismiss: () => void;
}

export default function SanctuaryExitReflection({
  companionName = 'Your companion',
  elapsedSeconds = 0,
  onDismiss,
}: SanctuaryExitReflectionProps) {
  const [selected, setSelected] = useState<QualityKey | null>(null);
  const [saved, setSaved] = useState(false);
  const [exiting, setExiting] = useState(false);

  const handleSave = useCallback(() => {
    if (!selected) return;
    localStorage.setItem(LAST_QUALITY_KEY, selected);
    breathHaptic();
    setSaved(true);
    setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 800);
    }, 1800);
  }, [selected, onDismiss]);

  const handleSkip = () => {
    setExiting(true);
    setTimeout(onDismiss, 800);
  };

  const selectedQuality = QUALITIES.find(q => q.key === selected);

  return createPortal(
    <AnimatePresence>
      {!exiting && (
        <div key="sanctuary-exit-wrapper">
          {/* Backdrop — blurred dashboard */}
          <motion.div
            key="sanctuary-exit-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="fixed inset-0 z-[200]"
            style={{
              background: 'hsl(230 25% 4% / 0.7)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
            }}
            onClick={handleSkip}
          />

          {/* Bottom sheet */}
          <motion.div
            key="sanctuary-exit-sheet"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed bottom-0 left-0 right-0 z-[201] rounded-t-3xl px-6 pt-7 pb-10 max-h-[85vh] overflow-y-auto"
            style={{
              background: 'linear-gradient(180deg, rgba(15,14,22,0.97) 0%, rgba(10,10,16,0.99) 100%)',
              border: '1px solid hsl(230 40% 25% / 0.15)',
              borderBottom: 'none',
              boxShadow: '0 -10px 60px rgba(0,0,0,0.5), 0 0 30px hsl(230 60% 50% / 0.06)',
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-5">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: 'hsl(230 40% 50% / 0.2)' }}
              />
            </div>

            <AnimatePresence mode="wait">
              {!saved ? (
                <motion.div
                  key="form"
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5"
                >
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <p
                      className="text-[10px] uppercase font-medium"
                      style={{
                        letterSpacing: '0.3em',
                        color: 'hsl(230 60% 70% / 0.5)',
                        textShadow: '0 0 10px hsl(230 60% 60% / 0.15)',
                      }}
                    >
                      The Re-emergence
                    </p>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="mx-auto h-px w-20"
                      style={{
                        background: 'linear-gradient(90deg, transparent, hsl(230 60% 60% / 0.25), transparent)',
                      }}
                    />
                  </div>

                  {/* Copy */}
                  <div className="text-center space-y-2">
                    <p className="font-serif text-sm text-white/50 italic leading-relaxed">
                      The world has waited. You've returned from the silence.
                    </p>
                    <p className="text-xs text-white/35 leading-relaxed">
                      Take a moment before the noise begins again—how was your pace?
                    </p>
                  </div>

                  {/* Quality pills */}
                  <div className="flex justify-center gap-2.5 pt-1">
                    {QUALITIES.map((q) => {
                      const isSelected = selected === q.key;
                      return (
                        <button
                          key={q.key}
                          onClick={() => setSelected(q.key)}
                          className="rounded-full px-4 py-2 text-[11px] font-medium tracking-wide uppercase transition-all duration-300"
                          style={{
                            background: isSelected
                              ? 'rgba(212,175,55,0.10)'
                              : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${isSelected ? 'hsl(43 74% 49% / 0.4)' : 'hsl(230 40% 50% / 0.12)'}`,
                            color: isSelected
                              ? 'hsl(43 74% 49% / 0.8)'
                              : 'hsl(230 60% 70% / 0.4)',
                            boxShadow: isSelected
                              ? '0 0 16px hsl(43 74% 49% / 0.1)'
                              : 'none',
                          }}
                        >
                          {q.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Micro-copy reward for selection */}
                  <div className="min-h-[1.25rem] text-center">
                    <AnimatePresence mode="wait">
                      {selectedQuality && (
                        <motion.p
                          key={selectedQuality.key}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 0.4, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.4 }}
                          className="text-[11px] text-white/40 italic"
                        >
                          {selectedQuality.micro}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Inscription note */}
                  <p className="text-xs text-white/25 text-center leading-relaxed">
                    {companionName} has inscribed this session into your blueprint.
                    <br />
                    Your time was well spent.
                  </p>

                  {/* Save */}
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={!selected}
                      className="rounded-full px-7 py-2.5 text-xs font-medium tracking-wide transition-all disabled:opacity-20"
                      style={{
                        background: selected
                          ? 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(184,134,11,0.08) 100%)'
                          : 'transparent',
                        border: `1px solid ${selected ? 'hsl(43 74% 49% / 0.25)' : 'hsl(230 40% 50% / 0.1)'}`,
                        color: selected ? 'hsl(43 74% 49% / 0.7)' : 'hsl(230 60% 70% / 0.2)',
                        boxShadow: selected ? '0 0 20px hsl(43 74% 49% / 0.06)' : 'none',
                      }}
                    >
                      Save Reflection
                    </button>
                    <button
                      onClick={handleSkip}
                      className="text-[10px] text-white/20 hover:text-white/30 transition-colors tracking-wide"
                    >
                      Skip
                    </button>
                  </div>
                </motion.div>
              ) : (
                /* ── Saved confirmation ── */
                <motion.div
                  key="saved"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                  className="text-center space-y-3 py-4"
                >
                  <p className="font-serif text-sm text-white/50 italic leading-relaxed">
                    You just emerged from a {selectedQuality?.label.toLowerCase()} stillness.
                  </p>
                  <p className="text-xs text-white/30 leading-relaxed">
                    The frequency you found there is still with you. Carry it into your next act.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
