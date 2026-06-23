import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteErrorFallback } from "@/components/RouteErrorBoundary";
import { useEffect, useState } from "react";
import {
  Loader2,
  ArrowLeft,
  Crown,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { LoadingAppShell } from "@/components/layout/LoadingAppShell";
import { SanctuaryGate } from "@/components/auth/SanctuaryGate";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AccountSkeleton } from "@/components/ui/page-skeletons";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  cancelSubscription,
  resumeSubscription,
  getStripeSubscriptionMeta,
  refreshSubscription,
} from "@/lib/billing.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/account_/billing")({
  head: () => ({
    meta: [
      { title: "Billing — SanctumIQ" },
      {
        name: "description",
        content: "Manage your SanctumIQ subscription, renewal, and cancellation.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
  errorComponent: RouteErrorFallback,
});

type SubRow = {
  tier: "free" | "minister" | "church_partner" | "admin";
  status: string;
  billing_interval: string | null;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
};

const TIER_META = {
  free: { label: "Free", icon: BookOpen, desc: "The sanctuary, on the house." },
  minister: { label: "Scribe", icon: Sparkles, desc: "The individual writes." },
  church_partner: { label: "Sanctuary", icon: Crown, desc: "The community gathers · 5 seats." },
  admin: { label: "Scribe", icon: Crown, desc: "Full system access." },
} as const;

function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [sub, setSub] = useState<SubRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data }, meta] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier, status, billing_interval, current_period_end, stripe_subscription_id")
          .eq("user_id", user.id)
          .maybeSingle(),
        getStripeSubscriptionMeta().catch(() => ({ cancelAtPeriodEnd: false })),
      ]);
      if (!active) return;
      setSub((data as SubRow | null) ?? null);
      setCancelAtPeriodEnd(meta.cancelAtPeriodEnd);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  if (authLoading) {
    return (
      <LoadingAppShell pageTitle="Billing">
        <AccountSkeleton text="Fetching billing details…" />
      </LoadingAppShell>
    );
  }

  if (!user) {
    return (
      <SanctuaryGate
        eyebrow="Billing"
        title="Sign in to view billing"
        description="Manage your subscription and renewal here."
        redirectTo="/account/billing"
      />
    );
  }

  const tier = sub?.tier ?? "free";
  const meta = TIER_META[tier];
  const Icon = meta.icon;
  const isPaid = tier === "minister" || tier === "church_partner";
  const renewalDate = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleCancel = async () => {
    setBusy(true);
    const res = await cancelSubscription();
    setBusy(false);
    setConfirmOpen(false);
    if (res.ok) {
      setCancelAtPeriodEnd(true);
      toast.success("Cancellation scheduled. Access remains until renewal date.");
    } else {
      toast.error(res.error ?? "Could not cancel.");
    }
  };

  const handleRefresh = async () => {
    if (!user) return;
    setBusy(true);
    const res = await refreshSubscription();
    if (res.ok) {
      const [{ data }, meta] = await Promise.all([
        supabase
          .from("subscriptions")
          .select("tier, status, billing_interval, current_period_end, stripe_subscription_id")
          .eq("user_id", user.id)
          .maybeSingle(),
        getStripeSubscriptionMeta().catch(() => ({ cancelAtPeriodEnd: false })),
      ]);
      setSub((data as SubRow | null) ?? null);
      setCancelAtPeriodEnd(meta.cancelAtPeriodEnd);
      toast.success("Subscription refreshed from Stripe.");
    } else {
      toast.error(res.error ?? "Could not refresh.");
    }
    setBusy(false);
  };
  const handleResume = async () => {
    setBusy(true);
    const res = await resumeSubscription();
    setBusy(false);
    if (res.ok) {
      setCancelAtPeriodEnd(false);
      toast.success("Subscription resumed.");
    } else {
      toast.error(res.error ?? "Could not resume.");
    }
  };

  return (
    <AppShell pageTitle="Billing">
      <div className="mx-auto max-w-lg px-6 py-16 space-y-8">
        <Link
          to="/account"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Account
        </Link>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner context="content" />
          </div>
        ) : (
          <>
            {/* Plan card */}
            <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-5">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-lg border border-gold/20 bg-gold/8 flex items-center justify-center"
                  style={{ background: "oklch(0.74 0.115 85 / 0.08)" }}
                >
                  <Icon className="h-6 w-6 text-gold" strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="font-display text-xl text-foreground">{meta.label}</p>
                  <p className="text-xs text-muted-foreground/70">{meta.desc}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                    Status
                  </p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      sub?.status === "active" || sub?.status === "trialing"
                        ? "text-emerald-400/90"
                        : sub?.status === "past_due"
                          ? "text-amber-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {sub?.status ? sub.status.replace("_", " ") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                    Billing
                  </p>
                  <p className="text-sm text-foreground/90 capitalize">
                    {sub?.billing_interval ? `${sub.billing_interval}ly` : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mb-1">
                    {cancelAtPeriodEnd ? "Access ends" : "Renews on"}
                  </p>
                  <p className="text-sm text-foreground/90">{renewalDate ?? "—"}</p>
                </div>
              </div>

              {sub?.status === "past_due" && (
                <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-200/90">
                    Payment failed. Update your card to keep access.
                  </p>
                </div>
              )}

              {cancelAtPeriodEnd && isPaid && (
                <div className="flex items-start gap-2 rounded-md border border-gold/30 bg-gold/5 p-3">
                  <AlertTriangle className="h-4 w-4 text-gold mt-0.5 shrink-0" />
                  <p className="text-xs text-gold-soft">
                    Cancellation scheduled. You'll keep access until {renewalDate}.
                  </p>
                </div>
              )}
            </div>

            {/* Refresh from Stripe */}
            {isPaid && (
              <button
                onClick={handleRefresh}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold-soft transition-colors disabled:opacity-50 py-2"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
                Refresh from Stripe
              </button>
            )}

            {/* Actions */}
            {isPaid ? (
              cancelAtPeriodEnd ? (
                <button
                  onClick={handleResume}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-6 py-4 text-sm text-gold-soft hover:bg-gold/15 transition-colors disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Resume subscription
                </button>
              ) : confirmOpen ? (
                <div className="hairline rounded-xl bg-obsidian-elevated/40 p-6 space-y-4">
                  <p className="text-sm text-foreground">Cancel your {meta.label} subscription?</p>
                  <p className="text-xs text-muted-foreground/70">
                    You'll keep access until {renewalDate}, then move to Sanctuary (free).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmOpen(false)}
                      disabled={busy}
                      className="flex-1 rounded-md border border-border/60 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Keep plan
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={busy}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-md bg-red-500/15 border border-red-500/40 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                    >
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                      Confirm cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="w-full rounded-xl hairline bg-obsidian-elevated/30 px-6 py-4 text-sm text-muted-foreground hover:text-red-300 hover:border-red-500/30 transition-colors"
                >
                  Cancel subscription
                </button>
              )
            ) : (
              <Link
                to="/pricing"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-6 py-4 text-sm text-gold-soft hover:bg-gold/10 transition-colors"
              >
                Upgrade plan
              </Link>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
