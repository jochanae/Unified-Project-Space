import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, Trophy } from 'lucide-react';
import BlueprintMilestoneCard from './BlueprintMilestoneCard';

/* ── Blueprint identity dimensions ─────────────────────────── */
const DIMENSIONS = [
  { label: 'Self-Awareness', emoji: '🪞', from: 68, to: 76 },
  { label: 'Boundaries', emoji: '🛡️', from: 71, to: 82 },
  { label: 'Emotional Clarity', emoji: '💎', from: 64, to: 73 },
  { label: 'Growth Momentum', emoji: '🚀', from: 58, to: 67 },
];

/* ── SVG Grid line paths ────────────────────────────────────── */
const GRID_LINES = [
  'M 20,40 L 280,40',
  'M 20,90 L 280,90',
  'M 20,140 L 280,140',
  'M 20,190 L 280,190',
  'M 60,20 L 60,210',
  'M 150,20 L 150,210',
  'M 240,20 L 240,210',
];

const GOLD = 'hsl(38 70% 50%)';
const GOLD_DIM = 'hsl(38 70% 50% / 0.15)';

interface BlueprintUpdateCeremonyProps {
  open: boolean;
  onClose: () => void;
  companionName?: string;
  insightText?: string;
  userName?: string;
}

export default function BlueprintUpdateCeremony({
  open,
  onClose,
  companionName = 'Your friend',
  insightText,
  userName,
}: BlueprintUpdateCeremonyProps) {
  const [phase, setPhase] = useState<'draw' | 'increment' | 'confirm'>('draw');
  const [showMilestone, setShowMilestone] = useState(false);
  const [completedLines, setCompletedLines] = useState(0);
  const [values, setValues] = useState(DIMENSIONS.map(d => d.from));

  useEffect(() => {
    if (!open) {
      setPhase('draw');
      setCompletedLines(0);
      setValues(DIMENSIONS.map(d => d.from));
      setShowMilestone(false);
      return;
    }

    // Phase 1: Draw gold grid lines staggered
    const lineTimers: ReturnType<typeof setTimeout>[] = [];
    GRID_LINES.forEach((_, i) => {
      lineTimers.push(setTimeout(() => {
        setCompletedLines(i + 1);
        if (navigator.vibrate) navigator.vibrate(8);
      }, 200 + i * 250));
    });

    // Phase 2: Increment values
    const incrementTimer = setTimeout(() => {
      setPhase('increment');
      if (navigator.vibrate) navigator.vibrate(20);

      // Animate values up over ~1.2s
      const steps = 20;
      const stepMs = 60;
      for (let s = 1; s <= steps; s++) {
        lineTimers.push(setTimeout(() => {
          setValues(DIMENSIONS.map(d => {
            const progress = s / steps;
            return Math.round(d.from + (d.to - d.from) * progress);
          }));
        }, s * stepMs));
      }
    }, 200 + GRID_LINES.length * 250 + 400);

    // Phase 3: Confirmation
    const confirmTimer = setTimeout(() => {
      setPhase('confirm');
      if (navigator.vibrate) navigator.vibrate([15, 50, 15]);
    }, 200 + GRID_LINES.length * 250 + 400 + 20 * 60 + 600);

    return () => {
      lineTimers.forEach(clearTimeout);
      clearTimeout(incrementTimer);
      clearTimeout(confirmTimer);
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[90] flex items-center justify-center"
          style={{ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: 'rgba(0,0,0,0.7)' }}
          onClick={phase === 'confirm' ? onClose : undefined}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            className="relative w-[320px] max-w-[90vw] rounded-3xl border overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(15,18,33,0.95), rgba(10,12,25,0.98))',
              borderColor: phase === 'draw' ? GOLD_DIM : GOLD,
              boxShadow: phase !== 'draw'
                ? `0 0 40px ${GOLD_DIM}, 0 0 80px rgba(212,175,55,0.1), inset 0 1px 1px rgba(255,255,255,0.06)`
                : 'inset 0 1px 1px rgba(255,255,255,0.04)',
              transition: 'border-color 0.8s, box-shadow 0.8s',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4" style={{ color: GOLD }} />
                <span className="text-[11px] tracking-[0.1em] uppercase font-semibold" style={{ color: GOLD }}>
                  Blueprint Update
                </span>
              </div>
              {insightText && (
                <p className="text-[12px] text-foreground/40 italic leading-relaxed line-clamp-2 mt-1" style={{ fontFamily: 'Georgia, serif' }}>
                  "{insightText}"
                </p>
              )}
            </div>

            {/* SVG Grid — the "laser sketch" */}
            <div className="px-5 py-2">
              <svg viewBox="0 0 300 220" className="w-full" style={{ filter: 'drop-shadow(0 0 4px rgba(212,175,55,0.2))' }}>
                {/* Background grid (dim) */}
                {GRID_LINES.map((d, i) => (
                  <path key={`bg-${i}`} d={d} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" fill="none" />
                ))}
                {/* Animated gold lines */}
                {GRID_LINES.slice(0, completedLines).map((d, i) => (
                  <motion.path
                    key={`gold-${i}`}
                    d={d}
                    stroke={GOLD}
                    strokeWidth="1"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                ))}
              </svg>
            </div>

            {/* Dimension values */}
            <div className="px-5 pb-2 space-y-2.5">
              {DIMENSIONS.map((dim, i) => (
                <div key={dim.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] text-foreground/60 flex items-center gap-1.5">
                      <span>{dim.emoji}</span>
                      {dim.label}
                    </span>
                    <motion.span
                      className="text-[13px] font-bold tabular-nums"
                      style={{ color: phase === 'increment' || phase === 'confirm' ? GOLD : 'rgba(255,255,255,0.4)' }}
                      animate={phase === 'increment' ? { scale: [1, 1.15, 1] } : {}}
                      transition={{ duration: 0.3, delay: i * 0.1 }}
                    >
                      {values[i]}%
                    </motion.span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${GOLD_DIM}, ${GOLD})`,
                      }}
                      initial={{ width: `${dim.from}%` }}
                      animate={{ width: `${values[i]}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut', delay: phase === 'increment' ? i * 0.15 : 0 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Confirmation phase */}
            <AnimatePresence>
              {phase === 'confirm' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="px-5 pt-3 pb-5 text-center space-y-3"
                >
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
                    >
                      <Check className="h-5 w-5" style={{ color: GOLD }} />
                    </motion.div>
                    <p className="text-sm text-foreground/70 italic" style={{ fontFamily: 'Georgia, serif' }}>
                      Identity updated. You're evolving.
                    </p>
                  </div>
                  <p className="text-[11px] text-foreground/30">
                    — {companionName}
                  </p>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    onClick={() => setShowMilestone(true)}
                    className="mt-2 px-5 py-2 rounded-full text-[12px] font-semibold tracking-wide transition-all active:scale-95 flex items-center gap-1.5"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD_DIM}, rgba(212,175,55,0.08))`,
                      color: GOLD,
                      border: `1px solid rgba(212,175,55,0.3)`,
                    }}
                  >
                    <Trophy className="h-3.5 w-3.5" />
                    View Milestone
                  </motion.button>
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    onClick={onClose}
                    className="text-[11px] text-foreground/30 hover:text-foreground/50 transition-colors"
                  >
                    Skip
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          {/* Milestone trophy card */}
          <BlueprintMilestoneCard
            open={showMilestone}
            onClose={() => { setShowMilestone(false); onClose(); }}
            title="The Peace Pillar"
            subtitle="Emotional Resilience"
            companionName={companionName}
            dimension="resilience"
            valueBefore={DIMENSIONS[0].from}
            valueAfter={DIMENSIONS[0].to}
            userName={userName}
          />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}