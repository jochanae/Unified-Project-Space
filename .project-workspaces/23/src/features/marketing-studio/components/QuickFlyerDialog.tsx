import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AssetGeneratorDialog } from './AssetGeneratorDialog';
import { EVENT_PRESETS, type EventPreset } from '../lib/event-presets';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Quick Flyer entry point — designed for non-marketers (event organizers,
 * pastors, party planners) who need a one-off promotional asset without
 * setting up a project first.
 *
 * Flow:
 *   1. Pick an event type (Church, Birthday, Fundraiser, Open House, Workshop, General)
 *   2. Opens the standard AssetGeneratorDialog pre-filled with smart defaults
 *      and the most appropriate template (flyer vs social tile).
 *   3. User edits, downloads, or saves to library.
 *
 * No project required. Brand kit falls back to org default automatically.
 */
export function QuickFlyerDialog({ open, onOpenChange }: Props) {
  const [selected, setSelected] = useState<EventPreset | null>(null);

  const handlePick = (preset: EventPreset) => {
    setSelected(preset);
    onOpenChange(false);
  };

  const handleGeneratorClose = (next: boolean) => {
    if (!next) {
      // Reset selection when generator closes so the picker can be reopened cleanly.
      setSelected(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto top-[calc(env(safe-area-inset-top,0px)+4rem)] translate-y-0 sm:top-[50%] sm:translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold" />
              Quick Flyer
            </DialogTitle>
            <DialogDescription>
              Pick an event type. We'll pre-fill smart defaults so you can edit and download
              in under a minute — no project setup needed.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 sm:grid-cols-2">
            {EVENT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePick(preset)}
                className={cn(
                  'group flex items-start gap-3 rounded-xl border border-border/40 bg-card/40 p-4 text-left transition-all',
                  'hover:border-gold/50 hover:bg-gold/5 hover:shadow-[0_0_18px_-6px_hsl(var(--gold)/0.4)]',
                )}
              >
                <span className="text-2xl leading-none" aria-hidden>
                  {preset.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground group-hover:text-gold transition-colors">
                    {preset.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
                    {preset.description}
                  </p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-wider text-muted-foreground/60">
                    {preset.templateId === 'gold-flyer'
                      ? 'Print flyer · 8.5×11'
                      : preset.templateId === 'cinematic-story'
                        ? 'Story · 9:16'
                        : 'Social tile · square'}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <p className="mt-2 text-[10px] text-muted-foreground/70 text-center">
            Tip: you can change the template, copy, and link in the next step.
          </p>
        </DialogContent>
      </Dialog>

      {/* Generator opens with the chosen preset's defaults */}
      {selected && (
        <AssetGeneratorDialog
          open={!!selected}
          onOpenChange={handleGeneratorClose}
          projectId={null}
          defaults={{
            templateId: selected.templateId,
            headline: selected.defaults.headline,
            subhead: selected.defaults.subhead,
            cta: selected.defaults.cta,
          }}
        />
      )}
    </>
  );
}
