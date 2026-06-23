import { useState } from 'react';
import { Layers, Wand2, Sparkles } from 'lucide-react';
import { TEMPLATES, type TemplateId } from '../types';
import { AssetGeneratorDialog } from './AssetGeneratorDialog';
import { QuickFlyerDialog } from './QuickFlyerDialog';
import { EVENT_PRESETS } from '../lib/event-presets';
import { useBrandKit } from '../hooks/use-brand-kit';
import { cn } from '@/lib/utils';

export function TemplateGallery() {
  const [open, setOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [selected, setSelected] = useState<TemplateId>('obsidian-tile');
  const { effective: brand } = useBrandKit(null);

  return (
    <section className="glass rounded-3xl border border-gold/20 p-5 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <Layers className="h-4 w-4 text-gold" />
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
          Social Funnels
        </p>
      </div>
      <h2 className="text-xl font-serif tracking-tight">Living flyers, not dead pixels.</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Drop a photo or video, pick a vibe, and your invite becomes a brand-locked share asset.
      </p>

      {/* Event-specific starters — same Quick Flyer presets, surfaced for power users */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
            Event Starters
          </p>
          <button
            onClick={() => setQuickOpen(true)}
            className="ml-auto text-[11px] text-gold/80 hover:text-gold transition-colors"
          >
            See all →
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
          {EVENT_PRESETS.filter((p) => p.id !== 'general-event').map((p) => (
            <button
              key={p.id}
              onClick={() => setQuickOpen(true)}
              className={cn(
                'flex-shrink-0 flex items-center gap-2 rounded-xl border border-border/40 bg-card/40 px-3 py-2 text-xs transition-all',
                'hover:border-gold/50 hover:bg-gold/5',
              )}
            >
              <span aria-hidden>{p.emoji}</span>
              <span className="font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setSelected(t.id);
              setOpen(true);
            }}
            className="group text-left rounded-2xl border border-border/30 bg-muted/20 p-4 transition-all hover:border-gold/40 hover:bg-muted/40"
          >
            <div
              className="aspect-[4/5] w-full rounded-xl mb-3 relative overflow-hidden"
              style={{
                background: `radial-gradient(circle at 70% 25%, ${brand.accent_hex}40 0%, transparent 60%), linear-gradient(135deg, #14141f 0%, #0a0a0f 100%)`,
              }}
            >
              <div className="absolute inset-0 p-3 flex flex-col justify-between">
                <span className="text-[8px] uppercase tracking-[0.3em] text-gold">
                  {brand.brand_name || 'IntoIQ'}
                </span>
                <p className="text-sm font-bold text-white leading-tight line-clamp-2">
                  {t.name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{t.name}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.width}×{t.height}
                </p>
              </div>
              <Wand2 className="h-4 w-4 text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{t.description}</p>
          </button>
        ))}
      </div>

      <AssetGeneratorDialog
        open={open}
        onOpenChange={setOpen}
        defaults={{ templateId: selected }}
      />
      <QuickFlyerDialog open={quickOpen} onOpenChange={setQuickOpen} />
    </section>
  );
}
