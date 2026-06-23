import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Lock, Zap, Loader2 } from 'lucide-react';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Props {
  projectId: string;
}

export function AutoFollowupToggle({ projectId }: Props) {
  const { tier, loading: tierLoading } = useSubscription();
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isPaid = tier === 'operator' || tier === 'growth';

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('projects')
      .select('auto_followup_enabled')
      .eq('id', projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setEnabled(!!data?.auto_followup_enabled);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectId]);

  const toggle = async (next: boolean) => {
    if (!isPaid) {
      toast.error('Auto follow-ups require a paid plan');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({ auto_followup_enabled: next })
      .eq('id', projectId);
    setSaving(false);
    if (error) {
      toast.error('Failed to update', { description: error.message });
      return;
    }
    setEnabled(next);
    toast.success(next ? 'Blueprint engine activated' : 'Automation paused');
  };

  if (loading || tierLoading) {
    return (
      <Card className="p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  // Signal (free) tier — locked with upgrade CTA
  if (!isPaid) {
    return (
      <Card className="p-4 space-y-3 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 bg-amber-500/10">
            <Lock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">Auto Follow-ups</h3>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">
                Identity & Innovation
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Let MarQ auto-trigger the next sequence step when leads don't engage. Frees you from manual re-sends.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="default"
          onClick={() => navigate('/pricing')}
          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Upgrade to Automate
        </Button>
      </Card>
    );
  }

  // Paid tiers — toggle + status
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={`rounded-full p-2 transition-colors ${enabled ? 'bg-emerald-500/10' : 'bg-muted/40'}`}>
            <Zap className={`h-4 w-4 transition-colors ${enabled ? 'text-emerald-500' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">Auto Follow-ups</h3>
              {enabled && (
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  Strategy Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {enabled
                ? "MarQ evaluates engagement every 15 min and queues the next sequence step when leads go cold."
                : "Toggle on to let the Blueprint engine drive follow-ups automatically based on lead engagement."}
            </p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} disabled={saving} />
      </div>
    </Card>
  );
}
