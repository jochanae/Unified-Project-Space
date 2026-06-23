import { useState } from 'react';
import { AlertTriangle, Zap, Mail, TrendingDown, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface FunnelLeak {
  stepId: string;
  stepTitle: string;
  stepType: string;
  views: number;
  leads: number;
  conversionRate: number;
  dropOffPercent: number;
  severity: 'critical' | 'warning' | 'mild';
}

interface LeakRecoveryPanelProps {
  leaks: FunnelLeak[];
  projectId: string;
  projectGoal?: string;
}

export function LeakRecoveryPanel({ leaks, projectId, projectGoal }: LeakRecoveryPanelProps) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  if (!leaks.length) return null;

  const visibleLeaks = leaks.filter(l => !dismissed.has(l.stepId));
  if (!visibleLeaks.length) return null;

  const handleGenerateRecovery = async (leak: FunnelLeak) => {
    setGenerating(leak.stepId);
    try {
      const { error } = await supabase.functions.invoke('quinn-sequence-writer', {
        body: {
          projectId,
          sequenceType: 'recovery',
          projectGoal: projectGoal || '',
          context: `Funnel leak detected at "${leak.stepTitle}" (${leak.stepType}). ${leak.views} visitors viewed but only ${leak.leads} converted (${leak.conversionRate.toFixed(1)}% rate, ${leak.dropOffPercent.toFixed(0)}% drop-off). Generate a recovery sequence to re-engage visitors who dropped off at this stage.`,
        },
      });
      if (error) throw error;
      toast.success('Recovery sequence generated!', {
        description: `MarQ created a recovery sequence for "${leak.stepTitle}". Check your Email Sequences below.`,
      });
    } catch (e) {
      toast.error('Failed to generate recovery sequence');
    } finally {
      setGenerating(null);
    }
  };

  const criticalCount = visibleLeaks.filter(l => l.severity === 'critical').length;
  const warningCount = visibleLeaks.filter(l => l.severity === 'warning').length;

  return (
    <div className="glass rounded-2xl border border-border/30 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-destructive">
            Leak Detection
          </span>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {criticalCount} critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {warningCount} warning
            </Badge>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">
          MarQ Recovery Engine
        </span>
      </div>

      <div className="p-4 space-y-3">
        {visibleLeaks.map((leak) => (
          <div
            key={leak.stepId}
            className={cn(
              'rounded-xl border p-4 transition-all duration-300',
              'bg-card/60 backdrop-blur-md',
              leak.severity === 'critical'
                ? 'border-destructive/40 shadow-[0_0_15px_hsl(var(--destructive)/0.1)]'
                : leak.severity === 'warning'
                ? 'border-yellow-500/40'
                : 'border-border/30'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className={cn(
                    'h-3.5 w-3.5',
                    leak.severity === 'critical' ? 'text-destructive' : 'text-yellow-500'
                  )} />
                  <span className="text-xs font-medium truncate">{leak.stepTitle}</span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                    {leak.stepType}
                  </span>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {leak.views} visitors → {leak.leads} converted •{' '}
                  <span className={cn(
                    'font-semibold',
                    leak.severity === 'critical' ? 'text-destructive' : 'text-yellow-500'
                  )}>
                    {leak.dropOffPercent.toFixed(0)}% drop-off
                  </span>
                  {' '}• {leak.conversionRate.toFixed(1)}% conversion
                </p>

                <p className="text-[10px] text-muted-foreground/60 mt-1 italic">
                  {leak.severity === 'critical'
                    ? '"High-value traffic is leaking. MarQ recommends a Tactical Grace recovery sequence."'
                    : '"Moderate leak detected. A gentle re-engagement nudge could recover lost leads."'}
                </p>
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant={leak.severity === 'critical' ? 'default' : 'secondary'}
                  className="text-[10px] h-7 gap-1"
                  disabled={generating === leak.stepId}
                  onClick={() => handleGenerateRecovery(leak)}
                >
                  {generating === leak.stepId ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Zap className="h-3 w-3" />
                  )}
                  Recovery Email
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[9px] h-5 text-muted-foreground/50"
                  onClick={() => setDismissed(prev => new Set([...prev, leak.stepId]))}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2 pt-1">
          <Mail className="h-3 w-3 text-muted-foreground/40" />
          <p className="text-[9px] text-muted-foreground/40">
            Recovery sequences use your Identity Lock context for brand-consistent re-engagement.
          </p>
        </div>
      </div>
    </div>
  );
}
