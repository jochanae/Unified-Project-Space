/**
 * StudioEngine — unified asset generation surface.
 *
 * Modes: logo · flyer · social · hero · freeform.
 * Brand-aware (server-side) · stores to marketing-assets · OutputActions inline.
 */

import { useState, useCallback, useEffect } from 'react';
import { useStudioGenerate } from '../hooks/use-studio-generate';
import { OutputActions } from './OutputActions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Loader2, Sparkles } from 'lucide-react';
import type { StudioMode, StudioPlatform } from '../types';

interface Props {
  mode?: StudioMode;
  defaultPrompt?: string;
  defaultPlatform?: StudioPlatform;
  /** When true, hides the mode tabs (caller has locked the mode). */
  lockMode?: boolean;
  /** Pre-populate the preview with an existing image (e.g. MarQ chat handoff). */
  initialImageUrl?: string;
  /** Called after a successful generation. */
  onResult?: (imageUrl: string) => void;
}

const MODE_TABS: { id: StudioMode; label: string; hint: string }[] = [
  { id: 'logo', label: 'Logo', hint: 'Square brand mark on white' },
  { id: 'flyer', label: 'Flyer', hint: '4:5 portrait marketing flyer' },
  { id: 'social', label: 'Social', hint: 'IG / LinkedIn / X post' },
  { id: 'hero', label: 'Hero', hint: 'Landing / OG hero image' },
  { id: 'freeform', label: 'Free', hint: 'Any composition' },
];

const PLATFORMS: { id: StudioPlatform; label: string }[] = [
  { id: 'instagram', label: 'Instagram (1:1)' },
  { id: 'linkedin', label: 'LinkedIn (1.91:1)' },
  { id: 'twitter', label: 'X / Twitter (16:9)' },
];

export function StudioEngine({
  mode: initialMode = 'freeform',
  defaultPrompt = '',
  defaultPlatform = 'instagram',
  lockMode,
  initialImageUrl,
  onResult,
}: Props) {
  const [mode, setMode] = useState<StudioMode>(initialMode);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [platform, setPlatform] = useState<StudioPlatform>(defaultPlatform);
  const { generate, loading, result, error } = useStudioGenerate();
  const displayedUrl = result?.imageUrl ?? initialImageUrl;


  // Keep mode/prompt in sync if caller updates them (e.g. dialog reopens).
  useEffect(() => { setMode(initialMode); }, [initialMode]);
  useEffect(() => { if (defaultPrompt) setPrompt(defaultPrompt); }, [defaultPrompt]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || loading) return;
    const r = await generate({
      mode,
      prompt: prompt.trim(),
      ...(mode === 'social' ? { platform } : {}),
    });
    if (r?.imageUrl) onResult?.(r.imageUrl);
  }, [mode, prompt, platform, generate, loading, onResult]);

  const activeTab = MODE_TABS.find(t => t.id === mode) ?? MODE_TABS[4];

  return (
    <div className="space-y-4">
      {/* Mode tabs */}
      {!lockMode && (
        <div className="flex flex-wrap gap-1.5">
          {MODE_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMode(tab.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border',
                mode === tab.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border/40 text-muted-foreground hover:bg-muted/40',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">{activeTab.hint}</p>

      {/* Platform picker (social only) */}
      {mode === 'social' && (
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlatform(p.id)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-[11px]',
                platform === p.id
                  ? 'bg-foreground/10 border-foreground/40 text-foreground'
                  : 'border-border/40 text-muted-foreground hover:bg-muted/40',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Prompt */}
      <div className="space-y-1.5">
        <Label htmlFor="studio-prompt" className="text-xs">Describe what you want</Label>
        <Textarea
          id="studio-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === 'logo' ? 'e.g. Minimal mountain crest for an outdoor coffee brand'
            : mode === 'flyer' ? 'e.g. Friday night jazz night — dim teal stage lighting, brass instruments'
            : mode === 'social' ? 'e.g. New episode drop announcement, bold typography teaser'
            : mode === 'hero' ? 'e.g. Cinematic wide shot for a SaaS landing page, abstract data ribbons'
            : 'Describe the visual...'
          }
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Action */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Brand kit applied automatically.
        </p>
        <Button onClick={handleGenerate} disabled={!prompt.trim() || loading} size="sm">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Generating…' : 'Generate'}
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {/* Preview */}
      {displayedUrl && (
        <div className="space-y-2 rounded-xl border border-border/40 bg-muted/10 p-3">
          <img
            src={displayedUrl}
            alt={prompt}
            className="w-full max-h-[60vh] object-contain rounded-lg"
          />
          <OutputActions imageUrl={displayedUrl} filename={`studio-${mode}.png`} showOpenInStudio={lockMode} />
        </div>
      )}
    </div>
  );
}
