import { motion } from 'framer-motion';
import { Heart, Sparkles, Shield, CheckCircle, Smile, BookmarkCheck } from 'lucide-react';
import type { TimelineEntry as TEntry, TimelineEntryType } from '@/hooks/useStoryTimeline';

interface TimelineEntryProps {
  entry: TEntry;
  index: number;
}

const TYPE_ICON: Record<TimelineEntryType, { icon: typeof Heart; color: string }> = {
  memory: { icon: Sparkles, color: 'text-primary' },
  milestone: { icon: Sparkles, color: 'text-primary' },
  plan: { icon: CheckCircle, color: 'text-primary' },
  rhythm: { icon: CheckCircle, color: 'text-primary' },
  mood: { icon: Smile, color: 'text-accent' },
  moment: { icon: BookmarkCheck, color: 'text-primary' },
};

const CATEGORY_OVERRIDE: Record<string, { icon: typeof Heart; color: string }> = {
  emotional: { icon: Heart, color: 'text-accent' },
  wellness: { icon: Shield, color: 'text-primary' },
};

export default function TimelineEntryCard({ entry, index }: TimelineEntryProps) {
  const meta = CATEGORY_OVERRIDE[entry.category] || TYPE_ICON[entry.type] || TYPE_ICON.memory;
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-start gap-3"
    >
      <div className="flex flex-col items-center mt-1 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card border border-border/40">
          <Icon className={`h-3.5 w-3.5 ${meta.color}`} />
        </div>
      </div>
      <div className="flex-1 rounded-2xl px-4 py-3 bg-card/40 backdrop-blur-sm border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">
        <p className="text-[13px] text-foreground/90 leading-relaxed">{entry.text}</p>
        {entry.imageUrl && (
          <img
            src={entry.imageUrl}
            alt="Saved moment"
            className="mt-2 w-full rounded-xl object-cover max-h-48"
            loading="lazy"
          />
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground/50">
            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="text-[9px] text-muted-foreground/30 uppercase tracking-wider">
            {entry.type}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
