/**
 * useUpdatePrompt
 *
 * Registers the service worker (via ensureServiceWorker) and surfaces a
 * "new version available" prompt when an updated SW is waiting. Calling
 * `applyUpdate` posts SKIP_WAITING to the waiting SW, which reloads.
 *
 * Skipped silently in preview/iframe contexts and when SW isn't supported.
 */

import { useCallback, useEffect, useState } from "react";
import { ensureServiceWorker, isPreviewContext, pushSupported } from "@/lib/push";

export function useUpdatePrompt(): {
  updateAvailable: boolean;
  applyUpdate: () => void;
} {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!pushSupported() || isPreviewContext()) return;

    let cancelled = false;
    let reg: ServiceWorkerRegistration | null = null;

    (async () => {
      reg = await ensureServiceWorker();
      if (cancelled || !reg) return;

      // Already waiting (visited after a deploy completed)
      if (reg.waiting) setWaiting(reg.waiting);

      // Watch for installs
      reg.addEventListener("updatefound", () => {
        const installing = reg!.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            setWaiting(reg!.waiting ?? installing);
          }
        });
      });

      // When a new SW takes control, reload to get the fresh shell.
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded) return;
        reloaded = true;
        window.location.reload();
      });

      // Periodic update check (hourly) — cheap, catches background deploys.
      const id = window.setInterval(
        () => {
          reg?.update().catch(() => {});
        },
        60 * 60 * 1000,
      );
      return () => window.clearInterval(id);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const applyUpdate = useCallback(() => {
    if (waiting) {
      waiting.postMessage("SKIP_WAITING");
    }
  }, [waiting]);

  return { updateAvailable: Boolean(waiting), applyUpdate };
}
