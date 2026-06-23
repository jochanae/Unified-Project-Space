/**
 * useOfflineSync
 *
 * Drains the IndexedDB write queue when the browser comes back online,
 * and again on initial mount in case a previous session left items behind.
 * Surfaces toast feedback for the user.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { flushQueue, queueSize } from "@/lib/offline-queue";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function useOfflineSync(): { pending: number } {
  const online = useOnlineStatus();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;
    queueSize().then((n) => {
      if (!cancelled) setPending(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!online) return;
    let cancelled = false;
    (async () => {
      const before = await queueSize();
      if (before === 0) {
        if (!cancelled) setPending(0);
        return;
      }
      const { flushed, remaining, failed } = await flushQueue(supabase);
      if (cancelled) return;
      setPending(remaining);
      if (flushed > 0 && remaining === 0) {
        toast.success(`Synced ${flushed} offline change${flushed === 1 ? "" : "s"}.`);
      } else if (flushed > 0) {
        toast.message(`Synced ${flushed}, ${remaining} pending.`);
      } else if (failed) {
        toast.error("Couldn't sync offline changes — will retry.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [online]);

  return { pending };
}
