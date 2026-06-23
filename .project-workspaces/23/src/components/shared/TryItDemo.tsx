import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Target, Globe, Lock, Zap, Users, Megaphone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TRY_IT_PRESETS, type TryItPreset } from '@/data/try-it-presets';

const STREAM_STAGES: Array<{
  key: keyof TryItPreset['stages'];
  icon: typeof Target;
  label: string;
}> = [
  { key: 'audience', icon: Users, label: 'Ideal Lead' },
  { key: 'offer', icon: Zap, label: 'High-Octane Offer' },
  { key: 'hook', icon: Megaphone, label: 'Scroll-Stopping Hook' },
  { key: 'headline', icon: Globe, label: 'Landing Page H1' },
  { key: 'cta', icon: Target, label: 'Conversion CTA' },
  { key: 'lead_magnet', icon: Mail, label: 'Lead Magnet + Engine Stage' },
];

/**
 * Scroll the page to the Signal Audit section (the gated, real-AI engine).
 * Falls back to scrollTop=0 if the anchor isn't on the page.
 */
function scrollToSignalAudit() {
  const el = document.getElementById('signal-audit');
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

export function TryItDemo() {
  const [activePreset, setActivePreset] = useState<TryItPreset | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [complete, setComplete] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const nudgeTimer = useRef<number | null>(null);

  const startPreset = (preset: TryItPreset) => {
    setActivePreset(preset);
    setActiveStep(-1);
    setComplete(false);
    setShowNudge(false);
  };

  // Simulated build animation — pure UI, zero AI cost
  useEffect(() => {
    if (!activePreset || complete) return;
    let step = 0;
    const interval = setInterval(() => {
      if (step < STREAM_STAGES.length) {
        setActiveStep(step);
        step++;
      } else {
        clearInterval(interval);
        setComplete(true);
      }
    }, 700);
    return () => clearInterval(interval);
  }, [activePreset, complete]);

  // Nudge dismisses itself after 4s
  const triggerNudge = () => {
    setShowNudge(true);
    if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    nudgeTimer.current = window.setTimeout(() => setShowNudge(false), 4500);
  };

  useEffect(() => {
    return () => {
      if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    };
  }, []);

  const handleReset = () => {
    setActivePreset(null);
    setActiveStep(-1);
    setComplete(false);
    setShowNudge(false);
  };

  const isStreaming = activePreset !== null && !complete;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Display-only "showroom" input — immersive headline */}
      <div className="mb-5">
        <div
          className={cn(
            'glass rounded-2xl p-1.5 flex items-center gap-2 transition-all duration-500 cursor-pointer relative',
            isStreaming && 'border-primary/40 ai-pulse-border',
            !isStreaming && 'opacity-90 hover:opacity-100',
          )}
          onClick={triggerNudge}
          role="button"
          aria-label="Showroom — select a sector below to watch MarQ build"
        >
          <Sparkles className="h-5 w-5 text-primary ml-4 shrink-0" />
          <div className="flex-1 py-3 px-2 text-sm sm:text-base text-muted-foreground/70 italic select-none truncate">
            {activePreset
              ? `"${activePreset.goal}"`
              : 'Step inside the engine. Select a sector to watch a high-conversion system come to life.'}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mr-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50">
            <Lock className="h-3 w-3" />
            <span className="hidden sm:inline">Showroom</span>
          </div>
        </div>

        {/* Gold nudge — tap-to-scroll for full user agency on mobile */}
        {showNudge && (
          <div className="mt-3 glass rounded-xl border border-primary/30 px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-in">
            <p className="text-xs sm:text-sm text-foreground/90 flex-1">
              <span className="text-primary font-medium">You're seeing the system at work.</span>{' '}
              Ready to see what it builds around you?
            </p>
            <Button
              size="sm"
              onClick={scrollToSignalAudit}
              className="cta-gold-bright shrink-0 h-9 px-5 text-xs font-semibold tracking-wide"
            >
              Run Custom Audit <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Sector chips — the "Power Lineup" — each label sells a future result */}
      <div className="flex flex-wrap gap-2.5 justify-center mb-8">
        <span className="text-xs text-muted-foreground/60 mr-1 self-center tracking-[0.18em] uppercase">
          Choose Your Sector:
        </span>
        {TRY_IT_PRESETS.map((preset, idx) => {
          const isActive = activePreset?.key === preset.key;
          return (
            <button
              key={preset.key}
              onClick={() => startPreset(preset)}
              className={cn(
                'rounded-full px-4 py-2 text-[11px] sm:text-xs tracking-wide border backdrop-blur-sm transition-all duration-300 cursor-pointer',
                'shadow-[inset_0_0_4px_rgba(255,255,255,0.1)]',
                isActive
                  ? 'text-primary border-primary/60 bg-primary/10 shadow-[0_0_18px_rgba(20,184,166,0.5),inset_0_0_6px_rgba(255,255,255,0.15)]'
                  : 'text-muted-foreground/80 border-white/[0.15] bg-white/[0.03] hover:text-primary hover:border-primary/40 hover:shadow-[0_0_12px_rgba(20,184,166,0.5),inset_0_0_4px_rgba(255,255,255,0.1)]',
                // Subtle gold pulse on idle until first click
                !activePreset && 'try-it-chip-pulse',
              )}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Stream visualization */}
      {activePreset && (
        <div className="glass rounded-2xl p-6 sm:p-8 overflow-hidden">
          <div className="mb-6 pb-4 border-b border-border/30">
            <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-1">
              Sector Snapshot · {activePreset.label}
            </p>
            <p className="text-sm text-foreground/90 font-medium line-clamp-2">
              "{activePreset.goal}"
            </p>
          </div>

          <div className="space-y-4">
            {STREAM_STAGES.map((stage, i) => {
              const isActive = i === activeStep;
              const isDone = i < activeStep || complete;
              const isHidden = i > activeStep && !complete;
              const StageIcon = stage.icon;
              const value = activePreset.stages[stage.key];

              return (
                <div
                  key={stage.key}
                  className={cn(
                    'flex items-start gap-4 transition-all duration-700',
                    isHidden && 'opacity-0 translate-y-4',
                    !isHidden && 'opacity-100 translate-y-0',
                  )}
                >
                  <div
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-500',
                      (isDone || isActive) && 'bg-primary/20 text-primary',
                      isActive && 'ai-pulse-border',
                      !isDone && !isActive && 'bg-muted/30 text-muted-foreground/30',
                    )}
                  >
                    <StageIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 pt-1 min-w-0">
                    <p
                      className={cn(
                        'text-[10px] uppercase tracking-[0.22em] font-medium transition-colors duration-500 mb-0.5',
                        isDone || isActive
                          ? 'text-primary/70'
                          : 'text-muted-foreground/30',
                      )}
                    >
                      {stage.label}
                    </p>
                    <p
                      className={cn(
                        'text-sm leading-relaxed transition-colors duration-500',
                        isDone || isActive
                          ? 'text-foreground/95'
                          : 'text-muted-foreground/20',
                      )}
                    >
                      {value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {complete && (
            <div className="mt-6 pt-5 border-t border-border/30 flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up">
              <div className="flex-1 text-center sm:text-left">
                <p className="text-sm font-serif text-foreground">
                  This is what MarQ builds in seconds.
                </p>
                <p className="text-xs text-muted-foreground">
                  Ready to architect your own? Run the Signal Audit to begin.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="border-border/50"
                >
                  Try Another
                </Button>
                <Button size="sm" onClick={scrollToSignalAudit} className="glow-button">
                  Run My Audit <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
