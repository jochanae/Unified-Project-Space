import React from 'react';
import { Clock } from 'lucide-react';
import SmartCard from './SmartCard';

interface MemoryCardProps {
  text: string;
  date?: string;
  category?: string;
  onRePractice?: () => void;
  onViewTimeline?: () => void;
}

const formatDate = (iso?: string) => {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return null; }
};

const MemoryCard: React.FC<MemoryCardProps> = ({ text, date, onRePractice, onViewTimeline }) => (
  <SmartCard type="memory">
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/80 italic">{text}</p>
        {date && <p className="text-[10px] text-muted-foreground/40 mt-1">{formatDate(date)}</p>}
      </div>
      <Clock size={13} className="text-muted-foreground/40 shrink-0 mt-0.5" />
    </div>
    {(onRePractice || onViewTimeline) && (
      <div className="flex items-center gap-3 mt-2.5">
        {onRePractice && (
          <button className="rounded-full px-3 py-1.5 text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-foreground transition-colors" onClick={onRePractice}>
            Practice again
          </button>
        )}
        {onViewTimeline && (
          <button className="text-[11px] text-primary/60 hover:text-primary transition-colors" onClick={onViewTimeline}>
            View story
          </button>
        )}
      </div>
    )}
  </SmartCard>
);

export default MemoryCard;
