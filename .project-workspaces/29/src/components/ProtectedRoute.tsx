import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, SUBSCRIPTION_TIERS } from '@/contexts/AuthContext';
import { FullPageLoader } from '@/components/ui/loading-spinner';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  requiredTier?: 'pro';
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireSubscription = false,
  requiredTier,
  requireAdmin = false,
  requireSuperAdmin = false,
}: ProtectedRouteProps) {
  const { user, isLoading, isSubscribed, subscriptionTier, role } = useAuth();
  const location = useLocation();
  const [showUpgradeModal, setShowUpgradeModal] = useState(true);

  if (isLoading) {
    return <FullPageLoader text="Loading your financial journey..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireSuperAdmin && role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireAdmin && role !== 'admin' && role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireSubscription && !isSubscribed) {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }

  // Tier-based gating with inline upgrade modal
  if (requiredTier) {
    const tierHierarchy = { free: 0, pro: 1 };
    const hasAccess = tierHierarchy[subscriptionTier] >= tierHierarchy[requiredTier];
    
    if (!hasAccess) {
      const featureName = getFeatureNameFromPath(location.pathname);
      
      return (
        <>
          <div className="relative">
            {/* Blurred preview of the content */}
            <div className="pointer-events-none select-none opacity-40 blur-sm">
              {children}
            </div>
            
            {/* Overlay */}
            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
          </div>
          
          <UpgradeModal
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            feature={featureName}
            requiredTier={requiredTier}
            description={`Unlock ${featureName} and other premium features with ${SUBSCRIPTION_TIERS[requiredTier].name}.`}
          />
        </>
      );
    }
  }

  return <>{children}</>;
}

// Helper to derive feature name from route path
function getFeatureNameFromPath(path: string): string {
  const pathMap: Record<string, string> = {
    '/youth-mode': 'Youth Mode',
    '/strategies': 'Trading Strategies',
    '/analytics': 'Advanced Analytics',
    '/broker-import-guide': 'Import Trades',
  };
  return pathMap[path] || 'Premium Feature';
}
