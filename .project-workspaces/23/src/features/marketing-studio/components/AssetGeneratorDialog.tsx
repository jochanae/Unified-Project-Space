import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Loader2, Download, Wand2, Sparkles, ChevronDown, ChevronUp, Lightbulb,
  ImagePlus, X, Film, RefreshCw, ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_RSVP_FIELDS,
  type AssetConfig,
  type RsvpFieldConfig,
  type TemplateId,
} from '../types';
import { Checkbox } from '@/components/ui/checkbox';
import { useBrandKit } from '../hooks/use-brand-kit';
import { useMarketingAssets } from '../hooks/use-marketing-assets';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { LockedAIArchitectOverlay } from './LockedAIArchitectOverlay';
import { useQuery } from '@tanstack/react-query';
import { NextStepPrompt } from '@/components/shared/NextStepPrompt';
import { useCurrentUser } from '@/hooks/use-current-user';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string | null;
  defaults?: Partial<AssetConfig> & { templateId?: TemplateId };
}

export function AssetGeneratorDialog({ open, onOpenChange, projectId, defaults }: Props) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const { effective: brand } = useBrandKit(projectId);
  const { saveAsset } = useMarketingAssets(projectId);
  const { tier, loading: tierLoading } = useSubscription();
  const isFreeTier = !tierLoading && tier === 'free';
  const isGrowthTier = tier === 'growth';
  const [savedAssetReady, setSavedAssetReady] = useState(false);
  const [addingToFunnel, setAddingToFunnel] = useState(false);

  // template_id is still required by the asset row; default it but no UI picker.
  const [templateId] = useState<TemplateId>(defaults?.templateId ?? 'obsidian-tile');
  const [headline, setHeadline] = useState(defaults?.headline ?? '');
  const [subhead, setSubhead] = useState(defaults?.subhead ?? '');
  const [cta, setCta] = useState(defaults?.cta ?? 'Learn more');
  const [url, setUrl] = useState(defaults?.url ?? '');
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [promptOverride, setPromptOverride] = useState('');
  const [writingCopy, setWritingCopy] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(defaults?.media_url);
  const [mediaType, setMediaType] = useState<'image' | 'video' | undefined>(defaults?.media_type);
  const [mediaFileName, setMediaFileName] = useState<string | undefined>();
  const [dragActive, setDragActive] = useState(false);
  // Phase 2: Living Flyer / RSVP settings
  const [rsvpFields, setRsvpFields] = useState<RsvpFieldConfig>(defaults?.rsvp_fields ?? DEFAULT_RSVP_FIELDS);
  const [successMessage, setSuccessMessage] = useState(defaults?.success_message ?? "You're on the list! We can't wait to see you.");
  const [eventDate, setEventDate] = useState(defaults?.event_date ?? '');
  const [eventTime, setEventTime] = useState(defaults?.event_time ?? '');
  const [eventLocation, setEventLocation] = useState(defaults?.event_location ?? '');
  const [sourceTag, setSourceTag] = useState(defaults?.source_tag ?? '');
  const [responseOpen, setResponseOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Briefing Session (Growth tier only)
  const [briefingOpen, setBriefingOpen] = useState(false);
  const [audience, setAudience] = useState('');
  const [painPoint, setPainPoint] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [variations, setVariations] = useState<{ angle: string; headline: string; subhead: string; cta: string }[] | null>(null);

  // Fetch project name for the locked overlay's "analyzing X" line
  const { data: projectName } = useQuery({
    queryKey: ['marketing-project-name', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase.from('projects').select('name').eq('id', projectId).maybeSingle();
      return data?.name ?? null;
    },
    enabled: !!projectId && isFreeTier,
  });

  const writeWithQuinn = async () => {
    if (isFreeTier) return;
    setWritingCopy(true);
    setVariations(null);
    try {
      const briefing = isGrowthTier && (audience || painPoint || desiredOutcome)
        ? { audience, painPoint, desiredOutcome }
        : undefined;
      const { data, error } = await supabase.functions.invoke('quinn-marketing-copy', {
        body: {
          projectId: projectId ?? undefined,
          templateId,
          brandName: brand.brand_name,
          briefing,
          variations: isGrowthTier ? 3 : 1,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.headline) setHeadline(data.headline);
      if (data?.subhead) setSubhead(data.subhead);
      if (data?.cta) setCta(data.cta);
      if (Array.isArray(data?.variations) && data.variations.length > 1) {
        setVariations(data.variations);
        toast.success(`MarQ drafted ${data.variations.length} angles`);
      } else {
        toast.success('MarQ drafted your copy');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Copywriter unavailable');
    } finally {
      setWritingCopy(false);
    }
  };

  const applyVariation = (v: { headline: string; subhead: string; cta: string }) => {
    setHeadline(v.headline);
    setSubhead(v.subhead);
    setCta(v.cta);
  };

  // Re-seed only when dialog transitions to open (avoid wiping state on parent re-renders)
  useEffect(() => {
    if (!open) return;
    setHeadline(defaults?.headline ?? '');
    setSubhead(defaults?.subhead ?? '');
    setCta(defaults?.cta ?? 'Learn more');
    setUrl(defaults?.url ?? '');
    setMediaUrl(defaults?.media_url);
    setMediaType(defaults?.media_type);
    setMediaFileName(undefined);
    setRsvpFields(defaults?.rsvp_fields ?? DEFAULT_RSVP_FIELDS);
    setSuccessMessage(defaults?.success_message ?? "You're on the list! We can't wait to see you.");
    setEventDate(defaults?.event_date ?? '');
    setEventTime(defaults?.event_time ?? '');
    setEventLocation(defaults?.event_location ?? '');
    setSourceTag(defaults?.source_tag ?? '');
    setImageUrl(null);
    setStoragePath(null);
    setPromptOverride('');
    setSavedAssetReady(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Revoke object URLs on unmount / change
  useEffect(() => {
    return () => {
      if (mediaUrl?.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMediaFile = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) {
      toast.error('Upload an image or MP4 video');
      return;
    }
    const cap = isVideo ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > cap) {
      toast.error(`Max size: ${isVideo ? '25 MB video' : '10 MB image'}`);
      return;
    }
    if (mediaUrl?.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
    const objUrl = URL.createObjectURL(file);
    setMediaUrl(objUrl);
    setMediaType(isVideo ? 'video' : 'image');
    setMediaFileName(file.name);
  };

  const clearMedia = () => {
    if (mediaUrl?.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
    setMediaUrl(undefined);
    setMediaType(undefined);
    setMediaFileName(undefined);
  };

  const config: AssetConfig = {
    headline: headline || 'Your Headline',
    subhead,
    cta,
    url,
    brand,
    media_url: mediaUrl,
    media_type: mediaType,
    rsvp_fields: rsvpFields,
    success_message: successMessage,
    event_date: eventDate || undefined,
    event_time: eventTime || undefined,
    event_location: eventLocation || undefined,
    source_tag: sourceTag || undefined,
  };

  const generateVisual = async () => {
    if (!headline.trim()) {
      toast.error('Add a headline first so MarQ knows what to design');
      return;
    }
    setGenerating(true);
    try {
      const visualPrompt = [
        `Campaign visual for: ${headline.trim()}.`,
        subhead.trim() && subhead.trim(),
        promptOverride.trim() && `Visual direction: ${promptOverride.trim()}`,
      ].filter(Boolean).join(' ');

      const { data, error } = await supabase.functions.invoke('studio-generate', {
        body: {
          mode: 'flyer',
          prompt: visualPrompt,
          projectId: projectId ?? undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error('No image returned');
      setImageUrl(data.imageUrl);
      setStoragePath(data.storagePath ?? null);
      setSavedAssetReady(false);
      toast.success('Visual ready');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const safeFilename = () =>
    `${(headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) || 'asset')}.png`;

  const handleDownload = async () => {
    if (!imageUrl) {
      toast.error('Generate the visual first');
      return;
    }
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = safeFilename();
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(objUrl);
      }, 200);
      toast.success('Downloaded');
    } catch {
      toast.error('Download failed');
    }
  };

  const handleSave = async () => {
    if (!imageUrl) {
      toast.error('Generate the visual first');
      return;
    }
    if (!headline.trim()) {
      toast.error('Add a headline first');
      return;
    }
    try {
      await saveAsset.mutateAsync({
        asset_type: 'social_tile',
        template_id: templateId,
        title: headline.slice(0, 80),
        config,
        image_url: imageUrl,
        storage_path: storagePath,
        project_id: projectId ?? null,
      });
      setSavedAssetReady(true);
      toast.success('Saved to your campaign library');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed');
    }
  };

  const addToFunnel = async () => {
    if (!projectId) {
      toast.error('Open this from a project to add it to a funnel.');
      return;
    }
    if (!user?.orgId) {
      toast.error('Sign in required.');
      return;
    }
    if (!imageUrl) return;
    setAddingToFunnel(true);
    try {
      const slug = `${(headline.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'campaign')}-${crypto.randomUUID().slice(0, 6)}`;
      const { data, error } = await supabase
        .from('pages')
        .insert({
          project_id: projectId,
          org_id: user.orgId,
          title: headline.slice(0, 80) || 'New campaign page',
          slug,
          content_blocks: [
            {
              type: 'hero',
              headline,
              subhead,
              cta_text: cta,
              cta_url: url || undefined,
              hero_image_url: imageUrl,
            },
          ],
        })
        .select('id')
        .single();
      if (error) throw error;
      onOpenChange(false);
      toast.success('Added to your campaign funnel');
      navigate(`/projects?projectId=${projectId}&tab=pages&pageId=${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create page');
    } finally {
      setAddingToFunnel(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto top-[calc(env(safe-area-inset-top,0px)+4rem)] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-gold" />
            Create a Campaign Asset
          </DialogTitle>
        </DialogHeader>

        <div className="relative grid gap-5">
          {/* Media Slot — drag/drop image or video (optional reference) */}
          <div>
            <Label className="text-xs mb-2 block">Reference media (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleMediaFile(f);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
            {mediaUrl ? (
              <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/5 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-background/60 overflow-hidden">
                  {mediaType === 'video' ? (
                    <Film className="h-5 w-5 text-gold" />
                  ) : (
                    <img src={mediaUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">
                    {mediaFileName || (mediaType === 'video' ? 'Uploaded video' : 'Uploaded image')}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Stored on the asset for reference
                  </p>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                  Replace
                </Button>
                <Button type="button" size="icon" variant="ghost" onClick={clearMedia} aria-label="Remove media">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleMediaFile(f);
                }}
                className={cn(
                  'group cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all',
                  dragActive
                    ? 'border-gold/70 bg-gold/10'
                    : 'border-border/40 bg-muted/20 hover:border-gold/40 hover:bg-gold/5',
                )}
              >
                <ImagePlus className="mx-auto h-5 w-5 text-muted-foreground group-hover:text-gold transition-colors" />
                <p className="mt-1.5 text-xs font-medium">Drop image or MP4 video</p>
                <p className="text-[10px] text-muted-foreground">Up to 10 MB image · 25 MB video</p>
              </div>
            )}
          </div>

          {/* AI section — wrapped so the locked overlay can sit on top for free users */}
          <div className="relative">
            {isFreeTier && <LockedAIArchitectOverlay projectName={projectName} />}

            <div className={cn('grid gap-4', isFreeTier && 'pointer-events-none select-none opacity-50')}>
              {/* Briefing Session — Growth tier only */}
              {isGrowthTier && (
                <div className="rounded-xl border border-gold/20 bg-gold/5">
                  <button
                    type="button"
                    onClick={() => setBriefingOpen((v) => !v)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold text-gold">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Briefing Session · Innovation
                    </span>
                    {briefingOpen ? (
                      <ChevronUp className="h-3.5 w-3.5 text-gold/70" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-gold/70" />
                    )}
                  </button>
                  {briefingOpen && (
                    <div className="grid gap-2.5 px-4 pb-4 pt-1">
                      <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                        Optional. MarQ already has your Signal Lab — this sharpens the angle.
                      </p>
                      <div className="grid gap-2">
                        <Input
                          value={audience}
                          onChange={(e) => setAudience(e.target.value)}
                          placeholder="Who exactly? e.g. high-net-worth retirees in Georgia"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={painPoint}
                          onChange={(e) => setPainPoint(e.target.value)}
                          placeholder="Their core fear or frustration"
                          className="h-8 text-xs"
                        />
                        <Input
                          value={desiredOutcome}
                          onChange={(e) => setDesiredOutcome(e.target.value)}
                          placeholder="The transformation they want"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Write with MarQ */}
              <button
                type="button"
                onClick={writeWithQuinn}
                disabled={writingCopy || isFreeTier}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-4 py-2.5 text-xs font-semibold text-gold transition-all',
                  'hover:bg-gold/20 hover:border-gold/60 disabled:opacity-50',
                )}
              >
                {writingCopy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {writingCopy
                  ? 'MarQ is writing…'
                  : isGrowthTier
                    ? 'Write with MarQ · 3 angles'
                    : 'Write with MarQ'}
              </button>

              {/* Variation chips — Growth tier */}
              {variations && variations.length > 1 && (
                <div className="grid gap-2">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    Pick an angle
                  </p>
                  <div className="grid gap-2">
                    {variations.map((v, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyVariation(v)}
                        className={cn(
                          'rounded-lg border border-border/40 bg-card/40 p-3 text-left transition-all',
                          'hover:border-gold/40 hover:bg-gold/5',
                          headline === v.headline && 'border-gold/60 bg-gold/10',
                        )}
                      >
                        <p className="text-[9px] uppercase tracking-wider text-gold/70 mb-1">
                          {v.angle}
                        </p>
                        <p className="text-sm font-semibold text-foreground leading-tight">
                          {v.headline}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                          {v.subhead}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Inputs */}
              <div className="grid gap-3">
                <div>
                  <Label className="text-xs">Headline</Label>
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder={isFreeTier ? 'Type to feel what AI Architect would write…' : 'Turn ideas into a live funnel'}
                    maxLength={80}
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
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Button text</Label>
                    <Input
                      value={cta}
                      onChange={(e) => setCta(e.target.value)}
                      maxLength={40}
                      placeholder="Count me in! 🥂"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Link URL (optional)</Label>
                    <Input
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      placeholder="https://intoiq.app/p/your-page"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Visual direction (optional)</Label>
                  <Textarea
                    value={promptOverride}
                    onChange={(e) => setPromptOverride(e.target.value)}
                    placeholder="e.g. cinematic obsidian background with gold accents, single hero subject, dramatic lighting"
                    rows={2}
                    maxLength={240}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Phase 2 — Response Settings (RSVP routing) */}
          <div className="rounded-xl border border-gold/20 bg-gold/5">
            <button
              type="button"
              onClick={() => setResponseOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left"
            >
              <span className="flex items-center gap-2 text-xs font-semibold text-gold">
                <Sparkles className="h-3.5 w-3.5" />
                Response Settings · Living Flyer
              </span>
              {responseOpen ? (
                <ChevronUp className="h-3.5 w-3.5 text-gold/70" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-gold/70" />
              )}
            </button>
            {responseOpen && (
              <div className="grid gap-3 px-4 pb-4 pt-1">
                <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                  When guests tap your button on the public page, their info lands directly in <span className="text-gold">your CRM</span>. Closed-loop — no one else sees it.
                </p>
                <div>
                  <Label className="text-xs mb-1.5 block">Capture fields</Label>
                  <div className="flex flex-wrap gap-3">
                    {(['name','phone','email'] as const).map((f) => (
                      <label key={f} className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox
                          checked={rsvpFields[f]}
                          onCheckedChange={(c) => setRsvpFields((prev) => ({ ...prev, [f]: c === true }))}
                        />
                        <span className="capitalize">{f}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Event date</Label>
                    <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Event time</Label>
                    <Input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Location (for "Get Directions")</Label>
                  <Input
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    placeholder="123 Cathedral Way, Atlanta, GA"
                  />
                </div>
                <div>
                  <Label className="text-xs">Source tag (CRM filter)</Label>
                  <Input
                    value={sourceTag}
                    onChange={(e) => setSourceTag(e.target.value)}
                    placeholder="Son's Wedding"
                    maxLength={48}
                  />
                </div>
                <div>
                  <Label className="text-xs">Success message</Label>
                  <Input
                    value={successMessage}
                    onChange={(e) => setSuccessMessage(e.target.value)}
                    maxLength={120}
                  />
                </div>
              </div>
            )}
          </div>

          {/* AI Visual Preview */}
          <div className="rounded-xl border border-border/30 bg-black/40 p-4 overflow-hidden">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                AI Visual
              </p>
              {imageUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={generateVisual}
                  disabled={generating}
                  className="h-7 gap-1.5 text-[11px] text-gold"
                  title="Regenerate"
                >
                  <RefreshCw className={cn('h-3 w-3', generating && 'animate-spin')} />
                  Regenerate
                </Button>
              )}
            </div>
            <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-xl border border-border/30 bg-muted/20">
              {imageUrl ? (
                <img src={imageUrl} alt="Generated campaign visual" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">
                    MarQ will design a brand-aware visual from your headline.
                  </p>
                  <Button
                    type="button"
                    onClick={generateVisual}
                    disabled={generating || !headline.trim() || isFreeTier}
                    className="bg-gold text-black hover:bg-gold/90"
                    size="sm"
                  >
                    {generating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Generate Visual
                  </Button>
                </div>
              )}
              {generating && imageUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                  <Loader2 className="h-6 w-6 animate-spin text-gold" />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleDownload} disabled={!imageUrl || generating}>
            <Download className="h-4 w-4" />
            Download
          </Button>
          <Button
            onClick={handleSave}
            disabled={!imageUrl || generating || saveAsset.isPending}
            className="bg-gold text-black hover:bg-gold/90"
          >
            {saveAsset.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Save to Library
          </Button>
        </DialogFooter>

        {/* Inline next-step prompt — appears only after a successful save */}
        {savedAssetReady && (
          <div className="px-1 pb-1">
            <NextStepPrompt
              mode="action"
              text="Add this to your campaign funnel"
              loading={addingToFunnel}
              onClick={addToFunnel}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
