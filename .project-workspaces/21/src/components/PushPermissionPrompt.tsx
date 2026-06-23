import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/utils/logger';

/**
 * Fires the native browser push permission prompt ONCE after the user has
 * completed onboarding. Headless component — no UI. Mounted from the
 * Dashboard so it only runs in an authenticated, post-onboarding context.
 *
 * Why: Notification preferences UI shows push as ON by default, but until
 * the user grants browser permission no subscription is ever created. This
 * closes that gap — proactively asking once after onboarding so the
 * "ON by default" promise is real.
 */
export default function PushPermissionPrompt() {
  const { user } = useAuth();
  const { profile } = useAppContext();
  const { isSupported, permission, isLoading, isSubscribed, subscribe } = usePushNotifications();
  const triedRef = useRef(false);

  useEffect(() => {
    if (!user?.id || !profile) return;
    if (!profile.onboardingCompleted) return;
    if (!isSupported || isLoading) return;
    if (isSubscribed) return;
    if (permission !== 'default') return; // already granted or denied — respect that
    if (triedRef.current) return;

    const storageKey = `push-prompt-asked-${user.id}`;
    if (localStorage.getItem(storageKey)) return;

    triedRef.current = true;
    // Small delay so the dashboard has settled before the system prompt appears
    const timer = setTimeout(async () => {
      localStorage.setItem(storageKey, new Date().toISOString());
      try {
        await subscribe();
      } catch (e) {
        logger.warn('[PushPermissionPrompt] subscribe failed', e);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [user?.id, profile, isSupported, isLoading, isSubscribed, permission, subscribe]);

  return null;
}
