import { useState, useRef, useEffect } from 'react';
import { StreamPhase, BuildStreamResult } from '@/features/quinn';
import { useGhostText } from '@/features/quinn';
import { useFunnelHub } from '@/features/projects';
import { useIntelligenceState } from '@/features/quinn';
import { Sparkles, Target, GitBranch, ArrowRight, RotateCcw, Zap, Pencil, ImagePlus, Loader2, CheckCircle2, Megaphone, Copy, ChevronDown, Instagram, Share2, FlaskConical, Plus } from 'lucide-react';
import { QuinnIdentityNudge } from '@/components/shared/QuinnUpgradeNudge';
import { useSubscription } from '@/features/billing';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LandingPagePreview } from '@/features/pages';
import { ConversionBoosters } from './ConversionBoosters';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';
import { getBrandColors } from '@/features/pages/utils/html-generator';

function StreamBlock({ visible, delay, children, className }: { visible: boolean; delay?: number; children: React.ReactNode; className?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => setShow(true), delay || 0);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [visible, delay]);

  return (
    <div className={cn(
      'transition-all duration-700 ease-out',
      show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
      className
    )}>
      {children}
    </div>
  );
}

const SOCIAL_PLATFORMS = [
  { key: 'instagram_caption' as const, label: 'Instagram', icon: '📸' },
  { key: 'linkedin_post' as const, label: 'LinkedIn', icon: '💼' },
  { key: 'twitter_post' as const, label: 'X (Twitter)', icon: '𝕏' },
  { key: 'email_teaser' as const, label: 'Email Teaser', icon: '📧' },
];

import { SocialExportPanel, ABTestPanel } from '@/features/deploy';

function SocialPromoSection({ promo, headline, subheadline, heroImage }: {
  promo: { instagram_caption: string; linkedin_post: string; twitter_post: string; email_teaser: string };
  headline: string;
  subheadline: string;
  heroImage?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${platform} copy copied to clipboard`);
  };

  return (
    <div className="glass rounded-2xl border border-border/50 card-hover-glow overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-2 text-primary">
          <Megaphone className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Social Promo Copy</span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded && (
        <div className="px-6 pb-6 space-y-4">
          {/* Export to Social toggle */}
          <Button
            variant={showExport ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 text-xs w-full"
            onClick={() => setShowExport(!showExport)}
          >
            <Share2 className="h-3.5 w-3.5" /> {showExport ? 'Hide Export Panel' : 'Export to Social'}
          </Button>

          {showExport ? (
            <SocialExportPanel
              headline={headline}
              subheadline={subheadline}
              heroImage={heroImage}
              socialPromo={promo}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map(({ key, label, icon }) => (
                <div
                  key={key}
                  className="rounded-xl p-4 space-y-3"
                  style={{
                    background: 'rgba(14, 20, 30, 0.7)',
                    border: '1px solid rgba(232, 240, 248, 0.08)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <span>{icon}</span> {label}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                      onClick={() => copyToClipboard(promo[key], label)}
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(232, 240, 248, 0.55)' }}>
                    {promo[key]}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { FunnelTemplates } from './FunnelTemplates';
import { PreFlightChecklist, type LockedAngle } from './PreFlightChecklist';
import { LockedAngleBanner } from './LockedAngleBanner';
import { useCollabPresence, useFieldLocks, CollabAvatars, CursorOverlay } from '@/features/collab';

interface BuildStreamProps {
  buildStream: {
    phase: StreamPhase;
    setPhase: (phase: StreamPhase) => void;
    result: BuildStreamResult | null;
    error: string | null;
    generate: (projectId: string, goal: string, locked?: LockedAngle | null) => Promise<void>;
    reset: () => void;
    updateResult: (updated: BuildStreamResult) => void;
    lockedAngle?: LockedAngle | null;
    setLockedAngle?: (l: LockedAngle | null) => void;
  };
  initialPrompt?: string;
}

export function BuildStream({ buildStream, initialPrompt }: BuildStreamProps) {
  const { activeProject } = useFunnelHub();
  const { phase, result, error, generate, reset, updateResult, lockedAngle } = buildStream;
  const { tier } = useSubscription();
  const { user } = useCurrentUser();
  const { pulse } = useIntelligenceState(phase);
  const [goal, setGoal] = useState(initialPrompt || '');
  const { suggestion, accept, dismiss } = useGhostText(goal);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const collabContainerRef = useRef<HTMLDivElement>(null);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  
  const [preFlightOpen, setPreFlightOpen] = useState(false);
  const [pendingGoal, setPendingGoal] = useState('');

  const { peers, broadcastCursor, enabled: collabEnabled, selfColor } = useCollabPresence({
    projectId: activeProject?.id ?? null,
    surface: 'build_stream',
  });
  const fieldLockApi = useFieldLocks({
    projectId: activeProject?.id ?? null,
    surface: 'build_stream',
  });

  useEffect(() => {
    if (phase === 'idle' && inputRef.current) inputRef.current.focus();
  }, [phase]);

  // Auto-trigger build if incoming prompt
  useEffect(() => {
    if (initialPrompt && activeProject && phase === 'idle' && !autoTriggered) {
      setAutoTriggered(true);
      generate(activeProject.id, initialPrompt);
    }
  }, [initialPrompt, activeProject, phase, autoTriggered, generate]);

  // Auto-generate hero image when page phase completes
  useEffect(() => {
    if (phase === 'page' && result && !result.landing_page.hero_image && !generatingImage) {
      generateHeroImage();
    }
  }, [phase, result]);

  if (!activeProject) return null;

  const brandColors = getBrandColors(activeProject.id);

  const generateHeroImage = async () => {
    if (!result || generatingImage) return;
    setGeneratingImage(true);

    try {
      const imagePrompt = `Create a premium, cinematic hero image for a landing page. Product: ${result.strategy.offer}. Audience: ${result.strategy.audience}. Style: dark, moody, professional with subtle teal/cyan lighting accents. Abstract tech visualization, no text, no logos. Ultra-wide composition, shallow depth of field, volumetric lighting.`;

      const { data, error } = await supabase.functions.invoke('studio-generate', {
        body: { mode: 'hero', prompt: imagePrompt, projectId: activeProject.id },
      });

      if (error) throw error;
      if (data?.imageUrl) {
        updateResult({
          ...result,
          landing_page: { ...result.landing_page, hero_image: data.imageUrl },
        });
      }
    } catch (e) {
      console.error('Hero image generation failed:', e);
      // Non-blocking — page still works without image
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = () => {
    if (!goal.trim() || phase === 'generating') return;
    // Open the pre-flight checklist instead of generating directly.
    setPendingGoal(goal.trim());
    setPreFlightOpen(true);
  };

  const handleLocked = (locked: LockedAngle) => {
    if (!activeProject) return;
    generate(activeProject.id, pendingGoal || goal.trim(), locked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      setGoal(accept());
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape' && suggestion) {
      dismiss();
    }
  };

  const phaseIndex = (p: StreamPhase) => ['idle', 'generating', 'strategy', 'funnel', 'page', 'complete'].indexOf(p);
  const isAfter = (target: StreamPhase) => phaseIndex(phase) >= phaseIndex(target);

  const updateLandingField = (field: string, value: string) => {
    if (!result) return;
    let nextValue: unknown = value;
    if (field === 'service_area_zips') {
      nextValue = value
        .split(/[\n,]/)
        .map(zip => zip.trim())
        .filter(Boolean)
        .slice(0, 50);
    } else if (field === 'service_area_required') {
      nextValue = value === 'true' || value === '1';
    }
    updateResult({
      ...result,
      landing_page: {
        ...result.landing_page,
        [field]: nextValue,
        ...(field === 'service_area_zips' ? { service_area_required: Array.isArray(nextValue) && nextValue.length > 0 } : {}),
      },
    });
  };

  const updateFeature = (index: number, field: 'title' | 'description', value: string) => {
    if (!result) return;
    const features = [...result.landing_page.features];
    features[index] = { ...features[index], [field]: value };
    updateResult({
      ...result,
      landing_page: { ...result.landing_page, features },
    });
  };

  const isGenerating = phase === 'generating';

  return (
    <div ref={collabContainerRef} className="relative max-w-3xl mx-auto space-y-6">
      {/* Live collaborators (Innovation tier) */}
      {collabEnabled && (peers.length > 0 || selfColor) && (
        <div className="flex justify-end">
          <div className="glass rounded-full px-3 py-1.5 border border-border/50">
            <CollabAvatars peers={peers} selfColor={selfColor} />
          </div>
        </div>
      )}
      {collabEnabled && peers.length > 0 && (
        <CursorOverlay peers={peers} onMove={broadcastCursor} containerRef={collabContainerRef} />
      )}

      {/* Pre-flight checkpoint modal */}
      <PreFlightChecklist
        open={preFlightOpen}
        onOpenChange={setPreFlightOpen}
        goal={pendingGoal || goal}
        projectId={activeProject.id}
        onLocked={handleLocked}
      />

      {/* Locked angle pin — visible after a wedge has been chosen */}
      {lockedAngle && phase !== 'idle' && <LockedAngleBanner locked={lockedAngle} />}

      {/* Input Phase */}
      {phase === 'idle' && (
        <div className="relative">
          <div className="glass rounded-2xl p-8 border border-border/50 card-hover-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-serif">What are you building?</h2>
                <p className="text-xs text-muted-foreground">Describe your goal — the AI builds the rest.</p>
              </div>
            </div>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={goal}
                onChange={e => setGoal(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g. Launch a lead capture funnel for my AI fitness coaching app targeting busy professionals..."
                className="w-full bg-transparent border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground/50 text-sm leading-relaxed min-h-[80px] relative z-10"
                rows={3}
              />
              {suggestion && (
                <div
                  className="absolute top-0 left-0 right-0 bottom-0 overflow-hidden text-sm leading-relaxed whitespace-pre-wrap break-words"
                  onClick={() => {
                    if (window.matchMedia('(pointer: coarse)').matches) {
                      setGoal(accept());
                    }
                  }}
                  style={{ pointerEvents: window.matchMedia('(pointer: coarse)').matches ? 'auto' : 'none' }}
                >
                  <span className="invisible">{goal}</span>
                  <span className="text-primary/40 italic">{suggestion}</span>
                  <span className="text-primary/30 text-xs ml-2 not-italic">
                    {window.matchMedia('(pointer: coarse)').matches ? '👆 Tap' : '⇥ Tab'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-4 pb-2">
              <p className="text-xs text-muted-foreground/40">
                {suggestion
                  ? (window.matchMedia('(pointer: coarse)').matches ? 'Tap suggestion to accept' : 'Press Tab to accept suggestion')
                  : 'Shift+Enter for new line'}
              </p>
              <Button
                onClick={(e) => {
                  handleSubmit();
                  // Scroll button into view after mobile keyboard dismisses
                  setTimeout(() => {
                    (e.target as HTMLElement)?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
                  }, 300);
                }}
                disabled={!goal.trim()}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.3)]"
              >
                <Sparkles className="h-4 w-4" /> Build It
              </Button>
            </div>
          </div>
          <FunnelTemplates onSelect={(templateData) => {
            buildStream.updateResult(templateData);
            buildStream.setPhase('complete');
          }} />
        </div>
      )}

      {/* Generating Spinner */}
      {isGenerating && (
        <div className="glass rounded-2xl p-12 text-center border border-primary/20 ai-pulse-border">
          <div className="relative mx-auto w-16 h-16 mb-4" style={{ transform: `scale(${0.95 + pulse * 0.1})` }}>
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" style={{ animationDuration: `${1.2 - pulse * 0.4}s` }} />
            <div className="absolute inset-3 rounded-full border-2 border-transparent border-b-primary/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: `${1.8 - pulse * 0.5}s` }} />
            <div
              className="absolute inset-0 rounded-full transition-all duration-500"
              style={{ boxShadow: `0 0 ${8 + pulse * 16}px hsl(var(--primary) / ${0.1 + pulse * 0.2})` }}
            />
          </div>
          <p className="text-sm text-muted-foreground font-serif">Building your funnel strategy...</p>
          <p className="text-xs text-muted-foreground/50 mt-1">IntoIQ is analyzing your goal</p>
        </div>
      )}

      {/* Error */}
      {phase === 'error' && (
        <div className="glass rounded-2xl p-8 border border-destructive/30 text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RotateCcw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      )}

      {/* STRATEGY BLOCK */}
      <StreamBlock visible={isAfter('strategy')} delay={100}>
        {result && (
          <div className="glass rounded-2xl p-6 border border-primary/20 space-y-4 card-hover-glow">
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Strategy</span>
            </div>
            <h3 className="text-xl font-serif">{result.strategy.hook}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Audience</p>
                <p>{result.strategy.audience}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Offer</p>
                <p>{result.strategy.offer}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider">Positioning</p>
                <p>{result.strategy.positioning}</p>
              </div>
            </div>
          </div>
        )}
      </StreamBlock>

      {/* FUNNEL MAP BLOCK */}
      <StreamBlock visible={isAfter('funnel')} delay={200}>
        {result && (
          <div id="funnel-map" className="glass rounded-2xl p-6 border border-border/50 space-y-4 card-hover-glow scroll-mt-24">
            <div className="flex items-center gap-2 text-primary">
              <GitBranch className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Funnel Map</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {result.funnel_steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="glass rounded-lg px-4 py-2 border border-border/50 text-sm card-hover-glow">
                    <p className="font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.step_type}</p>
                  </div>
                  {i < result.funnel_steps.length - 1 && (
                    <ArrowRight className="h-4 w-4 text-primary/40 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </StreamBlock>

      {/* VIDEO BRIEF BLOCK — a creative brief, not a playable asset */}
      <StreamBlock visible={isAfter('funnel') && !!result?.video_suggestion} delay={250}>
        {result?.video_suggestion && (
          <div className="glass rounded-2xl p-6 border border-border/50 space-y-4 card-hover-glow">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-primary">
                <Pencil className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-widest">Video Brief</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 px-2 py-0.5 rounded-full border border-border/40">
                Suggestion · not generated
              </span>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold">{result.video_suggestion.title}</h3>
              <p className="text-sm text-muted-foreground">{result.video_suggestion.description}</p>
              <p className="text-xs text-muted-foreground/60">
                Recommended placement: <span className="text-primary/80 capitalize">{result.video_suggestion.placement.replace(/_/g, ' ')}</span>
              </p>
              <p className="text-[11px] text-muted-foreground/60 italic pt-1">
                MarQ drafted this brief. Record it yourself, hire a creator, or use a tool like Loom / HeyGen — then paste the URL into a Video block.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${result.video_suggestion!.title}\n\n${result.video_suggestion!.description}`,
                  );
                  toast.success('Brief copied — paste into your script doc');
                }}
              >
                <Copy className="h-3 w-3" /> Copy Brief
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => {
                  toast.success('Add a Video block in the Page Builder and paste your video URL');
                }}
              >
                <Plus className="h-3 w-3" /> Add Video Block
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled
                className="gap-1.5 text-xs border-dashed border-border/40 text-muted-foreground/70 cursor-not-allowed"
                title="Coming soon — AI-generated kinetic typography video from this brief"
              >
                🎬 Generate Kinetic Video <span className="text-[9px] uppercase tracking-wider ml-1 opacity-70">Soon</span>
              </Button>
            </div>
          </div>
        )}
      </StreamBlock>

      {/* LIVE LANDING PAGE PREVIEW — Glassmorphic full-page mockup */}
      <StreamBlock visible={isAfter('page')} delay={300}>
        {result && (
          <div className="space-y-4">
            <ConversionBoosters
              socialProof={result.landing_page.social_proof}
              serviceAreaZips={result.landing_page.service_area_zips || []}
              serviceAreaRequired={!!result.landing_page.service_area_required}
              serviceAreaLabel={result.landing_page.service_area_label}
              onUpdateField={updateLandingField}
            />
            <div className="relative">

            {/* Regenerate hero image button — sits above the preview, not overlapping the URL bar */}
            {phase === 'complete' && (
              <div className="flex justify-end px-3 py-2 bg-card/40 backdrop-blur-sm border-b border-border/20">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs glass border-border/50"
                  onClick={generateHeroImage}
                  disabled={generatingImage}
                >
                  {generatingImage ? (
                    <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
                  ) : (
                    <><ImagePlus className="h-3 w-3" /> Regenerate Hero</>
                  )}
                </Button>
              </div>
            )}
            <LandingPagePreview
              landingPage={result.landing_page}
              onUpdateField={updateLandingField}
              onUpdateFeature={updateFeature}
              generatingImage={generatingImage}
              fieldLockApi={fieldLockApi}
              slug={activeProject.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || undefined}
             />
           </div>
          </div>
        )}
      </StreamBlock>

      {/* A/B TEST PANEL */}
      <StreamBlock visible={isAfter('page') && phase === 'complete' && !!activeProject} delay={320}>
        {result && activeProject && (
          <ABTestPanel
            pageId={activeProject.id}
            orgId={user?.orgId || ''}
            currentValues={{
              headline: result.landing_page.headline,
              subheadline: result.landing_page.subheadline,
              cta_text: result.landing_page.cta_text,
            }}
            onApplyWinner={(field, value) => {
              if (field === 'headline' || field === 'subheadline' || field === 'cta_text') {
                updateLandingField(field, value);
              }
            }}
          />
        )}
      </StreamBlock>

      {/* THANK YOU PAGE PREVIEW */}
      <StreamBlock visible={isAfter('page') && !!result?.thank_you_page} delay={350}>
        {result?.thank_you_page && (
          <div className="glass rounded-2xl p-6 border border-border/50 space-y-4 card-hover-glow">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">Thank You Page</span>
            </div>
            {/* Inline dark preview */}
            <div
              className="rounded-xl p-8 text-center space-y-4"
              style={{
                background: '#070b10',
                color: '#e8f0f8',
                border: '1px solid rgba(232, 240, 248, 0.08)',
              }}
            >
              <h2 className="text-2xl sm:text-3xl font-semibold" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {result.thank_you_page.headline}
              </h2>
              <p className="text-sm sm:text-base max-w-lg mx-auto" style={{ color: 'rgba(232, 240, 248, 0.55)' }}>
                {result.thank_you_page.subheadline}
              </p>
              {result.thank_you_page.bonus_message && (
                <div
                  className="rounded-lg px-4 py-3 mx-auto max-w-md text-sm"
                  style={{ background: 'hsla(174, 72%, 50%, 0.08)', border: '1px solid hsla(174, 72%, 50%, 0.2)', color: 'hsl(174, 72%, 50%)' }}
                >
                  🎁 {result.thank_you_page.bonus_message}
                </div>
              )}
              <button
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: 'hsl(174, 72%, 50%)',
                  color: '#070b10',
                  boxShadow: '0 0 24px hsla(174, 72%, 50%, 0.35)',
                }}
              >
                {result.thank_you_page.cta_text}
              </button>
            </div>
          </div>
        )}
      </StreamBlock>

      {/* SOCIAL PROMO COPY */}
      <StreamBlock visible={isAfter('page') && !!result?.social_promo} delay={400}>
        {result?.social_promo && (
          <SocialPromoSection
            promo={result.social_promo}
            headline={result.landing_page.headline}
            subheadline={result.landing_page.subheadline}
            heroImage={result.landing_page.hero_image}
          />
        )}
      </StreamBlock>

      {/* Upgrade Nudge — show to free users after build completes */}
      <StreamBlock visible={phase === 'complete'} delay={200}>
        {tier === 'free' && <QuinnIdentityNudge />}
      </StreamBlock>

      {/* SUCCESS REVEAL — cinematic celebration */}
      <StreamBlock visible={phase === 'complete'} delay={100}>
        <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-6 text-center shadow-[0_0_40px_hsl(var(--primary)/0.12)] animate-in fade-in-0 zoom-in-95 duration-700">
          <div className="relative mx-auto w-14 h-14 mb-3">
            <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 rounded-full bg-primary/5" />
            <CheckCircle2 className="h-7 w-7 text-primary absolute inset-0 m-auto" />
          </div>
          <p className="text-lg font-serif text-foreground">Your funnel is built</p>
          <p className="text-xs text-muted-foreground mt-1">Review your strategy, then publish when ready.</p>
        </div>
      </StreamBlock>

      {/* COMPLETE — Start Over */}
      <StreamBlock visible={phase === 'complete'} delay={400}>
        <div className="flex items-center justify-center py-4">
          <Button onClick={reset} variant="outline" size="sm" className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" /> Start Over
          </Button>
        </div>
      </StreamBlock>
    </div>
  );
}
