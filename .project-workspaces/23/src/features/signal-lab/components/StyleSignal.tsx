import { useState, useCallback } from 'react';
import { Palette, Loader2, Copy, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { callQuinnStream, extractJSON } from './SignalAIHelper';
import { supabase } from '@/integrations/supabase/client';
import LookbookCarousel from './LookbookCarousel';
import { useSubscription } from '@/features/billing';

interface StyleSignalOutput {
  palette: { name: string; hex: string; usage: string }[];
  typography: { heading: string; body: string; rationale: string };
  mood: string;
  visualDirection: string;
}

interface Props {
  oneLiner: string;
  elevatorPitch: string;
  socialBio: string;
  projectId?: string;
}

const VIBE_PRESETS = [
  'Obsidian & Gold',
  'Parisian Editorial',
  'Modern Coastal Luxury',
  'Vintage 80s CHANEL',
  'Minimalist Tech',
  'Desert Modernism',
  'Industrial Loft',
  'Cozy & Organic',
];

export default function StyleSignal({ oneLiner, elevatorPitch, socialBio, projectId }: Props) {
  const { tier } = useSubscription();
  const currentTier = (tier === 'growth' ? 'innovation' : tier === 'operator' ? 'identity' : 'signal') as 'free' | 'signal' | 'identity' | 'innovation';

  const [output, setOutput] = useState<StyleSignalOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [vibe, setVibe] = useState('');

  const generate = useCallback(async (vibeOverride?: string) => {
    if (loading) return;
    const vibeText = vibeOverride ?? vibe;
    setLoading(true);
    try {
      const vibeInstruction = vibeText.trim()
        ? `\n\n## Brand Vibe (Identity Lock)\nThe user describes their brand's visual and emotional soul as: "${vibeText.trim()}"\nInterpret the TEXTURE of this vibe — don't just pick generic colors. If they reference a fashion house, era, or material, translate that specific aesthetic into every design choice. In the typography rationale, explicitly reference the user's vibe and explain why the chosen fonts capture that feeling.`
        : '';

      const prompt = `You are MarQ, an elite Creative Director. Based on this brand signal, generate a complete visual identity that feels like a mood board from a world-class agency.

## Brand Signal
- One-Liner: "${oneLiner}"
- Elevator Pitch: "${elevatorPitch}"
- Social Bio: "${socialBio}"${vibeInstruction}

## Rules
- The palette should have exactly 5 colors (primary, secondary, accent, background, text)
- Typography should be real Google Font pairs that match the brand energy${vibeText.trim() ? ` and specifically reflect the "${vibeText.trim()}" vibe` : ''}
- Mood should be 2-3 words max
- Visual direction should be 2-3 sentences of actionable design guidance that a developer can translate into CSS
${vibeText.trim() ? `- The rationale MUST reference the user's vibe ("${vibeText.trim()}") and explain how each choice connects to that aesthetic` : ''}

Return ONLY valid JSON (no markdown, no code fences):
{
  "palette": [
    { "name": "Primary", "hex": "#hex", "usage": "CTAs, key elements" },
    { "name": "Secondary", "hex": "#hex", "usage": "Supporting elements" },
    { "name": "Accent", "hex": "#hex", "usage": "Highlights, hover states" },
    { "name": "Background", "hex": "#hex", "usage": "Page background" },
    { "name": "Text", "hex": "#hex", "usage": "Body copy" }
  ],
  "typography": {
    "heading": "Font Name",
    "body": "Font Name",
    "rationale": "Why these fonts capture the brand's soul${vibeText.trim() ? ` and the '${vibeText.trim()}' vibe` : ''}"
  },
  "mood": "2-3 word mood",
  "visualDirection": "Actionable design direction in 2-3 sentences"
}`;

      const raw = await callQuinnStream(prompt, projectId);
      const parsed = extractJSON<StyleSignalOutput>(raw);
      if (!parsed?.palette?.length) throw new Error('Failed to parse style signal');
      setOutput(parsed);

      // Persist style signal as project context for funnel generation
      if (projectId) {
        try {
          const { data: userData } = await supabase.auth.getSession();
          if (userData.session) {
            const { data: user } = await supabase.from('users').select('org_id').eq('id', userData.session.user.id).single();
            if (user) {
              const styleContext = JSON.stringify({
                vibe: vibeText.trim() || null,
                palette: parsed.palette,
                typography: parsed.typography,
                mood: parsed.mood,
                visualDirection: parsed.visualDirection,
              });
              // Upsert: delete old style_signal, insert new
              await supabase
                .from('project_context')
                .delete()
                .eq('project_id', projectId)
                .eq('org_id', user.org_id)
                .eq('context_type', 'style_signal');
              await supabase
                .from('project_context')
                .insert({ project_id: projectId, org_id: user.org_id, context_type: 'style_signal', directive: styleContext });
            }
          }
        } catch {
          // Non-blocking: style persistence is best-effort
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate style signal');
    } finally {
      setLoading(false);
    }
  }, [oneLiner, elevatorPitch, socialBio, projectId, loading, vibe]);

  const handleCopy = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Copied');
    setTimeout(() => setCopied(null), 2000);
  };

  /* ── Vibe Input (Empty State) ── */
  if (!output && !loading) {
    return (
      <div className="space-y-8 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
        {/* Lookbook Carousel */}
        <LookbookCarousel
          currentTier={currentTier}
          onSelect={(selectedVibe) => {
            setVibe(selectedVibe);
            generate(selectedVibe);
          }}
        />

        {/* Divider */}
        <div className="flex items-center gap-4 px-4">
          <div className="flex-1 h-px bg-border/20" />
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-medium">or describe your own</span>
          <div className="flex-1 h-px bg-border/20" />
        </div>

        <div className="rounded-2xl border border-border/20 bg-card/30 p-5 sm:p-6 backdrop-blur-sm">
          {/* Vibe Input */}
          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="e.g. Vintage 80s CHANEL meets minimalist obsidian tech..."
            rows={3}
            className={cn(
              'w-full rounded-xl border border-border/20 bg-background/50 p-4 text-sm text-foreground',
              'placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20',
              'resize-none transition-all duration-200',
            )}
          />

          {/* Vibe Presets */}
          <div className="mt-3 mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">
              Creative Sparks
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VIBE_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setVibe(preset)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-all',
                    vibe === preset
                      ? 'border-primary/40 bg-primary/10 text-primary'
                      : 'border-border/20 bg-background/30 text-muted-foreground hover:border-primary/20 hover:text-foreground',
                  )}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <Button onClick={() => generate()} className="w-full gap-2 h-11">
            <Sparkles className="h-4 w-4" />
            {vibe.trim() ? 'Lock Identity' : 'Generate Style Signal'}
          </Button>

          {!vibe.trim() && (
            <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
              You can skip the vibe and generate based on your message alone.
            </p>
          )}
        </div>
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="relative">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: '0 0 30px hsl(var(--primary) / 0.3)',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
        </div>
        <p className="text-sm text-muted-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
          {vibe.trim() ? `Translating "${vibe.trim()}" into visual DNA...` : 'Reading your signal\'s visual DNA...'}
        </p>
      </div>
    );
  }

  if (!output) return null;

  /* ── Results ── */
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Mood */}
      <div className="text-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Mood</span>
        <p className="text-2xl font-bold text-foreground mt-1" style={{ fontFamily: 'var(--font-heading)' }}>
          {output.mood}
        </p>
        {vibe.trim() && (
          <p className="text-xs text-muted-foreground/60 mt-1">
            Inspired by: {vibe.trim()}
          </p>
        )}
      </div>

      {/* Palette */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Color Palette</span>
        <div className="flex gap-2 mt-4">
          {output.palette.map((c) => (
            <button
              key={c.name}
              onClick={() => handleCopy(c.name, c.hex)}
              className="flex-1 group relative"
              title={`${c.name}: ${c.hex}`}
            >
              <div
                className="h-16 rounded-xl border border-border/10 transition-transform group-hover:scale-105"
                style={{ backgroundColor: c.hex }}
              />
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center truncate">{c.name}</p>
              <p className="text-[10px] text-muted-foreground/60 text-center font-mono">
                {copied === c.name ? '✓' : c.hex}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Typography</span>
          <button
            onClick={() => handleCopy('type', `${output.typography.heading} / ${output.typography.body}`)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied === 'type' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied === 'type' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground/60 mb-1">Headings</p>
            <p className="text-lg font-bold text-foreground">{output.typography.heading}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground/60 mb-1">Body</p>
            <p className="text-lg text-foreground">{output.typography.body}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">{output.typography.rationale}</p>
      </div>

      {/* Visual Direction */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Visual Direction</span>
          <button
            onClick={() => handleCopy('direction', output.visualDirection)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied === 'direction' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied === 'direction' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-foreground text-sm leading-relaxed">{output.visualDirection}</p>
      </div>

      {/* Regenerate */}
      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setOutput(null); }}
          disabled={loading}
          className="gap-2"
        >
          <Palette className="h-3.5 w-3.5" />
          Refine Vibe & Regenerate
        </Button>
      </div>
    </div>
  );
}
