import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, ShoppingBag, Check, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VirtualGift {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string | null;
  price_cents: number;
}

interface GiftStoreProps {
  userId: string;
  companionName: string;
  memberId: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  clothing: '👕',
  accessories: '💍',
  gifts: '🎁',
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  clothing: 'Clothing',
  accessories: 'Accessories',
  gifts: 'Gifts',
};

export default function GiftStore({ userId, companionName, memberId }: GiftStoreProps) {
  const [gifts, setGifts] = useState<VirtualGift[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadGiftsAndPurchases();
  }, [userId, memberId]);

  const loadGiftsAndPurchases = async () => {
    try {
      const [giftsRes, purchasesRes] = await Promise.all([
        supabase.from('virtual_gifts_public').select('*').eq('is_active', true),
        supabase.from('user_gift_purchases').select('gift_id').eq('user_id', userId).eq('member_id', memberId),
      ]);

      if (giftsRes.data) setGifts(giftsRes.data);
      if (purchasesRes.data) {
        setPurchasedIds(new Set(purchasesRes.data.map((p: any) => p.gift_id)));
      }
    } catch (e) {
      console.error('Failed to load gift store:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (gift: VirtualGift) => {
    if (purchasedIds.has(gift.id)) {
      toast.info(`${companionName} already has this!`);
      return;
    }
    setPurchaseLoading(gift.id);
    try {
      const { data, error } = await supabase.functions.invoke('gift-checkout', {
        body: { giftId: gift.id, memberId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (e: any) {
      console.error('[GiftStore] Checkout failed:', e);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setPurchaseLoading(null);
    }
  };

  const filteredGifts = activeCategory === 'all'
    ? gifts
    : gifts.filter((g) => g.category === activeCategory);

  const categories = ['all', ...Array.from(new Set(gifts.map((g) => g.category)))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mx-auto mb-2">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <h3 className="font-display text-sm font-bold text-foreground">Gift Shop</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Buy something special for {companionName} — they'll wear it in future photos ✨
        </p>
      </div>

      {/* Category filters */}
      <div className="flex gap-1.5 justify-center flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {cat !== 'all' && (CATEGORY_EMOJIS[cat] || '🎁')} {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Gift grid */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatePresence mode="popLayout">
          {filteredGifts.map((gift) => {
            const owned = purchasedIds.has(gift.id);
            const isLoading = purchaseLoading === gift.id;

            return (
              <motion.button
                key={gift.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => handlePurchase(gift)}
                disabled={isLoading}
                className={cn(
                  'relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]',
                  owned
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-white/[0.1] bg-white/[0.04] backdrop-blur-sm hover:border-primary/40 hover:bg-primary/5'
                )}
              >
                {owned && (
                  <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}

                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                  <span className="text-2xl">{CATEGORY_EMOJIS[gift.category] || '🎁'}</span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-foreground">{gift.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{gift.description}</p>
                </div>

                {owned ? (
                  <span className="text-[10px] font-semibold text-primary flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Owned
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    {isLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ShoppingBag className="h-3 w-3" />
                    )}
                    ${(gift.price_cents / 100).toFixed(2)}
                  </span>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredGifts.length === 0 && (
        <div className="text-center py-8">
          <Gift className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No gifts in this category yet</p>
        </div>
      )}
    </div>
  );
}
