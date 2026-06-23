import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Stripe product/price IDs
export const TIERS = {
  operator: {
    name: 'Operator',
    label: 'Pro',
    price_id: 'price_1TLUiEDe6sfYsRhIJHKHkeZO',
    product_id: 'prod_UK90OxxaLlTeY4',
    amount: 39,
    interval: 'month' as const,
  },
  growth: {
    name: 'Growth',
    label: 'Growth',
    price_id: 'price_1TLy7TDe6sfYsRhI849xdydB',
    product_id: 'prod_UKdOVv4Z8vndwd',
    amount: 79,
    interval: 'month' as const,
  },
} as const;

interface SubscriptionState {
  loading: boolean;
  subscribed: boolean;
  tier: 'free' | 'operator' | 'growth';
  productId: string | null;
  subscriptionEnd: string | null;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    subscribed: false,
    tier: 'free',
    productId: null,
    subscriptionEnd: null,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;

      let tier: 'free' | 'operator' | 'growth' = 'free';
      if (data.tier) {
        tier = data.tier;
      } else if (data.subscribed) {
        // Fallback: determine from product_id
        if (data.product_id === TIERS.growth.product_id) {
          tier = 'growth';
        } else {
          tier = 'operator';
        }
      }

      setState({
        loading: false,
        subscribed: data.subscribed ?? false,
        tier,
        productId: data.product_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
      });
    } catch {
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkSubscription();
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkSubscription();
    });
    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  const canPublish = state.tier === 'operator' || state.tier === 'growth';
  const isGrowth = state.tier === 'growth';

  const startCheckout = async (tier: 'operator' | 'growth') => {
    const tierConfig = TIERS[tier];
    const successUrl = `${window.location.origin}/dashboard?checkout=success&tier=${tierConfig.name}`;
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId: tierConfig.price_id, mode: 'subscription', successUrl },
    });
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  const openPortal = async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error) throw error;
    if (data?.url) {
      window.open(data.url, '_blank');
    }
  };

  return {
    ...state,
    canPublish,
    isGrowth,
    checkSubscription,
    startCheckout,
    openPortal,
  };
}
