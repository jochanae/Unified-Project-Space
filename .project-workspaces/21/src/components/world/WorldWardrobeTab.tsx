import { useState, useEffect, useMemo } from 'react';
import ResilientImage from '@/components/ResilientImage';
import { motion } from 'framer-motion';
import { Shirt, ShoppingBag, Sparkles, Check, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { SHOP_INVENTORY, RARITY_CONFIG, getShopItemImage, type ShopItem } from '@/lib/giftInventory';
import { cn } from '@/lib/utils';

// ── Category classification ──
const CONSUMABLE_CATEGORY = 'consumables';
type WardrobeSection = 'appearance' | 'moments';

const SECTION_CONFIG: Record<WardrobeSection, { label: string; icon: string }> = {
  appearance: { label: 'APPEARANCE', icon: '👔' },
  moments: { label: 'MOMENTS', icon: '✨' },
};

function isEquippable(item: ShopItem): boolean {
  return item.category !== CONSUMABLE_CATEGORY;
}

interface WorldWardrobeTabProps {
  userId: string;
  memberId: string;
  companionName: string;
}

export default function WorldWardrobeTab({ userId, memberId, companionName }: WorldWardrobeTabProps) {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<{ gift_id: string; purchased_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [equippedId, setEquippedId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<WardrobeSection>('appearance');

  useEffect(() => {
    if (!userId || !memberId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('user_gift_purchases')
      .select('gift_id, purchased_at')
      .eq('user_id', userId)
      .eq('member_id', memberId)
      .order('purchased_at', { ascending: false })
      .then(({ data }) => {
        setPurchases(data || []);
        setLoading(false);
      });
  }, [userId, memberId]);

  const ownedItems = useMemo(() =>
    purchases
      .map(p => {
        const item = SHOP_INVENTORY.find(g => g.id === p.gift_id);
        return item ? { ...item, purchasedAt: p.purchased_at } : null;
      })
      .filter(Boolean) as (ShopItem & { purchasedAt: string })[],
    [purchases]
  );

  const equippables = useMemo(() => ownedItems.filter(i => isEquippable(i)), [ownedItems]);
  const moments = useMemo(() => ownedItems.filter(i => !isEquippable(i)), [ownedItems]);

  const activeItems = activeSection === 'appearance' ? equippables : moments;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (ownedItems.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
          <Shirt className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <p className="text-xs font-semibold tracking-[0.15em] uppercase text-muted-foreground/60">
          Your collection is waiting
        </p>
        <p className="mt-2 max-w-[240px] text-[11px] text-muted-foreground/40 leading-relaxed">
          Gifts you send {companionName} will appear here — clothing they can wear, and moments you've shared.
        </p>
        <button
          onClick={() => navigate('/store')}
          className="mt-5 flex items-center gap-2 rounded-full bg-primary/90 px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-[0_0_20px_rgba(212,175,55,0.2)] hover:bg-primary transition-all"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Visit Gift Store
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Section toggle pills */}
      <div className="flex gap-2 justify-center">
        {(Object.keys(SECTION_CONFIG) as WardrobeSection[]).map((section) => {
          const cfg = SECTION_CONFIG[section];
          const count = section === 'appearance' ? equippables.length : moments.length;
          const isActive = activeSection === section;
          return (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-[10px] font-semibold tracking-[0.12em] uppercase transition-all',
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                  : 'bg-white/[0.03] text-muted-foreground/50 border border-white/[0.06] hover:border-white/[0.12]'
              )}
            >
              <span>{cfg.icon}</span>
              {cfg.label}
              <span className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[9px]',
                isActive ? 'bg-primary/20 text-primary' : 'bg-white/[0.05] text-muted-foreground/40'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Items */}
      {activeItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-[11px] text-muted-foreground/40">
            {activeSection === 'appearance'
              ? `No clothing or accessories yet`
              : `No moments shared yet`}
          </p>
        </div>
      ) : activeSection === 'appearance' ? (
        /* ── Equippable grid: 3D-style cards ── */
        <div className="grid grid-cols-2 gap-3">
          {activeItems.map((item, i) => {
            const rarity = RARITY_CONFIG[item.rarity];
            const imgSrc = getShopItemImage(item);
            const isEquipped = equippedId === item.id;

            return (
              <motion.button
                key={`${item.id}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setEquippedId(isEquipped ? null : item.id)}
                className={cn(
                  'group relative overflow-hidden rounded-2xl border-2 bg-card text-left transition-all',
                  isEquipped
                    ? 'border-primary shadow-[0_0_16px_rgba(212,175,55,0.4)]'
                    : rarity.borderClass + ' shadow-sm hover:border-primary/30'
                )}
                style={!isEquipped && rarity.glowColor !== 'transparent' ? { boxShadow: `0 0 16px 2px ${rarity.glowColor}` } : undefined}
              >
                {/* Equipped badge */}
                {isEquipped && (
                  <div className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-lg">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}

                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={item.name}
                    className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-muted/40">
                    <span className="text-3xl">{item.emoji || '👕'}</span>
                  </div>
                )}

                <div className="p-2.5">
                  <div className="flex items-center gap-1">
                    {item.rarity !== 'standard' && <Sparkles className="h-3 w-3 text-primary/70" />}
                    <span className="text-[11px] font-bold text-foreground truncate">{item.name}</span>
                  </div>
                  <span className={cn(
                    'mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold',
                    rarity.badgeClass
                  )}>
                    {rarity.label}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </div>
      ) : (
        /* ── Moments: circular glassmorphism icons ── */
        <div className="grid grid-cols-3 gap-3">
          {activeItems.map((item, i) => {
            const imgSrc = getShopItemImage(item);
            return (
              <motion.div
                key={`${item.id}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm overflow-hidden">
                  {imgSrc ? (
                    <ResilientImage
                      src={imgSrc}
                      alt={item.name}
                      wrapperClassName="h-full w-full rounded-full"
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <span className="text-2xl">{item.emoji || '✨'}</span>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-foreground/80 truncate max-w-[80px]">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground/40 flex items-center justify-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {format(new Date(item.purchasedAt), 'MMM d')}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Browse more */}
      <div className="flex justify-center pt-2">
        <button
          onClick={() => navigate('/store')}
          className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-[10px] font-medium tracking-[0.08em] text-muted-foreground/50 hover:bg-white/[0.06] transition-colors"
        >
          <ShoppingBag className="h-3 w-3" />
          Browse more gifts
        </button>
      </div>
    </div>
  );
}
