/**
 * ServiceModeBadge
 * Subtle "In Service" pill that appears when useServiceMode() is active.
 * Sits below the master header on the right; tappable for context.
 */

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Church } from "lucide-react";
import { useServiceMode } from "@/hooks/useServiceMode";

export function ServiceModeBadge() {
  const { active, reason } = useServiceMode();
  // Avoid SSR/client mismatch — service mode depends on local time/storage.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  if (!hydrated || !active) return null;

  const tip =
    reason === "calendar"
      ? "A calendar event has paused non-sacred notifications."
      : "Your service window has paused non-sacred notifications.";

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[95] flex justify-center"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 4.25rem)" }}
      aria-live="polite"
    >
      <Link
        to="/settings/notifications"
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-gold/25 bg-obsidian/80 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-gold-soft backdrop-blur-md hover:text-gold"
        title={tip}
        aria-label={`Service Mode active. ${tip}`}
      >
        <Church className="h-3 w-3" strokeWidth={1.5} />
        In Service
      </Link>
    </div>
  );
}
