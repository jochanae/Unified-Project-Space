import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { TIER_CONFIG, TierPill, isPaidTier, type TierKey } from "./TierBadge";

export function PlanCard({ tier }: { tier: TierKey }) {
  const meta = TIER_CONFIG[tier];
  const Icon = meta.icon;
  const paid = isPaidTier(tier);

  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-gold/70">Your Plan</p>
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-lg border border-gold/20 flex items-center justify-center"
          style={{ background: "oklch(0.74 0.115 85 / 0.08)" }}
        >
          <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
        </div>
        <div>
          <TierPill tier={tier} />
          <p className="text-xs text-muted-foreground/70 mt-1">{meta.description}</p>
        </div>
      </div>

      {paid ? (
        <Link
          to="/account/billing"
          className="inline-flex items-center gap-2 text-sm text-gold/70 hover:text-gold-soft transition-colors"
        >
          Manage billing & subscription
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <Link
          to="/pricing"
          className="inline-flex items-center gap-2 rounded-md border border-gold/30 px-4 py-2.5 text-sm text-gold-soft hover:bg-gold/10 transition-colors w-full justify-center"
        >
          Upgrade to Architect or Church Partner
        </Link>
      )}
    </div>
  );
}
