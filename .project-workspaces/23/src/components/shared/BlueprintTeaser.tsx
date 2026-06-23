import { useState, useEffect, useMemo } from 'react';
import { Brain, Zap, Target, Mail, FileText, Lightbulb, Tag, BookOpen } from 'lucide-react';
import { useIntelligenceState } from '@/features/quinn';
import { StreamPhase } from '@/features/quinn';
import { cn } from '@/lib/utils';

interface NoteData {
  id: string;
  type: string;
  title: string;
  body: string;
}

const TYPE_ICONS: Record<string, typeof Brain> = {
  Note: FileText,
  Plan: Target,
  Idea: Lightbulb,
  Offer: Tag,
  Feature: Zap,
  Story: BookOpen,
};

const FALLBACK_STEPS = [
  { icon: Target, label: 'Lead Capture Page', type: 'Plan' },
  { icon: Zap, label: 'Nurture Sequence', type: 'Feature' },
  { icon: Mail, label: 'Conversion Email', type: 'Offer' },
  { icon: Brain, label: 'Sales Funnel', type: 'Idea' },
];

interface BlueprintTeaserProps {
  notes?: NoteData[];
  streamPhase?: StreamPhase;
}

export function BlueprintTeaser({ notes = [], streamPhase = 'idle' }: BlueprintTeaserProps) {
  const [activeStep, setActiveStep] = useState(0);
  const { pulse, phase, intensity } = useIntelligenceState(streamPhase);

  // Derive steps from real notes or fallback
  const steps = useMemo(() => {
    if (notes.length > 0) {
      return notes.slice(0, 6).map(note => ({
        icon: TYPE_ICONS[note.type] || FileText,
        label: note.title || note.body.slice(0, 40),
        type: note.type,
        body: note.body.slice(0, 60),
      }));
    }
    return FALLBACK_STEPS.map(s => ({ ...s, body: '' }));
  }, [notes]);

  // Cycle speed depends on intelligence phase
  useEffect(() => {
    const speed = phase === 'processing' ? 1400 : 2200;
    const iv = setInterval(() => {
      setActiveStep((s) => (s + 1) % steps.length);
    }, speed);
    return () => clearInterval(iv);
  }, [steps.length, phase]);

  const glowOpacity = 0.03 + intensity * pulse * 0.08;
  const isProcessing = phase === 'processing';
  const isReady = phase === 'ready';

  return (
    <div className={cn(
      "glass rounded-2xl p-6 relative overflow-hidden",
      "transition-all duration-1000 ease-out",
      isProcessing && "border-primary/30",
      isReady && "border-primary/20"
    )}>
      {/* Radial glow — intensity-driven */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at 30% 50%, hsl(var(--primary) / ${glowOpacity}) 0%, transparent 70%)`,
        }}
      />

      <div className="relative space-y-4">
        {/* Header with live pulse indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div
            className="h-2 w-2 rounded-full bg-primary transition-all duration-500"
            style={{
              opacity: 0.4 + intensity * pulse * 0.6,
              boxShadow: `0 0 ${4 + intensity * pulse * 12}px hsl(var(--primary) / ${0.3 + intensity * 0.4})`,
            }}
          />
          <span className="font-mono text-xs tracking-wider uppercase transition-colors duration-500">
            {isProcessing ? 'Intelligence Processing' : isReady ? 'Blueprint Ready' : 'Intelligence Scanning'}
          </span>
        </div>

        <h3 className="text-xl font-serif transition-all duration-500">
          {notes.length > 0 ? 'Your Strategic Blueprint' : 'Strategic Blueprint'}
        </h3>

        {/* Steps — sourced from real notes when available */}
        <div className="space-y-2.5">
          {steps.map((step, i) => {
            const isActive = i === activeStep;
            const isDone = i < activeStep;
            const StepIcon = step.icon;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-3 glass rounded-lg px-4 py-3 text-sm",
                  "transition-all duration-700 ease-out",
                  isActive && isProcessing && "ai-pulse-border",
                  isActive && !isProcessing && "border-primary/20",
                  isDone && isReady && "border-primary/10"
                )}
                style={{
                  opacity: isDone || isActive ? 1 : 0.4 + intensity * 0.15,
                  transform: isActive
                    ? `translateX(${4 + intensity * 4}px)`
                    : 'translateX(0)',
                }}
              >
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium",
                    "transition-all duration-500",
                    isDone
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? '✓' : <StepIcon className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "transition-colors duration-500",
                    isDone || isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                  {step.body && isActive && (
                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5 transition-opacity duration-500">
                      {step.body}
                    </p>
                  )}
                </div>
                {isActive && (
                  <span className={cn(
                    "ml-auto text-xs font-mono whitespace-nowrap",
                    isProcessing
                      ? "text-primary animate-pulse"
                      : "text-muted-foreground"
                  )}>
                    {isProcessing ? 'synthesizing…' : isReady ? 'complete' : 'analyzing…'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
