import { useMemo, useState } from 'react';
import { Loader2, TrendingUp, Award, Sparkles, Eye, Users, Crown, Activity, Zap, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSavedCampaigns, type SavedCampaignRow, type PerformanceTier } from '../hooks/use-saved-campaigns';
import { formatDistanceToNow } from 'date-fns';
import { VariantDuelDialog } from './VariantDuelDialog';
import { useBrandKits } from '../hooks/use-brand-kits';

interface Props {
  projectId?: string | null;
}

const TIER_META: Record<PerformanceTier, { label: string; color: string; bg: string; ring: string }> = {
  elite: { label: 'Elite', color: 'text-gold', bg: 'bg-gold/15', ring: 'ring-gold/40' },
  high: { label: 'High', color: 'text-emerald-300', bg: 'bg-emerald-400/10', ring: 'ring-emerald-400/30' },
  standard: { label: 'Standard', color: 'text-muted-foreground', bg: 'bg-muted/30', ring: 'ring-border/40' },
};

/**
 * Strategist Performance — the visual half of the Closed Loop.
 * Surfaces leaderboard, tier distribution, channel & stage win-rates, and
 * a MarQ-flavored insight headline so users SEE what MarQ is learning.
 */
export function StrategistPerformancePanel({ projectId }: Props) {
  const { campaigns, isLoading } = useSavedCampaigns(projectId ?? null);
  const { active: activeKit } = useBrandKits();
  const [duelOpen, setDuelOpen] = useState(false);

  const stats = useMemo(() => buildStats(campaigns), [campaigns]);

  if (isLoading) {
    return (
      <section className="glass rounded-3xl border border-gold/20 p-7 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </section>
    );
  }

  if (campaigns.length === 0) {
    return (
      <section className="glass rounded-3xl border border-gold/20 p-7 text-center">
        <Sparkles className="h-5 w-5 text-gold/60 mx-auto" />
        <h2 className="mt-2 font-serif text-lg">No data yet.</h2>
        <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
          Save a Strategist plan, link it to a landing page, and MarQ will start tracking conversion patterns here.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Header + insight */}
      <div className="glass rounded-3xl border border-gold/20 p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-gold" />
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
                Strategist Performance
              </p>
            </div>
            <h2 className="text-xl font-serif tracking-tight">What MarQ is learning.</h2>
            <p className="mt-1 text-xs text-muted-foreground">{stats.headline}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDuelOpen(true)}
            disabled={!projectId}
            title={projectId ? 'Generate an A/B duel' : 'Open a project first'}
          >
            <Swords className="h-3.5 w-3.5 mr-1.5 text-gold" />
            A/B Duel
          </Button>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Kpi icon={<Crown className="h-3.5 w-3.5" />} label="Elite" value={stats.eliteCount} accent="gold" />
          <Kpi icon={<Award className="h-3.5 w-3.5" />} label="Tracked" value={stats.tracked} />
          <Kpi icon={<Eye className="h-3.5 w-3.5" />} label="Total views" value={stats.totalViews.toLocaleString()} />
          <Kpi icon={<TrendingUp className="h-3.5 w-3.5" />} label="Avg CVR" value={`${stats.avgCvr}%`} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Leaderboard */}
        <div className="glass rounded-3xl border border-border/40 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Crown className="h-3.5 w-3.5 text-gold" />
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Gold Mines · Top 5
            </h3>
          </div>
          {stats.top.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Link landing pages to a campaign to fill the leaderboard.
            </p>
          ) : (
            <ol className="space-y-2">
              {stats.top.map((c, i) => {
                const tier = TIER_META[c.performance_tier];
                return (
                  <li
                    key={c.id}
                    className={`rounded-xl border border-border/40 bg-muted/20 p-3 ring-1 ${tier.ring}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground w-4">#{i + 1}</span>
                          <span className="text-sm font-semibold truncate">{c.name}</span>
                          <span className={`inline-flex items-center rounded-full ${tier.bg} ${tier.color} px-1.5 py-0.5 text-[9px] uppercase tracking-wider`}>
                            {tier.label}
                          </span>
                        </div>
                        <div className="mt-1.5 ml-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span className="hidden sm:inline"><span className="text-foreground font-medium">{c.metrics.views}</span> views</span>
                          <span><span className="text-foreground font-medium">{c.metrics.leads}</span> leads</span>
                          <span><span className={`${tier.color} font-semibold`}>{c.metrics.cvr}%</span> CVR</span>
                        </div>
                      </div>
                    </div>
                    {/* Inline CVR bar */}
                    <div className="mt-2 h-1 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold/60 to-gold transition-all duration-700"
                        style={{ width: `${Math.min(100, (c.metrics.cvr / Math.max(stats.maxCvr, 1)) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Tier distribution */}
        <div className="glass rounded-3xl border border-border/40 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-3.5 w-3.5 text-gold" />
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Tier distribution
            </h3>
          </div>
          <TierBar
            elite={stats.tierCounts.elite}
            high={stats.tierCounts.high}
            standard={stats.tierCounts.standard}
            total={campaigns.length}
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {(['elite', 'high', 'standard'] as PerformanceTier[]).map((t) => (
              <div key={t} className={`rounded-lg ${TIER_META[t].bg} px-2 py-2`}>
                <div className={`text-base font-semibold ${TIER_META[t].color}`}>
                  {stats.tierCounts[t]}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  {TIER_META[t].label}
                </div>
              </div>
            ))}
          </div>
          {stats.lastUpdate && (
            <p className="mt-3 text-[10px] text-muted-foreground/70 text-center">
              Last metric refresh {formatDistanceToNow(new Date(stats.lastUpdate), { addSuffix: true })}
            </p>
          )}
        </div>

        {/* Channel win-rates */}
        <RatePanel
          title="Channels by avg CVR"
          rows={stats.channelRates}
          icon={<Users className="h-3.5 w-3.5 text-gold" />}
        />

        {/* Stage win-rates */}
        <RatePanel
          title="Funnel stages by avg CVR"
          rows={stats.stageRates}
          icon={<TrendingUp className="h-3.5 w-3.5 text-gold" />}
        />
      </div>

      <VariantDuelDialog
        open={duelOpen}
        onOpenChange={setDuelOpen}
        projectId={projectId ?? null}
        brand={activeKit?.kit}
      />
    </section>
  );
}

function Kpi({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: 'gold';
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <div className={`mt-1 text-lg font-semibold tracking-tight ${accent === 'gold' ? 'text-gold' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function TierBar({
  elite,
  high,
  standard,
  total,
}: {
  elite: number;
  high: number;
  standard: number;
  total: number;
}) {
  const denom = Math.max(total, 1);
  const e = (elite / denom) * 100;
  const h = (high / denom) * 100;
  const s = (standard / denom) * 100;
  return (
    <div className="h-3 rounded-full bg-muted/30 overflow-hidden flex">
      {e > 0 && <div className="h-full bg-gold" style={{ width: `${e}%` }} title={`Elite ${elite}`} />}
      {h > 0 && <div className="h-full bg-emerald-400" style={{ width: `${h}%` }} title={`High ${high}`} />}
      {s > 0 && <div className="h-full bg-muted-foreground/30" style={{ width: `${s}%` }} title={`Standard ${standard}`} />}
    </div>
  );
}

function RatePanel({
  title,
  rows,
  icon,
}: {
  title: string;
  rows: Array<{ key: string; cvr: number; count: number }>;
  icon: React.ReactNode;
}) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.cvr), 1);
  return (
    <div className="glass rounded-3xl border border-border/40 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h3>
      </div>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="capitalize font-medium">{r.key}</span>
              <span className="text-muted-foreground">
                <span className="text-foreground font-semibold">{r.cvr.toFixed(1)}%</span> · {r.count} campaign{r.count === 1 ? '' : 's'}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400/60 to-gold transition-all duration-700"
                style={{ width: `${(r.cvr / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stats derivation
// ────────────────────────────────────────────────────────────────────────────

function buildStats(campaigns: SavedCampaignRow[]) {
  const tracked = campaigns.filter((c) => (c.linked_page_ids?.length ?? 0) > 0);
  const tierCounts: Record<PerformanceTier, number> = { elite: 0, high: 0, standard: 0 };
  campaigns.forEach((c) => {
    tierCounts[c.performance_tier] = (tierCounts[c.performance_tier] ?? 0) + 1;
  });

  const totalViews = campaigns.reduce((s, c) => s + (c.metrics?.views ?? 0), 0);
  const totalLeads = campaigns.reduce((s, c) => s + (c.metrics?.leads ?? 0), 0);
  const cvrSamples = tracked.map((c) => c.metrics?.cvr ?? 0).filter((n) => n > 0);
  const avgCvr = cvrSamples.length
    ? +(cvrSamples.reduce((s, n) => s + n, 0) / cvrSamples.length).toFixed(1)
    : totalViews > 0
      ? +((totalLeads / totalViews) * 100).toFixed(1)
      : 0;

  const top = [...tracked]
    .sort((a, b) => (b.metrics?.cvr ?? 0) - (a.metrics?.cvr ?? 0))
    .slice(0, 5);
  const maxCvr = Math.max(...top.map((c) => c.metrics?.cvr ?? 0), 1);

  // Aggregate per channel / stage from plan.assets, weighted by campaign CVR
  const channelMap = new Map<string, { sum: number; count: number }>();
  const stageMap = new Map<string, { sum: number; count: number }>();
  tracked.forEach((c) => {
    const cvr = c.metrics?.cvr ?? 0;
    if (cvr <= 0) return;
    const assets = (c.plan?.assets ?? []) as Array<{ channel?: string; stage?: string }>;
    const channels = new Set(assets.map((a) => a.channel).filter(Boolean) as string[]);
    const stages = new Set(assets.map((a) => a.stage).filter(Boolean) as string[]);
    channels.forEach((ch) => {
      const cur = channelMap.get(ch) ?? { sum: 0, count: 0 };
      channelMap.set(ch, { sum: cur.sum + cvr, count: cur.count + 1 });
    });
    stages.forEach((st) => {
      const cur = stageMap.get(st) ?? { sum: 0, count: 0 };
      stageMap.set(st, { sum: cur.sum + cvr, count: cur.count + 1 });
    });
  });

  const channelRates = [...channelMap.entries()]
    .map(([key, v]) => ({ key, cvr: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.cvr - a.cvr);
  const stageRates = [...stageMap.entries()]
    .map(([key, v]) => ({ key, cvr: v.sum / v.count, count: v.count }))
    .sort((a, b) => b.cvr - a.cvr);

  const lastUpdate = campaigns
    .map((c) => c.metrics_updated_at)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  // Headline insight
  let headline = 'MarQ is waiting on real data — link a campaign to a landing page to start the loop.';
  if (top.length > 0 && (top[0].metrics?.cvr ?? 0) > 0) {
    const winner = top[0];
    const ch = channelRates[0]?.key;
    headline = ch
      ? `"${winner.name}" leads at ${winner.metrics.cvr}% CVR. ${cap(ch)} is your strongest channel — MarQ weights new plans toward it.`
      : `"${winner.name}" leads at ${winner.metrics.cvr}% CVR — MarQ is using this pattern as a reference.`;
  } else if (tracked.length > 0) {
    headline = `${tracked.length} campaign${tracked.length === 1 ? '' : 's'} tracked, awaiting traffic. Metrics refresh automatically as leads come in.`;
  }

  return {
    tracked: tracked.length,
    eliteCount: tierCounts.elite,
    tierCounts,
    totalViews,
    totalLeads,
    avgCvr,
    top,
    maxCvr,
    channelRates,
    stageRates,
    lastUpdate,
    headline,
  };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
