import { motion } from 'framer-motion';
import { Flame, Brain, Trophy } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { DepthSignals as DepthSignalsType } from '@/hooks/useDepthSignals';

interface DepthSignalsProps {
  signals: DepthSignalsType;
  companionName?: string;
  onMemoryClick?: () => void;
}

export default function DepthSignals({ signals, companionName, onMemoryClick }: DepthSignalsProps) {
  if (signals.loading) return null;

  const name = companionName || 'Your friend';
  const milestonePercent = signals.totalMilestones > 0
    ? Math.round((signals.milestonesAchieved / signals.totalMilestones) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className={`mt-4 grid gap-2.5 ${signals.milestonesAchieved > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}
    >
      {/* Streak */}
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 backdrop-blur-xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" style={{ background: 'hsl(243 47% 20% / 0.4)' }}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <Flame className="h-4 w-4 text-primary" />
        </div>
        <span className="font-display text-lg font-bold text-foreground leading-none">
          {signals.streakDays}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">
          day streak
        </span>
      </div>

      {/* Memories */}
      <div
        onClick={onMemoryClick}
        className={`flex flex-col items-center gap-1.5 rounded-xl border border-border/50 backdrop-blur-xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors ${onMemoryClick ? 'cursor-pointer hover:border-accent/40' : ''}`}
        style={{ background: 'hsl(243 47% 20% / 0.4)' }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10">
          <Brain className="h-4 w-4 text-accent" />
        </div>
        <span className="font-display text-lg font-bold text-foreground leading-none">
          {signals.memoryCount}
        </span>
        <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">
          {signals.memoryCount === 1 ? 'memory' : 'memories'}
        </span>
      </div>

      {/* Milestones — hidden until the user earns at least one */}
      {signals.milestonesAchieved > 0 && (
        <div className="flex flex-col items-center gap-1.5 rounded-xl border border-border/50 backdrop-blur-xl p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" style={{ background: 'hsl(243 47% 20% / 0.4)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <span className="font-display text-lg font-bold text-foreground leading-none">
            {signals.milestonesAchieved}/{signals.totalMilestones}
          </span>
          <span className="text-[10px] font-semibold text-muted-foreground text-center leading-tight">
            milestones
          </span>
        </div>
      )}

      {/* Memory insight bar — full width below the 3-col grid */}
      {signals.memoryCount > 0 && (
        <div className="col-span-3 rounded-xl border border-border/50 backdrop-blur-xl px-3.5 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" style={{ background: 'hsl(243 47% 20% / 0.4)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">
              {name} knows {signals.memoryCount} {signals.memoryCount === 1 ? 'thing' : 'things'} about you
            </span>
            <span className="text-[10px] font-bold text-primary">{milestonePercent}%</span>
          </div>
          <Progress value={milestonePercent} className="h-1.5" />
        </div>
      )}
    </motion.div>
  );
}
