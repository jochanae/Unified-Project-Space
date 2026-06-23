import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const STRIPE_TIERS = {
  premium_monthly: {
    price_id: "price_1T3g0GBIFIyHdifHcd2kdvTd",
    product_id: "prod_U1jTlDSJR5lxyn",
    name: "Premium Monthly",
    amount: 14.99,
    interval: "month" as const,
  },
  premium_quarterly: {
    price_id: "price_1T3zqOBIFIyHdifH1Whs4Ghv",
    product_id: "prod_U23yurdf9TV3XC",
    name: "Premium Quarterly",
    amount: 38.97,
    monthlyEquivalent: 12.99,
    interval: "quarter" as const,
  },
  premium_yearly: {
    price_id: "price_1T3g0SBIFIyHdifHrHqjlp7M",
    product_id: "prod_U1jTZi8bC0vyHn",
    name: "Premium Yearly",
    amount: 119.88,
    monthlyEquivalent: 9.99,
    interval: "year" as const,
  },
} as const;

// Free tier limits
export const FREE_LIMITS = {
  DAILY_MESSAGES: 30,
  DAILY_IMAGES: 3,
  MAX_COMPANIONS: 1,
} as const;

// Premium tier limits
export const PREMIUM_LIMITS = {
  MAX_COMPANIONS: 5,
} as const;

export interface SubscriptionStatus {
  subscribed: boolean;
  isAdminSub: boolean;
  productId: string | null;
  priceId: string | null;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription(userId: string | undefined) {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    isAdminSub: false,
    productId: null,
    priceId: null,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!userId) {
      setStatus(s => ({ ...s, loading: false }));
      return;
    }
    try {
      // Ensure we have a valid session before calling the edge function.
      // Without this, the Authorization header may be missing on first load,
      // causing the edge function to return subscribed: false.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn('[useSubscription] No session yet — skipping check, will retry');
        return; // Don't clear loading — the 10s retry will pick it up
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      const subscribed = data.subscribed ?? false;
      const productId = data.product_id ?? null;
      setStatus({
        subscribed,
        isAdminSub: subscribed && productId === null,
        productId,
        priceId: data.price_id ?? null,
        subscriptionEnd: data.subscription_end ?? null,
        loading: false,
      });
    } catch (e) {
      console.error('Failed to check subscription:', e);
      setStatus(s => ({ ...s, loading: false }));
    }
  }, [userId]);

  useEffect(() => {
    checkSubscription();
    const initialTimer = setTimeout(() => {
      checkSubscription();
    }, 10_000);
    const interval = setInterval(checkSubscription, 5 * 60_000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [checkSubscription]);

  const startCheckout = async (priceId: string) => {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: { priceId },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  const startDonation = async (amount: number) => {
    const { data, error } = await supabase.functions.invoke('create-payment', {
      body: { amount },
    });
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  const openPortal = async () => {
    const { data, error } = await supabase.functions.invoke('customer-portal');
    if (error) throw error;
    if (data?.url) window.open(data.url, '_blank');
  };

  return {
    ...status,
    checkSubscription,
    startCheckout,
    startDonation,
    openPortal,
  };
}
