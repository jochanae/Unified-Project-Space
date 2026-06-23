import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, X, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Stage =
  | 'audience'
  | 'offer'
  | 'hook'
  | 'headline'
  | 'subheadline'
  | 'cta'
  | 'lead_magnet';

const STAGE_LABELS: Record<Stage, string> = {
  audience: 'Identifying audience',
  offer: 'Structuring the offer',
  hook: 'Crafting the hook',
  headline: 'Writing the headline',
  subheadline: 'Refining the subheadline',
  cta: 'Designing the CTA',
  lead_magnet: 'Defining the lead magnet',
};

const STAGES: Stage[] = [
  'audience',
  'offer',
  'hook',
  'headline',
  'subheadline',
  'cta',
  'lead_magnet',
];

const SAMPLE_IDEAS = [
  { label: 'Coaching offer', value: 'A 1:1 coaching program for new moms returning to work, helping them rebuild confidence and design a flexible career.' },
  { label: 'SaaS launch', value: 'A SaaS tool that helps freelancers automate client onboarding — contracts, payments, and welcome flows in one click.' },
  { label: 'Local service', value: 'A premium mobile car detailing service for busy professionals in the Bay Area, booked entirely online.' },
  { label: 'Digital product', value: 'A Notion template bundle for solo founders to plan, ship, and market their first product in 30 days.' },
];

// Client-side abuse guard
const RATE_LIMIT_KEY = 'intoiq_preview_rate_limit';
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(): { allowed: boolean; remaining: number; resetMins: number } {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    const allowed = recent.length < RATE_LIMIT_MAX;
    const remaining = Math.max(0, RATE_LIMIT_MAX - recent.length);
    const oldest = recent[0] ?? now;
    const resetMins = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - oldest)) / 60000);
    return { allowed, remaining, resetMins };
  } catch {
    return { allowed: true, remaining: RATE_LIMIT_MAX, resetMins: 0 };
  }
}

function recordRateLimit() {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    const now = Date.now();
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    recent.push(now);
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
  } catch { /* noop */ }
}

// Lightweight analytics — sessionStorage event log + console for debugging
function trackEvent(event: string, payload: Record<string, unknown> = {}) {
  try {
    const key = 'intoiq_preview_funnel';
    const raw = sessionStorage.getItem(key);
    const events = raw ? JSON.parse(raw) : [];
    events.push({ event, payload, ts: Date.now() });
    sessionStorage.setItem(key, JSON.stringify(events.slice(-50)));
    // eslint-disable-next-line no-console
    console.info(`[preview-funnel] ${event}`, payload);
  } catch { /* noop */ }
}

type Preview = Partial<Record<Stage, string>>;

export interface AnonymousPreviewOverlayProps {
  open: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'intoiq_pending_preview';

export function AnonymousPreviewOverlay({ open, onClose }: AnonymousPreviewOverlayProps) {
  const navigate = useNavigate();
  const [idea, setIdea] = useState('');
  const [phase, setPhase] = useState<'input' | 'streaming' | 'reveal'>('input');
  const [preview, setPreview] = useState<Preview>({});
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [completedStages, setCompletedStages] = useState<Set<Stage>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      setPhase('input');
      setPreview({});
      setActiveStage(null);
      setCompletedStages(new Set());
    } else {
      trackEvent('preview_opened');
    }
  }, [open]);

  if (!open) return null;

  const startStream = async (overrideIdea?: string) => {
    const finalIdea = (overrideIdea ?? idea).trim();
    if (finalIdea.length < 3) {
      toast.error('Add a few more words to your idea.');
      return;
    }

    // Rate limit check
    const limit = checkRateLimit();
    if (!limit.allowed) {
      toast.error(`Preview limit reached — try again in ~${limit.resetMins} min.`);
      trackEvent('preview_rate_limited', { resetMins: limit.resetMins });
      return;
    }

    if (overrideIdea) setIdea(overrideIdea);
    setPhase('streaming');
    setPreview({});
    setCompletedStages(new Set());
    setActiveStage(null);
    recordRateLimit();
    trackEvent('preview_started', { ideaLength: finalIdea.length });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-anonymous-preview`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ idea: finalIdea }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const errText = await resp.text().catch(() => '');
        let msg = 'Preview unavailable. Try again in a moment.';
        try {
          const parsed = JSON.parse(errText);
          if (parsed?.error) msg = parsed.error;
        } catch { /* noop */ }
        toast.error(msg);
        setPhase('input');
        trackEvent('preview_failed', { status: resp.status });
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let raw = '';
      let streamDone = false;

      const stageRegex = /###STAGE:([a-z_]+)###/g;

      const flush = () => {
        const matches = [...raw.matchAll(stageRegex)];
        if (matches.length === 0) return;
        for (let i = 0; i < matches.length; i++) {
          const stage = matches[i][1] as Stage;
          if (!STAGES.includes(stage)) continue;
          const start = matches[i].index! + matches[i][0].length;
          const end = i + 1 < matches.length ? matches[i + 1].index! : raw.length;
          const value = raw.slice(start, end).trim();
          if (value) {
            setPreview((prev) => ({ ...prev, [stage]: value }));
            setActiveStage(stage);
            const idx = STAGES.indexOf(stage);
            setCompletedStages((prev) => {
              const next = new Set(prev);
              for (let j = 0; j < idx; j++) next.add(STAGES[j]);
              return next;
            });
          }
        }
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              raw += content;
              flush();
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      flush();
      setCompletedStages(new Set(STAGES));
      setActiveStage(null);
      setPhase('reveal');
      trackEvent('preview_completed');
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      console.error('preview stream error', err);
      toast.error('Preview interrupted. Try again.');
      setPhase('input');
      trackEvent('preview_failed', { reason: 'exception' });
    }
  };

  const handleRegenerate = () => {
    trackEvent('preview_regenerated');
    startStream();
  };

  const handleClaim = () => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ idea: idea.trim(), preview, savedAt: Date.now() }),
      );
    } catch { /* noop */ }
    trackEvent('preview_claimed');
    navigate('/login');
  };

  const limitInfo = checkRateLimit();

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 backdrop-blur-xl overflow-y-auto">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[160px] pointer-events-none" />

      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close preview"
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-10 h-10 w-10 rounded-full glass flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="relative min-h-full flex flex-col items-center justify-center px-5 py-16 sm:py-24">
        <div className="w-full max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <span className="inline-flex items-center glass rounded-full px-3 py-1 text-[10px] text-primary font-medium tracking-[0.22em] uppercase mb-4">
              <Sparkles className="w-3 h-3 mr-2" />
              Live Preview
            </span>
            <h2 className="text-2xl sm:text-4xl font-serif leading-tight [text-wrap:balance]">
              {phase === 'input' && (
                <>What idea do you want to turn into <span className="gradient-text italic">revenue</span>?</>
              )}
              {phase === 'streaming' && (
                <>MarQ is architecting your <span className="gradient-text italic">system</span>…</>
              )}
              {phase === 'reveal' && (
                <>Your <span className="gradient-text italic">Revenue System</span> is ready.</>
              )}
            </h2>
            {phase === 'input' && (
              <p className="text-muted-foreground text-sm sm:text-base mt-3 [text-wrap:balance]">
                A product, service, skill, or even a rough thought. MarQ handles the rest.
              </p>
            )}
          </div>

          {/* INPUT */}
          {phase === 'input' && (
            <div className="space-y-4">
              <Textarea
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="e.g. AI journaling app for creators, or a coaching offer for new moms…"
                rows={4}
                maxLength={500}
                className="glass border-border/40 text-base resize-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) startStream();
                }}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground/70">
                <span>⌘ + Enter to launch</span>
                <span>{idea.length}/500</span>
              </div>

              {/* Sample idea chips */}
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-medium">
                  Or start with a template
                </div>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_IDEAS.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => {
                        trackEvent('preview_sample_clicked', { sample: sample.label });
                        startStream(sample.value);
                      }}
                      className="glass rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 border border-transparent transition-all"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => startStream()}
                size="lg"
                className="glow-button w-full h-14 text-base font-semibold"
              >
                Build My Revenue System <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              {limitInfo.remaining < RATE_LIMIT_MAX && (
                <p className="text-[11px] text-center text-muted-foreground/60">
                  {limitInfo.remaining} of {RATE_LIMIT_MAX} previews remaining this hour
                </p>
              )}
            </div>
          )}

          {/* STREAMING */}
          {phase === 'streaming' && (
            <div className="space-y-2">
              {STAGES.map((stage) => {
                const isComplete = completedStages.has(stage);
                const isActive = activeStage === stage && !isComplete;
                const isPending = !isComplete && !isActive;
                return (
                  <div
                    key={stage}
                    className={cn(
                      'glass rounded-xl px-4 py-3 flex items-center gap-3 transition-all',
                      isActive && 'border-primary/40 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]',
                      isPending && 'opacity-40',
                    )}
                  >
                    <div className="w-5 h-5 flex-shrink-0">
                      {isComplete && (
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                      )}
                      {isActive && <Loader2 className="w-5 h-5 animate-spin text-primary" />}
                      {isPending && <div className="w-5 h-5 rounded-full border border-border/40" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">
                        {STAGE_LABELS[stage]}
                      </div>
                      {preview[stage] && (
                        <div className="text-sm text-foreground mt-0.5 truncate">
                          {preview[stage]}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* REVEAL */}
          {phase === 'reveal' && (
            <div className="space-y-6 animate-fade-in">
              {/* Strategy snapshot */}
              <div className="glass rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-primary font-medium">
                    Strategy Snapshot
                  </div>
                  <button
                    onClick={handleRegenerate}
                    className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </button>
                </div>
                {(['audience', 'offer', 'hook'] as Stage[]).map((s) => (
                  preview[s] && (
                    <div key={s}>
                      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 mb-1">
                        {s === 'audience' ? 'Audience' : s === 'offer' ? 'Core Offer' : 'Hook'}
                      </div>
                      <div className="text-sm sm:text-base text-foreground leading-relaxed">
                        {preview[s]}
                      </div>
                    </div>
                  )
                ))}
              </div>

              {/* Landing page mockup */}
              <div className="rounded-2xl overflow-hidden border border-border/40 bg-card">
                <div className="px-4 py-2 border-b border-border/40 bg-muted/30 flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                  <div className="ml-3 text-[10px] text-muted-foreground/60 font-mono truncate">
                    your-revenue-system.intoiq.app
                  </div>
                </div>
                <div className="p-6 sm:p-10 text-center space-y-5">
                  {preview.headline && (
                    <h3 className="text-xl sm:text-3xl font-serif leading-tight [text-wrap:balance]">
                      {preview.headline}
                    </h3>
                  )}
                  {preview.subheadline && (
                    <p className="text-sm sm:text-base text-muted-foreground [text-wrap:balance] max-w-md mx-auto">
                      {preview.subheadline}
                    </p>
                  )}
                  <div className="max-w-sm mx-auto space-y-3 pt-2">
                    <div className="flex items-center gap-2 glass rounded-lg px-3 py-2.5 text-sm text-muted-foreground/70">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span>your@email.com</span>
                    </div>
                    <div className="glow-button rounded-lg py-3 text-sm font-semibold">
                      {preview.cta || 'Get Instant Access'}
                    </div>
                    {preview.lead_magnet && (
                      <p className="text-[11px] text-muted-foreground/60 [text-wrap:balance]">
                        {preview.lead_magnet}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Claim CTA */}
              <div className="glass rounded-2xl p-5 sm:p-6 text-center space-y-4 border border-primary/20">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-primary font-medium mb-2">
                    Save & Deploy
                  </div>
                  <h4 className="text-lg sm:text-xl font-serif leading-tight [text-wrap:balance]">
                    Create your free vault to deploy this system live.
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 [text-wrap:balance]">
                    Your strategy and page will be waiting in your workspace — ready to publish, customize, and start capturing leads.
                  </p>
                </div>
                <Button
                  onClick={handleClaim}
                  size="lg"
                  className="glow-button w-full h-14 text-base font-semibold"
                >
                  Claim My Revenue System <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <button
                  onClick={() => {
                    setPhase('input');
                    setPreview({});
                  }}
                  className="text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  ← Try a different idea
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const PENDING_PREVIEW_KEY = STORAGE_KEY;
