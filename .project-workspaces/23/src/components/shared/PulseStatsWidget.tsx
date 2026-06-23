import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Eye, Mail, TrendingUp } from 'lucide-react';

export function PulseStatsWidget() {
  const { data: subscriberStats } = useQuery({
    queryKey: ['dashboard-subscriber-stats'],
    queryFn: async () => {
      const { count: total } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true });
      const { count: active } = await supabase
        .from('subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return { total: total ?? 0, active: active ?? 0 };
    },
  });

  const { data: pageViewCount } = useQuery({
    queryKey: ['dashboard-pageview-stats'],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);
      return count ?? 0;
    },
  });

  const { data: sequenceCount } = useQuery({
    queryKey: ['dashboard-sequence-stats'],
    queryFn: async () => {
      const { count } = await supabase
        .from('email_sequences')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const { data: contactCount } = useQuery({
    queryKey: ['dashboard-contact-stats'],
    queryFn: async () => {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  });

  const stats = [
    { label: 'Subscribers', value: subscriberStats?.total ?? 0, sub: `${subscriberStats?.active ?? 0} active`, icon: Users, color: 'text-emerald-400' },
    { label: 'Page Views (7d)', value: pageViewCount ?? 0, sub: 'last week', icon: Eye, color: 'text-blue-400' },
    { label: 'Email Sequences', value: sequenceCount ?? 0, sub: 'configured', icon: Mail, color: 'text-amber-400' },
    { label: 'Total Contacts', value: contactCount ?? 0, sub: 'in pipeline', icon: TrendingUp, color: 'text-primary' },
  ];

  return (
    <section className="glass rounded-3xl border border-border/30 p-5 sm:p-7">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        <h2 className="text-xl font-serif tracking-tight">Pulse Check</h2>
        <span className="text-xs text-muted-foreground ml-auto">Live metrics</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border/20 bg-muted/10 p-3 sm:p-4">
            <s.icon className={`h-4 w-4 ${s.color} mb-2`} />
            <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
