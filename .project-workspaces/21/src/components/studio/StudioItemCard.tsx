import { motion } from 'framer-motion';
import { Check, Crown, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StudioItem {
  id: string;
  label: string;
  image?: string;       // URL or imported image
  emoji?: string;       // fallback if no image
  description?: string;
  tier: 'free' | 'premium' | 'store';
  priceCents?: number;  // only for store items
  owned?: boolean;
}

interface StudioItemCardProps {
  item: StudioItem;
  selected: boolean;
  isPremium: boolean;
  onSelect: (item: StudioItem) => void;
  index: number;
}

export default function StudioItemCard({
  item,
  selected,
  isPremium,
  onSelect,
  index,
}: StudioItemCardProps) {
  const isLocked = item.tier === 'premium' && !isPremium;
  const isStore = item.tier === 'store' && !item.owned;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={() => onSelect(item)}
      className={cn(
        'group relative flex flex-col items-center overflow-hidden rounded-2xl border-2 transition-all',
        selected
          ? 'border-primary ring-2 ring-primary/20 shadow-md'
          : isLocked
            ? 'border-border/30 opacity-70'
            : 'border-border/40 hover:border-primary/30 hover:shadow-sm'
      )}
    >
      {/* Visual area */}
      <div className="relative aspect-square w-full bg-secondary/50 flex items-center justify-center overflow-hidden">
        {item.image ? (
          <img
            src={item.image}
            alt={item.label}
            className={cn(
              'h-full w-full object-cover transition-transform',
              !isLocked && 'group-hover:scale-105'
            )}
            loading="lazy"
          />
        ) : (
          <span className="text-3xl">{item.emoji || '✨'}</span>
        )}

        {/* Selected checkmark */}
        {selected && (
          <div className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow">
            <Check className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
        )}

        {/* Premium lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-card/90 shadow">
              <Crown className="h-3.5 w-3.5 text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Label + price */}
      <div className="w-full px-2 py-2 text-center">
        <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{item.label}</p>
        {item.description && (
          <p className="text-[9px] text-muted-foreground mt-0.5 truncate">{item.description}</p>
        )}

        {isStore && item.priceCents != null && (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <ShoppingBag className="h-2.5 w-2.5" />
            ${(item.priceCents / 100).toFixed(2)}
          </span>
        )}

        {item.owned && (
          <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
            <Check className="h-2.5 w-2.5" /> Owned
          </span>
        )}
      </div>
    </motion.button>
  );
}
