import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PracticeCoachingFeedbackProps {
  feedback: string | null;
  onTryStronger?: () => void;
  onNextScenario?: () => void;
  onDismiss: () => void;
}

export default function PracticeCoachingFeedback({
  feedback,
  onTryStronger,
  onNextScenario,
  onDismiss,
}: PracticeCoachingFeedbackProps) {
  // Auto-dismiss after 15 seconds so it doesn't block the input forever
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(onDismiss, 15000);
    return () => clearTimeout(timer);
  }, [feedback, onDismiss]);

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.3}
          onDragEnd={(_e, info) => {
            if (Math.abs(info.offset.y) > 40) onDismiss();
          }}
          className="mx-3 mb-2 rounded-xl border border-primary/20 p-3 cursor-grab active:cursor-grabbing"
          style={{
            background: 'linear-gradient(to bottom, rgba(212,175,55,0.08), rgba(15,18,33,0.6))',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p className="text-[12px] text-white/70 leading-relaxed mb-2.5"
            style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
          >
            {feedback}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {onTryStronger && (
              <button
                onClick={onTryStronger}
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary/70 hover:text-primary transition-colors px-2.5 py-1.5 rounded-full border border-primary/20 hover:border-primary/40 active:scale-95"
              >
                Try stronger
              </button>
            )}
            {onNextScenario && (
              <button
                onClick={onNextScenario}
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50 hover:text-white/70 transition-colors px-2.5 py-1.5 rounded-full border border-white/10 hover:border-white/20 active:scale-95"
              >
                Next scenario
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={onDismiss}
              className="text-[10px] text-white/30 hover:text-white/50 transition-colors"
            >
              dismiss
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
