import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, TrendingDown, Users, DollarSign, AlertTriangle, Lock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForecastResponse {
  totals: { views: number; leads: number; revenue_usd: number; pages: number };
  forecasts: {
    leads_next_7: number;
    leads_next_30: number;
    cvr_recent_pct: number;
    cvr_prior_pct: number;
    cvr_delta_pct: number;
    revenue_next_30_usd: number;
    engagement_decay_risk_pct: number;
  };
  narrative: { headline: string; insight: string; action: string };
  sparkline: { views: number[]; leads: number[]; revenue: number[] };
  generated_at: string;
}

function Sparkline({ values, positive = true }: { values: number[]; positive?: boolean }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 24;
  const step = w / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        fill="none"
        stroke={positive ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'}
        strokeWidth="1.5"
        points={points}
      />
    </svg>
  );
}

function ForecastCard({
  icon, label, value, sub, trend, sparkline, positive = true,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  trend?: 'up' | 'down' | 'flat'; sparkline?: number[]; positive?: boolean;
}) {
  return (
    <div className="glass rounded-2xl border border-border/30 p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          {icon}
          {label}
        </div>
        {trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-green-400" />}
        {trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
      </div>
      <div className="text-2xl font-serif tracking-tight">{value}</div>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      {sparkline && sparkline.length > 0 && <Sparkline values={sparkline} positive={positive} />}
    </div>
  );
}

export function PredictiveForecast({ compact = false }: { compact?: boolean }) {
  const { tier, loading: subLoading, startCheckout } = useSubscription();
  const isLocked = !subLoading && tier !== 'growth';

  const { data, isLoading, error, refetch } = useQuery<ForecastResponse>({
    queryKey: ['predictive-forecast'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('predictive-forecast');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    enabled: !isLocked && !subLoading,
    staleTime: 5 * 60_000,
  });

  // Locked state
  if (isLocked) {
    return (
      <div className="glass rounded-3xl border border-primary/20 p-6 sm:p-8 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 70% 30%, hsl(var(--primary)), transparent 60%)' }}
        />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70">Innovation Tier</p>
              <h3 className="text-lg font-serif tracking-tight">Predictive Forecast</h3>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg leading-relaxed">
            Stop reacting to yesterday. MarQ projects leads, conversion drift, revenue, and decay risk
            for the next 7–30 days — so you can act before the leak shows up.
          </p>
          <ul className="text-xs text-muted-foreground/80 space-y-1.5 max-w-md">
            <li>· Leads forecast (7d &amp; 30d)</li>
            <li>· Conversion rate drift detection</li>
            <li>· Revenue projection</li>
            <li>· Engagement decay risk</li>
          </ul>
          <Button
            onClick={() => startCheckout('growth')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Unlock Predictive Analytics — $79/mo
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || subLoading) {
    return (
      <div className="glass rounded-3xl border border-border/30 p-8 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-3 text-sm text-muted-foreground">MarQ is forecasting…</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="glass rounded-3xl border border-destructive/30 p-6">
        <p className="text-sm text-destructive">Forecast unavailable. {(error as Error)?.message}</p>
        <Button variant="ghost" size="sm" className="mt-2" onClick={() => refetch()}>Retry</Button>
      </div>
    );
  }

  const f = data.forecasts;
  const cvrTrend = f.cvr_delta_pct > 0.5 ? 'up' : f.cvr_delta_pct < -0.5 ? 'down' : 'flat';
  const leadTrend = f.leads_next_7 > 0 ? 'up' : 'flat';

  if (compact) {
    return (
      <div className="glass rounded-2xl border border-primary/20 p-4 sm:p-5 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, hsl(var(--primary)), transparent 60%)' }}
        />
        <div className="relative flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70 mb-1">Predictive Forecast</p>
            <p className="text-sm font-medium">{data.narrative.headline}</p>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{data.narrative.insight}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
              <span><strong className="text-foreground">{f.leads_next_7}</strong> leads / 7d</span>
              <span className={cn(cvrTrend === 'down' && 'text-destructive')}>
                CVR <strong className="text-foreground">{f.cvr_recent_pct}%</strong>
                {f.cvr_delta_pct !== 0 && ` (${f.cvr_delta_pct > 0 ? '+' : ''}${f.cvr_delta_pct})`}
              </span>
              <span><strong className="text-foreground">${f.revenue_next_30_usd}</strong> / 30d</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* MarQ narrative header */}
      <div className="glass rounded-3xl border border-primary/20 p-5 sm:p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 30% 50%, hsl(var(--primary)), transparent 70%)' }}
        />
        <div className="relative flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/15 flex items-center justify-center shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70 mb-1.5">Predictive Briefing</p>
            <h3 className="text-lg font-serif tracking-tight mb-2">{data.narrative.headline}</h3>
            <p className="text-sm text-foreground/90 leading-relaxed">{data.narrative.insight}</p>
            <p className="text-xs text-primary/90 mt-3">→ {data.narrative.action}</p>
          </div>
        </div>
      </div>

      {/* 4 forecast cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ForecastCard
          icon={<Users className="h-3.5 w-3.5" />}
          label="Leads next 7d"
          value={f.leads_next_7.toLocaleString()}
          sub={`${f.leads_next_30.toLocaleString()} projected over 30 days`}
          trend={leadTrend}
          sparkline={data.sparkline.leads}
        />
        <ForecastCard
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="CVR drift"
          value={`${f.cvr_recent_pct}%`}
          sub={`${f.cvr_delta_pct > 0 ? '+' : ''}${f.cvr_delta_pct}% vs prior week`}
          trend={cvrTrend}
          positive={cvrTrend !== 'down'}
          sparkline={data.sparkline.leads.map((l, i) => {
            const v = data.sparkline.views[i] || 0;
            return v > 0 ? (l / v) * 100 : 0;
          })}
        />
        <ForecastCard
          icon={<DollarSign className="h-3.5 w-3.5" />}
          label="Revenue next 30d"
          value={`$${f.revenue_next_30_usd.toLocaleString()}`}
          sub={`From $${data.totals.revenue_usd.toFixed(0)} prior 30d`}
          trend={f.revenue_next_30_usd > data.totals.revenue_usd ? 'up' : 'down'}
          sparkline={data.sparkline.revenue}
        />
        <ForecastCard
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Decay risk"
          value={`${f.engagement_decay_risk_pct}%`}
          sub="Subscribers going cold"
          trend={f.engagement_decay_risk_pct > 50 ? 'down' : 'flat'}
          positive={f.engagement_decay_risk_pct <= 50}
        />
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-right">
        Generated {new Date(data.generated_at).toLocaleTimeString()} · Hybrid model (regression + MarQ AI)
      </p>
    </div>
  );
}
