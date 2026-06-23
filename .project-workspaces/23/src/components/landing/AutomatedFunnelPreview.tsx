import { useEffect, useState } from 'react';
import { Mail, Sparkles, Film, ArrowRight } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { cn } from '@/lib/utils';

/**
 * AutomatedFunnelPreview — visualizes the Lead → Kinetic Video conversion.
 *
 * Three-stage cinematic loop:
 *   1. Lead arrives (email pulses into capture)
 *   2. MarQ processes (gold signal threads weave)
 *   3. Kinetic video renders (Obsidian frame with animated typography)
 *
 * Pure CSS/SVG, autoplays, respects reduced-motion.
 */

const STAGE_MS = 2400;
const STAGES = ['capture', 'process', 'render'] as const;
type Stage = typeof STAGES[number];

const KINETIC_LINES = [
  { kicker: 'For', word: 'Sarah', accent: '— founder, FinTech' },
  { kicker: 'Your', word: 'Edge', accent: 'is automation.' },
  { kicker: 'Book', word: 'Today', accent: '→ 15-min demo' },
] as const;

export function AutomatedFunnelPreview() {
  const [stage, setStage] = useState<Stage>('capture');
  const [kineticIdx, setKineticIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduceMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => {
      setStage((s) => STAGES[(STAGES.indexOf(s) + 1) % STAGES.length]);
    }, STAGE_MS);
    return () => clearInterval(id);
  }, [reduceMotion]);

  useEffect(() => {
    if (reduceMotion || stage !== 'render') return;
    const id = setInterval(() => setKineticIdx((i) => (i + 1) % KINETIC_LINES.length), 800);
    return () => clearInterval(id);
  }, [stage, reduceMotion]);

  const isCapture = stage === 'capture';
  const isProcess = stage === 'process';
  const isRender = stage === 'render';

  return (
    <section
      id="funnel-preview"
      className="relative px-5 sm:px-6 lg:px-12 py-16 sm:py-24 scroll-mt-20 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, transparent 0%, hsl(var(--background)) 30%, hsl(var(--background)) 70%, transparent 100%)' }}
    >
      {/* Obsidian glow accents */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none animate-float"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)', filter: 'blur(80px)' }}
      />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full pointer-events-none animate-float"
        style={{ background: 'radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)', filter: 'blur(60px)', animationDelay: '2s' }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-[10px] sm:text-xs font-medium tracking-[0.22em] uppercase mb-5"
              style={{ color: '#C9A84C', borderColor: 'rgba(201,168,76,0.25)' }}
            >
              <Sparkles className="w-3 h-3 mr-2" />
              Lead → Video, Automated
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-serif leading-[1.1] [text-wrap:balance]">
              One email in.{' '}
              <span className="italic" style={{ color: '#C9A84C' }}>A cinema-grade pitch out.</span>
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl mx-auto text-sm sm:text-base [text-wrap:balance]">
              The moment a lead enters their info, MarQ drafts a personalized Obsidian & Gold kinetic video — automatically.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 sm:gap-6">
            {/* STAGE 1 — Lead capture */}
            <StageCard
              active={isCapture}
              label="01 · Lead arrives"
              caption="Email captured on your funnel"
            >
              <div className="relative h-32 flex items-center justify-center">
                <div
                  className={cn(
                    'glass rounded-xl px-4 py-3 flex items-center gap-3 border transition-all duration-700',
                    isCapture ? 'scale-100 opacity-100' : 'scale-95 opacity-50'
                  )}
                  style={{ borderColor: isCapture ? 'rgba(201,168,76,0.4)' : 'hsl(var(--border) / 0.3)' }}
                >
                  <Mail className="h-4 w-4" style={{ color: '#C9A84C' }} />
                  <div className="text-left">
                    <div className="text-[11px] sm:text-xs font-mono text-foreground">sarah@fintech.io</div>
                    <div className="text-[9px] sm:text-[10px] text-muted-foreground/70 uppercase tracking-wider">Just opted in</div>
                  </div>
                  {isCapture && (
                    <span className="ml-1 h-2 w-2 rounded-full animate-pulse-glow" style={{ background: '#C9A84C', boxShadow: '0 0 12px rgba(201,168,76,0.8)' }} />
                  )}
                </div>
              </div>
            </StageCard>

            <FlowConnector active={!isCapture} />

            {/* STAGE 2 — MarQ processes */}
            <StageCard
              active={isProcess}
              label="02 · MarQ weaves signals"
              caption="Brand · Hook · Voice"
            >
              <div className="relative h-32 flex items-center justify-center">
                <svg viewBox="0 0 160 100" className="w-full h-full max-w-[200px]" aria-hidden>
                  <defs>
                    <linearGradient id="goldThread" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.2" />
                      <stop offset="50%" stopColor="#F0D78C" stopOpacity="1" />
                      <stop offset="100%" stopColor="#C9A84C" stopOpacity="0.2" />
                    </linearGradient>
                  </defs>
                  {/* Three weaving signal lines */}
                  {[0, 1, 2].map((i) => (
                    <path
                      key={i}
                      d={`M 10 ${30 + i * 20} Q 80 ${i % 2 === 0 ? 10 : 90} 150 ${30 + i * 20}`}
                      fill="none"
                      stroke="url(#goldThread)"
                      strokeWidth="1.5"
                      strokeDasharray="200"
                      style={{
                        strokeDashoffset: isProcess ? 0 : 200,
                        transition: 'stroke-dashoffset 1.4s ease-out',
                        transitionDelay: `${i * 0.15}s`,
                        opacity: isProcess ? 1 : 0.2,
                      }}
                    />
                  ))}
                  {/* Center node */}
                  <circle
                    cx="80"
                    cy="50"
                    r={isProcess ? 6 : 3}
                    fill="#C9A84C"
                    style={{
                      transition: 'all 0.6s ease-out',
                      filter: isProcess ? 'drop-shadow(0 0 8px #C9A84C)' : 'none',
                    }}
                  />
                </svg>
              </div>
            </StageCard>

            <FlowConnector active={isRender} />

            {/* STAGE 3 — Kinetic video output */}
            <StageCard
              active={isRender}
              label="03 · Cinema delivered"
              caption="Personalized kinetic video"
            >
              <div className="relative h-32 flex items-center justify-center">
                <div
                  className={cn(
                    'relative aspect-video w-full max-w-[200px] rounded-lg border overflow-hidden transition-all duration-700',
                    isRender ? 'scale-100 opacity-100' : 'scale-95 opacity-50'
                  )}
                  style={{
                    background: 'linear-gradient(135deg, #0E1612 0%, #1a1a1a 100%)',
                    borderColor: isRender ? 'rgba(201,168,76,0.5)' : 'hsl(var(--border) / 0.3)',
                    boxShadow: isRender ? '0 0 30px rgba(201,168,76,0.2)' : 'none',
                  }}
                >
                  {/* Film corner mark */}
                  <Film className="absolute top-1.5 right-1.5 h-3 w-3" style={{ color: 'rgba(201,168,76,0.5)' }} />

                  {/* Kinetic typography */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-3">
                    <div className="text-[8px] uppercase tracking-[0.3em] mb-1" style={{ color: 'rgba(201,168,76,0.7)' }}>
                      {KINETIC_LINES[kineticIdx].kicker}
                    </div>
                    <div
                      key={kineticIdx}
                      className="font-serif italic text-base sm:text-lg leading-tight animate-fade-in"
                      style={{ color: '#F4EFE6' }}
                    >
                      {KINETIC_LINES[kineticIdx].word}
                    </div>
                    <div className="text-[8px] mt-1 text-center" style={{ color: 'rgba(244,239,230,0.5)' }}>
                      {KINETIC_LINES[kineticIdx].accent}
                    </div>
                  </div>

                  {/* Scanline */}
                  {isRender && (
                    <div
                      className="absolute inset-x-0 h-px opacity-40"
                      style={{
                        background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)',
                        animation: 'scanline 2s linear infinite',
                        top: '50%',
                      }}
                    />
                  )}
                </div>
              </div>
            </StageCard>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={300}>
          <p className="text-center text-[11px] sm:text-xs text-muted-foreground/60 mt-10 uppercase tracking-[0.22em] font-medium">
            Capture <span className="mx-1.5" style={{ color: '#C9A84C' }}>→</span> Synthesize <span className="mx-1.5" style={{ color: '#C9A84C' }}>→</span> Deploy · Under 60 seconds
          </p>
        </ScrollReveal>
      </div>

      <style>{`
        @keyframes scanline {
          0% { top: 10%; opacity: 0; }
          50% { opacity: 0.6; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </section>
  );
}

function StageCard({
  active,
  label,
  caption,
  children,
}: {
  active: boolean;
  label: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-5 sm:p-6 transition-all duration-500 border',
        active ? 'scale-[1.02]' : 'scale-100'
      )}
      style={{
        borderColor: active ? 'rgba(201,168,76,0.35)' : 'hsl(var(--border) / 0.3)',
        boxShadow: active ? '0 0 40px rgba(201,168,76,0.12)' : 'none',
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.22em] font-medium mb-1"
        style={{ color: active ? '#C9A84C' : 'hsl(var(--muted-foreground))' }}
      >
        {label}
      </div>
      <div className="text-xs text-muted-foreground/80 mb-4">{caption}</div>
      {children}
    </div>
  );
}

function FlowConnector({ active }: { active: boolean }) {
  return (
    <div className="hidden lg:flex items-center justify-center px-1">
      <ArrowRight
        className="h-5 w-5 transition-all duration-500"
        style={{
          color: active ? '#C9A84C' : 'hsl(var(--muted-foreground) / 0.4)',
          filter: active ? 'drop-shadow(0 0 6px rgba(201,168,76,0.6))' : 'none',
        }}
      />
    </div>
  );
}
