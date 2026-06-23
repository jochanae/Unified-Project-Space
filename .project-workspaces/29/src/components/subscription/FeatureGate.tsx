import { useState, ReactNode } from 'react';
import { useAuth, SubscriptionTier } from '@/contexts/AuthContext';
import { UpgradeModal } from './UpgradeModal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles, Crown } from 'lucide-react';

interface FeatureGateProps {
  children: ReactNode;
  requiredTier: 'pro';
  featureName: string;
  featureDescription?: string;
  /** If true, shows a locked overlay instead of hiding children */
  showLockedPreview?: boolean;
}

const tierHierarchy: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
};

const tierIcons = {
  pro: Crown,
};

const tierColors = {
  pro: 'from-amber-500 to-orange-500',
};

export function FeatureGate({
  children,
  requiredTier,
  featureName,
  featureDescription,
  showLockedPreview = false,
}: FeatureGateProps) {
  const { subscriptionTier, isLoading, role } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Don't gate during loading
  if (isLoading) {
    return <>{children}</>;
  }

  // Admins always have full access
  const isAdmin = role === 'admin' || role === 'super_admin';
  const hasAccess = isAdmin || tierHierarchy[subscriptionTier] >= tierHierarchy[requiredTier];

  if (hasAccess) {
    return <>{children}</>;
  }

  const Icon = tierIcons[requiredTier];

  if (showLockedPreview) {
    return (
      <>
        <div className="relative">
          <div className="pointer-events-none select-none opacity-30 blur-[2px]">
            {children}
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg">
            <Card className="max-w-sm mx-4 border-border/50 shadow-lg">
              <CardContent className="pt-6 text-center">
                <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${tierColors[requiredTier]}`}>
                  <Lock className="h-5 w-5 text-white" />
                </div>
                <Badge className={`mb-3 bg-gradient-to-r ${tierColors[requiredTier]} text-white border-0`}>
                  {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Feature
                </Badge>
                <h3 className="font-semibold mb-1">{featureName}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {featureDescription || `Upgrade to unlock ${featureName.toLowerCase()}.`}
                </p>
                <Button
                  onClick={() => setShowUpgradeModal(true)}
                  className={`w-full bg-gradient-to-r ${tierColors[requiredTier]} hover:opacity-90`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  Unlock Feature
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        <UpgradeModal
          open={showUpgradeModal}
          onOpenChange={setShowUpgradeModal}
          feature={featureName}
          requiredTier={requiredTier}
          description={featureDescription}
        />
      </>
    );
  }

  // Show a compact locked card
  return (
    <>
      <Card className="border-dashed border-2 border-border/50 bg-muted/20">
        <CardContent className="py-8 text-center">
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br ${tierColors[requiredTier]}/20`}>
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <Badge className={`mb-3 bg-gradient-to-r ${tierColors[requiredTier]} text-white border-0`}>
            {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Feature
          </Badge>
          <h3 className="font-semibold mb-1">{featureName}</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-xs mx-auto">
            {featureDescription || `Upgrade to access ${featureName.toLowerCase()}.`}
          </p>
          <Button
            onClick={() => setShowUpgradeModal(true)}
            variant="outline"
            className="gap-2"
          >
            <Icon className="h-4 w-4" />
            Learn More
          </Button>
        </CardContent>
      </Card>
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        feature={featureName}
        requiredTier={requiredTier}
        description={featureDescription}
      />
    </>
  );
}
