import { Crown, Sparkles, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export const TIER_CONFIG = {
  free: {
    label: "Free",
    description: "The sanctuary, on the house.",
    icon: BookOpen,
    badgeClass: "border-border/60 bg-muted/20 text-muted-foreground",
  },
  partner: {
    label: "Scribe",
    description: "The individual writes.",
    icon: Sparkles,
    badgeClass: "border-gold/40 bg-gold/10 text-gold-soft",
  },
  minister: {
    label: "Scribe",
    description: "The individual writes.",
    icon: Sparkles,
    badgeClass: "border-gold/40 bg-gold/10 text-gold-soft",
  },
  church_partner: {
    label: "Sanctuary",
    description: "The community gathers · 5 seats.",
    icon: Crown,
    badgeClass: "border-gold/50 bg-gold/15 text-gold-soft",
  },
  admin: {
    label: "Scribe",
    description: "Full system access.",
    icon: Crown,
    badgeClass: "border-gold/60 bg-gold/20 text-gold",
  },
} as const;

export type TierKey = keyof typeof TIER_CONFIG;

const PRIORITY: readonly TierKey[] = ["free", "partner", "minister", "church_partner", "admin"];

export function highestTier(roles: readonly string[]): TierKey {
  return roles.reduce<TierKey>((best, r) => {
    const key = r as TierKey;
    if (!(key in TIER_CONFIG)) return best;
    return PRIORITY.indexOf(key) > PRIORITY.indexOf(best) ? key : best;
  }, "free");
}

export function isPaidTier(tier: TierKey): boolean {
  return tier === "admin" || tier === "minister" || tier === "church_partner" || tier === "partner";
}

export function TierPill({ tier, className }: { tier: TierKey; className?: string }) {
  const meta = TIER_CONFIG[tier];
  return (
    <p
      className={cn(
        "w-fit rounded-full border px-3 py-0.5 text-xs uppercase tracking-[0.2em] font-medium",
        meta.badgeClass,
        className,
      )}
    >
      {meta.label}
    </p>
  );
}
