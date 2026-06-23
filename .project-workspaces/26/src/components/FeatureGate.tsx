import { ReactNode, useState, useCallback, useEffect } from 'react';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Crown, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  /** If true, shows a preview of the content with an upgrade banner overlay */
  showPreview?: boolean;
  /** Custom message for the upgrade prompt */
  upgradeMessage?: string;
  /** Fallback content when feature is locked and showPreview is false */
  fallback?: ReactNode;
}

/**
 * FeatureGate component - wraps features that may require premium subscription
 * 
 * Usage:
 * <FeatureGate feature="kids-premium">
 *   <PremiumKidsContent />
 * </FeatureGate>
 * 
 * With preview mode:
 * <FeatureGate feature="ai-insights" showPreview>
 *   <AIInsightsPanel />
 * </FeatureGate>
 */
export function FeatureGate({ 
  feature, 
  children, 
  showPreview = false,
  upgradeMessage,
  fallback 
}: FeatureGateProps) {
  const { hasFeature, getFeatureInfo, isLoading, isPremiumUser } = useFeatureGating();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const navigate = useNavigate();
  
  const featureInfo = getFeatureInfo(feature);
  const isLocked = !hasFeature(feature);
  
  // Still loading - show nothing or skeleton
  if (isLoading) {
    return <div className="animate-pulse bg-muted rounded-lg h-24" />;
  }
  
  // Feature is available - render children
  if (!isLocked) {
    return <>{children}</>;
  }
  
  // Feature is locked - handle based on showPreview prop
  const defaultMessage = featureInfo?.description || 'This feature requires a premium subscription';
  const message = upgradeMessage || defaultMessage;
  
  // Show preview with upgrade banner overlay
  if (showPreview) {
    return (
      <div className="relative">
        {/* Blurred/dimmed preview of the content */}
        <div className="opacity-50 pointer-events-none blur-[1px] select-none">
          {children}
        </div>
        
        {/* Upgrade banner overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <Card className="max-w-sm mx-4 border-2 border-primary/20 shadow-lg">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{featureInfo?.name || 'Premium Feature'}</h3>
                <p className="text-sm text-muted-foreground mt-1">{message}</p>
              </div>
              <Button 
                onClick={() => setShowUpgradeModal(true)}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade to Premium
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <UpgradeModal 
          open={showUpgradeModal} 
          onOpenChange={setShowUpgradeModal}
          featureName={featureInfo?.name}
        />
      </div>
    );
  }
  
  // Show fallback content if provided
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Default locked state - compact upgrade prompt
  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardContent className="py-8 text-center space-y-4">
        <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium">{featureInfo?.name || 'Premium Feature'}</h3>
          <p className="text-sm text-muted-foreground mt-1">{message}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setShowUpgradeModal(true)}
          className="gap-2"
        >
          <Crown className="h-4 w-4" />
          Upgrade to Unlock
        </Button>
      </CardContent>
      
      <UpgradeModal 
        open={showUpgradeModal} 
        onOpenChange={setShowUpgradeModal}
        featureName={featureInfo?.name}
      />
    </Card>
  );
}

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName?: string;
}

function UpgradeModal({ open, onOpenChange, featureName }: UpgradeModalProps) {
  const navigate = useNavigate();
  
  const premiumFeatures = [
    'Unlimited Bloom',
    'KidsBloom Premium (3+ kids, group chat)',
    'Family group chore board',
    'Second parent access',
    'AI-powered insights',
    'Voice commands',
  ];
  
  const handleUpgrade = () => {
    onOpenChange(false);
    navigate('/settings?tab=billing');
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-primary" />
            Upgrade to Premium
          </DialogTitle>
          <DialogDescription>
            {featureName 
              ? `Unlock ${featureName} and all premium features for just $9.99/month`
              : 'Unlock all premium features for just $9.99/month'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <h4 className="text-sm font-medium mb-3">Premium includes:</h4>
          <ul className="space-y-2">
            {premiumFeatures.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Button onClick={handleUpgrade} className="gap-2">
            Upgrade Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Premium badge component for indicating premium features
 */
export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary ${className}`}>
      <Crown className="h-3 w-3" />
      Premium
    </span>
  );
}

/**
 * Hook for checking if user can use a limited feature (e.g., 3 messages/day)
 * Returns real-time usage data from the database
 */
export function useFeatureLimitCheck(feature: string) {
  const { user } = useAuth();
  const { getFreeLimit, isPremiumUser, isAdmin, isModerator } = useFeatureGating();
  const [usageData, setUsageData] = useState<{
    canUse: boolean;
    remaining: number;
    currentCount: number;
    limit: number;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const limit = getFreeLimit(feature);

  const checkUsage = useCallback(async () => {
    // Premium users, admins, moderators have no limits
    if (isPremiumUser || isAdmin || isModerator) {
      setUsageData({ canUse: true, remaining: Infinity, currentCount: 0, limit: Infinity });
      return { canUse: true, remaining: Infinity };
    }

    if (!user || !limit) {
      setUsageData({ canUse: true, remaining: Infinity, currentCount: 0, limit: limit || Infinity });
      return { canUse: true, remaining: Infinity };
    }

    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc('get_feature_usage', {
        p_user_id: user.id,
        p_feature_name: feature,
        p_daily_limit: limit
      });

      if (error) {
        console.error('Error checking feature usage:', error);
        setUsageData({ canUse: true, remaining: limit, currentCount: 0, limit });
        return { canUse: true, remaining: limit };
      }

      // Type assertion for the RPC result
      const usageResult = data as { can_use: boolean; remaining: number; current_count: number; daily_limit: number };
      const result = {
        canUse: usageResult.can_use,
        remaining: usageResult.remaining,
        currentCount: usageResult.current_count,
        limit: usageResult.daily_limit
      };
      setUsageData(result);
      return result;
    } catch (err) {
      console.error('Error in checkUsage:', err);
      setUsageData({ canUse: true, remaining: limit, currentCount: 0, limit });
      return { canUse: true, remaining: limit };
    } finally {
      setIsChecking(false);
    }
  }, [user, feature, limit, isPremiumUser, isAdmin, isModerator]);

  // Check usage on mount
  useEffect(() => {
    if (user && limit) {
      checkUsage();
    }
  }, [user, limit]);

  return { 
    ...usageData,
    isChecking,
    refreshUsage: checkUsage
  };
}