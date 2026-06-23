import { useEffect, useState } from 'react';
import JSZip from 'jszip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, Package, Sparkles, RefreshCw, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { AssetConfig } from '../types';
import { useBrandKit } from '../hooks/use-brand-kit';
import { useMarketingAssets } from '../hooks/use-marketing-assets';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

type Stage = 'awareness' | 'desire' | 'action';

const STAGES: { id: Stage; label: string; description: string }[] = [
  { id: 'awareness', label: 'Awareness', description: 'Stop the scroll' },
  { id: 'desire', label: 'Desire', description: 'Show the transformation' },
  { id: 'action', label: 'Action', description: 'Drive the click' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  defaults?: Partial<AssetConfig>;
}

interface StageState {
  imageUrl: string | null;
  storagePath: string | null;
  loading: boolean;
}

const emptyStage = (): StageState => ({ imageUrl: null, storagePath: null, loading: false });

/**
 * Campaign Bundle — generates 3 brand-aware AI visuals (Awareness, Desire, Action)
 * in parallel, packages them as a ZIP, and optionally saves each to the library.
 */
export function CampaignBundleDialog({ open, onOpenChange, projectId, defaults }: Props) {
  const { effective: brand } = useBrandKit(projectId);
  const { saveAsset } = useMarketingAssets(projectId);

  const [headline, setHeadline] = useState(defaults?.headline ?? '');
  const [subhead, setSubhead] = useState(defaults?.subhead ?? '');
  const [cta, setCta] = useState(defaults?.cta ?? 'Get Started');
  const [url, setUrl] = useState(defaults?.url ?? '');
  const [writingCopy, setWritingCopy] = useState(false);
  const [working, setWorking] = useState(false);
  const [saveToLibrary, setSaveToLibrary] = useState(true);
  const [stages, setStages] = useState<Record<Stage, StageState>>({
    awareness: emptyStage(),
    desire: emptyStage(),
    action: emptyStage(),
  });

  useEffect(() => {
    if (!open) return;
    setHeadline(defaults?.headline ?? '');
    setSubhead(defaults?.subhead ?? '');
    setCta(defaults?.cta ?? 'Get Started');
    setUrl(defaults?.url ?? '');
    setStages({ awareness: emptyStage(), desire: emptyStage(), action: emptyStage() });
  }, [open, defaults]);

  const config: AssetConfig = {
    headline: headline || 'Your Headline',
    subhead,
    cta,
    url,
    brand,
  };

  const buildPrompt = (stage: Stage, h: string, s: string, c: string): string => {
    switch (stage) {
      case 'awareness':
        return `Awareness stage visual for campaign: ${h}. Introduce the concept, evoke curiosity. Bold composition, single focal point.`;
      case 'desire':
        return `Desire stage visual for campaign: ${h}. ${s}. Show the transformation — aspirational, emotionally resonant.`;
      case 'action':
        return `Action stage visual for campaign: ${h}. CTA: ${c}. Drive urgency and conversion — clean, decisive, button-friendly composition.`;
    }
  };

  const generateStage = async (stage: Stage): Promise<{ imageUrl: string; storagePath: string | null } | null> => {
    setStages((prev) => ({ ...prev, [stage]: { ...prev[stage], loading: true } }));
    try {
      const { data, error } = await supabase.functions.invoke('studio-generate', {
        body: {
          mode: 'flyer',
          prompt: buildPrompt(stage, headline.trim() || 'Your Headline', subhead.trim(), cta.trim()),
          projectId: projectId ?? undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error('No image returned');
      const result = { imageUrl: data.imageUrl as string, storagePath: (data.storagePath ?? null) as string | null };
      setStages((prev) => ({
        ...prev,
        [stage]: { imageUrl: result.imageUrl, storagePath: result.storagePath, loading: false },
      }));
      return result;
    } catch (e) {
      setStages((prev) => ({ ...prev, [stage]: { ...prev[stage], loading: false } }));
      toast.error(`${stage} failed: ${e instanceof Error ? e.message : 'unknown'}`);
      return null;
    }
  };

  const generateAll = async () => {
    if (!headline.trim()) {
      toast.error('Add a headline first');
      return;
    }
    setWorking(true);
    try {
      await Promise.all(STAGES.map((s) => generateStage(s.id)));
      toast.success('Campaign bundle ready');
    } finally {
      setWorking(false);
    }
  };

  // Auto-generate when dialog opens with a headline already present.
  useEffect(() => {
    if (!open) return;
    if (!headline.trim()) return;
    const anyImage = Object.values(stages).some((s) => s.imageUrl);
    if (anyImage) return;
    generateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const writeWithQuinn = async () => {
    setWritingCopy(true);
    try {
      const { data, error } = await supabase.functions.invoke('quinn-marketing-copy', {
        body: { projectId: projectId ?? undefined, templateId: 'obsidian-tile', brandName: brand.brand_name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.headline) setHeadline(data.headline);
      if (data?.subhead) setSubhead(data.subhead);
      if (data?.cta) setCta(data.cta);
      toast.success('MarQ drafted your bundle copy');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Copywriter unavailable');
    } finally {
      setWritingCopy(false);
    }
  };

  const handleDownloadBundle = async () => {
    const ready = STAGES.filter((s) => stages[s.id].imageUrl);
    if (ready.length === 0) {
      toast.error('Generate the visuals first');
      return;
    }
    setWorking(true);
    try {
      const zip = new JSZip();
      const safeBase = headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'campaign';

      for (const s of ready) {
        const url = stages[s.id].imageUrl!;
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
        zip.file(`${safeBase}-${s.id}.${ext}`, blob);

        if (saveToLibrary) {
          try {
            await saveAsset.mutateAsync({
              asset_type: 'social_tile',
              template_id: 'obsidian-tile',
              title: `${headline.slice(0, 60)} · ${s.label}`,
              config,
              image_url: url,
              storage_path: stages[s.id].storagePath,
              project_id: projectId ?? null,
            });
          } catch {
            // continue bundle even if a save fails
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const objUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = `${safeBase}-campaign-bundle.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      }, 200);
      toast.success('Campaign bundle downloaded');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Bundle failed');
    } finally {
      setWorking(false);
    }
  };

  const completed = STAGES.filter((s) => stages[s.id].imageUrl).length;
  const anyLoading = STAGES.some((s) => stages[s.id].loading);
  const progressValue = (completed / STAGES.length) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gold" />
            Campaign Bundle
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5">
          <p className="text-xs text-muted-foreground">
            MarQ generates 3 brand-aware visuals — Awareness, Desire, Action — packaged into a single ZIP.
          </p>

          <button
            type="button"
            onClick={writeWithQuinn}
            disabled={writingCopy || working}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs font-semibold text-gold transition-all',
              'hover:bg-gold/20 hover:border-gold/60 disabled:opacity-50',
            )}
          >
            {writingCopy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {writingCopy ? 'MarQ is writing…' : 'Write with MarQ'}
          </button>

          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Headline</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Turn ideas into a live funnel"
                maxLength={80}
                disabled={working}
              />
            </div>
            <div>
              <Label className="text-xs">Subhead</Label>
              <Textarea
                value={subhead}
                onChange={(e) => setSubhead(e.target.value)}
                placeholder="One sentence on why someone should act."
                rows={2}
                maxLength={180}
                disabled={working}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">CTA</Label>
                <Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={28} disabled={working} />
              </div>
              <div>
                <Label className="text-xs">Link URL (optional)</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://intoiq.app/p/your-page"
                  disabled={working}
                />
              </div>
            </div>
          </div>

          {/* 3-slot stage grid */}
          <div className="grid grid-cols-3 gap-2">
            {STAGES.map((s) => {
              const st = stages[s.id];
              return (
                <div
                  key={s.id}
                  className="rounded-xl border border-gold/20 bg-gold/5 p-2 text-xs space-y-1.5"
                >
                  <div className="aspect-square overflow-hidden rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center">
                    {st.loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-gold" />
                    ) : st.imageUrl ? (
                      <img src={st.imageUrl} alt={s.label} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
                    </div>
                    {st.imageUrl && !working && (
                      <button
                        type="button"
                        onClick={() => generateStage(s.id)}
                        disabled={st.loading}
                        title="Regenerate"
                        className="text-gold hover:text-gold/80"
                      >
                        <RefreshCw className={cn('h-3 w-3', st.loading && 'animate-spin')} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            onClick={generateAll}
            disabled={working || anyLoading || !headline.trim()}
            variant="outline"
            size="sm"
          >
            {anyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {completed === 0 ? 'Generate all 3 visuals' : 'Regenerate all'}
          </Button>

          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={saveToLibrary}
              onChange={(e) => setSaveToLibrary(e.target.checked)}
              disabled={working}
              className="h-3.5 w-3.5 accent-[hsl(var(--gold))]"
            />
            Also save each visual to my campaign library
          </label>

          {(working || anyLoading || completed > 0) && (
            <div className="grid gap-2">
              <Progress value={progressValue} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground">
                {completed} of {STAGES.length} ready
                {anyLoading && ' · generating…'}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            Cancel
          </Button>
          <Button
            onClick={handleDownloadBundle}
            disabled={working || completed === 0}
            className="bg-gold text-black hover:bg-gold/90"
          >
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Bundle (.zip)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
