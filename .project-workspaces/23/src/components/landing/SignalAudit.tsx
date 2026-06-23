import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollReveal } from '@/components/ui/scroll-reveal';
import { ArrowRight, Sparkles, Loader2, Compass, Target, Zap, GitBranch, Lock, Mail, Terminal } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AuditStage = 'signal' | 'positioning' | 'void' | 'hook' | 'funnel' | 'next';
type AuditMap = Partial<Record<AuditStage, string>>;

const STAGE_ORDER: AuditStage[] = ['signal', 'positioning', 'void', 'hook', 'funnel', 'next'];

const STAGE_META: Record<AuditStage, { label: string; icon: typeof Compass; eyebrow: string }> = {
  signal: { label: 'The Identified Signal', icon: Compass, eyebrow: 'Resonance' },
  positioning: { label: 'Why The Market Wants It', icon: Target, eyebrow: 'Positioning' },
  void: { label: 'The Missing Link', icon: Zap, eyebrow: 'Competitive Void' },
  hook: { label: 'Day 1 Social Hook', icon: Sparkles, eyebrow: 'First Move' },
  funnel: { label: '3-Step Funnel Sketch', icon: GitBranch, eyebrow: 'Architecture' },
  next: { label: 'What Unlocks Next', icon: Lock, eyebrow: 'The Full Map' },
};

// "Clinical Architect" throttle copy
const THROTTLE_PHASES: { from: number; label: string; to: number }[] = [
  { from: 0, to: 25, label: 'INITIALIZING SEMANTIC PARSING…' },
  { from: 25, to: 45, label: 'IDENTIFYING COMPETITIVE MARKET VOIDS…' },
  { from: 45, to: 80, label: 'SYNTHESIZING NARRATIVE TRAJECTORY…' },
  { from: 80, to: 100, label: 'SIGNAL ARCHITECTURE LOCKED.' },
];
const THROTTLE_MS = 30_000;
const THROTTLE_KEY = 'intoiq_audit_last_run';
// Simulated diagnostic log for "under the hood" feel
const LOG_LINES = [
  '[0.01s] accessing project_context...',
  '[0.05s] tokenizing vision string...',
  '[0.12s] mapping semantic distance: [concept] → [market_gap]',
  '[0.34s] running similarity scan against 14k niches...',
  '[0.45s] calculating missing_link_probability...',
  '[0.71s] aligning with funnel topology...',
  '[0.89s] identifying narrative outlier nodes...',
  '[1.04s] cross-referencing identity directives...',
  '[1.22s] composing day-1 hook variants...',
  '[1.41s] locking signal architecture...',
];

function parseStream(buffer: string): AuditMap {
  const out: AuditMap = {};
  const regex = /###STAGE:(signal|positioning|void|hook|funnel|next)###\s*([\s\S]*?)(?=###STAGE:|$)/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(buffer)) !== null) {
    const key = m[1] as AuditStage;
    const val = (m[2] || '').trim();
    if (val) out[key] = val;
  }
  return out;
}

export function SignalAudit() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [audit, setAudit] = useState<AuditMap>({});
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<AuditStage | null>(null);
  const [email, setEmail] = useState('');
  const [emailSaved, setEmailSaved] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  // Hard gate: results stay blurred until the visitor surrenders an email
  const [unlocked, setUnlocked] = useState(false);
  // Throttle / Data Log state
  const [cooldownMs, setCooldownMs] = useState(0);
  const [throttleProgress, setThrottleProgress] = useState(0);
  const [logVisible, setLogVisible] = useState(false);
  const [logCursor, setLogCursor] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const throttleStartRef = useRef<number | null>(null);

  // Hydrate cooldown from sessionStorage (resume after refresh)
  useEffect(() => {
    try {
      const last = sessionStorage.getItem(THROTTLE_KEY);
      if (!last) return;
      const elapsed = Date.now() - Number(last);
      if (elapsed < THROTTLE_MS) {
        const remaining = THROTTLE_MS - elapsed;
        setCooldownMs(remaining);
      }
    } catch { /* noop */ }
  }, []);

  // Cooldown ticker — drives both the gate and the throttle progress bar
  useEffect(() => {
    if (cooldownMs <= 0) {
      setThrottleProgress(0);
      return;
    }
    const id = window.setInterval(() => {
      setCooldownMs((prev) => {
        const next = Math.max(0, prev - 250);
        const elapsed = THROTTLE_MS - next;
        setThrottleProgress(Math.min(100, (elapsed / THROTTLE_MS) * 100));
        return next;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [cooldownMs]);

  // Cycle the simulated data log while throttled
  useEffect(() => {
    if (cooldownMs <= 0 || !logVisible) return;
    const id = window.setInterval(() => {
      setLogCursor((c) => (c + 1) % LOG_LINES.length);
    }, 700);
    return () => window.clearInterval(id);
  }, [cooldownMs, logVisible]);

  const hasResults = Object.keys(audit).length > 0;
  const isComplete = hasResults && audit.next !== undefined;
  const isCooling = cooldownMs > 0;
  const cooldownSeconds = Math.ceil(cooldownMs / 1000);
  const currentPhase = THROTTLE_PHASES.find(
    (p) => throttleProgress >= p.from && throttleProgress < p.to,
  ) || THROTTLE_PHASES[THROTTLE_PHASES.length - 1];

  async function runAudit() {
    const trimmed = input.trim();
    if (trimmed.length < 5) {
      setError('Give MarQ a little more to work with — at least 5 characters.');
      return;
    }
    if (trimmed.length > 600) {
      setError('Keep it under 600 characters for the audit.');
      return;
    }
    if (isCooling) {
      setError(`MarQ is calibrating. Try again in ${cooldownSeconds}s.`);
      return;
    }
    setError(null);
    setAudit({});
    setActiveStage(null);
    setStreaming(true);
    // Engage the 30s throttle immediately to deter spam clicks
    throttleStartRef.current = Date.now();
    try { sessionStorage.setItem(THROTTLE_KEY, String(Date.now())); } catch { /* noop */ }
    setCooldownMs(THROTTLE_MS);
    setThrottleProgress(0);
    setLogCursor(0);

    const controller = new AbortController();
    abortRef.current = controller;


    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-signal-audit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ input: trimmed }),
          signal: controller.signal,
        },
      );

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => '');
        let msg = 'Audit failed. Try again.';
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error) msg = parsed.error;
        } catch {
          /* noop */
        }
        if (resp.status === 429) msg = 'MarQ is at capacity. Try again shortly.';
        if (resp.status === 402) msg = 'AI credits exhausted. Please contact support.';
        throw new Error(msg);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assembled = '';
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        textBuffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') {
            done = true;
            break;
          }
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (delta) {
              assembled += delta;
              const next = parseStream(assembled);
              setAudit(next);
              const filled = STAGE_ORDER.filter((s) => next[s]);
              if (filled.length) setActiveStage(filled[filled.length - 1]);
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Persist for handoff to onboarding/auto-save on signup
      try {
        sessionStorage.setItem(
          'intoiq_signal_audit',
          JSON.stringify({ input: trimmed, audit: parseStream(assembled), at: Date.now() }),
        );
      } catch {
        /* sessionStorage may be unavailable */
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message || 'Something went wrong.');
    } finally {
      setStreaming(false);
    }
  }

  async function unlockReport() {
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Enter a valid email');
      return;
    }
    if (trimmed.length > 255) {
      toast.error('Email too long');
      return;
    }
    setSubmittingEmail(true);
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/capture-landing-lead`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          email: trimmed,
          snippet: input.trim(),
          signals: audit,
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || 'Could not unlock the report.');
      }
      // Persist locally too for /login auto-attach
      try {
        const existing = sessionStorage.getItem('intoiq_signal_audit');
        const payload = existing ? JSON.parse(existing) : {};
        sessionStorage.setItem(
          'intoiq_signal_audit',
          JSON.stringify({ ...payload, email: trimmed }),
        );
      } catch { /* ignore */ }
      setEmailSaved(true);
      setUnlocked(true);
      toast.success('Strategy unlocked. Report is on its way to your inbox.');
    } catch (err) {
      toast.error((err as Error).message || 'Try again in a moment.');
    } finally {
      setSubmittingEmail(false);
    }
  }

  function claimMap() {
    // Audit already lives in sessionStorage — login flow can pick it up.
    // Pre-fill email on /login if user provided one.
    const saved = email.trim();
    if (saved && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saved)) {
      navigate(`/login?email=${encodeURIComponent(saved)}&mode=signup`);
    } else {
      navigate('/login?mode=signup');
    }
  }

  return (
    <section
      id="signal-audit"
      className="relative px-5 sm:px-6 lg:px-12 py-16 sm:py-24 scroll-mt-20"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/8 blur-[120px] pointer-events-none animate-float" />

      <div className="relative z-10 max-w-4xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-10 sm:mb-14">
            <span className="inline-flex items-center glass rounded-full px-4 py-1.5 text-[10px] sm:text-xs text-primary font-medium tracking-[0.22em] uppercase mb-5">
              <Sparkles className="w-3 h-3 mr-2" />
              Free Signal Audit
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-serif leading-[1.1] mb-4 [text-wrap:balance]">
              Stop guessing.{' '}
              <span className="gradient-text italic">Let MarQ audit your message in 60 seconds.</span>
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto [text-wrap:balance]">
              Paste your book title, business idea, or a single paragraph. MarQ returns your
              Identified Signal, the competitive void you own, and a Day 1 hook — live, on this page.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={150}>
          <div className="glass rounded-2xl p-5 sm:p-8 border border-border/40 mb-8">
            <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground/80 mb-3 font-medium">
              Your message
            </label>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. I wrote a book about overcoming burnout for corporate executives."
              maxLength={600}
              rows={3}
              disabled={streaming || isCooling}
              className="bg-background/60 border-border/50 text-sm sm:text-base resize-none mb-3"
            />
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-[11px] text-muted-foreground/60 tabular-nums">
                {input.length}/600
              </span>
              <Button
                size="lg"
                onClick={runAudit}
                disabled={streaming || isCooling || input.trim().length < 5}
                className="glow-button h-12 px-6 text-sm font-semibold tracking-wide"
              >
                {streaming || isCooling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {isCooling ? `Calibrating · ${cooldownSeconds}s` : 'Auditing…'}
                  </>
                ) : (
                  <>
                    Run the Audit <ArrowRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>

            {/* Throttle bar — "Intelligence Pulse" */}
            {isCooling && (
              <div className="mt-4 rounded-xl border border-primary/20 bg-background/40 p-3.5 animate-in fade-in duration-300">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-primary/90">
                    {currentPhase.label}
                  </p>
                  <button
                    type="button"
                    onClick={() => setLogVisible((v) => !v)}
                    className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 hover:text-primary transition-colors"
                  >
                    <Terminal className="h-3 w-3" />
                    {logVisible ? 'hide log' : 'data log'}
                  </button>
                </div>
                <div className="relative h-[3px] w-full overflow-hidden rounded-full bg-primary/10">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/80 shadow-[0_0_12px_hsl(var(--primary)/0.5)] transition-all duration-300 ease-out"
                    style={{ width: `${throttleProgress}%` }}
                  />
                </div>
                {logVisible && (
                  <div className="mt-3 max-h-32 overflow-hidden rounded-md border border-border/30 bg-background/60 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground/80">
                    {LOG_LINES.slice(0, logCursor + 1).slice(-6).map((line, i, arr) => (
                      <div
                        key={`${logCursor}-${i}`}
                        className={cn(
                          'truncate animate-in fade-in slide-in-from-bottom-1 duration-300',
                          i === arr.length - 1 && 'text-primary',
                        )}
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive mt-3" role="alert">
                {error}
              </p>
            )}
          </div>
        </ScrollReveal>

        {(streaming || hasResults) && (
          <div className="relative">
            {/* Stages — blurred while still streaming OR if locked after completion */}
            <div
              className={cn(
                'space-y-3 sm:space-y-4 transition-all duration-700',
                isComplete && !unlocked && 'blur-md select-none pointer-events-none',
              )}
              aria-hidden={isComplete && !unlocked}
            >
              {STAGE_ORDER.map((stage) => {
                const meta = STAGE_META[stage];
                const Icon = meta.icon;
                const value = audit[stage];
                const isActive = activeStage === stage && streaming;
                const isFilled = !!value;
                if (!isFilled && !isActive && !streaming) return null;
                return (
                  <div
                    key={stage}
                    className={cn(
                      'glass rounded-xl p-4 sm:p-5 border transition-all duration-500',
                      isFilled
                        ? 'border-primary/30 opacity-100 translate-y-0'
                        : 'border-border/30 opacity-50',
                      isActive && 'ring-1 ring-primary/40 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)]',
                    )}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <div
                        className={cn(
                          'shrink-0 h-9 w-9 rounded-lg flex items-center justify-center border',
                          isFilled
                            ? 'bg-primary/15 border-primary/30 text-primary'
                            : 'bg-muted/30 border-border/40 text-muted-foreground',
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 font-medium mb-1">
                          {meta.eyebrow}
                        </div>
                        <div className="text-sm sm:text-base font-serif text-foreground/90 mb-1.5">
                          {meta.label}
                        </div>
                        {value ? (
                          <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {value}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground/50 italic">
                            {isActive ? 'MarQ is composing…' : 'Pending'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* HARD GATE — obsidian + gold unlock card overlays the blurred results */}
            {isComplete && !unlocked && (
              <div className="absolute inset-0 z-10 flex items-center justify-center px-2 animate-in fade-in duration-500">
                <div
                  className="relative w-full max-w-md rounded-2xl border border-primary/40 p-6 sm:p-8 shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.4)]"
                  style={{
                    background:
                      'linear-gradient(135deg, hsl(var(--background) / 0.95), hsl(var(--background) / 0.85))',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                  }}
                >
                  <div
                    className="absolute -inset-px rounded-2xl pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(135deg, hsl(var(--primary) / 0.4), transparent 50%, hsl(var(--primary) / 0.2))',
                      WebkitMask:
                        'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      WebkitMaskComposite: 'xor',
                      maskComposite: 'exclude',
                      padding: '1px',
                    }}
                  />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold">
                        Strategy Locked
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-serif leading-tight mb-2 [text-wrap:balance]">
                      MarQ architected your first 7 days of authority.
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                      Where should she send your full Intelligence Report — including the
                      narrative arc, hooks, and funnel sketch?
                    </p>
                    <div className="space-y-2">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@domain.com"
                          maxLength={255}
                          disabled={submittingEmail}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') unlockReport();
                          }}
                          className="cta-gold-input pl-9 h-12 text-base"
                        />
                      </div>
                      <Button
                        onClick={unlockReport}
                        disabled={submittingEmail || email.trim().length === 0}
                        className="glow-button w-full h-12 text-sm font-semibold"
                      >
                        {submittingEmail ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Unlocking…
                          </>
                        ) : (
                          <>
                            Unlock My Intelligence Report{' '}
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground/60 mt-3 uppercase tracking-[0.18em]">
                      No spam · One-tap unsubscribe · Zero-trace
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* After unlock — the "Claim Full Map" CTA replaces the gate */}
        {isComplete && unlocked && (
          <ScrollReveal>
            <div className="glass rounded-2xl p-5 sm:p-7 border border-primary/30 mt-8 bg-gradient-to-br from-primary/8 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold mb-2">
                    Report sent ✓
                  </p>
                  <p className="text-sm sm:text-base font-medium mb-1">
                    Want the full map deployed today?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Claim your dashboard for the 7-day arc, landing page, and email sequence.
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={claimMap}
                  className="glow-button animate-pulse-glow h-12 px-6 text-sm font-semibold"
                >
                  Claim Your Full Map <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </ScrollReveal>
        )}

        {!hasResults && !streaming && (
          <p className="text-center text-[11px] text-muted-foreground/60 mt-6 uppercase tracking-[0.22em]">
            Zero-Trace · No tracking until you sign up
          </p>
        )}
      </div>
    </section>
  );
}
