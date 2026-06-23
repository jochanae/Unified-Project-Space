import { Navigate } from 'react-router-dom';
import { useFeatureFlags, getFeatureKeyForPath } from '@/hooks/useFeatureFlags';

interface FeatureGateProps {
  path: string;
  children: React.ReactNode;
}

/**
 * Wraps a route to check if its feature flag is enabled.
 * If disabled, redirects to dashboard.
 */
export function FeatureGate({ path, children }: FeatureGateProps) {
  const { isFeatureEnabled, loading } = useFeatureFlags();
  
  if (loading) return null; // Wait for flags to load
  
  const featureKey = getFeatureKeyForPath(path);
  
  // If no feature key mapped, always allow
  if (!featureKey) return <>{children}</>;
  
  if (!isFeatureEnabled(featureKey)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
