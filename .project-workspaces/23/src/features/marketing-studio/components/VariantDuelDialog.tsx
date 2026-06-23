import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Swords, Trophy, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { BrandKit } from '../types';
import type { StrategistPlan, StrategistAsset } from './StrategistDialog';
import { useSavedCampaigns } from '../hooks/use-saved-campaigns';

interface DuelResult {
  hypothesis: string;
  variant_a: StrategistPlan;
  variant_b: StrategistPlan;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  brand?: BrandKit;
  onApplyVariant?: (plan: StrategistPlan) => void;
}

const STAGE_TINT: Record<StrategistAsset['stage'], string> = {
  awareness: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-300',
  desire: 'border-gold/40 bg-gold/10 text-gold',
  action: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300',
};

export function VariantDuelDialog({ open, onOpenChange, projectId, brand, onApplyVariant }: Props) {
  const [duel, setDuel] = useState<DuelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { save } = useSavedCampaigns(projectId);

  const requestDuel = async () => {
    if (!projectId) {
      toast.error('Open a project first');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-marketing-strategist', {
        body: {
          projectId,
          brandName: brand?.brand_name,
          brand,
          variants: true,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.duel) {
        setDuel(data.duel as DuelResult);
        toast.success('MarQ drafted both variants');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Duel failed');
    } finally {
      setLoading(false);
    }
  };

  const saveBoth = async () => {
    if (!duel) return;
    try {
      await Promise.all([
        save.mutateAsync({
          plan: { ...duel.variant_a, campaign_name: `${duel.variant_a.campaign_name} (A)` },
          projectId,
        }),
        save.mutateAsync({
          plan: { ...duel.variant_b, campaign_name: `${duel.variant_b.campaign_name} (B)` },
          projectId,
        }),
      ]);
      toast.success('Duel saved — link both to landing pages to crown a winner');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) setDuel(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-4 w-4 text-gold" />
            Multi-Variant Duel
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          MarQ drafts two competing campaigns testing one strategic axis. Save both, link them to pages, and let real
          conversion data crown the Elite winner.
        </p>

        {!duel && (
          <Button
            onClick={requestDuel}
            disabled={loading || !projectId}
            className="bg-gold text-black hover:bg-gold/90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Swords className="h-4 w-4 mr-2" />}
            {loading ? 'MarQ is dueling…' : 'Generate A/B Duel'}
          </Button>
        )}

        {duel && (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Duel hypothesis</div>
              <p className="mt-1 text-sm font-serif italic">{duel.hypothesis}</p>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <VariantColumn
                label="Variant A"
                accent="cyan"
                plan={duel.variant_a}
                onApply={() => onApplyVariant?.(duel.variant_a)}
              />
              <VariantColumn
                label="Variant B"
                accent="gold"
                plan={duel.variant_b}
                onApply={() => onApplyVariant?.(duel.variant_b)}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
          {duel && (
            <Button onClick={saveBoth} disabled={save.isPending} className="bg-gold text-black hover:bg-gold/90">
              {save.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BookmarkPlus className="h-4 w-4 mr-2" />
              )}
              Save both to Library
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VariantColumn({
  label,
  accent,
  plan,
  onApply,
}: {
  label: string;
  accent: 'cyan' | 'gold';
  plan: StrategistPlan;
  onApply: () => void;
}) {
  const accentBorder = accent === 'gold' ? 'border-gold/40' : 'border-cyan-400/40';
  const accentBg = accent === 'gold' ? 'bg-gold/5' : 'bg-cyan-400/5';
  const accentText = accent === 'gold' ? 'text-gold' : 'text-cyan-300';

  return (
    <div className={cn('rounded-2xl border p-4', accentBorder, accentBg)}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Trophy className={cn('h-3.5 w-3.5', accentText)} />
          <span className={cn('text-[10px] uppercase tracking-[0.22em]', accentText)}>{label}</span>
        </div>
        <Button size="sm" variant="ghost" onClick={onApply}>
          Use this
        </Button>
      </div>
      <h4 className="text-base font-serif">{plan.campaign_name}</h4>
      <p className="mt-1 text-[11px] text-muted-foreground italic">{plan.strategic_rationale}</p>
      <div className="mt-3 grid gap-2">
        {plan.assets.map((a, i) => (
          <div key={i} className="rounded-xl border border-border/40 bg-background/40 p-2.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={cn(
                  'rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider',
                  STAGE_TINT[a.stage],
                )}
              >
                {a.stage}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {a.channel} · {a.asset_type.replace('_', ' ')}
              </span>
            </div>
            <div className="text-xs font-semibold leading-snug">{a.headline}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{a.subhead}</div>
            <div className="mt-1.5 inline-flex items-center rounded-md border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold">
              CTA: {a.cta}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
