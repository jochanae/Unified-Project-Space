import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import SmartCard from './SmartCard';

interface HabitCardProps {
  title: string;
  emoji?: string;
  streak?: number;
  planId?: string;
  isComplete?: boolean;
  onComplete?: () => void;
  onRemind?: () => void;
}

const HabitCard: React.FC<HabitCardProps> = ({ title, emoji, streak, isComplete, onComplete, onRemind }) => (
  <SmartCard type="habit">
    <div className="flex items-center gap-3">
      <span className="text-2xl shrink-0">
        {emoji || <CheckCircle2 size={24} className="text-muted-foreground/60" />}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{title}</p>
        {!!streak && streak > 0 && (
          <span className="text-[11px] text-amber-400/80">🔥 {streak} days</span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        {isComplete ? (
          <CheckCircle2 size={20} className="text-green-400" />
        ) : (
          <button
            onClick={onComplete}
            className="rounded-full px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            Check in
          </button>
        )}
        {!isComplete && onRemind && (
          <button
            onClick={onRemind}
            className="text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            Remind me
          </button>
        )}
      </div>
    </div>
  </SmartCard>
);

export default HabitCard;
