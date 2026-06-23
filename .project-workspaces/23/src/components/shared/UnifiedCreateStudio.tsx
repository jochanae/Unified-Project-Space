import { useRef, useState, useCallback, useEffect } from 'react';
import {
  Sparkles, Paperclip, X, ChevronDown, Palette, Loader2, Wand2, ArrowRight,
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useStudioGenerate } from '@/features/studio-engine';
import { useBrandKit } from '@/features/marketing-studio/hooks/use-brand-kit';
import { OutputActions } from '@/features/studio-engine';
import type { StudioMode } from '@/features/studio-engine';
import { toast } from 'sonner';

import obsidianSample    from '@/assets/inspiration-obsidian.jpg';
import goldSample        from '@/assets/inspiration-gold.jpg';
import cinematicSample   from '@/assets/inspiration-cinematic.jpg';
import editorialSample   from '@/assets/inspiration-editorial.jpg';
import minimalSample     from '@/assets/inspiration-minimal.jpg';
import realestateSample  from '@/assets/inspiration-realestate.jpg';
import productdropSample from '@/assets/inspiration-productdrop.jpg';

/* ──────────────────────────────────────────────────────────────────────────
 * UnifiedCreateStudio — the "Ultimate Create" surface.
 *
 * Single prompt + Auto format + multi-image upload + true visual color wheel
 * + vibe chips + Inspired Gallery lookbook with full-blueprint autofill.
 * ─────────────────────────────────────────────────────────────────────── */

type FormatId = StudioMode | 'auto';
type FormatOption = { id: FormatId; label: string; hint: string };

const FORMATS: FormatOption[] = [
  { id: 'auto',     label: 'Auto',   hint: 'MarQ picks the best format' },
  { id: 'flyer',    label: 'Flyer',  hint: '4:5 marketing flyer' },
  { id: 'social',   label: 'Social', hint: 'IG / LinkedIn / X post' },
  { id: 'logo',     label: 'Logo',   hint: 'Square brand mark' },
  { id: 'hero',     label: 'Hero',   hint: 'Landing / OG image' },
  { id: 'freeform', label: 'Free',   hint: 'Any composition' },
];

const VIBES = ['Cinematic', 'Obsidian', 'Gold', 'Editorial', 'Minimal'] as const;
type Vibe = typeof VIBES[number];

type Inspiration = {
  id: string;
  label: string;
  theme: Vibe;
  mode: FormatId;
  prompt: string;
  vibes: Vibe[];
  palette: string[];      // first entry becomes active color
  sample: string;         // imported image
};

const INSPIRATIONS: Inspiration[] = [
  {
    id: 'obs-tile', label: 'Obsidian Elevate', theme: 'Obsidian', mode: 'social',
    prompt: 'Obsidian black square social tile. Large gold serif headline "ELEVATE" centered. Tiny tracked uppercase subhead "MARQ STUDIO · 2026" below. Subtle gold rim light from top-right, faint marble texture, luxury minimal magazine feel.',
    vibes: ['Obsidian', 'Gold'],
    palette: ['#D4AF37', '#0A0A0A', '#1A1A1F'],
    sample: obsidianSample,
  },
  {
    id: 'gold-fly', label: 'Gold Private Launch', theme: 'Gold', mode: 'flyer',
    prompt: 'Luxury invitation flyer, pitch black background, massive metallic gold serif headline "PRIVATE LAUNCH" stacked. Tracked uppercase subhead "BE THE FIRST · EXPERIENCE THE EXCEPTIONAL". Thin gold hairline rules, monogram crest, soft golden corner glow.',
    vibes: ['Gold', 'Editorial'],
    palette: ['#E5C063', '#0A0A0A', '#3A2A10'],
    sample: goldSample,
  },
  {
    id: 'cine-hero', label: 'Cinematic Momentum', theme: 'Cinematic', mode: 'hero',
    prompt: 'Cinematic widescreen hero. Deep teal-and-charcoal palette, abstract flowing data ribbons and light streaks. Bold white sans-serif headline "BUILT FOR MOMENTUM" left-aligned, tiny teal kicker "INTELLIGENCE ENGINE" above, ghost CTA outline below.',
    vibes: ['Cinematic'],
    palette: ['#2DD4BF', '#0F2A35', '#050810'],
    sample: cinematicSample,
  },
  {
    id: 'edit-port', label: 'Editorial Founder', theme: 'Editorial', mode: 'social',
    prompt: 'Editorial 4:5 magazine cover. Warm cream background, black-and-white portrait on the right half, massive didone serif headline "THE FOUNDER ISSUE" on the left, thin ruling lines, small uppercase metadata "VOL. 04 · MARQ" at top, italic body teasers below.',
    vibes: ['Editorial', 'Minimal'],
    palette: ['#F4F1EC', '#1A1A1A', '#8A857C'],
    sample: editorialSample,
  },
  {
    id: 'min-mark', label: 'Minimal Atelier Mark', theme: 'Minimal', mode: 'logo',
    prompt: 'Ultra-minimal wordmark presentation on charcoal. Single thin-weight white sans-serif wordmark perfectly centered with a tiny circular dot mark above. Massive negative space, faint grain texture, gallery-quality.',
    vibes: ['Minimal'],
    palette: ['#FFFFFF', '#1A1A1A'],
    sample: minimalSample,
  },
  {
    id: 'realestate-listing', label: 'Just Listed · Hillside', theme: 'Cinematic', mode: 'flyer',
    prompt: 'Luxury real estate property flyer. Twilight modern hillside mansion with infinity pool glowing teal, warm interior lights. Tracked uppercase kicker "JUST LISTED · BEVERLY HILLS" at top. Massive elegant serif headline "[BEDS · VIEW]" stacked. Cream price tag bottom and tiny agent line. Cinematic editorial real-estate magazine quality, deep navy and warm gold accents.',
    vibes: ['Cinematic', 'Editorial'],
    palette: ['#D4AF37', '#0B1A2E', '#0A0A0A'],
    sample: realestateSample,
  },
  {
    id: 'product-drop', label: 'Limited Product Drop', theme: 'Gold', mode: 'social',
    prompt: 'Promotional product-drop graphic. Floating hero shot of a luxury matte-black product on a soft peach gradient backdrop, water droplets, gentle shadow. Tracked uppercase kicker "LIMITED DROP · [DATE]" at top. Massive condensed sans-serif headline "[EDITION NAME]" in cream. Small brand tag bottom-left and a gold SHOP pill bottom-right. Premium e-commerce campaign aesthetic.',
    vibes: ['Gold', 'Editorial'],
    palette: ['#E5C063', '#F4D5BD', '#1A1A1A'],
    sample: productdropSample,
  },
];

export function UnifiedCreateStudio() {
  const { effective: brand } = useBrandKit(null);
  const { generate, loading, result, error } = useStudioGenerate();

  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState<FormatId>('auto');
  const [vibe, setVibe] = useState<Vibe | null>(null);
  const [attachments, setAttachments] = useState<{ file: File; url: string }[]>([]);
  const [color, setColor] = useState<string>(brand.accent_hex || '#D4AF37');
  const fileRef = useRef<HTMLInputElement>(null);

  /* ─── attachments ─────────────────────────────────────────────────── */
  const onPickFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).slice(0, 8 - attachments.length).map(file => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setAttachments(prev => [...prev, ...next]);
  };
  const removeAttachment = (idx: number) => {
    setAttachments(prev => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  /* ─── generate ────────────────────────────────────────────────────── */
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    const mode: StudioMode = format === 'auto' ? 'freeform' : format;
    const composed = [
      prompt.trim(),
      vibe && `Style: ${vibe}.`,
      color && `Primary color: ${color}.`,
      attachments.length && `Incorporate ${attachments.length} reference image${attachments.length > 1 ? 's' : ''} into a cohesive layout.`,
    ].filter(Boolean).join(' ');

    await generate({ mode, prompt: composed });
  }, [prompt, format, vibe, color, attachments.length, loading, generate]);

  /* ─── inspiration → autofill the entire blueprint ─────────────────── */
  const useInspiration = (i: Inspiration) => {
    setPrompt(i.prompt);
    setFormat(i.mode);
    setVibe(i.theme);
    setColor(i.palette[0]);
    toast.success(`Loaded "${i.label}" — tweak the text and Create`);
  };

  /* ─── listen for Vault "Reuse as template" handoffs ───────────────── */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        title?: string;
        format?: string;
        image_url?: string;
        config?: {
          prompt?: string;
          vibe?: Vibe;
          palette?: string[];
          color?: string;
        } | null;
      } | undefined;
      if (!detail) return;

      const cfg = detail.config ?? {};
      const nextPrompt =
        cfg.prompt?.trim() ||
        (detail.title ? `Remix of "${detail.title}"` : '');
      if (nextPrompt) setPrompt(nextPrompt);

      const fmt = (detail.format || '').toLowerCase();
      const allowed: FormatId[] = ['auto', 'flyer', 'social', 'logo', 'hero', 'freeform'];
      if (allowed.includes(fmt as FormatId)) setFormat(fmt as FormatId);

      if (cfg.vibe && (VIBES as readonly string[]).includes(cfg.vibe)) {
        setVibe(cfg.vibe as Vibe);
      }

      const nextColor = cfg.color || (cfg.palette && cfg.palette[0]);
      if (nextColor) setColor(nextColor);

      // Bring the studio into view + soft toast.
      requestAnimationFrame(() => {
        document.getElementById('unified-create-studio')?.scrollIntoView({
          behavior: 'smooth', block: 'start',
        });
      });
      toast.success(`Loaded "${detail.title ?? 'asset'}" — tweak and Create`);
    };
    window.addEventListener('intoiq:reuse-asset', handler as EventListener);
    return () => window.removeEventListener('intoiq:reuse-asset', handler as EventListener);
  }, []);

  const activeFormat = FORMATS.find(f => f.id === format)!;
  const brandDots = Array.from(new Set(
    [brand.accent_hex, '#0A0A0A', '#D4AF37', '#2DD4BF', '#F4F1EC'].filter(Boolean) as string[],
  ));

  return (
    <section id="unified-create-studio" aria-label="Create" className="space-y-4 scroll-mt-24">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
            Create with MarQ
          </p>
        </div>
        <p className="text-[10px] text-muted-foreground/70 hidden sm:block">
          One prompt. Any format. Brand-aware.
        </p>
      </div>

      {/* ─── Core Card ─────────────────────────────────────────────── */}
      <div className="glass relative overflow-visible rounded-3xl border border-gold/20 bg-background/50 p-4 sm:p-5 shadow-[0_0_32px_-12px_hsl(var(--gold)/0.35)]">
        {/* Prompt textarea */}
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you want to create — e.g. 'Friday jazz night flyer, dim teal stage, brass instruments'"
          rows={3}
          className="resize-none border-0 bg-transparent px-1 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0"
        />

        {/* Attachment thumbs */}
        {attachments.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {attachments.map((a, i) => (
              <div key={i} className="relative h-14 w-14 rounded-lg overflow-hidden border border-gold/30 group">
                <img src={a.url} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <X className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {/* Attach */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-muted/30 px-2.5 py-1.5 text-[11px] text-foreground/80 hover:bg-muted/60 transition-colors"
          >
            <Paperclip className="h-3.5 w-3.5" />
            {attachments.length > 0 ? `${attachments.length}` : 'Attach'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => { onPickFiles(e.target.files); e.target.value = ''; }}
          />

          {/* Format selector — Radix Popover, portal'd so z-index can never get clipped */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-1.5 text-[11px] text-gold/90 hover:bg-gold/15 transition-colors"
              >
                <Wand2 className="h-3.5 w-3.5" />
                {activeFormat.label}
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              sideOffset={6}
              className="z-[100] w-56 p-1 rounded-xl border border-gold/20 bg-background/95 backdrop-blur-md shadow-xl"
            >
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={cn(
                    'w-full text-left rounded-lg px-2.5 py-1.5 text-[11px] transition-colors',
                    format === f.id ? 'bg-gold/15 text-gold' : 'text-foreground/80 hover:bg-muted/40',
                  )}
                >
                  <div className="font-medium">{f.label}</div>
                  <div className="text-[10px] text-muted-foreground">{f.hint}</div>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Color dots + visual wheel popover */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-muted/30 px-2 py-1.5">
            {brandDots.slice(0, 4).map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={cn(
                  'h-4 w-4 rounded-full border transition-transform',
                  color.toLowerCase() === c.toLowerCase()
                    ? 'border-white scale-110 ring-1 ring-gold/60'
                    : 'border-white/20 hover:scale-110',
                )}
                aria-label={`Use color ${c}`}
              />
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1 ml-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Open color wheel"
                >
                  <span
                    className="h-4 w-4 rounded-full border border-white/40"
                    style={{ background: color }}
                  />
                  <Palette className="h-3 w-3" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                sideOffset={6}
                className="z-[100] w-auto p-3 rounded-2xl border border-gold/20 bg-background/95 backdrop-blur-md shadow-xl"
              >
                <HexColorPicker
                  color={color}
                  onChange={setColor}
                  style={{ width: 200, height: 200 }}
                />
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hex</span>
                  <Input
                    value={color}
                    onChange={(e) => {
                      const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                      setColor(v);
                    }}
                    className="h-8 flex-1 text-xs font-mono"
                    maxLength={7}
                  />
                  <span
                    className="h-8 w-8 rounded-md border border-white/20"
                    style={{ background: color }}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Spacer + Generate */}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim() || loading}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
              'bg-gold text-black hover:bg-gold/90 active:scale-[0.98] shadow-[0_0_18px_-4px_hsl(var(--gold)/0.6)]',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? 'Creating…' : 'Create'}
          </button>
        </div>

        {/* Vibe chips */}
        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mr-1">Vibe</span>
          {VIBES.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setVibe(vibe === v ? null : v)}
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] transition-colors',
                vibe === v
                  ? 'border-gold/60 bg-gold/15 text-gold'
                  : 'border-border/30 text-muted-foreground hover:border-gold/30 hover:text-foreground',
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

        {/* Inline result */}
        {result?.imageUrl && (
          <div className="mt-4 rounded-2xl border border-gold/20 bg-muted/10 p-3">
            <img src={result.imageUrl} alt="" className="w-full max-h-[55vh] object-contain rounded-lg" />
            <div className="mt-2">
              <OutputActions imageUrl={result.imageUrl} filename={`marq-${format}.png`} />
            </div>
          </div>
        )}
      </div>

      {/* ─── Inspired Gallery — luxury lookbook ───────────────────── */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/80">
            Inspired Gallery
          </p>
          <p className="text-[10px] text-muted-foreground/60">Tap to load the full blueprint</p>
        </div>
        <div className="-mx-1 px-1 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-thin">
          {INSPIRATIONS.map(i => (
            <button
              key={i.id}
              type="button"
              onClick={() => useInspiration(i)}
              className={cn(
                'group relative shrink-0 snap-start w-44 sm:w-52 aspect-[4/5] rounded-2xl overflow-hidden text-left',
                'border border-border/30 hover:border-gold/50 transition-all',
                'shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_32px_-8px_hsl(var(--gold)/0.4)]',
                'active:scale-[0.98]',
              )}
            >
              <img
                src={i.sample}
                alt={`${i.label} sample`}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              />
              {/* Gradient scrim for legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20" />
              {/* Overlay metadata */}
              <div className="absolute inset-0 p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] uppercase tracking-[0.3em] px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-sm" style={{ color: i.palette[0] }}>
                    {i.theme}
                  </span>
                  <div className="flex gap-1">
                    {i.palette.slice(0, 3).map(c => (
                      <span key={c} className="h-2 w-2 rounded-full border border-white/40" style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-serif text-white leading-tight drop-shadow">{i.label}</p>
                  <p className="text-[9px] uppercase tracking-wider text-white/60 mt-0.5">
                    {FORMATS.find(f => f.id === i.mode)?.label} · {i.vibes.join(' / ')}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-gold/90 group-hover:text-gold transition-colors">
                    Use this Style <ArrowRight className="h-2.5 w-2.5" />
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
