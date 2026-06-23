import { motion } from 'framer-motion';
import { usePracticeMode } from './PracticeModeContext';
import { Target } from 'lucide-react';

export default function PracticeModeToggle() {
  const { active, toggle } = usePracticeMode();

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-all duration-300 active:scale-95 ${
        active
          ? 'bg-primary/20 text-primary border border-primary/30'
          : 'text-muted-foreground/60 hover:text-muted-foreground hover:bg-white/[0.06] border border-transparent'
      }`}
      title={active ? 'Exit Practice Mode' : 'Practice Mode'}
    >
      <Target className="h-3.5 w-3.5" />
      <span className="uppercase tracking-[0.12em]">Practice</span>
      {active && (
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-primary"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </button>
  );
}
