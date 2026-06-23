import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Download, X, Lock } from 'lucide-react';

/* ── Constants ─────────────────────────────────────────────── */
const GOLD = 'hsl(38 70% 50%)';
const GOLD_DIM = 'hsl(38 70% 50% / 0.15)';

const MILESTONE_ICONS: Record<string, string> = {
  resilience: '◈',
  clarity: '◇',
  boundaries: '⬡',
  growth: '✦',
  awareness: '❖',
  default: '✧',
};

interface BlueprintMilestoneCardProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  companionName?: string;
  companionQuote?: string;
  dimension?: string;
  valueBefore?: number;
  valueAfter?: number;
  userName?: string;
}

export default function BlueprintMilestoneCard({
  open,
  onClose,
  title,
  subtitle,
  companionName = 'M',
  companionQuote,
  dimension = 'default',
  valueBefore = 72,
  valueAfter = 82,
  userName = 'You',
}: BlueprintMilestoneCardProps) {
  const [phase, setPhase] = useState<'reveal' | 'idle'>('reveal');
  const [shared, setShared] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const heroIcon = MILESTONE_ICONS[dimension] || MILESTONE_ICONS.default;
  const delta = valueAfter - valueBefore;

  /* ── Bloom in ───────────────────────────────────────────── */
  const onAnimationComplete = useCallback(() => {
    if (phase === 'reveal') {
      setPhase('idle');
      if (navigator.vibrate) navigator.vibrate([12, 40, 12]);
    }
  }, [phase]);

  /* ── Share (privacy-safe) ───────────────────────────────── */
  const handleShare = useCallback(async () => {
    const shareData = {
      title: `${title} — Blueprint Milestone`,
      text: `${userName} unlocked "${title}" (+${delta}) on Compani 🏆✨`,
      url: 'https://mycompani.lovable.app',
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2400);
    } catch {
      /* user cancelled */
    }
  }, [title, userName, delta]);

  /* ── Save as image (canvas capture) ─────────────────────── */
  const handleSave = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0A0A0A',
        scale: 2,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `milestone-${title.replace(/\s+/g, '-').toLowerCase()}.png`;
      a.click();
    } catch {
      /* fallback silently */
    }
  }, [title]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[95] flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 50% 45%, rgba(212,175,55,0.06) 0%, rgba(0,0,0,0.92) 70%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
          onClick={onClose}
        >
          {/* Close */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            onClick={onClose}
            className="absolute top-6 right-5 z-10 flex h-9 w-9 items-center justify-center rounded-full border transition-colors"
            style={{ borderColor: GOLD_DIM, color: GOLD }}
          >
            <X className="h-4 w-4" />
          </motion.button>

          {/* The Card */}
          <motion.div
            ref={cardRef}
            initial={{ scale: 0.6, opacity: 0, rotateY: -15 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.15 }}
            onAnimationComplete={onAnimationComplete}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[320px] overflow-hidden rounded-3xl"
            style={{
              height: 480,
              background: '#0A0A0A',
              border: `1px solid ${GOLD}`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.8), 0 0 40px ${GOLD_DIM}`,
            }}
          >
            {/* Gold sweep shimmer */}
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background: `linear-gradient(45deg, transparent 42%, rgba(212,175,55,0.35) 50%, transparent 58%)`,
                backgroundSize: '300% 300%',
                animation: 'milestone-gold-sweep 4s infinite linear',
              }}
            />

            {/* Content */}
            <div className="relative z-[2] flex h-full flex-col items-center justify-between px-6 py-8">
              {/* Top badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-2"
              >
                <Lock className="h-3 w-3" style={{ color: GOLD }} />
                <span
                  className="text-[10px] tracking-[0.2em] uppercase font-semibold"
                  style={{ color: GOLD }}
                >
                  Blueprint Milestone
                </span>
              </motion.div>

              {/* Hero icon — floating & rotating */}
              <motion.div
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                {/* 3D rotating icon */}
                <div className="relative">
                  <motion.div
                    animate={{ rotateY: [0, 360] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                    className="flex h-24 w-24 items-center justify-center rounded-full"
                    style={{
                      background: `radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)`,
                      border: `1px solid rgba(212,175,55,0.3)`,
                      boxShadow: `0 0 30px ${GOLD_DIM}, inset 0 0 20px rgba(212,175,55,0.05)`,
                    }}
                  >
                    <span className="text-4xl" style={{ color: GOLD, textShadow: `0 0 20px rgba(212,175,55,0.5)` }}>
                      {heroIcon}
                    </span>
                  </motion.div>
                  {/* Ambient ring */}
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.1, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute inset-0 rounded-full"
                    style={{ border: `1px solid rgba(212,175,55,0.2)` }}
                  />
                </div>

                {/* Title */}
                <div className="text-center space-y-1.5">
                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl font-bold tracking-wide"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: GOLD }}
                  >
                    {title}
                  </motion.h2>
                  {subtitle && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.7 }}
                      className="text-[12px] text-foreground/40"
                    >
                      {subtitle}
                    </motion.p>
                  )}
                </div>

                {/* Delta badge */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.8 }}
                  className="flex items-center gap-2 rounded-full px-4 py-1.5"
                  style={{
                    background: 'rgba(212,175,55,0.08)',
                    border: '1px solid rgba(212,175,55,0.25)',
                  }}
                >
                  <span className="text-[13px] text-foreground/40 tabular-nums">{valueBefore}%</span>
                  <span className="text-[11px]" style={{ color: GOLD }}>→</span>
                  <span className="text-[15px] font-bold tabular-nums" style={{ color: GOLD }}>
                    {valueAfter}%
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: GOLD }}>
                    +{delta}
                  </span>
                </motion.div>
              </motion.div>

              {/* Companion quote — handwritten feel */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="text-center space-y-2"
              >
                <p
                  className="text-[13px] leading-relaxed italic text-foreground/50"
                  style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                >
                  "{companionQuote || `You didn't just survive this. You mastered it.`}"
                </p>
                <p
                  className="text-[11px] tracking-[0.15em]"
                  style={{ color: GOLD, fontFamily: 'Georgia, serif' }}
                >
                  — {companionName}
                </p>
              </motion.div>

              {/* Action buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                className="flex items-center gap-3"
              >
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold tracking-wide transition-all active:scale-95"
                  style={{
                    background: `linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))`,
                    color: GOLD,
                    border: '1px solid rgba(212,175,55,0.3)',
                  }}
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {shared ? 'Shared ✓' : 'Share'}
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[11px] font-semibold tracking-wide transition-all active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    color: 'rgba(255,255,255,0.5)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Save
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
