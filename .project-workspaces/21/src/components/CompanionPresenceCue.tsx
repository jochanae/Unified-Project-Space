import { motion, AnimatePresence } from 'framer-motion';

interface CompanionPresenceCueProps {
  companionName: string;
  isReturning: boolean;
  welcomeBack: string | null;
  dailyCue: string | null;
  onClick?: () => void;
}

/**
 * Ambient companion-awareness signal.
 * Shows a subtle "thinking" animation + contextual message.
 * - If returning after absence (2+ days): shows welcome-back message
 * - Otherwise: shows a daily "thinking of you" cue once per session
 */
export default function CompanionPresenceCue({ companionName, isReturning, welcomeBack, dailyCue, onClick }: CompanionPresenceCueProps) {
  const message = isReturning && welcomeBack ? welcomeBack : dailyCue;
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.button
        type="button"
        onClick={onClick}
        style={{ willChange: 'opacity, transform' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="w-full flex items-start gap-2.5 rounded-2xl px-4 py-3 mb-2 text-left active:scale-[0.98] transition-transform cursor-pointer"
      >
        {/* Thinking dots */}
        <div className="flex items-center gap-0.5 pt-1 shrink-0">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-primary/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>

        <p className="text-xs text-white/60 italic leading-relaxed">
          {message}
        </p>
      </motion.button>
    </AnimatePresence>
  );
}
