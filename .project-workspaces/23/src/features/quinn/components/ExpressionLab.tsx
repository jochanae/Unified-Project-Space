import { useState } from 'react';
import { Sliders, Eye, Brain, Shield, Palette, Crosshair, Sparkles, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useQuinnCalibration, type QuinnCalibration } from '../hooks/use-quinn-calibration';
import { toast } from 'sonner';

const PRESENCE_MODES = [
  {
    value: 'observer',
    label: 'Observer',
    icon: Eye,
    description: 'MarQ speaks only when spoken to or when a benchmark is hit.',
  },
  {
    value: 'partner',
    label: 'Partner',
    icon: Brain,
    description: 'Morning insights and occasional mid-day signal checks.',
  },
  {
    value: 'shadow',
    label: 'Shadow',
    icon: Shield,
    description: 'Highly proactive — offers thoughts on brainstorms and suggests A/B tests.',
  },
] as const;

const TONE_PROFILES = [
  {
    value: 'strategist',
    label: 'The Strategist',
    icon: Crosshair,
    description: 'Focuses on ROI, conversion, and market positioning.',
  },
  {
    value: 'creative',
    label: 'The Creative',
    icon: Palette,
    description: 'Focuses on aesthetic consistency, vibe alignment, and storytelling.',
  },
  {
    value: 'guardian',
    label: 'The Guardian',
    icon: Shield,
    description: 'Focuses on risk management, leaks, and system stability.',
  },
] as const;

export function ExpressionLab() {
  const { calibration, loading, saving, save } = useQuinnCalibration();
  const [local, setLocal] = useState<QuinnCalibration | null>(null);

  const current = local ?? calibration;
  const isDirty = local !== null;

  const update = (partial: Partial<QuinnCalibration>) => {
    setLocal({ ...current, ...partial });
  };

  const handleSave = async () => {
    if (!local) return;
    await save(local);
    setLocal(null);
    toast.success('MarQ calibration saved', {
      description: 'Your preferences will guide all future interactions.',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 mb-3">
          <Sliders className="h-6 w-6 text-primary" />
        </div>
        <h3
          className="text-lg font-bold text-foreground"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Expression Lab
        </h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Calibrate how MarQ communicates. She'll adapt her intelligence to match your workflow.
        </p>
      </div>

      {/* Tactical ↔ Grace Slider */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Communication Balance
          </span>
          <span className="text-[10px] text-muted-foreground/60 tabular-nums">
            {current.tacticalGrace}% Tactical
          </span>
        </div>

        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={100}
            value={current.tacticalGrace}
            onChange={(e) => update({ tacticalGrace: Number(e.target.value) })}
            className="w-full accent-primary h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(var(--accent)) ${100 - current.tacticalGrace}%, hsl(var(--primary)) ${current.tacticalGrace}%)`,
            }}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/50">
            <span>✦ Grace — Encouraging, vision-focused</span>
            <span>⚡ Tactical — Direct, data-driven</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed">
          {current.tacticalGrace > 70
            ? '"I\'ll cut straight to the signal. No padding, no pleasantries — just the move."'
            : current.tacticalGrace > 40
              ? '"A balanced approach — strategic precision delivered with considered warmth."'
              : '"I\'ll guide you with encouragement, focusing on the vision and the bigger picture."'
          }
        </p>
      </div>

      {/* Presence Frequency */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Presence Frequency
        </span>
        <div className="grid gap-2">
          {PRESENCE_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => update({ presenceFrequency: mode.value })}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                current.presenceFrequency === mode.value
                  ? 'border-primary/40 bg-primary/5 shadow-[0_0_15px_hsl(var(--primary)/0.08)]'
                  : 'border-border/20 hover:border-border/40',
              )}
            >
              <mode.icon className={cn(
                'h-4 w-4 mt-0.5 shrink-0',
                current.presenceFrequency === mode.value ? 'text-primary' : 'text-muted-foreground/50'
              )} />
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  current.presenceFrequency === mode.value ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {mode.label}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  {mode.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Intellectual Tone */}
      <div className="rounded-2xl border border-border/20 bg-card/30 p-5 backdrop-blur-sm space-y-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Intellectual Tone
        </span>
        <div className="grid gap-2">
          {TONE_PROFILES.map((tone) => (
            <button
              key={tone.value}
              onClick={() => update({ intellectualTone: tone.value })}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all',
                current.intellectualTone === tone.value
                  ? 'border-primary/40 bg-primary/5 shadow-[0_0_15px_hsl(var(--primary)/0.08)]'
                  : 'border-border/20 hover:border-border/40',
              )}
            >
              <tone.icon className={cn(
                'h-4 w-4 mt-0.5 shrink-0',
                current.intellectualTone === tone.value ? 'text-primary' : 'text-muted-foreground/50'
              )} />
              <div>
                <p className={cn(
                  'text-sm font-medium',
                  current.intellectualTone === tone.value ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  {tone.label}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                  {tone.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      {isDirty && (
        <div className="flex justify-center animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
          <Button onClick={handleSave} disabled={saving} className="gap-2 px-8">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lock Calibration
          </Button>
        </div>
      )}

      {/* MarQ note */}
      <p className="text-[10px] text-muted-foreground/30 text-center italic px-4">
        "These preferences shape how I brief you, what I prioritize, and how I speak. Over time, I'll suggest adjustments based on your workflow."
      </p>
    </div>
  );
}
