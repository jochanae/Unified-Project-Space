import { useMemo } from 'react';
import { useAuth, SubscriptionTier } from '@/contexts/AuthContext';

const tierHierarchy: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
};

// Define which features require which tier (now just free vs pro)
export const FEATURE_TIERS = {
  // Free tier features (available to all)
  paperTrading: 'free',
  strategyWizard: 'free',
  basicAI: 'free',
  
  // Pro tier features
  unlimitedAI: 'pro',
  analytics: 'pro',
  advancedAnalytics: 'pro',
  strategyBacktester: 'pro',
  strategyAnalysis: 'pro',
  patternRecognition: 'pro',
  tradeChecklist: 'pro',
  brokerImport: 'free',
  planExport: 'pro',
  exportReports: 'pro',
  myFinances: 'pro',
} as const;

export type FeatureKey = keyof typeof FEATURE_TIERS;

export function useFeatureAccess() {
  const { subscriptionTier, isLoading, role } = useAuth();

  // Admins always have access to all features
  const isAdmin = role === 'admin' || role === 'super_admin';

  const checkAccess = useMemo(() => {
    return (feature: FeatureKey): boolean => {
      if (isAdmin) return true;
      const requiredTier = FEATURE_TIERS[feature] as SubscriptionTier;
      return tierHierarchy[subscriptionTier] >= tierHierarchy[requiredTier];
    };
  }, [subscriptionTier, isAdmin]);

  const getRequiredTier = (feature: FeatureKey): 'free' | 'pro' => {
    return FEATURE_TIERS[feature] as 'free' | 'pro';
  };

  return {
    checkAccess,
    getRequiredTier,
    subscriptionTier,
    isLoading,
    isAdmin,
  };
}
