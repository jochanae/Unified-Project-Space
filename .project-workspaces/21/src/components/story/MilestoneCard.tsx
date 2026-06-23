import { motion } from 'framer-motion';
import { Trophy, Flame, Heart, Sparkles } from 'lucide-react';

interface MilestoneCardProps {
  text: string;
  date: string;
  milestoneType?: string;
  index: number;
}

const MILESTONE_STYLE: Record<string, { icon: typeof Trophy; gradient: string }> = {
  first_message: { icon: Sparkles, gradient: 'from-primary/20 to-accent/20' },
  '7_day_streak': { icon: Flame, gradient: 'from-primary/25 to-primary/10' },
  '30_day_streak': { icon: Trophy, gradient: 'from-accent/20 to-primary/20' },
  vulnerable_share: { icon: Heart, gradient: 'from-accent/25 to-accent/10' },
  crisis_followup: { icon: Heart, gradient: 'from-primary/20 to-accent/15' },
};

export default function MilestoneCard({ text, date, milestoneType, index }: MilestoneCardProps) {
  const style = MILESTONE_STYLE[milestoneType || ''] || MILESTONE_STYLE.first_message;
  const Icon = style.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, type: 'spring', damping: 20 }}
      className={`relative rounded-2xl px-4 py-4 bg-gradient-to-br ${style.gradient} border border-primary/20 overflow-hidden`}
    >
      {/* Subtle glow */}
      <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full bg-primary/10 blur-xl" />

      <div className="flex items-start gap-3 relative z-10">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 border border-primary/30 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground leading-relaxed">{text}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1.5">
            {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
