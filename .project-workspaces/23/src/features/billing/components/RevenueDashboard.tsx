import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RevenueDashboard() {
  const { data: subscriptions } = useQuery({
    queryKey: ['revenue-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  const metrics = useMemo(() => {
    if (!subscriptions) return { mrr: 0, active: 0, churn: 0, total: 0, growth: 0 };

    const active = subscriptions.filter(s => s.status === 'active');
    const canceled = subscriptions.filter(s => s.status === 'canceled');

    // Rough MRR calc based on known tier pricing
    const mrr = active.reduce((sum, s) => {
      if (s.product_id?.includes('growth') || s.product_id === 'prod_UKdOVv4Z8vndwd') return sum + 79;
      return sum + 39; // default operator
    }, 0);

    // Growth: compare last 30 days vs prior 30 days
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    const sixtyDaysAgo = now - 60 * 86400000;
    const recentActive = active.filter(s => new Date(s.created_at || '').getTime() > thirtyDaysAgo).length;
    const priorActive = active.filter(s => {
      const t = new Date(s.created_at || '').getTime();
      return t > sixtyDaysAgo && t <= thirtyDaysAgo;
    }).length;
    const growth = priorActive > 0 ? ((recentActive - priorActive) / priorActive) * 100 : recentActive > 0 ? 100 : 0;

    return {
      mrr,
      active: active.length,
      churn: canceled.length,
      total: subscriptions.length,
      growth: Math.round(growth),
    };
  }, [subscriptions]);

  const recentSubs = (subscriptions || []).slice(0, 8);

  return (
    <section className="glass rounded-2xl p-6 mb-6">
      <h2 className="text-lg font-medium mb-5 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-primary" /> Revenue Dashboard
      </h2>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <MetricCard
          icon={<DollarSign className="h-4 w-4" />}
          label="MRR"
          value={`$${metrics.mrr.toLocaleString()}`}
        />
        <MetricCard
          icon={<Users className="h-4 w-4" />}
          label="Active"
          value={metrics.active.toString()}
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Growth"
          value={`${metrics.growth > 0 ? '+' : ''}${metrics.growth}%`}
          highlight={metrics.growth > 0}
          negative={metrics.growth < 0}
        />
        <MetricCard
          icon={<CreditCard className="h-4 w-4" />}
          label="Churned"
          value={metrics.churn.toString()}
          negative={metrics.churn > 0}
        />
      </div>

      {/* Recent Subscriptions */}
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Recent Activity</p>
        {recentSubs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No subscription data yet.</p>
        ) : (
          <div className="space-y-1.5">
            {recentSubs.map(sub => (
              <div key={sub.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={cn(
                    'h-2 w-2 rounded-full shrink-0',
                    sub.status === 'active' ? 'bg-emerald-500' : sub.status === 'canceled' ? 'bg-red-500' : 'bg-muted-foreground'
                  )} />
                  <span className="text-sm truncate">{sub.user_id.slice(0, 8)}…</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      sub.status === 'active' ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'
                    )}
                  >
                    {sub.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {sub.created_at ? new Date(sub.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function MetricCard({ icon, label, value, highlight, negative }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
  negative?: boolean;
}) {
  return (
    <Card className="border-border/20">
      <CardContent className="p-3 text-center">
        <div className="flex justify-center mb-1.5 text-muted-foreground">{icon}</div>
        <p className={cn(
          'text-xl font-bold',
          highlight && 'text-emerald-400',
          negative && 'text-red-400',
        )}>{value}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      </CardContent>
    </Card>
  );
}
