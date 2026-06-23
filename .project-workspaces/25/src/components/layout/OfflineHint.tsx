/**
 * OfflineHint — inline banner for routes that can't fully function offline
 * (e.g. /search). Only renders when navigator.onLine is false.
 */

import { CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function OfflineHint({ message }: { message: string }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/40 p-4 flex items-start gap-3">
      <CloudOff className="h-4 w-4 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
      <div className="text-xs text-muted-foreground/80 leading-relaxed">
        <p className="text-gold-soft font-display text-sm mb-1">You're offline</p>
        {message}
      </div>
    </div>
  );
}
