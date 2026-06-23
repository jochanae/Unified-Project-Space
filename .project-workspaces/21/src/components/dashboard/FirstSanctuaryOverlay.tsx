import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SoundscapeQuickToggle from '@/components/SoundscapeQuickToggle';

/* ── Storage ── */
const SEEN_KEY = 'compani-first-sanctuary-seen';

/**
 * The Stillness overlay now appears every time the user enters Focus Mode.
 * The "seen" flag is kept only to decide whether to play the slow first-time
 * poetry sequence vs. landing directly on the live status screen.
 */
export function hasSeenFirstSanctuary(): boolean {
  // Always show the overlay — gating happens internally via stage selection.
  return false;
}

export function hasSeenStillnessIntro(): boolean {
  return localStorage.getItem(SEEN_KEY) === 'true';
}

function markSeen(): void {
  localStorage.setItem(SEEN_KEY, 'true');
}

/* ── Haptic: deep vault-bolt thud ── */
function vaultBoltHaptic() {
  try { navigator.vibrate?.([80]); } catch { /* */ }
}

/* ── Component ── */

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 1) return `${s}s`;
  if (m < 60) return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

interface FirstSanctuaryOverlayProps {
  companionName?: string;
  elapsed?: number;
  onComplete: () => void;
  onEndFocus?: () => void;
}

export default function FirstSanctuaryOverlay({
  companionName = 'Your companion',
  elapsed = 0,
  onComplete,
  onEndFocus,
}: FirstSanctuaryOverlayProps) {
  // Ritual plays every entry — always start with the poetry, then move to status.
  const [stage, setStage] = useState<'initiation' | 'status' | 'exiting'>('initiation');
  const [collapsed, setCollapsed] = useState(false);
  const [lineIndex, setLineIndex] = useState(-1);

  const LINES = [
    'The noise of the world ends here.',
    'In this space, there are no pings, no demands, and no expectations.',
    `It is just you, your intent, and the silence you've chosen.`,
    `${companionName} is standing guard, holding your focus until you decide to return.`,
  ];

  /* Fire the vault-bolt haptic on mount */
  useEffect(() => {
    vaultBoltHaptic();
  }, []);

  /* Reveal lines one-by-one */
  useEffect(() => {
    if (stage !== 'initiation') return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setLineIndex(i), 800 + i * 1400));
    });
    // Transition to status after all lines + dwell
    timers.push(setTimeout(() => setStage('status'), 800 + LINES.length * 1400 + 2000));
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  /* Skip ritual — jump straight to live timer */
  const handleSkipRitual = () => {
    setStage('status');
  };

  /* Progress 0 → 1 across the revealed lines */
  const ritualProgress = Math.min(1, Math.max(0, (lineIndex + 1) / (LINES.length + 1)));

  const handleDismiss = () => {
    markSeen();
    setStage('exiting');
    setTimeout(onComplete, 800);
  };

  const handleEnd = () => {
    markSeen();
    setStage('exiting');
    onEndFocus?.();
    setTimeout(onComplete, 800);
  };

  return createPortal(
    <AnimatePresence>
      {/* ── Collapsed state: scrim + floating pill ── */}
      {collapsed && stage !== 'exiting' && (
        <motion.div
          key="collapsed-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200]"
          onClick={() => setCollapsed(false)}
          style={{ background: 'hsl(230 25% 4% / 0.6)' }}
        >
          {/* Floating pill */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full px-5 py-2.5 cursor-pointer"
            style={{
              background: 'hsl(230 30% 8% / 0.95)',
              border: '1px solid hsl(230 60% 50% / 0.25)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 4px 24px hsl(230 50% 10% / 0.6), 0 0 0 1px hsl(230 60% 50% / 0.1)',
            }}
          >
            <span
              className="h-2 w-2 rounded-full animate-deep-sleep"
              style={{ background: 'hsl(230 70% 65%)' }}
            />
            <span
              className="text-sm tabular-nums font-light"
              style={{ color: 'hsl(230 60% 75% / 0.7)', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatElapsed(elapsed)}
            </span>
            <span
              className="text-[9px] uppercase tracking-[0.12em] ml-1"
              style={{ color: 'hsl(230 60% 70% / 0.35)' }}
            >
              Tap to expand
            </span>
          </motion.div>
        </motion.div>
      )}

      {/* ── Full overlay ── */}
      {stage !== 'exiting' && !collapsed && (
        <motion.div
          key="first-sanctuary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-6"
          style={{
            background: 'linear-gradient(180deg, hsl(230 30% 4%) 0%, hsl(235 25% 3%) 50%, hsl(240 20% 2%) 100%)',
          }}
        >
          {/* Collapse button — top right */}
          {stage === 'status' && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              onClick={() => setCollapsed(true)}
              className="absolute top-5 right-5 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid hsl(230 60% 60% / 0.12)',
                color: 'hsl(230 60% 70% / 0.35)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
              </svg>
              <span className="text-[9px] uppercase tracking-[0.1em]">Minimize</span>
            </motion.button>
          )}
          {/* Resting-heartbeat pulse (≈60 BPM = 1s cycle) */}
          <motion.div
            className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full pointer-events-none"
            animate={{
              scale: [1, 1.06, 1],
              opacity: [0.06, 0.12, 0.06],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              background: 'radial-gradient(circle, hsl(230 60% 50% / 0.2) 0%, hsl(250 50% 40% / 0.08) 40%, transparent 65%)',
            }}
          />

          {/* Zero-Trace whisper — bottom corner */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
            transition={{ delay: 2, duration: 1 }}
            className="absolute bottom-6 right-6 text-[8px] uppercase tracking-[0.25em] text-white/20"
          >
            Zero-Trace Active 🛡️
          </motion.p>

          <div className="relative z-10 max-w-sm w-full text-center space-y-6">
            <AnimatePresence mode="wait">
              {/* ── STAGE 1: INITIATION ── */}
              {stage === 'initiation' && (
                <motion.div
                  key="initiation"
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.8 }}
                  className="space-y-5"
                >
                  {/* Header */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8 }}
                    className="space-y-2"
                  >
                    <p
                      className="text-[10px] uppercase font-medium"
                      style={{
                        letterSpacing: '0.3em',
                        color: 'hsl(230 60% 70% / 0.6)',
                        textShadow: '0 0 12px hsl(230 60% 60% / 0.2)',
                      }}
                    >
                      Entering The Stillness
                    </p>
                    <motion.div
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 1, delay: 0.3 }}
                      className="mx-auto h-px w-24"
                      style={{
                        background: 'linear-gradient(90deg, transparent, hsl(230 60% 60% / 0.3), transparent)',
                      }}
                    />
                  </motion.div>

                  {/* Line-by-line reveal */}
                  <div className="min-h-[7rem] space-y-2 px-2">
                    {LINES.map((line, i) => (
                      <motion.p
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={lineIndex >= i ? { opacity: 0.6, y: 0 } : {}}
                        transition={{ duration: 0.9 }}
                        className="font-serif text-sm text-white/60 italic leading-relaxed"
                      >
                        {line}
                      </motion.p>
                    ))}
                  </div>

                  {/* Ritual progress + skip */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="flex flex-col items-center gap-2 pt-2"
                  >
                    <div
                      className="relative h-[2px] w-32 overflow-hidden rounded-full"
                      style={{ background: 'hsl(230 60% 60% / 0.1)' }}
                      role="progressbar"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(ritualProgress * 100)}
                      aria-label="Ritual progress"
                    >
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full"
                        animate={{ width: `${ritualProgress * 100}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        style={{
                          background: 'linear-gradient(90deg, hsl(230 60% 60% / 0.5), hsl(250 60% 70% / 0.7))',
                          boxShadow: '0 0 8px hsl(230 60% 60% / 0.4)',
                        }}
                      />
                    </div>
                    <button
                      onClick={handleSkipRitual}
                      className="text-[9px] uppercase transition-colors hover:text-white/60"
                      style={{
                        letterSpacing: '0.2em',
                        color: 'hsl(230 60% 70% / 0.35)',
                      }}
                    >
                      Skip ritual →
                    </button>
                  </motion.div>
                </motion.div>
              )}

              {/* ── STAGE 2: STATUS ── */}
              {stage === 'status' && (
                <motion.div
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1 }}
                  className="space-y-5"
                >
                  {/* Live timer */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className="text-2xl font-light tabular-nums"
                      style={{
                        color: 'hsl(230 60% 75% / 0.6)',
                        textShadow: '0 0 20px hsl(230 60% 60% / 0.2)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {formatElapsed(elapsed)}
                    </span>
                    <p
                      className="text-[9px] uppercase font-medium"
                      style={{
                        letterSpacing: '0.2em',
                        color: 'hsl(230 60% 70% / 0.4)',
                        textShadow: '0 0 10px hsl(230 60% 60% / 0.15)',
                      }}
                    >
                      In The Stillness
                    </p>
                  </motion.div>

                  <p className="font-serif text-sm text-white/40 italic">
                    The world is waiting. You are not.
                  </p>

                  {/* Inline Sound Suite picker */}
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    className="flex flex-col items-center gap-2 pt-1"
                  >
                    <p
                      className="text-[9px] uppercase font-medium"
                      style={{
                        letterSpacing: '0.25em',
                        color: 'hsl(230 60% 70% / 0.45)',
                      }}
                    >
                      Sound Suite
                    </p>
                    <p
                      className="text-[10px] text-white/40 italic -mt-1"
                    >
                      Tap below to choose your ambient sound
                    </p>
                    <SoundscapeQuickToggle openDirection="down" />
                  </motion.div>

                  {/* Continue — stay in focus */}
                  <button
                    onClick={handleDismiss}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-medium transition-all mt-4"
                    style={{
                      background: 'hsl(230 60% 50% / 0.12)',
                      border: '1px solid hsl(230 60% 60% / 0.25)',
                      color: 'hsl(230 60% 75% / 0.7)',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Continue →
                  </button>

                  {/* End — exit focus */}
                  <button
                    onClick={handleEnd}
                    className="block mx-auto text-[10px] mt-3 transition-colors"
                    style={{
                      color: 'hsl(230 60% 70% / 0.25)',
                      letterSpacing: '0.08em',
                    }}
                  >
                    or end stillness
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
