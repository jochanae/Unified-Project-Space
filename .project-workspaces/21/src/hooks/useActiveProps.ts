import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SHOP_INVENTORY } from '@/lib/giftInventory';

export interface ActiveProp {
  id: string;
  giftId: string;
  emoji: string;
  name: string;
  purchasedAt: string;
  expiresAt: number; // epoch ms
}

const PROP_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const DISPLAY_ROTATE_MS = 60 * 1000; // rotate visible prop every 60s

// Map gift IDs to animated prop configs
export const PROP_ANIMATIONS: Record<string, {
  emoji: string;
  animation: Record<string, any>;
  label: string;
}> = {
  'cs-coffee':      { emoji: '☕️', label: 'Coffee',  animation: { y: [0, -4, 0], transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } } },
  'cs-hug':         { emoji: '💖', label: 'Hug',     animation: { scale: [1, 1.12, 1], transition: { repeat: Infinity, duration: 1.5, ease: 'easeInOut' } } },
  'cs-flower':      { emoji: '💐', label: 'Flowers', animation: { rotate: [0, 8, -8, 0], transition: { repeat: Infinity, duration: 3, ease: 'easeInOut' } } },
  'cs-cookie':      { emoji: '🍪', label: 'Cookie',  animation: { scale: [1, 1.08, 1], transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } } },
  'cs-love-letter': { emoji: '💌', label: 'Letter',  animation: { rotate: [0, 5, -5, 0], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } } },
  'cs-mixtape':     { emoji: '🎵', label: 'Mixtape', animation: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' } } },
  'cs-teddy':       { emoji: '🧸', label: 'Teddy',   animation: { rotate: [0, 6, -6, 0], transition: { repeat: Infinity, duration: 2.5, ease: 'easeInOut' } } },
  'cs-star':        { emoji: '🌠', label: 'Star',    animation: { scale: [1, 1.15, 1], opacity: [1, 0.7, 1], transition: { repeat: Infinity, duration: 2, ease: 'easeInOut' } } },
  'cs-picnic':      { emoji: '🧺', label: 'Picnic',  animation: { y: [0, -3, 0], transition: { repeat: Infinity, duration: 2.2, ease: 'easeInOut' } } },
  'cs-cake':        { emoji: '🎂', label: 'Cake',    animation: { scale: [1, 1.06, 1], transition: { repeat: Infinity, duration: 1.6, ease: 'easeInOut' } } },
};

export function useActiveProps(userId: string | null, memberId: string | undefined) {
  const [props, setProps] = useState<ActiveProp[]>([]);
  const [visibleIndex, setVisibleIndex] = useState(0);

  // Fetch recent consumable purchases (last 24h)
  useEffect(() => {
    if (!userId || !memberId) return;

    const cutoff = new Date(Date.now() - PROP_DURATION_MS).toISOString();

    supabase
      .from('user_gift_purchases')
      .select('id, gift_id, purchased_at')
      .eq('user_id', userId)
      .eq('member_id', memberId)
      .gte('purchased_at', cutoff)
      .order('purchased_at', { ascending: false })
      .then(({ data }) => {
        if (!data) return;
        const activeProps: ActiveProp[] = data
          .filter(p => {
            const item = SHOP_INVENTORY.find(g => g.id === p.gift_id);
            return item?.category === 'consumables';
          })
          .map(p => {
            const item = SHOP_INVENTORY.find(g => g.id === p.gift_id)!;
            const config = PROP_ANIMATIONS[p.gift_id];
            return {
              id: p.id,
              giftId: p.gift_id,
              emoji: config?.emoji || item.emoji || '✨',
              name: item.name,
              purchasedAt: p.purchased_at,
              expiresAt: new Date(p.purchased_at).getTime() + PROP_DURATION_MS,
            };
          })
          .filter(p => p.expiresAt > Date.now());
        setProps(activeProps);
      });
  }, [userId, memberId]);

  // Rotate visible prop
  useEffect(() => {
    if (props.length <= 1) return;
    const interval = setInterval(() => {
      setVisibleIndex(prev => (prev + 1) % props.length);
    }, DISPLAY_ROTATE_MS);
    return () => clearInterval(interval);
  }, [props.length]);

  const currentProp = props.length > 0 ? props[visibleIndex % props.length] : null;

  const addProp = useCallback((giftId: string) => {
    const item = SHOP_INVENTORY.find(g => g.id === giftId);
    if (!item || item.category !== 'consumables') return;
    const config = PROP_ANIMATIONS[giftId];
    const now = Date.now();
    setProps(prev => [{
      id: `local-${now}`,
      giftId,
      emoji: config?.emoji || item.emoji || '✨',
      name: item.name,
      purchasedAt: new Date().toISOString(),
      expiresAt: now + PROP_DURATION_MS,
    }, ...prev]);
  }, []);

  return { props, currentProp, addProp, propCount: props.length };
}
