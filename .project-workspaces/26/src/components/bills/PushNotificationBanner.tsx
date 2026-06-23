import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const STORAGE_KEY = 'push-banner-dismissed';

export const PushNotificationBanner = () => {
  const { isSupported, isSubscribed, permission, subscribe, isLoading: isCheckingSubscription } = usePushNotifications();
  const [isDismissed, setIsDismissed] = useState(() => {
    // Initialize from localStorage for persistence across sessions
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [isEnabling, setIsEnabling] = useState(false);

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - Permission already granted (user already enabled, just waiting for subscription check)
  // - Permission denied
  // - Dismissed by user
  // - Still checking subscription status (prevents flash)
  if (!isSupported || isSubscribed || permission === 'denied' || isDismissed || isCheckingSubscription) {
    return null;
  }

  const handleEnable = async () => {
    setIsEnabling(true);
    const success = await subscribe();
    if (success) {
      // No localStorage set here — banner hides via isSubscribed state
    }
    setIsEnabling(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  return (
    <div className="relative bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800 rounded-xl p-4 mb-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 bg-violet-500/20 rounded-lg">
          <Bell className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm text-foreground">
            Never miss a bill payment
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get push notifications on your device before bills are due
          </p>
          <Button
            onClick={handleEnable}
            disabled={isEnabling}
            size="sm"
            className="mt-2 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isEnabling ? "Enabling..." : "Enable Notifications"}
          </Button>
        </div>
      </div>
    </div>
  );
};
