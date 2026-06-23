import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, Brain, Wand2, Lock, BookmarkPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import type { TemplateId, AssetType, BrandKit } from '../types';
import { useSavedCampaigns } from '../hooks/use-saved-campaigns';
import { CreativeCritiquePanel } from './CreativeCritiquePanel';

export interface StrategistAsset {
  template_id: TemplateId;
  asset_type: AssetType;
  channel: 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'print' | 'email';
  stage: 'awareness' | 'desire' | 'action';
  headline: string;
  subhead: string;
  cta: string;
  accent_usage?: 'subtle' | 'bold' | 'monochrome';
}

export interface StrategistPlan {
  campaign_name: string;
  strategic_rationale: string;
  assets: StrategistAsset[];
  distribution_plan?: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  brand?: BrandKit;
  /** Called when user accepts the plan — receives the lead asset to seed CampaignBundle. */
  onApply: (plan: StrategistPlan) => void;
}

const CHANNEL_LABEL: Record<StrategistAsset['channel'], string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  print: 'Print',
  email: 'Email',
};

const STAGE_TINT: Record<StrategistAsset['stage'], string> = {
  awareness: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-300',
  desire: 'border-gold/40 bg-gold/10 text-gold',
  action: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300',
};

export function StrategistDialog({ open, onOpenChange, projectId, brand, onApply }: Props) {
  const brandLocked = !!(brand?.brand_name || brand?.tagline || brand?.voice || brand?.mood);
  const [plan, setPlan] = useState<StrategistPlan | null>(null);
  const [originalAssets, setOriginalAssets] = useState<StrategistAsset[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineNote, setRefineNote] = useState('');
  const { save: saveCampaign } = useSavedCampaigns(projectId);

  const updateAssetField = (idx: number, field: 'headline' | 'subhead' | 'cta', value: string) => {
    setPlan((prev) => {
      if (!prev) return prev;
      const next = { ...prev, assets: prev.assets.map((a, i) => i === idx ? { ...a, [field]: value } : a) };
      return next;
    });
  };

  const handleSavePlan = async () => {
    if (!plan) return;
    try {
      await saveCampaign.mutateAsync({ plan, projectId });
      toast.success('Saved to Campaign Memory');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const requestPlan = async (message?: string) => {
    if (!projectId) {
      toast.error('Open a project first');
      return;
    }
    const isRefine = !!message;
    if (isRefine) setRefining(true); else setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-marketing-strategist', {
        body: {
          projectId,
          brandName: brand?.brand_name,
          brand: brand
            ? {
                brand_name: brand.brand_name,
                tagline: brand.tagline,
                accent_hex: brand.accent_hex,
                voice: brand.voice,
                mood: brand.mood,
                heading_font: brand.heading_font,
              }
            : undefined,
          message,
          priorPlan: isRefine ? plan : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.plan) {
        const next = data.plan as StrategistPlan;
        setPlan(next);
        // Snapshot a deep copy of the original copy for diffing
        setOriginalAssets(next.assets.map((a) => ({ ...a })));
        setRefineNote('');
        toast.success(isRefine ? 'Plan refined' : 'MarQ drafted your campaign');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Strategist unavailable');
    } finally {
      if (isRefine) setRefining(false); else setLoading(false);
    }
  };

  const handleClose = (next: boolean) => {
    if (!next) {
      setPlan(null);
      setOriginalAssets(null);
      setRefineNote('');
    }
    onOpenChange(next);
  };

  const handleApply = () => {
    if (!plan) return;
    // Close the dialog FIRST so it doesn't flash over the workspace navigation.
    onOpenChange(false);
    onApply(plan);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-gold" />
            MarQ — Marketing Strategist
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <p className="text-xs text-muted-foreground">
            MarQ reads your Strategy Blueprint and proposes a complete launch campaign — three coordinated
            assets, channel-tuned, sequenced from awareness → action.
          </p>

          {brandLocked && (
            <div
              className="flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px]"
              style={{
                borderColor: `${brand?.accent_hex || '#D4AF37'}55`,
                background: `${brand?.accent_hex || '#D4AF37'}0d`,
              }}
            >
              <Lock className="h-3 w-3" style={{ color: brand?.accent_hex || '#D4AF37' }} />
              <span className="text-foreground/80">
                Brand-locked to{' '}
                <span className="font-semibold" style={{ color: brand?.accent_hex || '#D4AF37' }}>
                  {brand?.brand_name || 'your vault'}
                </span>
                {brand?.voice && <> · voice: <span className="text-foreground">{brand.voice}</span></>}
                {brand?.mood && <> · mood: <span className="text-foreground">{brand.mood}</span></>}
              </span>
            </div>
          )}

          {!plan && (
            <Button
              onClick={() => requestPlan()}
              disabled={loading || !projectId}
              className="bg-gold text-black hover:bg-gold/90"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loading ? 'MarQ is thinking…' : 'Generate Campaign Plan'}
            </Button>
          )}

          {plan && (
            <div className="grid gap-4">
              <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4">
                <div className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Campaign</div>
                <div className="mt-1 text-lg font-serif">{plan.campaign_name}</div>
                <p className="mt-2 text-xs text-muted-foreground italic">{plan.strategic_rationale}</p>
              </div>

              <div className="grid gap-3">
                {plan.assets.map((a, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-border/40 bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider', STAGE_TINT[a.stage])}>
                          {a.stage}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {CHANNEL_LABEL[a.channel]} · {a.asset_type.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">#{i + 1}</span>
                    </div>
                    <Input
                      value={a.headline}
                      onChange={(e) => updateAssetField(i, 'headline', e.target.value)}
                      className="mt-2 h-auto border-0 bg-transparent px-0 py-0 text-sm font-semibold leading-snug shadow-none focus-visible:ring-0"
                    />
                    <Textarea
                      value={a.subhead}
                      onChange={(e) => updateAssetField(i, 'subhead', e.target.value)}
                      rows={2}
                      className="mt-1 min-h-0 resize-none border-0 bg-transparent px-0 py-0 text-xs text-muted-foreground shadow-none focus-visible:ring-0"
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <div className="inline-flex items-center rounded-md border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold gap-1">
                        <span>CTA:</span>
                        <Input
                          value={a.cta}
                          onChange={(e) => updateAssetField(i, 'cta', e.target.value)}
                          className="h-auto w-auto min-w-[60px] max-w-[160px] border-0 bg-transparent px-0 py-0 text-[10px] font-semibold uppercase tracking-wider text-gold shadow-none focus-visible:ring-0"
                        />
                      </div>
                      {a.accent_usage && (
                        <span className="inline-flex items-center rounded-md border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          accent: {a.accent_usage}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <CreativeCritiquePanel
                projectId={projectId}
                draftAssets={plan.assets}
                originalAssets={originalAssets ?? undefined}
                onApplySuggestion={(idx, attr, value) => {
                  if (attr === 'overall') return;
                  updateAssetField(idx, attr, value);
                  toast.success('Suggestion applied');
                }}
              />

              {plan.distribution_plan && plan.distribution_plan.length > 0 && (
                <div className="rounded-2xl border border-border/30 p-4">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
                    Distribution Plan
                  </div>
                  <ol className="grid gap-1.5 text-xs text-foreground/90 list-decimal list-inside">
                    {plan.distribution_plan.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="grid gap-2">
                <Textarea
                  value={refineNote}
                  onChange={(e) => setRefineNote(e.target.value)}
                  placeholder="Refine: e.g. 'Make it more urgent' or 'Target busy founders'"
                  rows={2}
                  disabled={refining}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!refineNote.trim() || refining}
                  onClick={() => requestPlan(refineNote.trim())}
                >
                  {refining ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Sparkles className="h-3.5 w-3.5 mr-2" />}
                  Refine with MarQ
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => handleClose(false)}>
            Close
          </Button>
          {plan && (
            <>
              <Button
                variant="outline"
                onClick={handleSavePlan}
                disabled={saveCampaign.isPending}
              >
                {saveCampaign.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BookmarkPlus className="h-4 w-4 mr-2" />
                )}
                Save to Library
              </Button>
              <Button onClick={handleApply} className="bg-gold text-black hover:bg-gold/90">
                <Wand2 className="h-4 w-4 mr-2" />
                Use This Plan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
