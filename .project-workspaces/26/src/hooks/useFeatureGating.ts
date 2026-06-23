import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

type SubscriptionTier = 'free' | 'premium';

interface FeatureConfig {
  name: string;
  tier: 'free' | 'premium';
  description?: string;
  freeLimit?: number; // For features with limited free access
}

const FEATURE_CONFIG: Record<string, FeatureConfig> = {
  // ===== FREE FEATURES =====
  // Core financial management
  'accounts': { name: 'Accounts', tier: 'free', description: 'Track all your accounts' },
  'budgets': { name: 'Budgets', tier: 'free', description: 'Create and manage budgets' },
  'goals': { name: 'Goals', tier: 'free', description: 'Set savings goals' },
  'bills': { name: 'Bills', tier: 'free', description: 'Track bills and reminders' },
  'transactions': { name: 'Transactions', tier: 'free', description: 'Record and categorize transactions' },
  
  // Planning tools
  'debts': { name: 'Debt Manager', tier: 'free', description: 'DTI calculator, snowball/avalanche strategies' },
  'credit': { name: 'Credit Tracking', tier: 'free', description: 'Manual credit score entry and history' },
  'vision-board': { name: 'Vision Board', tier: 'free', description: 'Visualize your financial goals' },
  'advanced-tools': { name: 'Advanced Tools', tier: 'free', description: 'Tax, insurance, business expenses, charity tracking' },
  'reports': { name: 'Reports', tier: 'free', description: 'Basic spending reports and charts' },
  
  // Learning & discovery
  'money-academy': { name: 'Money Academy', tier: 'free', description: 'Financial education content' },
  'professionals': { name: 'Find Professionals', tier: 'free', description: 'Connect with financial professionals' },
  
  // KidsBloom basic (1-2 kids, 1:1 chat, individual chores)
  'kids-basic': { name: 'KidsBloom Basic', tier: 'free', description: 'Link up to 2 kids, 1:1 chat, individual chores' },
  
  // Bloom with daily limit
  'bloom-coach': { name: 'Bloom', tier: 'free', description: 'AI financial guidance', freeLimit: 3 },
  
  // ===== PREMIUM FEATURES ($9.99/mo) =====
  // Collaborative features - creating/inviting only (joining is free)
  'collaborative-goals': { name: 'Collaborative Goals', tier: 'premium', description: 'Create collaborative goals and invite others' },
  'collaborative-budgets': { name: 'Collaborative Budgets', tier: 'premium', description: 'Create collaborative budgets and invite others' },
  
  // Full KidsBloom experience
  'kids-premium': { name: 'KidsBloom Premium', tier: 'premium', description: '3+ kids, group chat, shared chore board, second parent access' },
  'kids-group-chat': { name: 'Family Group Chat', tier: 'premium', description: 'Multi-person family conversations' },
  'kids-shared-chores': { name: 'Shared Chore Board', tier: 'premium', description: 'Family-wide chore management' },
  'kids-multi-parent': { name: 'Multi-Parent Access', tier: 'premium', description: 'Second parent joins with family code' },
  
  // Unlimited AI
  'bloom-coach-unlimited': { name: 'Unlimited Bloom', tier: 'premium', description: 'Unlimited AI financial guidance' },
  'ai-insights': { name: 'AI Insights', tier: 'premium', description: 'AI-powered financial analysis and recommendations' },
  
  // Advanced features
  'voice-commands': { name: 'Voice Commands', tier: 'premium', description: 'Voice-activated financial assistant' },
  'debit-card': { name: 'Digital Debit Card', tier: 'premium', description: 'Your personalized CoinsBloom debit card' },
};

/**
 * Feature gating hook for controlling feature access based on user subscription/plan
 * Two-tier model: Free and Premium ($9.99/mo)
 */
export function useFeatureGating() {
  const { user } = useAuth();
  const [userTier, setUserTier] = useState<SubscriptionTier>('free');
  const [userRole, setUserRole] = useState<'admin' | 'moderator' | 'user' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch user's subscription tier and role
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        setUserTier('free');
        setUserRole(null);
        setIsLoading(false);
        return;
      }
      
      // Skip subscription check for kid accounts (internal emails)
      if (user.email?.includes('@kidsbloom.internal')) {
        setUserTier('free');
        setUserRole(null);
        setIsLoading(false);
        return;
      }
      
      // Check if user is admin/moderator/super_admin (gets full access)
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (roleData?.role === 'admin' || roleData?.role === 'super_admin' || roleData?.role === 'moderator') {
        setUserRole(roleData.role === 'super_admin' ? 'admin' : roleData.role as 'admin' | 'moderator');
        setUserTier('premium'); // Admins/moderators/super_admins get premium access
        setIsLoading(false);
        return;
      }
      
      // Check subscription status via check-subscription function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const { data, error } = await supabase.functions.invoke('check-subscription', {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          if (!error && data?.subscribed) {
            setUserTier('premium');
          } else {
            setUserTier('free');
          }
        } else {
          setUserTier('free');
        }
      } catch {
        setUserTier('free');
      }
      
      setIsLoading(false);
    };
    
    fetchUserData();
  }, [user]);

  const hasFeature = useCallback((featureName: string): boolean => {
    // Admins/moderators have access to everything
    if (userRole === 'admin' || userRole === 'moderator') {
      return true;
    }
    
    // If user is not logged in, only allow public features
    if (!user) {
      return ['money-academy', 'professionals'].includes(featureName);
    }
    
    const config = FEATURE_CONFIG[featureName];
    if (!config) {
      // Unknown feature, allow by default
      return true;
    }
    
    // Free features are available to all authenticated users
    if (config.tier === 'free') {
      return true;
    }
    
    // Premium features require premium subscription
    return userTier === 'premium';
  }, [user, userTier, userRole]);

  const isFeatureLocked = useCallback((featureName: string): boolean => {
    return !hasFeature(featureName);
  }, [hasFeature]);

  const getFeatureInfo = useCallback((featureName: string): FeatureConfig | undefined => {
    return FEATURE_CONFIG[featureName];
  }, []);

  const getRequiredTier = useCallback((featureName: string): SubscriptionTier | undefined => {
    const config = FEATURE_CONFIG[featureName];
    if (!config) return undefined;
    return config.tier;
  }, []);

  const getFreeLimit = useCallback((featureName: string): number | undefined => {
    const config = FEATURE_CONFIG[featureName];
    return config?.freeLimit;
  }, []);

  const isPremiumUser = userTier === 'premium';
  const isAdmin = userRole === 'admin';
  const isModerator = userRole === 'moderator';

  return {
    hasFeature,
    isFeatureLocked,
    getFeatureInfo,
    getRequiredTier,
    getFreeLimit,
    userTier,
    userRole,
    isPremiumUser,
    isAdmin,
    isModerator,
    isLoading,
    features: FEATURE_CONFIG,
  };
}
