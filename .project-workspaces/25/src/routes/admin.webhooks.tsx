import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Link2,
  ShieldCheck,
} from "lucide-react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { supabase } from "@/integrations/supabase/client";
import { getBillingHealth, type BillingHealth } from "@/lib/billing-health.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/webhooks")({
  head: () => ({
    meta: [{ title: "Webhook Health — SanctumIQ" }, { name: "robots", content: "noindex" }],
  }),
  component: WebhookHealthPage,
});

type WebhookEvent = {
  id: string;
  source: string;
  stripe_event_id: string | null;
  event_type: string;
  status: string;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
};

function WebhookHealthPage() {
  const { user, loading: authLoading } = useAuth();
  const { hasRole, loading: rolesLoading } = useRoles(user?.id);
  const isAdmin = hasRole("admin");
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [health, setHealth] = useState<BillingHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const [{ data }, healthRes] = await Promise.all([
      supabase
        .from("webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(50),
      getBillingHealth().catch(() => null),
    ]);
    setEvents((data as WebhookEvent[] | null) ?? []);
    setHealth(healthRes);
  };

  useEffect(() => {
    if (!user || !isAdmin) return;
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [user, isAdmin]);

  const last = events[0] ?? null;
  const lastReceived = last ? new Date(last.received_at).toLocaleString() : "Never";
  const failures24h = events.filter(
    (e) => e.status === "failed" && Date.now() - new Date(e.received_at).getTime() < 86_400_000,
  ).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-obsidian text-foreground">
        <AdminHeader />
        <div className="flex items-center justify-center min-h-[60svh]">
          <LoadingSpinner context="page" />
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    throw redirect({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-obsidian text-foreground">
      <AdminHeader />
      <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground hover:text-gold-soft transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Admin
        </Link>

        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-2">Operations</p>
            <h1 className="font-display text-3xl text-foreground">Webhook Health</h1>
            <p className="text-sm text-muted-foreground/80 mt-1">
              Stripe events received and processed by the server.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md hairline bg-obsidian-elevated/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            Refresh
          </button>
        </div>

        {/* Stripe endpoint health */}
        <HealthSection health={health} loading={loading} />

        {/* Summary tiles */}
        <div className="grid sm:grid-cols-3 gap-4">
          <SummaryTile label="Last event" value={lastReceived} icon={Clock} />
          <SummaryTile
            label="Last result"
            value={last ? last.status : "—"}
            icon={last?.status === "failed" ? AlertCircle : CheckCircle2}
            tone={last?.status === "failed" ? "error" : last ? "ok" : "muted"}
          />
          <SummaryTile
            label="Failures (24h)"
            value={String(failures24h)}
            icon={AlertCircle}
            tone={failures24h > 0 ? "error" : "ok"}
          />
        </div>

        {/* Recent events */}
        <div className="hairline rounded-xl bg-obsidian-elevated/30 overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/80">
              Recent events
            </p>
            <a
              href="https://supabase.com/dashboard/project/ovngiqcvbygeyzcmxlqr/functions/stripe-webhook/logs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-[0.2em] text-gold-soft/80 hover:text-gold transition-colors"
            >
              Edge logs ↗
            </a>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center">
              <LoadingSpinner context="content" />
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground/70">
              No webhook events recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {events.map((e) => (
                <div key={e.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                  <StatusDot status={e.status} />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-foreground/90 truncate">{e.event_type}</p>
                    {e.error_message && (
                      <p className="text-[11px] text-red-400/80 truncate mt-0.5">
                        {e.error_message}
                      </p>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 shrink-0">
                    {new Date(e.received_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "muted",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "ok" | "error" | "muted";
}) {
  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/30 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "ok" && "text-emerald-400/80",
            tone === "error" && "text-red-400",
            tone === "muted" && "text-muted-foreground/60",
          )}
        />
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">{label}</p>
      </div>
      <p className="text-sm text-foreground/90 truncate capitalize">{value}</p>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "processed" ? "bg-emerald-400" : status === "failed" ? "bg-red-400" : "bg-amber-400";
  return <span className={cn("h-2 w-2 rounded-full shrink-0", cls)} />;
}

function HealthSection({ health, loading }: { health: BillingHealth | null; loading: boolean }) {
  if (loading && !health) {
    return (
      <div className="hairline rounded-xl bg-obsidian-elevated/30 p-6">
        <LoadingSpinner context="content" />
      </div>
    );
  }
  if (!health) return null;

  const ep = health.endpoint;
  const ev = health.events7d;
  const endpointOk = ep.found && ep.enabled === true && ep.missingEvents.length === 0 && !ep.error;
  const lastReceived = ev.lastReceivedAt
    ? new Date(ev.lastReceivedAt).toLocaleString()
    : "None in last 7 days";

  return (
    <div className="hairline rounded-xl bg-obsidian-elevated/30 overflow-hidden">
      <div className="px-5 py-3 border-b border-border/40 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-gold/80" />
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground/80">
          Stripe billing health
        </p>
      </div>
      <div className="divide-y divide-border/40">
        <div className="px-5 py-4 flex items-start gap-3">
          {endpointOk ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground/90">
              {ep.error
                ? "Could not verify endpoint with Stripe"
                : ep.found
                  ? ep.enabled
                    ? `Endpoint registered (${ep.livemode ? "Live mode" : "Test mode"})`
                    : "Endpoint registered but disabled"
                  : "Endpoint NOT found in Stripe"}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1 flex items-center gap-1.5 break-all">
              <Link2 className="h-3 w-3 shrink-0" />
              {ep.expectedUrl}
            </p>
            {ep.error && <p className="text-[11px] text-red-400/80 mt-1">{ep.error}</p>}
            {ep.found && ep.missingEvents.length > 0 && (
              <p className="text-[11px] text-amber-300/90 mt-1">
                Missing events: {ep.missingEvents.join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="px-5 py-4 flex items-start gap-3">
          {ev.failed > 0 ? (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          ) : ev.total > 0 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Clock className="h-5 w-5 text-muted-foreground/60 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground/90">
              {ev.total === 0
                ? "No webhook events received in the last 7 days"
                : `${ev.total} event${ev.total === 1 ? "" : "s"} in last 7 days · ${ev.processed} processed${ev.failed ? ` · ${ev.failed} failed` : ""}`}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Last received: {lastReceived}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
