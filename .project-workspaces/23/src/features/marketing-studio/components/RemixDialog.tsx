import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCw, Sparkles, BookmarkPlus, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { BrandKit } from '../types';
import type { StrategistPlan, StrategistAsset } from './StrategistDialog';
import { useSavedCampaigns, type SavedCampaignRow } from '../hooks/use-saved-campaigns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: SavedCampaignRow | null;
  projectId: string | null;
  brand?: BrandKit;
}

const STAGE_TINT: Record<StrategistAsset['stage'], string> = {
  awareness: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-300',
  desire: 'border-gold/40 bg-gold/10 text-gold',
  action: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300',
};

/** Smart Recycling — MarQ refreshes a winning campaign while preserving its strategic spine. */
export function RemixDialog({ open, onOpenChange, source, projectId, brand }: Props) {
  const [remix, setRemix] = useState<StrategistPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const { save } = useSavedCampaigns(projectId);

  const requestRemix = async () => {
    if (!source) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-marketing-strategist', {
        body: {
          projectId: source.project_id ?? projectId,
          brand,
          mode: 'remix',
          sourcePlan: source.plan,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.plan) {
        setRemix(data.plan as StrategistPlan);
        toast.success('MarQ refreshed the winner');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Remix failed');
    } finally {
      setLoading(false);
    }
  };

  const saveRemix = async () => {
    if (!remix) return;
    try {
      await save.mutateAsync({ plan: remix, projectId: source?.project_id ?? projectId });
      toast.success('Saved remix to Library');
      handleClose(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) setRemix(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCw className="h-4 w-4 text-gold" />
            Remix winning campaign
          </DialogTitle>
        </DialogHeader>

        {source && (
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-gold">
              <Crown className="h-3 w-3" />
              Source winner
            </div>
            <div className="mt-1 text-sm font-semibold">{source.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {source.metrics?.cvr ?? 0}% CVR · {source.metrics?.leads ?? 0} leads · {source.performance_tier}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          MarQ keeps the channel mix, stage cadence, and accent strategy that made this campaign win — and rewrites
          every headline, subhead, and CTA so it feels fresh.
        </p>

        {!remix && (
          <Button onClick={requestRemix} disabled={loading} className="bg-gold text-black hover:bg-gold/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {loading ? 'MarQ is remixing…' : 'Generate Remix'}
          </Button>
        )}

        {remix && (
          <div className="grid gap-3">
            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300">Remix</div>
              <div className="mt-1 text-base font-serif">{remix.campaign_name}</div>
              <p className="mt-1 text-xs text-muted-foreground italic">{remix.strategic_rationale}</p>
            </div>
            <div className="grid gap-2">
              {remix.assets.map((a, i) => (
                <div key={i} className="rounded-2xl border border-border/40 bg-muted/20 p-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider',
                        STAGE_TINT[a.stage],
                      )}
                    >
                      {a.stage}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {a.channel} · {a.asset_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-semibold leading-snug">{a.headline}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.subhead}</div>
                  <div className="mt-1.5 inline-flex items-center rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                    CTA: {a.cta}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
          {remix && (
            <Button onClick={saveRemix} disabled={save.isPending} className="bg-gold text-black hover:bg-gold/90">
              {save.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BookmarkPlus className="h-4 w-4 mr-2" />
              )}
              Save Remix
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
