/**
 * OfflineBadge — pill that appears below the master header when offline,
 * mirroring the ServiceModeBadge layout. Sits to the LEFT so the two pills
 * never collide.
 */

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useOfflineSync } from "@/hooks/useOfflineSync";

export function OfflineBadge() {
  const online = useOnlineStatus();
  const { pending } = useOfflineSync();
  // Avoid SSR/client mismatch — only reveal after hydration.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Show the pill if offline, OR if we're online with a pending sync flushing.
  if (!hydrated) return null;
  if (online && pending === 0) return null;

  const label = online
    ? `Syncing ${pending} change${pending === 1 ? "" : "s"}…`
    : pending > 0
      ? `Offline · ${pending} queued`
      : "Offline";

  return (
    <div
      className="pointer-events-none fixed left-0 z-[95] flex"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 4.25rem)", paddingLeft: "1rem" }}
      aria-live="polite"
    >
      <span
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-obsidian/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gold-soft backdrop-blur-md"
        title={label}
      >
        <CloudOff className="h-3 w-3" strokeWidth={1.5} />
        {label}
      </span>
    </div>
  );
}
