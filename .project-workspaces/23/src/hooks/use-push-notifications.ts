import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';

export type PushStatus = 'unsupported' | 'denied' | 'granted' | 'default' | 'unconfigured';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

let cachedKey: string | null = null;
async function fetchVapidKey(): Promise<string | null> {
  if (cachedKey !== null) return cachedKey;
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    if (error || !data?.key) return null;
    cachedKey = data.key as string;
    return cachedKey;
  } catch {
    return null;
  }
}

export function usePushNotifications() {
  const { user } = useCurrentUser();
  const [status, setStatus] = useState<PushStatus>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setStatus('unsupported');
      return;
    }
    setStatus(Notification.permission as PushStatus);
  }, []);

  const subscribe = useCallback(async () => {
    if (!user?.orgId) return false;
    setBusy(true);
    try {
      const vapidKey = await fetchVapidKey();
      if (!vapidKey) {
        setStatus('unconfigured');
        return false;
      }

      const permission = await Notification.requestPermission();
      setStatus(permission as PushStatus);
      if (permission !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyBytes = urlBase64ToUint8Array(vapidKey);
        // Copy into a fresh ArrayBuffer to satisfy strict BufferSource typing
        const appServerKey = new Uint8Array(keyBytes).buffer;
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      }

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;

      await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          org_id: user.orgId,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: 'endpoint' },
      );
      return true;
    } finally {
      setBusy(false);
    }
  }, [user]);

  return { status, busy, subscribe };
}
