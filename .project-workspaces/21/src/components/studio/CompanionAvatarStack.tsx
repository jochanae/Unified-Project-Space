import { motion } from 'framer-motion';
import { Plus, Crown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Connection } from '@/hooks/useProfile';

interface CompanionAvatarStackProps {
  connections: Connection[];
  activeIdx: number;
  onSelect: (idx: number) => void;
  onAdd: () => void;
  canAdd: boolean;
  isLocked: boolean; // true if at limit on free tier
  hideAddButton?: boolean;
  hiddenMemberIds?: string[];
}

export default function CompanionAvatarStack({
  connections,
  activeIdx,
  onSelect,
  onAdd,
  canAdd,
  isLocked,
  hideAddButton,
  hiddenMemberIds = [],
}: CompanionAvatarStackProps) {
  return (
    <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 py-3 justify-center">
      {connections.map((conn, idx) => {
        if (hiddenMemberIds.includes(conn.memberId)) return null;

        const isActive = idx === activeIdx;
        return (
          <button
            key={conn.memberId}
            onClick={() => onSelect(idx)}
            className="flex flex-col items-center gap-1.5 shrink-0"
          >
            <div className="relative">
              <div
                className={cn(
                  'h-[72px] w-[72px] rounded-full overflow-hidden transition-all shadow-md',
                  isActive
                    ? 'ring-[2.5px] ring-primary shadow-[0_0_12px_2px_hsl(18_85%_58%/0.4)]'
                    : 'ring-1 ring-white/15'
                )}
              >
                {conn.avatarUrl ? (
                  <img
                    src={conn.avatarUrl}
                    alt={conn.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center gradient-primary text-primary-foreground font-bold text-xl">
                    {conn.name.charAt(0)}
                  </div>
                )}
              </div>
              {isActive && (
                <motion.div
                  animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute inset-0 rounded-full border-2 border-primary pointer-events-none"
                  style={{ margin: '-3px' }}
                />
              )}
            </div>
            <span className={cn(
              'text-[11px] font-semibold truncate max-w-[72px]',
              isActive ? 'text-white' : 'text-white/60'
            )}>
              {conn.name.length > 10 ? conn.name.slice(0, 9) + '…' : conn.name}
            </span>
          </button>
        );
      })}

      {!hideAddButton && (
        <button
          onClick={onAdd}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className="relative h-[72px] w-[72px] rounded-full flex items-center justify-center transition-all duration-500 hover:border-amber-400/60 hover:shadow-[0_0_15px_rgba(212,175,55,0.25)]" style={{ border: '2px dashed rgba(212,175,55,0.4)' }}>
            {isLocked ? (
              <>
                <Plus className="h-6 w-6 text-white/50" />
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
                  <Crown className="h-3 w-3 text-primary-foreground" />
                </div>
              </>
            ) : canAdd ? (
              <Plus className="h-6 w-6 text-white/60" />
            ) : (
              <>
                <Plus className="h-6 w-6 text-white/30" />
                <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-muted shadow-sm">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
              </>
            )}
          </div>
          <span className="text-[11px] font-semibold text-white/60">Add</span>
        </button>
      )}
    </div>
  );
}
