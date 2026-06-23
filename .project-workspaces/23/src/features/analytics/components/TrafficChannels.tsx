import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Radio, Instagram, MessageSquare, Twitter, Facebook, Music2, Linkedin, Mail, Link2, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  range?: { startISO: string | null };
};

type ChannelRow = {
  key: string;
  label: string;
  views: number;
  leads: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'teal' | 'gold' | 'muted';
};

const SOURCE_META: Record<string, { label: string; icon: ChannelRow['icon']; tone: ChannelRow['tone'] }> = {
  instagram: { label: 'Instagram', icon: Instagram, tone: 'teal' },
  sms:       { label: 'SMS / Text', icon: MessageSquare, tone: 'gold' },
  text:      { label: 'SMS / Text', icon: MessageSquare, tone: 'gold' },
  twitter:   { label: 'X (Twitter)', icon: Twitter, tone: 'teal' },
  x:         { label: 'X (Twitter)', icon: Twitter, tone: 'teal' },
  facebook:  { label: 'Facebook', icon: Facebook, tone: 'teal' },
  tiktok:    { label: 'TikTok', icon: Music2, tone: 'teal' },
  linkedin:  { label: 'LinkedIn', icon: Linkedin, tone: 'teal' },
  email:     { label: 'Email', icon: Mail, tone: 'teal' },
  direct:    { label: 'Direct / Unspecified', icon: Globe, tone: 'muted' },
};

function normalize(src: string | null | undefined): string {
  if (!src) return 'direct';
  const s = src.trim().toLowerCase();
  if (!s || s === '(direct)' || s === 'none') return 'direct';
  return s;
}

export function TrafficChannels({ range }: Props) {
  const { user } = useCurrentUser();
  const orgId = user?.orgId;

  const { data, isLoading } = useQuery({
    queryKey: ['traffic-channels', orgId, range?.startISO ?? 'all'],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async () => {
      let viewsQ = supabase
        .from('page_views')
        .select('utm_source, page_id')
        .eq('org_id', orgId!);
      if (range?.startISO) viewsQ = viewsQ.gte('created_at', range.startISO);
      const { data: viewRows, error: vErr } = await viewsQ;
      if (vErr) throw vErr;

      let leadsQ = supabase
        .from('lead_notifications')
        .select('id, page_id, created_at')
        .eq('org_id', orgId!);
      if (range?.startISO) leadsQ = leadsQ.gte('created_at', range.startISO);
      const { data: leadRows, error: lErr } = await leadsQ;
      if (lErr) throw lErr;

      // Attribute leads via the most-recent page_view utm_source for that page_id
      // (lightweight heuristic — works without joining a session id we don't have)
      const lastSourceByPage: Record<string, string> = {};
      (viewRows || []).forEach((v: any) => {
        const k = normalize(v.utm_source);
        if (v.page_id) lastSourceByPage[v.page_id] = k;
      });

      const viewCounts: Record<string, number> = {};
      (viewRows || []).forEach((v: any) => {
        const k = normalize(v.utm_source);
        viewCounts[k] = (viewCounts[k] || 0) + 1;
      });

      const leadCounts: Record<string, number> = {};
      (leadRows || []).forEach((l: any) => {
        const k = lastSourceByPage[l.page_id] || 'direct';
        leadCounts[k] = (leadCounts[k] || 0) + 1;
      });

      return { viewCounts, leadCounts };
    },
  });

  const rows: ChannelRow[] = useMemo(() => {
    const v = data?.viewCounts || {};
    const l = data?.leadCounts || {};
    const keys = Array.from(new Set([...Object.keys(v), ...Object.keys(l)]));
    return keys
      .map((k): ChannelRow => {
        const meta = SOURCE_META[k] || { label: k.charAt(0).toUpperCase() + k.slice(1), icon: Link2, tone: 'teal' as const };
        return { key: k, label: meta.label, icon: meta.icon, tone: meta.tone, views: v[k] || 0, leads: l[k] || 0 };
      })
      .sort((a, b) => (b.leads - a.leads) || (b.views - a.views));
  }, [data]);

  const totalViews = rows.reduce((s, r) => s + r.views, 0);
  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);

  return (
    <section className="glass rounded-3xl border border-border/30 p-5 sm:p-7 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 80% 0%, hsl(var(--primary)), transparent 60%)' }}
      />
      <div className="relative flex items-start justify-between flex-wrap gap-2 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Radio className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Signal Attribution</p>
          </div>
          <h2 className="mt-1.5 text-lg font-serif tracking-tight">Traffic Channels</h2>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{totalViews.toLocaleString()} views · {totalLeads.toLocaleString()} leads</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No tracked traffic yet. Share a page using the Social Lab or "Copy SMS link" button to start populating channels.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const pct = totalViews > 0 ? (row.views / totalViews) * 100 : 0;
            const leadPct = totalLeads > 0 ? (row.leads / totalLeads) * 100 : 0;
            const Icon = row.icon;
            const barColor =
              row.tone === 'gold' ? 'bg-amber-400/80'
              : row.tone === 'muted' ? 'bg-muted-foreground/40'
              : 'bg-primary/80';
            return (
              <div key={row.key} className="group">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      row.tone === 'gold' ? 'text-amber-400' : row.tone === 'muted' ? 'text-muted-foreground' : 'text-primary'
                    )} />
                    <span className="truncate text-foreground/90">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-3 text-muted-foreground tabular-nums">
                    <span>{row.views.toLocaleString()} views</span>
                    <span className="text-foreground/80">{row.leads.toLocaleString()} leads</span>
                    <span className="w-10 text-right">{leadPct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-700', barColor)}
                    style={{ width: `${Math.max(pct, row.views > 0 ? 2 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
