import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Target, Sparkles, Crown, Zap, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type IntentMode = 'conversion' | 'differentiation' | 'premium';

export interface ProposedAngle {
  name: string;
  wedge: string;
  audience_cut: string;
  hook: string;
  why_it_works: string;
  tradeoff: string;
}

export interface LockedAngle {
  intentMode: IntentMode;
  angle: ProposedAngle;
}

interface PreFlightChecklistProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: string;
  projectId: string;
  onLocked: (locked: LockedAngle) => void;
}

const INTENT_OPTIONS: { value: IntentMode; label: string; sub: string; icon: typeof Target }[] = [
  {
    value: 'conversion',
    label: 'Conversion-first',
    sub: 'Capture leads fast. Clear single promise. Low friction.',
    icon: Zap,
  },
  {
    value: 'differentiation',
    label: 'Differentiation-first',
    sub: 'Stake out a contrarian position. Stand apart from the category.',
    icon: Target,
  },
  {
    value: 'premium',
    label: 'Premium-first',
    sub: 'Signal status and taste. Aspiration over urgency.',
    icon: Crown,
  },
];

export function PreFlightChecklist({ open, onOpenChange, goal, projectId, onLocked }: PreFlightChecklistProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [intent, setIntent] = useState<IntentMode | null>(null);
  const [angles, setAngles] = useState<ProposedAngle[] | null>(null);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setIntent(null);
    setAngles(null);
    setChosenIdx(null);
    setError(null);
    setLoading(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const proceedToAngles = async (mode: IntentMode) => {
    setIntent(mode);
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('ai-propose-angles', {
        body: { goal, intentMode: mode, projectId },
      });
      if (fnErr) throw new Error(fnErr.message);
      if (data?.error) throw new Error(data.error);
      const list = (data?.angles || []) as ProposedAngle[];
      if (list.length === 0) throw new Error('No angles returned');
      setAngles(list);
      setStep(2);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to propose angles';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const lockAndBuild = () => {
    if (intent === null || angles === null || chosenIdx === null) return;
    onLocked({ intentMode: intent, angle: angles[chosenIdx] });
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Pre-flight checkpoint
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 1
              ? 'Pick your intent. This locks the lens IntoIQ uses to generate everything.'
              : 'Three distinct angles. Pick the one you want to commit to — IntoIQ will build the entire funnel around it.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Intent Mode */}
        {step === 1 && (
          <div className="space-y-3 pt-2">
            {INTENT_OPTIONS.map(({ value, label, sub, icon: Icon }) => (
              <button
                key={value}
                onClick={() => proceedToAngles(value)}
                disabled={loading}
                className={cn(
                  'w-full text-left rounded-xl border border-border/60 bg-background/40 p-4 transition-all',
                  'hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50 disabled:cursor-not-allowed',
                  loading && intent === value && 'border-primary/80 bg-primary/10',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    {loading && intent === value ? (
                      <Loader2 className="h-4 w-4 text-primary animate-spin" />
                    ) : (
                      <Icon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                  </div>
                </div>
              </button>
            ))}
            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 text-center pt-1">
              Step 1 of 2
            </p>
          </div>
        )}

        {/* Step 2: Pick angle */}
        {step === 2 && angles && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                {INTENT_OPTIONS.find(o => o.value === intent)?.label} · 3 angles
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={loading || !intent}
                onClick={() => { if (intent) { setChosenIdx(null); proceedToAngles(intent); } }}
                className="h-7 gap-1.5 text-[11px] text-muted-foreground hover:text-primary"
                title="Generate 3 fresh angles in the same intent tier"
              >
                {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>🔄</span>}
                Re-roll Angles
              </Button>
            </div>
            {angles.map((a, i) => {
              const selected = chosenIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => setChosenIdx(i)}
                  className={cn(
                    'w-full text-left rounded-xl border p-4 transition-all',
                    selected
                      ? 'border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
                      : 'border-border/60 bg-background/40 hover:border-primary/40',
                  )}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                        Angle {String.fromCharCode(65 + i)}
                      </span>
                      <h3 className="font-serif text-base">{a.name}</h3>
                    </div>
                    {selected && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 mb-3 italic">"{a.hook}"</p>
                  <div className="grid gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground/70 uppercase tracking-wider text-[10px]">Wedge: </span>
                      <span className="text-foreground/80">{a.wedge}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/70 uppercase tracking-wider text-[10px]">Audience: </span>
                      <span className="text-foreground/80">{a.audience_cut}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground/70 uppercase tracking-wider text-[10px]">Why: </span>
                      <span className="text-foreground/80">{a.why_it_works}</span>
                    </div>
                    <div className="pt-2 border-t border-border/30">
                      <span className="text-destructive/70 uppercase tracking-wider text-[10px]">Tradeoff: </span>
                      <span className="text-muted-foreground">{a.tradeoff}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => { setStep(1); setAngles(null); setChosenIdx(null); }}>
                ← Change intent
              </Button>
              <Button
                onClick={lockAndBuild}
                disabled={chosenIdx === null}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Lock & build <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 text-center">
              Step 2 of 2
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
