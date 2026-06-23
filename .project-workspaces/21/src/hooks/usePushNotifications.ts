import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// This will be set after generating VAPID keys
const VAPID_PUBLIC_KEY = 'BOjkNR4hMKIuCR39ODntKRQuHnhbcn-6c7YWJNQcM-LbfuQY7c91-lHT_H65NKuBsFiDDsQmcnSp2y8TeiXqWrk';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check browser support and register service worker
  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          logger.log('Push Service Worker registered:', reg);
          setRegistration(reg);
          (reg as any).pushManager.getSubscription().then((sub: PushSubscription | null) => {
            setIsSubscribed(!!sub);
            setIsLoading(false);
          });
        })
        .catch((err) => {
          console.error('Service Worker registration failed:', err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  // Auto-resubscribe: if user has push enabled in prefs but lost their browser subscription
  useEffect(() => {
    if (!user || !registration || !isSupported || isLoading) return;
    if (isSubscribed) return; // already subscribed, nothing to do
    if (Notification.permission !== 'granted') return; // can't auto-subscribe without prior permission

    // Check if user's notification_preferences has push_notifications = true.
    // Treat a missing row as "true" since the UI defaults to ON — otherwise
    // users who never explicitly toggled push will silently never subscribe.
    (async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('push_notifications')
        .eq('user_id', user.id)
        .maybeSingle();

      const wantsPush = data === null || data?.push_notifications === true;
      if (wantsPush) {
        logger.log('Auto-resubscribing: user has push enabled but no active subscription');
        // Silently re-subscribe
        try {
          const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          const subscription = await (registration as any).pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey.buffer as ArrayBuffer,
          });

          const p256dhKey = subscription.getKey('p256dh');
          const authKey = subscription.getKey('auth');
          if (p256dhKey && authKey) {
            const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
            const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));

            // One-subscription-per-user: clear other endpoints first
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('user_id', user.id)
              .neq('endpoint', subscription.endpoint);

            await supabase.from('push_subscriptions').upsert({
              user_id: user.id,
              endpoint: subscription.endpoint,
              p256dh,
              auth,
            }, { onConflict: 'user_id,endpoint' });

            setIsSubscribed(true);
            logger.log('Auto-resubscribe successful');
          }
        } catch (err) {
          console.error('Auto-resubscribe failed:', err);
        }
      }
    })();
  }, [user, registration, isSupported, isLoading, isSubscribed]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registration || !user) {
      logger.warn('Push not supported or not ready');
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      toast.error('VAPID public key not configured yet. Generate keys first.');
      return false;
    }

    try {
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      const existingSub = await (registration as any).pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });

      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));

      // Enforce one-subscription-per-user: remove any other endpoints for this user
      // before inserting the current one. Prevents duplicate push notifications when
      // the user has subscribed from multiple browsers/devices.
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .neq('endpoint', subscription.endpoint);

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
      }, {
        onConflict: 'user_id,endpoint'
      });

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      // Show a real native notification as confirmation (not just a toast)
      try {
        if (registration) {
          registration.showNotification('Compani', {
            body: 'Push notifications are now enabled! You\'ll hear from your friend soon.',
            icon: '/icon-192.png',
            tag: 'push-enabled',
          });
        }
      } catch (e) { logger.warn("[PushNotifications] Registration failed:", e); }
      toast.success('Push notifications enabled!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Failed to enable push notifications');
      return false;
    }
  }, [isSupported, registration, user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!registration || !user) return false;

    try {
      const subscription = await (registration as any).pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);
      }

      setIsSubscribed(false);
      toast.success('Push notifications disabled');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    }
  }, [registration, user]);

  const sendNotification = useCallback(({
    title,
    body,
    icon = '/icon-192.png',
    tag,
    requireInteraction = false
  }: PushNotificationOptions): boolean => {
    if (!isSupported || permission !== 'granted') return false;

    try {
      if (registration) {
        registration.showNotification(title, { body, icon, tag, requireInteraction });
      } else {
        new Notification(title, { body, icon, tag, requireInteraction });
      }
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }, [isSupported, permission, registration]);

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    sendNotification,
  };
};
