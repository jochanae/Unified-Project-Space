import { useState, useEffect } from 'react';
import { Sparkles, Layers, Cpu, ChevronRight, Lock, Info, X, ArrowRight } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const COACHMARK_KEY = 'intoiq_depths_coachmark_seen';

type Layer = 'semantic' | 'structural' | 'systemic';

const LAYERS: Array<{
  id: Layer;
  index: string;
  label: string;
  focus: string;
  icon: typeof Sparkles;
  accent: string;
  dot: string;
  control: string;
  bestFor: string;
  hint: string;
  status?: 'live' | 'soon';
}> = [
  {
    id: 'semantic',
    index: '01',
    label: 'Semantic Surface',
    focus: 'The vibe & the voice',
    icon: Sparkles,
    accent: 'from-emerald-500/15 to-transparent',
    dot: 'bg-emerald-400',
    control: 'Tap Refine to swap a headline, retune the tone, or shift the visual.',
    bestFor: 'Quick deployments. Daily social updates.',
    hint: 'Start here when you want fast, low-stakes edits — copy tweaks and tone shifts that ship in seconds.',
    status: 'live',
  },
  {
    id: 'structural',
    index: '02',
    label: 'Structural Strategy',
    focus: 'The narrative & the flow',
    icon: Layers,
    accent: 'from-primary/20 to-transparent',
    dot: 'bg-primary',
    control: 'See your 7-day arc as a storyboard. Reorder days — MarQ rewires the connective tissue.',
    bestFor: 'Book launches, course drops, complex offers.',
    hint: 'Move here when the message is right but the sequence is off — MarQ rebuilds connective tissue.',
    status: 'live',
  },
  {
    id: 'systemic',
    index: '03',
    label: 'Systemic Logic',
    focus: 'The hood & the engine',
    icon: Cpu,
    accent: 'from-amber-500/15 to-transparent',
    dot: 'bg-amber-400',
    control: 'Inspect the raw Strategy JSON. Override directives, retarget personas, wire custom triggers.',
    bestFor: 'High ad-spend operators. Power users.',
    hint: 'Drop here only when surface + structure feel locked — this is the engine room, not a starting point.',
    status: 'soon',
  },
];

export function ThreeDepthsOfControl() {
  const [active, setActive] = useState<Layer>('structural');
  const [showCoachmark, setShowCoachmark] = useState(false);
  const [coachStep, setCoachStep] = useState(0);
  const current = LAYERS.find((l) => l.id === active)!;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(COACHMARK_KEY)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setTimeout(() => setShowCoachmark(true), 600);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    const el = document.getElementById('control');
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const dismissCoachmark = () => {
    localStorage.setItem(COACHMARK_KEY, '1');
    setShowCoachmark(false);
  };

  const advanceCoachmark = () => {
    if (coachStep < 2) {
      const next = coachStep + 1;
      setCoachStep(next);
      setActive((['semantic', 'structural', 'systemic'] as Layer[])[next]);
    } else {
      dismissCoachmark();
    }
  };

  const COACH_STEPS = [
    {
      title: 'Start at the Surface',
      body: "Tap a headline, swap a tone, ship in seconds. This is where most days begin — fast, low-stakes refinements.",
    },
    {
      title: 'Move to Structure',
      body: "When the words are right but the sequence is off, restructure the 7-day arc. MarQ rewires the connective tissue around your edits.",
    },
    {
      title: 'Drop to the Engine',
      body: "Only when surface + structure feel locked — override Strategy JSON, retarget personas, wire custom triggers. This is the engine room, not a starting point.",
    },
  ];


  return (
    <section
      id="control"
      className="relative px-5 sm:px-6 lg:px-12 py-16 sm:py-24 scroll-mt-20"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        {showCoachmark && (
          <div
            className="fixed inset-x-4 bottom-6 sm:bottom-8 sm:left-auto sm:right-8 sm:max-w-sm z-50 glass rounded-2xl p-5 border border-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.25)] animate-in fade-in slide-in-from-bottom-4 duration-500"
            role="dialog"
            aria-label="Three depths walkthrough"
          >
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] uppercase tracking-[0.22em] text-primary/80 font-mono">
                    MarQ · Step {coachStep + 1}/3
                  </span>
                  <button
                    onClick={dismissCoachmark}
                    className="text-muted-foreground/60 hover:text-foreground transition-colors"
                    aria-label="Dismiss walkthrough"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h4 className="text-sm font-medium mb-1.5">{COACH_STEPS[coachStep].title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {COACH_STEPS[coachStep].body}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          i <= coachStep ? 'bg-primary' : 'bg-muted'
                        )}
                      />
                    ))}
                  </div>
                  <button
                    onClick={advanceCoachmark}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    {coachStep < 2 ? 'Next' : 'Got it'}
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-14">
            <div className="flex items-center justify-center gap-2 mb-5">
              <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-[10px] sm:text-xs text-primary font-medium tracking-[0.22em] uppercase">
                <Layers className="w-3 h-3 mr-2" />
                The Digital Lens
              </span>
              <span className="inline-flex items-center rounded-full border border-border/40 bg-muted/30 px-2.5 py-1 text-[9px] sm:text-[10px] text-muted-foreground font-mono tracking-[0.18em] uppercase">
                Preview
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-serif leading-[1.1] mb-4 [text-wrap:balance]">
              Three depths of{' '}
              <span className="gradient-text italic">control</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto [text-wrap:balance]">
              Most AI tools are a black box — you take what you're given. IntoIQ is a telescoping
              workspace. Engage as much, or as little, as you want.
            </p>
          </div>
        </ScrollReveal>

        {/* Layer selector */}
        <ScrollReveal delay={150}>
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
              {LAYERS.map((layer) => {
                const Icon = layer.icon;
                const isActive = layer.id === active;
                return (
                  <button
                    key={layer.id}
                    onClick={() => setActive(layer.id)}
                    className={cn(
                      'group glass rounded-2xl p-4 sm:p-5 text-left transition-all duration-300 relative overflow-hidden',
                      isActive
                        ? 'border-primary/40 shadow-[0_0_32px_hsl(var(--primary)/0.18)] scale-[1.01]'
                        : 'border-border/30 hover:border-border/60 opacity-70 hover:opacity-100',
                    )}
                  >
                    <div
                      className={cn(
                        'absolute inset-0 bg-gradient-to-br opacity-60 pointer-events-none',
                        layer.accent,
                      )}
                    />
                    <div className="relative flex items-start gap-3">
                      <div
                        className={cn(
                          'h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border',
                          isActive
                            ? 'bg-primary/15 border-primary/30 text-primary'
                            : 'bg-muted/40 border-border/40 text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/70 font-mono">
                            {layer.index}
                          </span>
                          <span className={cn('h-1.5 w-1.5 rounded-full', layer.dot)} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                onClick={(e) => e.stopPropagation()}
                                className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground/70 hover:text-foreground transition-colors cursor-help"
                                aria-label={`Why ${layer.label}?`}
                              >
                                <Info className="h-3 w-3" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[240px] text-xs leading-relaxed">
                              {layer.hint}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <h3 className="text-sm sm:text-base font-medium leading-tight mb-1">
                          {layer.label}
                        </h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground italic">
                          {layer.focus}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </TooltipProvider>
        </ScrollReveal>

        {/* Active layer detail */}
        <ScrollReveal delay={250}>
          <div className="glass rounded-2xl p-5 sm:p-8 relative overflow-hidden">
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-50 pointer-events-none',
                current.accent,
              )}
            />
            <div className="relative grid sm:grid-cols-[auto_1fr] gap-5 sm:gap-7 items-start">
              <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-2">
                <span className="font-serif text-4xl sm:text-6xl gradient-text italic leading-none">
                  {current.index}
                </span>
                {current.status === 'soon' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-amber-400/90 font-medium border border-amber-400/30 rounded-full px-2 py-0.5">
                    <Lock className="h-2.5 w-2.5" /> Power mode soon
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-emerald-400/90 font-medium border border-emerald-400/30 rounded-full px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live now
                  </span>
                )}
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl sm:text-2xl font-serif mb-1">{current.label}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground italic">
                    {current.focus}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <ChevronRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-sm sm:text-base text-foreground/90 leading-relaxed">
                      {current.control}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" />
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      <span className="text-muted-foreground/60 uppercase tracking-widest text-[10px] mr-2">
                        Best for
                      </span>
                      {current.bestFor}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={350}>
          <p className="text-center text-[11px] sm:text-xs text-muted-foreground/60 mt-6 uppercase tracking-[0.22em]">
            MarQ provides the map <span className="text-primary/60 mx-1.5">·</span> You own the steering wheel
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
