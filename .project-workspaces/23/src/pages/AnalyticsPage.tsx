import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ParticleMeshBackground } from '@/components/shared/ParticleMeshBackground';
import { useFunnelHub } from '@/features/projects';
import { useCurrentUser } from '@/hooks/use-current-user';
import { MorningBriefing } from '@/features/quinn';
import { StrategistPerformancePanel } from '@/features/marketing-studio';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { Radio, Eye, Users, TrendingUp, ChevronDown, ChevronRight, Sparkles, ArrowDown, Compass, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/shared/EmptyState';
import { AutoSignalAudit } from '@/components/shared/AutoSignalAudit';
import { WinCardDialog } from '@/components/shared/WinCardDialog';
import { useMilestoneCelebration, todayStamp } from '@/hooks/use-milestone-celebration';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PredictiveForecast } from '@/features/analytics/components/PredictiveForecast';
import { FunnelWaterfall } from '@/features/analytics/components/FunnelWaterfall';
import { FunnelInsight } from '@/features/analytics/components/FunnelInsight';
import { StageDrilldownDialog } from '@/features/analytics/components/StageDrilldownDialog';
import { TrafficChannels } from '@/features/analytics/components/TrafficChannels';
import { OrderHistory } from '@/features/billing';

type TimeRange = 'today' | '7d' | '30d' | 'all';

const RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  '7d': '7 days',
  '30d': '30 days',
  all: 'All time',
};

function getStartDate(range: TimeRange): string | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'today') d.setHours(0, 0, 0, 0);
  else if (range === '7d') d.setDate(d.getDate() - 7);
  else if (range === '30d') d.setDate(d.getDate() - 30);
  return d.toISOString();
}

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { projects, theme } = useFunnelHub();
  const { user } = useCurrentUser();
  const [range, setRange] = useState<TimeRange>('7d');
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [drilldown, setDrilldown] = useState<{ step: any; projectId: string } | null>(null);

  // Fetch ALL pages for the org
  const { data: pages } = useQuery({
    queryKey: ['analytics-all-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('id, slug, title, is_published, project_id, funnel_step_id');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  // Fetch funnel steps for all projects
  const { data: funnelSteps } = useQuery({
    queryKey: ['analytics-funnel-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnel_steps')
        .select('id, title, step_type, order_index, project_id')
        .order('order_index');
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const pageIds = useMemo(() => (pages || []).map((p) => p.id), [pages]);

  // Fetch page views
  const { data: views } = useQuery({
    queryKey: ['analytics-all-views', range, pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      let q = supabase.from('page_views').select('id, page_id, created_at').in('page_id', pageIds);
      const start = getStartDate(range);
      if (start) q = q.gte('created_at', start);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: pageIds.length > 0,
    refetchInterval: 60_000,
  });

  // Fetch form submissions
  const { data: submissions } = useQuery({
    queryKey: ['analytics-all-submissions', range, pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      let q = supabase.from('form_submissions').select('id, page_id, created_at').in('page_id', pageIds);
      const start = getStartDate(range);
      if (start) q = q.gte('created_at', start);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: pageIds.length > 0,
    refetchInterval: 60_000,
  });

  // Aggregate stats
  const totalViews = views?.length || 0;
  const totalLeads = submissions?.length || 0;
  const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : '0.0';

  // Per-project breakdown
  const perProject = useMemo(() => {
    if (!pages || !projects.length) return [];

    const viewMap: Record<string, number> = {};
    const subMap: Record<string, number> = {};
    views?.forEach((v) => { viewMap[v.page_id] = (viewMap[v.page_id] || 0) + 1; });
    submissions?.forEach((s) => { subMap[s.page_id] = (subMap[s.page_id] || 0) + 1; });

    return projects.map((project) => {
      const projectPages = pages.filter((p) => p.project_id === project.id);
      const pViews = projectPages.reduce((sum, p) => sum + (viewMap[p.id] || 0), 0);
      const pLeads = projectPages.reduce((sum, p) => sum + (subMap[p.id] || 0), 0);
      const rate = pViews > 0 ? (pLeads / pViews) * 100 : 0;

      const pageBreakdown = projectPages.map((p) => {
        const v = viewMap[p.id] || 0;
        const s = subMap[p.id] || 0;
        return { id: p.id, title: p.title || p.slug, views: v, leads: s, rate: v > 0 ? (s / v) * 100 : 0, published: p.is_published };
      });

      return { id: project.id, name: project.name, views: pViews, leads: pLeads, rate, pages: pageBreakdown };
    }).sort((a, b) => b.views - a.views);
  }, [projects, pages, views, submissions]);

  // MarQ strategic briefing — richer, more personal
  const quinnInsight = useMemo(() => {
    if (totalViews === 0) {
      return "Your signals are warming up. Deploy your first page to start capturing real-time performance data. Once traffic flows, I'll surface the patterns that matter.";
    }
    const topProject = perProject[0];
    if (!topProject) return "Analyzing your data streams...";

    const parts: string[] = [];

    if (perProject.length > 1 && topProject.views > 0) {
      const secondBest = perProject[1];
      const leadPct = secondBest && secondBest.views > 0
        ? ((topProject.views / secondBest.views - 1) * 100).toFixed(0)
        : null;
      parts.push(`Your "${topProject.name}" signal is leading${leadPct ? ` — outperforming the next by ${leadPct}%` : ''} with ${topProject.views.toLocaleString()} views.`);
    } else if (topProject.views > 0) {
      parts.push(`"${topProject.name}" has captured ${topProject.views.toLocaleString()} views with a ${topProject.rate.toFixed(1)}% conversion rate.`);
    }

    if (parseFloat(conversionRate) > 10) {
      parts.push("Conversion is strong — your signal is resonating. Consider scaling ad spend on this funnel.");
    } else if (parseFloat(conversionRate) > 3) {
      parts.push("Solid traction. Refine your CTA or headline to push past the next conversion threshold.");
    } else if (parseFloat(conversionRate) > 0) {
      parts.push("People are arriving but not converting. Your hook is working — now sharpen the offer.");
    } else {
      parts.push("Focus on driving traffic to your published pages to activate your conversion engine.");
    }
    return parts.join(' ');
  }, [totalViews, perProject, conversionRate]);

  const maxProjectViews = Math.max(...perProject.map((p) => p.views), 1);

  // Daily 'Pulse High' celebration — fires once per day per org when CVR clears
  // the Gold Pulse benchmark (>8%) on meaningful traffic (>=50 views).
  const { winCard, setWinCard, celebrate } = useMilestoneCelebration(user?.orgId);
  useEffect(() => {
    const cvr = parseFloat(conversionRate);
    if (totalViews >= 50 && cvr >= 8) {
      celebrate(`pulse_high:${todayStamp()}`, {
        milestone: 'pulse_high',
        headline: 'Gold Pulse cleared',
        metric: `${cvr.toFixed(1)}% CVR`,
        subtitle: `${totalLeads} leads from ${totalViews} views today.`,
      });
    }
  }, [totalViews, totalLeads, conversionRate, celebrate]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground relative overflow-x-hidden">
      <ParticleMeshBackground theme={theme} />

      {/* Cinematic glow overlays */}
      <div className="absolute inset-0 pointer-events-none z-[1]">
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.06] blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
        />
        <div
          className="absolute bottom-1/4 right-1/6 w-72 h-72 rounded-full opacity-[0.04] blur-3xl"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl lg:max-w-none flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        {/* Header */}
        <section className="glass rounded-3xl border border-border/30 p-5 sm:p-7">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <Radio className="h-5 w-5 text-primary" />
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Command Center</p>
              </div>
              <h1 className="mt-2 text-3xl font-serif tracking-tight sm:text-4xl">Signal Strength</h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Real-time intelligence across every funnel — views, leads, conversions.
              </p>
            </div>

            {/* Time filter pills */}
            <div className="flex gap-1.5">
              {(Object.keys(RANGE_LABELS) as TimeRange[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setRange(key)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-full transition-colors',
                    range === key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  )}
                >
                  {RANGE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="forecast">
              <Sparkles className="h-3 w-3 mr-1.5" />
              Forecast
            </TabsTrigger>
          </TabsList>

          <TabsContent value="forecast" className="space-y-5">
            <PredictiveForecast />
          </TabsContent>

          <TabsContent value="overview" className="space-y-6">
            {/* Teaser card linking to Forecast tab */}
            <PredictiveForecast compact />

            {/* MarQ Strategic Briefing */}
        <section className="glass rounded-3xl border border-primary/20 p-5 sm:p-6 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 30% 50%, hsl(var(--primary)), transparent 70%)' }}
          />
          <div
            className="absolute top-0 right-0 w-48 h-48 opacity-[0.03] pointer-events-none"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary)), transparent 60%)' }}
          />
          <div className="relative flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 shadow-[0_0_20px_hsl(var(--primary)/0.15)]">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary/70 font-medium mb-1.5">MarQ Strategic Briefing</p>
              <p className="text-sm text-foreground/90 leading-relaxed">{quinnInsight}</p>
            </div>
          </div>
        </section>

        {/* Auto-triggered Signal Audit — surfaces only when traffic warrants */}
        <AutoSignalAudit
          views={totalViews}
          leads={totalLeads}
          conversionRate={parseFloat(conversionRate)}
          topProjectName={perProject[0]?.name}
          topProjectViews={perProject[0]?.views}
          topProjectLeads={perProject[0]?.leads}
        />

        {/* Morning Briefing + Intelligence Triggers */}
        {user?.orgId && <MorningBriefing orgId={user.orgId} />}

        {/* Summary Metrics — glowing cards */}
        <section className="grid gap-3 sm:grid-cols-3">
          <MetricCard icon={<Eye className="h-4 w-4" />} label="Total Reach" value={totalViews.toLocaleString()} />
          <MetricCard icon={<Users className="h-4 w-4" />} label="Signal Conversion" value={totalLeads.toLocaleString()} />
          <MetricCard icon={<TrendingUp className="h-4 w-4" />} label="Conversion Rate" value={`${conversionRate}%`} highlight={parseFloat(conversionRate) > 5} />
        </section>

        {/* Traffic Channels — UTM attribution breakdown */}
        <TrafficChannels range={{ startISO: getStartDate(range) }} />

        {/* Order history + refunds */}
        <OrderHistory />
        {perProject.length > 0 ? (
          <section className="glass rounded-3xl border border-border/30 p-5 sm:p-7 space-y-4">
            <h2 className="text-lg font-serif tracking-tight">Project Breakdown</h2>

            {perProject.map((project) => {
              const isExpanded = expandedProject === project.id;
              return (
                <div key={project.id} className="glass rounded-2xl border border-border/20 overflow-hidden">
                  <button
                    onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                    className="w-full flex items-center justify-between p-4 text-left transition-colors hover:bg-muted/20"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {project.views} views · {project.leads} leads · {project.rate.toFixed(1)}%
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      {/* Mini bar */}
                      <div className="hidden sm:block w-24 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${(project.views / maxProjectViews) * 100}%` }}
                        />
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-border/10 pt-3">
                      {project.pages.length > 0 ? (
                        project.pages.map((page) => (
                          <div key={page.id} className="flex items-center justify-between text-xs py-1.5">
                            <span className="truncate max-w-[200px] text-muted-foreground">
                              {page.published && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />}
                              {page.title}
                            </span>
                            <span className="text-muted-foreground/70 shrink-0 ml-2">
                              {page.views} views · {page.leads} leads · {page.rate.toFixed(1)}%
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground py-2">No pages deployed yet.</p>
                      )}
                      {project.pages.length > 1 && (
                        <FunnelInsight
                          steps={project.pages.map((p) => ({
                            id: p.id,
                            title: p.title,
                            views: p.views,
                            leads: p.leads,
                          }))}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        ) : (
          <EmptyState
            icon={Compass}
            title="No projects yet"
            description="Performance lives here once you launch your first funnel. Spin up a project to start tracking signals."
            ctaLabel="Quick Launch"
            onCta={() => navigate('/launch')}
            secondaryLabel="Browse templates"
            onSecondary={() => navigate('/projects')}
          />
        )}

        {/* Funnel Flow Analysis */}
        {(() => {
          const funnelFlows = projects.map((project) => {
            const steps = (funnelSteps || []).filter(s => s.project_id === project.id);
            if (steps.length === 0) return null;

            const projectPages = (pages || []).filter(p => p.project_id === project.id);
            const viewMap: Record<string, number> = {};
            const subMap: Record<string, number> = {};
            views?.forEach(v => { viewMap[v.page_id] = (viewMap[v.page_id] || 0) + 1; });
            submissions?.forEach(s => { subMap[s.page_id] = (subMap[s.page_id] || 0) + 1; });

            const stepsWithData = steps.map(step => {
              const stepPages = projectPages.filter(p => p.funnel_step_id === step.id);
              const stepViews = stepPages.reduce((sum, p) => sum + (viewMap[p.id] || 0), 0);
              const stepLeads = stepPages.reduce((sum, p) => sum + (subMap[p.id] || 0), 0);
              return { ...step, views: stepViews, leads: stepLeads };
            });

            return { project, steps: stepsWithData };
          }).filter(Boolean);

          if (funnelFlows.length === 0) {
            return (
              <section className="glass rounded-3xl border border-border/30 p-6 sm:p-8 text-center space-y-3">
                <div className="flex justify-center">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Radio className="h-5 w-5 text-primary animate-pulse" />
                  </div>
                </div>
                <h3 className="text-lg font-serif tracking-tight">Funnel Flow Analysis</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Add funnel steps to your projects to see drop-off analysis here.
                </p>
              </section>
            );
          }

          return (
            <section className="glass rounded-3xl border border-border/30 p-5 sm:p-7 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <Radio className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-serif tracking-tight">Funnel Flow Analysis</h2>
                </div>
                <button
                  onClick={() => exportFunnelCsv(funnelFlows)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Export CSV
                </button>
              </div>
              {funnelFlows.map((flow: any) => (
                <div key={flow.project.id} className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{flow.project.name}</p>
                  <FunnelWaterfall
                    steps={flow.steps}
                    onStepClick={(s) => setDrilldown({ step: { ...s, leads: s.leads ?? 0 }, projectId: flow.project.id })}
                  />
                  <FunnelInsight steps={flow.steps} />
                </div>
              ))}
            </section>
          );
        })()}

        {/* Campaign Memory now lives in the Project Vault (dashboard). */}
        <CollapsibleSection title="Strategist Performance">
          <StrategistPerformancePanel />
        </CollapsibleSection>
          </TabsContent>
        </Tabs>
      </div>

      {winCard && (
        <WinCardDialog
          open={!!winCard}
          onOpenChange={(o) => !o && setWinCard(null)}
          input={winCard}
        />
      )}

      <StageDrilldownDialog
        open={!!drilldown}
        onClose={() => setDrilldown(null)}
        step={drilldown?.step ?? null}
        projectId={drilldown?.projectId}
      />
    </div>
  );
}

function MetricCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn(
      'glass rounded-2xl border p-4 sm:p-5 space-y-2 relative overflow-hidden',
      highlight ? 'border-primary/30' : 'border-border/30',
    )}>
      {highlight && (
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 80%, hsl(var(--primary)), transparent 70%)' }}
        />
      )}
      <div className="relative flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs uppercase tracking-[0.15em]">{label}</span>
      </div>
      <p className="relative text-3xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function exportFunnelCsv(flows: any[]) {
  const rows: string[] = ['Project,Step,Type,Views,Leads,CVR %,Drop from prev %,Lost'];
  flows.forEach((flow) => {
    flow.steps.forEach((s: any, i: number) => {
      const prev = i > 0 ? flow.steps[i - 1].views : null;
      const cvr = s.views > 0 ? ((s.leads / s.views) * 100).toFixed(2) : '0.00';
      const dropPct = prev && prev > 0 ? ((1 - s.views / prev) * 100).toFixed(2) : '';
      const lost = prev !== null ? prev - s.views : '';
      const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      rows.push([flow.project.name, s.title, s.step_type || '', s.views, s.leads, cvr, dropPct, lost].map(escape).join(','));
    });
  });
  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `funnel-results-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
