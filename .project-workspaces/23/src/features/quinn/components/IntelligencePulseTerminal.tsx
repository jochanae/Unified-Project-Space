import { useIntelligenceState, IntelligencePhase } from '@/features/quinn';
import { Brain, Sparkles, Activity, CheckCircle } from 'lucide-react';
import { useEffect, useState, useMemo, useRef } from 'react';
import { StreamPhase } from '@/features/quinn';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

const TYPEWRITER_LINES: Record<IntelligencePhase, string[]> = {
  dormant: [
    'Mapping strategic pathways…',
    'Scanning for conversion opportunities…',
    'Ready to architect your next asset.',
  ],
  listening: [
    'Capturing your intent…',
    'Building context from your signal…',
    'Preparing the synthesis engine…',
  ],
  processing: [
    'Assembling funnel architecture…',
    'Cross-referencing your notes for strategy…',
    'Generating high-conversion blueprint…',
  ],
  ready: [
    'Your blueprint is ready for deployment.',
    'All systems aligned. Launch when ready.',
    'Intelligence applied. Review your assets below.',
  ],
};

const PHASE_ICONS: Record<IntelligencePhase, typeof Brain> = {
  dormant: Brain,
  listening: Activity,
  processing: Sparkles,
  ready: CheckCircle,
};

/** Personalized greeting shown once per session */
function QuinnGreeting({ name }: { name: string }) {
  const [displayed, setDisplayed] = useState('');
  const [visible, setVisible] = useState(true);
  const firstName = name.split('@')[0].split('.')[0];
  const capitalised = firstName.charAt(0).toUpperCase() + firstName.slice(1);

  const greetings = useMemo(() => [
    `Welcome back, ${capitalised}. Your blueprints are waiting.`,
    `Good to see you, ${capitalised}. Let's build something today.`,
    `${capitalised} — MarQ is ready when you are.`,
  ], [capitalised]);

  const line = useMemo(() => greetings[Math.floor(Math.random() * greetings.length)], [greetings]);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(line.slice(0, i));
      if (i >= line.length) clearInterval(iv);
    }, 28);
    return () => clearInterval(iv);
  }, [line]);

  // Auto-fade after 5s
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className={cn(
      'fixed top-20 left-1/2 -translate-x-1/2 w-max max-w-sm z-[9999]',
      'px-4 py-2 rounded-xl bg-card/80 backdrop-blur-xl border border-primary/15 shadow-lg',
      'transition-all duration-1000',
      !visible && 'opacity-0 translate-y-2 pointer-events-none'
    )}>
      <p className="text-sm text-primary/90 font-serif italic">
        {displayed}<span className="animate-pulse text-primary">|</span>
      </p>
    </div>
  );
}

interface IntelligencePulseTerminalProps {
  streamPhase?: StreamPhase;
  onActionClick?: () => void;
}

export function IntelligencePulseTerminal({ streamPhase = 'idle', onActionClick }: IntelligencePulseTerminalProps) {
  const { pulse, statusText, phase, intensity } = useIntelligenceState(streamPhase);
  const [typedText, setTypedText] = useState('');
  const [lineIndex, setLineIndex] = useState(0);
  const { user } = useCurrentUser();
  const [showGreeting, setShowGreeting] = useState(false);
  const greetingShownRef = useRef(false);

  // Show greeting once after login
  useEffect(() => {
    if (user && !greetingShownRef.current && phase === 'dormant') {
      greetingShownRef.current = true;
      const t = setTimeout(() => setShowGreeting(true), 600);
      return () => clearTimeout(t);
    }
  }, [user, phase]);

  const lines = useMemo(() => TYPEWRITER_LINES[phase], [phase]);
  const PhaseIcon = PHASE_ICONS[phase];

  // Typewriter cycle
  useEffect(() => {
    const line = lines[lineIndex % lines.length];
    let charIndex = 0;
    setTypedText('');

    const speed = phase === 'processing' ? 30 : 45;
    const typeInterval = setInterval(() => {
      if (charIndex <= line.length) {
        setTypedText(line.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typeInterval);
        setTimeout(() => {
          setLineIndex((p) => p + 1);
        }, phase === 'processing' ? 1500 : 2500);
      }
    }, speed);

    return () => clearInterval(typeInterval);
  }, [lineIndex, lines, phase]);

  // Reset typewriter on phase change
  useEffect(() => {
    setLineIndex(0);
  }, [phase]);

  const glowOpacity = 0.2 + intensity * pulse * 0.6;
  const ringScale = 0.95 + pulse * intensity * 0.12;
  const orbShadow = `0 0 ${12 + intensity * pulse * 30}px hsl(var(--primary) / ${0.2 + intensity * 0.4})`;

  // Haptic micro-kick: a quick scale bump synced to the pulse peak
  const hapticKick = pulse > 0.92 ? 1.04 : 1;

  return (
    <div className="flex items-center justify-center h-full p-4 sm:p-8 mesh-gradient">
      <div className={cn(
        "relative z-10 flex flex-col items-center max-w-lg text-center",
        "transition-all duration-1000 ease-out"
      )}>
        {/* Personalized greeting */}
        {showGreeting && user && (
          <QuinnGreeting name={user.email} />
        )}

        {/* Outer glow ring */}
        <div
          className="relative mb-4 sm:mb-6 transition-transform duration-700 ease-out"
          style={{ transform: `scale(${ringScale})` }}
        >
          {/* Glow halo */}
          <div
            className="absolute inset-0 rounded-full blur-2xl transition-all duration-1000"
            style={{
              background: `radial-gradient(circle, hsl(var(--primary) / ${glowOpacity}) 0%, transparent 70%)`,
              width: `${100 + intensity * 40}px`,
              height: `${100 + intensity * 40}px`,
              top: `${-10 - intensity * 10}px`,
              left: `${-10 - intensity * 10}px`,
            }}
          />

          {/* Orbiting particle ring — visible during processing */}
          {phase === 'processing' && (
            <>
              <div className="absolute inset-[-18px] rounded-full animate-[orb-ring-spin_4s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary/70 shadow-[0_0_6px_hsl(var(--primary)/0.6)]" />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-primary/40 shadow-[0_0_4px_hsl(var(--primary)/0.3)]" />
              </div>
              <div className="absolute inset-[-26px] rounded-full animate-[orb-ring-spin_6s_linear_infinite_reverse]">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 h-1 w-1 rounded-full bg-primary/50 shadow-[0_0_5px_hsl(var(--primary)/0.4)]" />
                <div className="absolute top-0 right-1/4 h-0.5 w-0.5 rounded-full bg-primary/30" />
                <div className="absolute bottom-1/4 right-0 h-0.5 w-0.5 rounded-full bg-primary/25" />
              </div>
            </>
          )}

          {/* Core orb with haptic micro-kick */}
          <div
            className={cn(
              "glass rounded-full h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center relative overflow-hidden",
              "transition-all duration-150 ease-out",
              phase === 'processing' && 'ai-pulse-border orb-shimmer',
              phase === 'ready' && 'border-primary/50'
            )}
            style={{
              boxShadow: orbShadow,
              transform: `scale(${hapticKick})`,
            }}
          >
            {/* Inner radial gradient */}
            <div
              className="absolute inset-0 transition-all duration-1000"
              style={{
                background: `radial-gradient(circle at 50% 50%, hsl(var(--primary) / ${0.05 + intensity * pulse * 0.15}) 0%, transparent 70%)`,
              }}
            />

            {/* Haptic ripple ring — fast expand-fade on pulse peak */}
            <div
              className="absolute inset-0 rounded-full border border-primary/30 transition-all duration-200 ease-out"
              style={{
                transform: `scale(${pulse > 0.9 ? 1.25 : 1})`,
                opacity: pulse > 0.9 ? 0 : 0.3,
              }}
            />

            <PhaseIcon
              className={cn(
                "h-8 w-8 text-primary relative z-10 transition-all duration-500",
                phase === 'processing' && 'animate-pulse'
              )}
              style={{ opacity: 0.6 + intensity * 0.4 }}
            />
          </div>
        </div>

        {/* Phase label */}
        <h2 className="text-lg sm:text-xl font-serif mb-2 flex items-center gap-2 transition-all duration-500">
          <Sparkles
            className="h-4 w-4 text-primary transition-opacity duration-500"
            style={{ opacity: 0.3 + intensity * 0.7 }}
          />
          <span className="transition-all duration-500">
            {phase === 'dormant' && 'Intelligence Active'}
            {phase === 'listening' && 'Signal Received'}
            {phase === 'processing' && 'Synthesizing Blueprint'}
            {phase === 'ready' && 'Blueprint Complete'}
          </span>
        </h2>

        {/* Typewriter line */}
        <div className={cn(
          "glass rounded-xl px-6 py-4 min-h-[60px] flex items-center justify-center w-full max-w-sm",
          "transition-all duration-700",
          phase === 'processing' && 'border-primary/30'
        )}>
          <p className="text-muted-foreground text-sm font-mono">
            {typedText}
            <span className="text-primary animate-pulse">▍</span>
          </p>
        </div>

        {/* Status badge */}
        <div className={cn(
          "mt-4 px-3 py-1 rounded-full text-xs font-mono tracking-wide uppercase",
          "transition-all duration-700",
          phase === 'dormant' && 'bg-muted/50 text-muted-foreground/60',
          phase === 'listening' && 'bg-primary/10 text-primary/80',
          phase === 'processing' && 'bg-primary/20 text-primary ai-pulse-border',
          phase === 'ready' && 'bg-primary/15 text-primary/90',
        )}>
          {statusText}
        </div>

        {phase === 'dormant' && (
          <button
            onClick={onActionClick}
            className="mt-5 px-5 py-2.5 rounded-xl bg-primary/10 text-primary text-sm font-medium tracking-wide transition-all hover:bg-primary/20 hover:scale-[1.02] active:scale-95 border border-primary/20"
          >
            Create your first project
          </button>
        )}
      </div>
    </div>
  );
}
