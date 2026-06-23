import { motion } from 'framer-motion';

interface CompletionBarProps {
  progress: number; // 0-1
  companionName?: string;
}

function getEncouragement(pct: number): string {
  if (pct <= 0.25) return 'Just getting started — give them a name and a vibe ✨';
  if (pct <= 0.5) return 'Looking good! Add their style and personality to go deeper.';
  if (pct <= 0.75) return 'Almost there — finish their look to unlock new expressions.';
  if (pct < 1) return "So close! One more detail and they're fully yours.";
  return '✨ Your companion is complete — new styles unlocked!';
}

export default function CompletionBar({ progress, companionName }: CompletionBarProps) {
  const pct = Math.round(progress * 100);

  return (
    <div className="px-4 pb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium text-muted-foreground">Companion profile</span>
        <span className="text-[10px] font-bold text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, hsl(350 45% 65%), hsl(20 30% 70%))',
          }}
        />
      </div>
      <p className="text-[10px] text-muted-foreground mt-1">
        {getEncouragement(progress)}
      </p>
    </div>
  );
}
