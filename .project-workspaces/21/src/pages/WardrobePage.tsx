import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, ShoppingBag, Sparkles, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAppContext } from '@/contexts/AppContext';
import { supabase } from '@/integrations/supabase/client';
import { SHOP_INVENTORY, RARITY_CONFIG, getShopItemImage, type ShopItem } from '@/lib/giftInventory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PurchasedGift {
  gift_id: string;
  purchased_at: string;
}

export default function WardrobePage() {
  const { user, connections } = useAppContext();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<PurchasedGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');

  // Filter to non-archived companions
  const activeConnections = connections.filter(c => !c.isArchived);

  // Initialize selected companion
  useEffect(() => {
    if (!selectedMemberId && activeConnections.length > 0) {
      setSelectedMemberId(activeConnections[0].memberId);
    }
  }, [activeConnections, selectedMemberId]);

  const selectedCompanion = activeConnections.find(c => c.memberId === selectedMemberId);
  const companionName = selectedCompanion?.name || 'Your Companion';

  useEffect(() => {
    if (!user?.id || !selectedMemberId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('user_gift_purchases')
      .select('gift_id, purchased_at')
      .eq('user_id', user.id)
      .eq('member_id', selectedMemberId)
      .order('purchased_at', { ascending: false })
      .then(({ data }) => {
        setPurchases(data || []);
        setLoading(false);
      });
  }, [user?.id, selectedMemberId]);

  // Map purchased gift IDs to inventory items
  const ownedItems: (ShopItem & { purchasedAt: string })[] = purchases
    .map(p => {
      const item = SHOP_INVENTORY.find(g => g.id === p.gift_id);
      return item ? { ...item, purchasedAt: p.purchased_at } : null;
    })
    .filter(Boolean) as any;

  if (!user) return null;

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border/40 bg-card/90 px-5 py-4 backdrop-blur-md"
      >
        <div className="mx-auto max-w-lg">
          <div className="flex items-center gap-2">
            <Shirt className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Wardrobe
            </h1>
          </div>

          {/* Companion selector */}
          {activeConnections.length > 1 ? (
            <div className="mt-2">
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-9 w-full rounded-xl border-border/50 bg-secondary/50 text-sm">
                  <SelectValue placeholder="Select companion" />
                </SelectTrigger>
                <SelectContent>
                  {activeConnections.map(c => (
                    <SelectItem key={c.memberId} value={c.memberId}>
                      {c.name}'s Collection
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              {companionName}'s collection
            </p>
          )}

          <p className="mt-1 text-[13px] text-muted-foreground">
            {ownedItems.length > 0
              ? `${ownedItems.length} item${ownedItems.length !== 1 ? 's' : ''} collected`
              : 'No gifts yet — visit the Gift Store to start collecting'}
          </p>
        </div>
      </motion.header>

      <div className="flex-1 px-4 py-5">
        <div className="mx-auto max-w-lg">
          {loading ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading wardrobe…</p>
            </div>
          ) : ownedItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-16 text-center"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Shirt className="h-10 w-10 text-primary/60" />
              </div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Wardrobe is empty
              </h2>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Gifts you buy for {companionName} from the Gift Store will appear here.
              </p>
              <button
                onClick={() => navigate("/store")}
                className="mt-6 flex items-center gap-2 rounded-full gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md hover:opacity-90 transition-all active:scale-[0.98]"
              >
                <ShoppingBag className="h-4 w-4" />
                Visit Gift Store
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ownedItems.map((item, i) => {
                const rarity = RARITY_CONFIG[item.rarity];
                const imgSrc = getShopItemImage(item);
                return (
                  <motion.div
                    key={`${item.id}-${i}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`relative overflow-hidden rounded-2xl border-2 ${rarity.borderClass} bg-card shadow-sm`}
                    style={rarity.glowColor !== 'transparent' ? { boxShadow: `0 0 16px 2px ${rarity.glowColor}` } : undefined}
                  >
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={item.name}
                        className="aspect-square w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex aspect-square w-full items-center justify-center bg-muted/40">
                        <Shirt className="h-10 w-10 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex items-center gap-1.5">
                        {item.rarity !== 'standard' && (
                          <Sparkles className="h-3 w-3 text-primary/70" />
                        )}
                        <span className="text-sm font-bold text-foreground truncate">{item.name}</span>
                      </div>
                      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${rarity.badgeClass}`}>
                        {rarity.label}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Sent {format(new Date(item.purchasedAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* CTA at bottom when items exist */}
          {ownedItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex justify-center"
            >
              <button
                onClick={() => navigate("/store")}
                className="flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                Browse more gifts
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
