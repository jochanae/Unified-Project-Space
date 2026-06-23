import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Activity, Eye, MailX, ShoppingCart, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

const TRIGGER_META: Record<string, { label: string; icon: any; tone: string }> = {
  viewed_no_convert: { label: 'Viewed · no convert', icon: Eye, tone: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  no_email_engagement: { label: 'No email engagement', icon: MailX, tone: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  abandoned_checkout: { label: 'Abandoned checkout', icon: ShoppingCart, tone: 'text-rose-400 bg-rose-400/10 border-rose-400/30' },
};

interface Props {
  projectId?: string;
}

export function BehaviorTriggerAudit({ projectId }: Props) {
  const { user } = useCurrentUser();
  const [running, setRunning] = useState(false);

  const { data: log, isLoading, refetch } = useQuery({
    queryKey: ['behavior-trigger-log', user?.orgId, projectId],
    enabled: !!user?.orgId,
    queryFn: async () => {
      let q = supabase
        .from('queued_behavior_log')
        .select('id, behavior_trigger, queued_at, sequence_id, contact_id')
        .eq('org_id', user!.orgId)
        .order('queued_at', { ascending: false })
        .limit(50);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60_000,
  });

  // Aggregate counts by trigger over last 7 days
  const stats = (log || []).reduce<Record<string, number>>((acc, row) => {
    const ageMs = Date.now() - new Date(row.queued_at).getTime();
    if (ageMs <= 7 * 24 * 60 * 60 * 1000) {
      acc[row.behavior_trigger] = (acc[row.behavior_trigger] || 0) + 1;
    }
    return acc;
  }, {});

  const runEvaluator = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-behavior-triggers', { body: {} });
      if (error) throw error;
      toast.success(`Evaluator ran. ${data?.queued ?? 0} new triggers queued.`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Evaluator failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="glass rounded-3xl border border-border/30 p-5 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shadow-[0_0_18px_hsl(var(--primary)/0.15)]">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-serif tracking-tight">Behavior Trigger Audit</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              What MarQ fired in the last 7 days, and why.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={runEvaluator}
          disabled={running}
          className="text-xs"
        >
          <Clock className={cn('h-3 w-3 mr-1.5', running && 'animate-spin')} />
          {running ? 'Running…' : 'Run now'}
        </Button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.entries(TRIGGER_META).map(([key, meta]) => {
          const Icon = meta.icon;
          const count = stats[key] || 0;
          return (
            <div
              key={key}
              className={cn(
                'rounded-2xl border p-3 flex items-center gap-3 transition-colors',
                count > 0 ? meta.tone : 'border-border/20 bg-muted/10 text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{meta.label}</p>
                <p className="text-[10px] opacity-70">{count} fired · 7d</p>
              </div>
              <span className="text-xl font-bold tabular-nums">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Recent activity feed */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recent triggers</p>
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4">Loading…</p>
        ) : (log || []).length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/20 rounded-2xl">
            No behavior triggers fired yet. They'll appear here once a sequence with a behavior rule is active and contacts hit the threshold.
          </div>
        ) : (
          <div className="divide-y divide-border/10 rounded-2xl border border-border/20 overflow-hidden">
            {(log || []).slice(0, 10).map((row) => {
              const meta = TRIGGER_META[row.behavior_trigger] || {
                label: row.behavior_trigger,
                icon: Activity,
                tone: 'text-muted-foreground',
              };
              const Icon = meta.icon;
              return (
                <div key={row.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                  <Icon className={cn('h-3.5 w-3.5 shrink-0', meta.tone.split(' ')[0])} />
                  <span className="flex-1 truncate font-medium">{meta.label}</span>
                  <span className="text-muted-foreground/70 tabular-nums shrink-0">
                    {formatDistanceToNow(new Date(row.queued_at), { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
