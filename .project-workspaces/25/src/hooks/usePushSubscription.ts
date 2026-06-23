/**
 * usePushSubscription — manages this device's Web Push subscription.
 *
 * Surfaces three things the settings UI needs:
 *   - status: "unsupported" | "preview" | "denied" | "off" | "on" | "loading"
 *   - subscribe(): prompts permission, creates PushSubscription, persists row
 *   - unsubscribe(): cancels locally and removes the row
 *
 * Always scoped to the signed-in user. Never registers SW in the preview iframe.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ensureServiceWorker,
  isPreviewContext,
  pushSupported,
  subscribePush,
  unsubscribePush,
} from "@/lib/push";

export type PushStatus = "loading" | "unsupported" | "preview" | "denied" | "off" | "on";

export function usePushSubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (!pushSupported()) return setStatus("unsupported");
    if (isPreviewContext()) return setStatus("preview");
    if (Notification.permission === "denied") return setStatus("denied");

    const reg = await ensureServiceWorker();
    if (!reg) return setStatus("unsupported");
    const sub = await reg.pushManager.getSubscription();
    setStatus(sub ? "on" : "off");
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const sub = await subscribePush();
      if (!sub) {
        await refresh();
        return;
      }
      const json = sub.toJSON() as { endpoint?: string };
      const endpoint = json.endpoint ?? sub.endpoint;
      // Upsert by endpoint so re-subscribing on the same device doesn't duplicate.
      await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      await supabase.from("push_subscriptions").insert({
        user_id: user.id,
        endpoint,
        subscription: json as never,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      setStatus("on");
    } finally {
      setBusy(false);
    }
  }, [user, refresh]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    try {
      const endpoint = await unsubscribePush();
      if (endpoint) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", endpoint);
      }
      setStatus("off");
    } finally {
      setBusy(false);
    }
  }, [user]);

  return { status, busy, subscribe, unsubscribe, refresh };
}
