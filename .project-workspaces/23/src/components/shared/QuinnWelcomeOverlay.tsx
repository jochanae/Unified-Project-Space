import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Radar, Palette, Megaphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { cn } from '@/lib/utils';

const GHOST_TEXTS = [
  'e.g., A premium coaching program for first-time founders...',
  'e.g., A 30-day fitness challenge for busy professionals...',
  'e.g., An AI-powered financial wellness platform...',
];

type Phase = 'loading' | 'entrance' | 'typing' | 'trinity' | 'input' | 'nudge';

const TRINITY = [
  { key: 'signal', label: 'Strategize', sub: 'Signal Lab', route: '/signal-lab', Icon: Radar, copy: 'Sharpen the hook before you build.' },
  { key: 'studio', label: 'Brand', sub: 'Studio Vault', route: '/studio', Icon: Palette, copy: 'Lock your colors, logos, and tone.' },
  { key: 'social', label: 'Distribute', sub: 'Social Lab', route: '/studio?tab=social', Icon: Megaphone, copy: 'Turn your signal into shareable posts.' },
] as const;

export function QuinnWelcomeOverlay() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user?.id;

  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>('loading');
  const [typedText, setTypedText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [ghostIndex] = useState(() => Math.floor(Math.random() * GHOST_TEXTS.length));
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const INTRO_TEXT = "Welcome. I'm MarQ. IntoIQ is a Marketing Suite — three rooms, one outcome. Pick your entry point, or just tell me the idea.";

  // Check onboarding status
  useEffect(() => {
    if (!userId) return;

    supabase
      .from('users')
      .select('has_completed_onboarding')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data && !data.has_completed_onboarding) {
          setShow(true);
          setTimeout(() => setPhase('entrance'), 200);
          setTimeout(() => setPhase('typing'), 1000);
        }
      });
  }, [userId]);

  // Typewriter — then reveal Trinity, then input
  useEffect(() => {
    if (phase !== 'typing') return;

    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTypedText(INTRO_TEXT.slice(0, i));
      if (i >= INTRO_TEXT.length) {
        clearInterval(interval);
        setTimeout(() => setPhase('trinity'), 350);
        setTimeout(() => {
          setPhase('input');
          setTimeout(() => inputRef.current?.focus(), 300);
        }, 1400);
      }
    }, 28);

    return () => clearInterval(interval);
  }, [phase]);

  // Idle nudge timer
  useEffect(() => {
    if (phase !== 'input') return;
    idleTimerRef.current = setTimeout(() => setPhase('nudge'), 10000);
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
  }, [phase, inputValue]);

  const handleInputChange = useCallback((val: string) => {
    setInputValue(val);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (phase === 'nudge') setPhase('input');
    idleTimerRef.current = setTimeout(() => {
      if (phase === 'input' || phase === 'nudge') setPhase('nudge');
    }, 10000);
  }, [phase]);

  const completeOnboarding = useCallback(async () => {
    if (!userId) return;
    await supabase
      .from('users')
      .update({ has_completed_onboarding: true } as any)
      .eq('id', userId);
  }, [userId]);

  const handleSubmit = useCallback(async () => {
    await completeOnboarding();
    setShow(false);
    if (inputValue.trim()) {
      navigate('/workspace', { state: { prompt: inputValue.trim() } });
    } else {
      navigate('/signal-lab');
    }
  }, [completeOnboarding, inputValue, navigate]);

  const handleSkip = useCallback(async () => {
    await completeOnboarding();
    setShow(false);
    navigate('/dashboard');
  }, [completeOnboarding, navigate]);

  const handleTrinityPick = useCallback(async (route: string) => {
    await completeOnboarding();
    setShow(false);
    navigate(route);
  }, [completeOnboarding, navigate]);

  if (!show) return null;

  const trinityVisible = phase === 'trinity' || phase === 'input' || phase === 'nudge';
  const inputVisible = phase === 'input' || phase === 'nudge';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto py-10">
      {/* Deep obsidian backdrop */}
      <div
        className={cn(
          "absolute inset-0 transition-all duration-1000",
          phase !== 'loading' ? 'opacity-100' : 'opacity-0'
        )}
        style={{ backgroundColor: 'hsl(var(--background))' }}
      />

      {/* Gold pulse orb */}
      <div
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-1500",
          phase !== 'loading' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
        )}
        style={{
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 65%)',
          animation: phase !== 'loading' ? 'quinn-pulse 4s ease-in-out infinite' : 'none',
        }}
      />

      {/* Content container */}
      <div className="relative z-10 w-full max-w-2xl mx-auto px-6 text-center">
        {/* MarQ presence indicator */}
        <div
          className={cn(
            "mx-auto mb-7 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-700",
            phase !== 'loading' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'
          )}
          style={{
            background: 'hsl(var(--primary) / 0.1)',
            border: '1px solid hsl(var(--primary) / 0.3)',
            boxShadow: '0 0 40px hsl(var(--primary) / 0.2)',
          }}
        >
          <Sparkles className="h-7 w-7 text-primary" style={{ filter: 'drop-shadow(0 0 8px hsl(var(--primary) / 0.5))' }} />
        </div>

        {/* Typewriter text */}
        <div
          className={cn(
            "mb-8 min-h-[80px] transition-opacity duration-500",
            phase === 'loading' ? 'opacity-0' : 'opacity-100'
          )}
        >
          <p
            className="text-base sm:text-lg text-foreground leading-relaxed [text-wrap:balance]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {typedText}
            {phase === 'typing' && (
              <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-pulse" />
            )}
          </p>
        </div>

        {/* Trinity — Strategize / Brand / Produce */}
        <div
          className={cn(
            "grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 transition-all duration-700",
            trinityVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
          )}
        >
          {TRINITY.map(({ key, label, sub, route, Icon, copy }, i) => (
            <button
              key={key}
              onClick={() => handleTrinityPick(route)}
              className="group relative rounded-2xl border border-border/40 bg-card/40 backdrop-blur-sm p-4 text-left transition-all hover:border-primary/50 hover:bg-card/60 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)] active:scale-[0.98]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-primary/80">{label}</span>
              </div>
              <p className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-heading)' }}>
                {sub}
              </p>
              <p className="mt-1 text-xs text-muted-foreground leading-snug">{copy}</p>
            </button>
          ))}
        </div>

        {/* Input area */}
        <div
          className={cn(
            "transition-all duration-700",
            inputVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          )}
        >
          <label
            className="block text-xs text-muted-foreground mb-3 uppercase tracking-[0.2em]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Or just tell me the idea
          </label>

          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={GHOST_TEXTS[ghostIndex]}
              rows={3}
              className="w-full rounded-2xl border border-border/30 bg-card/40 px-4 py-3 text-foreground placeholder:text-muted-foreground/30 text-base resize-none backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
            />

            <button
              onClick={handleSubmit}
              disabled={!inputValue.trim()}
              className={cn(
                "absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-xl transition-all",
                inputValue.trim()
                  ? 'bg-primary text-primary-foreground shadow-lg hover:shadow-xl active:scale-95'
                  : 'bg-muted/50 text-muted-foreground'
              )}
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {phase === 'nudge' && (
            <p className="mt-4 text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-2 duration-500" style={{ fontFamily: 'var(--font-heading)' }}>
              Just give me the raw idea. I'll handle the positioning, the audience, and the architecture.
            </p>
          )}

          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={handleSkip}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Skip — take me to the Dashboard
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes quinn-pulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.15; }
          50% { transform: translate(-50%, -50%) scale(1.08); opacity: 0.25; }
        }
      `}</style>
    </div>
  );
}
