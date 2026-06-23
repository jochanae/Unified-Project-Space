/**
 * UpdatePromptHost
 * Watches for a waiting service worker and surfaces a sonner toast inviting
 * the user to refresh. Mounts once at the root.
 */

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useUpdatePrompt } from "@/hooks/useUpdatePrompt";

export function UpdatePromptHost() {
  const { updateAvailable, applyUpdate } = useUpdatePrompt();
  const shown = useRef(false);

  useEffect(() => {
    if (!updateAvailable || shown.current) return;
    shown.current = true;
    toast("A new version of SanctumIQ is ready.", {
      description: "Refresh to load the latest improvements.",
      duration: Infinity,
      action: {
        label: "Refresh",
        onClick: () => applyUpdate(),
      },
    });
  }, [updateAvailable, applyUpdate]);

  return null;
}
