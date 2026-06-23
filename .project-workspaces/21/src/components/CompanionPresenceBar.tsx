import { motion } from 'framer-motion';

interface CompanionPresence {
  memberId: string;
  name: string;
  avatarUrl?: string;
  isActive: boolean;
  hasRecentActivity: boolean;
}

interface CompanionPresenceBarProps {
  companions: CompanionPresence[];
  onTap?: (memberId: string) => void;
  onShowAll?: () => void;
  selectedFilter?: string | null;
}

export default function CompanionPresenceBar({ companions, onTap, onShowAll, selectedFilter }: CompanionPresenceBarProps) {
  if (companions.length === 0) return null;

  const isAllSelected = !selectedFilter;

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      {/* "All" chip */}
      <button
        onClick={() => onShowAll?.()}
        className={`flex h-10 items-center justify-center rounded-full px-4 text-xs font-bold transition-all ${
          isAllSelected
            ? 'bg-primary/20 text-primary ring-2 ring-primary shadow-[0_0_8px_rgba(212,175,80,0.3)]'
            : 'bg-muted text-muted-foreground ring-1 ring-border/30 hover:bg-muted/80'
        }`}
      >
        All
      </button>
      {companions.map((c) => (
        <button
          key={c.memberId}
          onClick={() => onTap?.(c.memberId)}
          className="relative flex flex-col items-center gap-1 transition-transform active:scale-95"
          title={c.name}
        >
          {(() => {
            const isFiltered = selectedFilter === c.memberId;
            const ringClass = isFiltered
              ? 'ring-accent shadow-[0_0_8px_rgba(139,92,246,0.4)]'
              : c.isActive
                ? 'ring-primary shadow-[0_0_8px_rgba(212,175,80,0.3)]'
                : 'ring-border/30 opacity-60 grayscale-[30%]';
            return c.avatarUrl ? (
              <img
                src={c.avatarUrl}
                alt={c.name}
                className={`h-10 w-10 rounded-full object-cover ring-2 transition-all ${ringClass}`}
              />
            ) : (
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ring-2 transition-all ${
                  isFiltered
                    ? 'bg-accent/20 text-accent ring-accent'
                    : c.isActive
                      ? 'bg-primary/20 text-primary ring-primary'
                      : 'bg-muted text-muted-foreground ring-border/30 opacity-60'
                }`}
              >
                {c.name[0]?.toUpperCase()}
              </div>
            );
          })()}
          {/* Activity dot */}
          {c.hasRecentActivity && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary border-2 border-background"
            />
          )}
          <span className={`text-[10px] font-medium truncate max-w-[48px] ${
            c.isActive ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {c.isActive ? `${c.name}` : c.name}
          </span>
        </button>
      ))}
    </div>
  );
}
