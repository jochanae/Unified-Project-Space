import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

// VAPID public key - users need to set their own
const VAPID_PUBLIC_KEY = 'BGTuzraAWzZmkDZYV2dAwEYqQN1fZvHjw53s4gLL3mhVcnar4Se0IdYYKV5EUaxbke_Lrj3vLpd1Yf1D21yyrF0';

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
  const [isLoading, setIsLoading] = useState(true); // Track loading state
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Check if notifications and service workers are supported
    if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Register service worker at root scope for PWA installability
      navigator.serviceWorker.ready
        .then((reg) => {
          console.log('Push Service Worker registered:', reg);
          setRegistration(reg);
          
          // Check if already subscribed
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

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registration || !user) {
      console.warn('Push not supported or not ready');
      return false;
    }

    try {
      // Request notification permission first
      const permResult = await Notification.requestPermission();
      setPermission(permResult);
      
      if (permResult !== 'granted') {
        toast.error('Notification permission denied');
        return false;
      }

      // Unsubscribe any existing subscription first (key may have changed)
      const existingSub = await (registration as any).pushManager.getSubscription();
      if (existingSub) {
        await existingSub.unsubscribe();
      }

      // Subscribe to push
      const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
      const subscription = await (registration as any).pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });

      console.log('Push subscription:', subscription);

      // Extract keys
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');
      
      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get subscription keys');
      }

      const p256dh = btoa(String.fromCharCode(...new Uint8Array(p256dhKey)));
      const auth = btoa(String.fromCharCode(...new Uint8Array(authKey)));

      // Save to database
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
        
        // Remove from database
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

  const requestPermission = useCallback(async (): Promise<boolean> => {
    return subscribe();
  }, [subscribe]);

  // Local notification (when app is open)
  const sendNotification = useCallback(({
    title,
    body,
    icon = '/favicon.ico',
    tag,
    requireInteraction = false
  }: PushNotificationOptions): boolean => {
    if (!isSupported) {
      console.warn('Notifications not supported');
      return false;
    }

    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return false;
    }

    try {
      if (registration) {
        // Use service worker notification
        registration.showNotification(title, {
          body,
          icon,
          tag,
          requireInteraction,
        });
      } else {
        // Fallback to regular notification
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
    requestPermission,
    subscribe,
    unsubscribe,
    sendNotification,
  };
};
