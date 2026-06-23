import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart3, Eye, Users, TrendingUp } from 'lucide-react';
import { QuinnAnalyticsHint } from '@/components/shared/QuinnContextualHint';
import { cn } from '@/lib/utils';

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

interface FunnelAnalyticsProps {
  projectId: string;
}

export function FunnelAnalytics({ projectId }: FunnelAnalyticsProps) {
  const [range, setRange] = useState<TimeRange>('7d');

  // Fetch pages for this project
  const { data: pages } = useQuery({
    queryKey: ['analytics-pages', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pages')
        .select('id, slug, title, is_published')
        .eq('project_id', projectId);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const pageIds = useMemo(() => (pages || []).map((p) => p.id), [pages]);

  // Fetch page views
  const { data: views } = useQuery({
    queryKey: ['analytics-views', projectId, range, pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      let q = supabase
        .from('page_views')
        .select('id, page_id, created_at')
        .in('page_id', pageIds);
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
    queryKey: ['analytics-submissions', projectId, range, pageIds],
    queryFn: async () => {
      if (!pageIds.length) return [];
      let q = supabase
        .from('form_submissions')
        .select('id, page_id, created_at')
        .in('page_id', pageIds);
      const start = getStartDate(range);
      if (start) q = q.gte('created_at', start);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: pageIds.length > 0,
    refetchInterval: 60_000,
  });

  // Compute stats
  const totalViews = views?.length || 0;
  const totalLeads = submissions?.length || 0;
  const conversionRate = totalViews > 0 ? ((totalLeads / totalViews) * 100).toFixed(1) : '0.0';

  const perPage = useMemo(() => {
    if (!pages) return [];
    const viewMap: Record<string, number> = {};
    const subMap: Record<string, number> = {};
    views?.forEach((v) => { viewMap[v.page_id] = (viewMap[v.page_id] || 0) + 1; });
    submissions?.forEach((s) => { subMap[s.page_id] = (subMap[s.page_id] || 0) + 1; });

    return pages.map((p) => {
      const v = viewMap[p.id] || 0;
      const s = subMap[p.id] || 0;
      const rate = v > 0 ? (s / v) * 100 : 0;
      return { id: p.id, slug: p.slug, title: p.title, views: v, leads: s, rate, published: p.is_published };
    });
  }, [pages, views, submissions]);

  const maxRate = Math.max(...perPage.map((p) => p.rate), 1);

  return (
    <div className="glass-card rounded-2xl p-5 space-y-5">
      <QuinnAnalyticsHint />
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold tracking-tight">Performance Metrics</h2>
          </div>
          <p className="text-[10px] text-muted-foreground/50 uppercase tracking-wider mt-1 ml-7">Conversion Analytics</p>
        </div>

        {/* Time filter pills */}
        <div className="flex gap-1.5">
          {(Object.keys(RANGE_LABELS) as TimeRange[]).map((key) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={cn(
                'px-3 py-1 text-xs rounded-full transition-colors',
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

      {/* Summary cards */}
      <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
        <SummaryCard icon={<Eye className="w-4 h-4" />} label="Views" value={totalViews.toLocaleString()} />
        <SummaryCard icon={<Users className="w-4 h-4" />} label="Leads" value={totalLeads.toLocaleString()} />
        <SummaryCard icon={<TrendingUp className="w-4 h-4" />} label="Conversion" value={`${conversionRate}%`} />
      </div>

      {/* Per-page breakdown */}
      {perPage.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Per-page breakdown</p>
          {perPage.map((p) => (
            <div key={p.id} className="glass-card rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium truncate max-w-[200px]">{p.title || p.slug}</span>
                <span className="text-muted-foreground text-xs ml-2 shrink-0">
                  {p.views} views · {p.leads} leads · {p.rate.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(p.rate / maxRate) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No published pages yet. Deploy a page to start tracking analytics.
        </p>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-3 min-w-[120px] flex-1 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-xl font-bold tracking-tight">{value}</p>
    </div>
  );
}
