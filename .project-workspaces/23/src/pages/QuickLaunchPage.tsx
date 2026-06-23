import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Sparkles, Loader2, Rocket, ArrowLeft, CheckCircle2, ExternalLink, ImageIcon, RefreshCw, MessageSquare } from 'lucide-react';
import { openQuinnHUD } from '@/features/quinn/lib/quinn-context';
import { ParticleMeshBackground } from '@/components/shared/ParticleMeshBackground';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useFunnelHub } from '@/features/projects';
import { useCurrentUser } from '@/hooks/use-current-user';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logClientError } from '@/lib/error-logger';
import { WinCardDialog } from '@/components/shared/WinCardDialog';
import { useMilestoneCelebration } from '@/hooks/use-milestone-celebration';

type Stage = 'idea' | 'generating' | 'review' | 'deploying' | 'live';

interface LandingDraft {
  headline: string;
  subheadline: string;
  cta_text: string;
  features: { title: string; description: string }[];
  social_proof: string;
  hero_image?: string | null;
}

export default function QuickLaunchPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useFunnelHub();
  const { user } = useCurrentUser();
  const { winCard, setWinCard, celebrate } = useMilestoneCelebration(user?.orgId);
  const [stage, setStage] = useState<Stage>('idea');
  const [idea, setIdea] = useState('');
  const [draft, setDraft] = useState<LandingDraft | null>(null);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [heroLoading, setHeroLoading] = useState(false);

  // Bridge: receive a pre-filled idea from MarQ ("Turn this into a launch")
  useEffect(() => {
    const prefill = (location.state as { prefillIdea?: string } | null)?.prefillIdea;
    if (prefill && !idea) {
      setIdea(prefill);
      // Clear state so back/forward doesn't re-prefill
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateHero = async () => {
    if (!draft) return;
    setHeroLoading(true);
    try {
      const prompt = `Cinematic, premium hero image for a landing page. Concept: "${draft.headline}". Tone: ${draft.subheadline}. Style: dark obsidian background, soft teal accent glow, abstract editorial photography, no text, no logos, 16:9 composition, depth of field, magazine-quality.`;
      const { data, error } = await supabase.functions.invoke('studio-generate', {
        body: { mode: 'hero', prompt },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const url = data?.imageUrl;
      if (!url) throw new Error('No image returned');
      updateDraft({ hero_image: url });
      toast.success('Hero image generated');
    } catch (err: any) {
      logClientError(err?.message || 'Hero image generation failed', {
        stack: err?.stack,
        component: 'QuickLaunchPage.generateHero',
      });
      toast.error('MarQ could not generate the hero. Try again.');
    } finally {
      setHeroLoading(false);
    }
  };

  const generate = async () => {
    if (idea.trim().length < 8) {
      toast.error('Tell MarQ a bit more about your idea');
      return;
    }
    setStage('generating');
    try {
      // Use ai-build-stream to draft a landing page
      const { data, error } = await supabase.functions.invoke('ai-build-stream', {
        body: { prompt: idea, mode: 'quick_launch' },
      });
      if (error) throw error;

      // Fallback: synthesize a draft if AI returns nothing structured
      const lp = (data?.landingPage || data?.result?.landingPage) as LandingDraft | undefined;
      const synth: LandingDraft = lp || {
        headline: idea.split('.')[0].slice(0, 80),
        subheadline: 'A focused, no-friction way to capture leads while you build the rest.',
        cta_text: 'Get Early Access',
        features: [
          { title: 'Built in 30 minutes', description: 'From raw idea to live URL — no setup tax.' },
          { title: 'Lead capture first', description: 'Every visitor becomes a signal in your dashboard.' },
          { title: 'Refine later', description: 'MarQ learns from real traffic to sharpen the message.' },
        ],
        social_proof: 'Trusted by founders shipping their first 30-minute funnels.',
      };
      setDraft(synth);
      setStage('review');
    } catch (err: any) {
      logClientError(err?.message || 'Quick Launch generation failed', {
        stack: err?.stack,
        component: 'QuickLaunchPage.generate',
      });
      toast.error('MarQ hit a snag generating that. Try again.');
      setStage('idea');
    }
  };

  const updateDraft = (patch: Partial<LandingDraft>) => {
    setDraft((d) => (d ? { ...d, ...patch } : d));
  };

  const deploy = async () => {
    if (!draft || !user?.orgId) return;
    setStage('deploying');
    try {
      // Create a fresh project for this launch
      const projectName = draft.headline.slice(0, 60) || 'Quick Launch';
      const slug = `ql-${Date.now().toString(36)}`;
      const { data: project, error: projErr } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          slug,
          org_id: user.orgId,
          goal: idea,
          status: 'active',
        })
        .select('id, slug')
        .single();
      if (projErr || !project) throw projErr || new Error('Project creation failed');

      const { data, error } = await supabase.functions.invoke('deploy-landing-page', {
        body: {
          projectId: project.id,
          landingPage: draft,
          theme: 'cinematic',
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const url = data?.url || `/p/${project.slug}-page`;
      setLiveUrl(url);
      setStage('live');
      toast.success('You are live.', { icon: <Rocket className="h-4 w-4" /> });
      celebrate('first_deploy', {
        milestone: 'first_deploy',
        headline: 'First funnel live',
        metric: projectName,
        subtitle: 'You just shipped your first lead engine.',
      });
    } catch (err: any) {
      logClientError(err?.message || 'Quick Launch deploy failed', {
        stack: err?.stack,
        component: 'QuickLaunchPage.deploy',
      });
      toast.error('Deploy failed. Try once more.');
      setStage('review');
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground relative overflow-x-hidden">
      <ParticleMeshBackground theme={theme} />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </button>

        {stage === 'idea' && (
          <section className="glass rounded-3xl border border-primary/20 p-6 sm:p-10 shadow-[0_0_40px_hsl(var(--primary)/0.08)]">
            <p className="text-xs uppercase tracking-[0.22em] text-primary">Quick Launch</p>
            <h1 className="mt-3 text-3xl font-serif tracking-tight sm:text-4xl">
              Turn your idea into a live URL
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Drop your idea below. MarQ will draft a landing page, you confirm, we deploy.
            </p>

            <Textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g. A 7-day cold email course for B2B founders who hate writing..."
              className="mt-6 min-h-[140px] resize-none text-base bg-background/50 border-border/50 focus-visible:border-primary/60"
              autoFocus
            />

            <Button
              onClick={generate}
              disabled={idea.trim().length < 8}
              size="lg"
              className="mt-5 w-full gap-2 sm:w-auto"
            >
              <Sparkles className="h-4 w-4" />
              Generate Launch Plan
              <ArrowRight className="h-4 w-4" />
            </Button>

            <button
              type="button"
              onClick={() => openQuinnHUD(idea.trim() || 'Help me sharpen a launch idea. Ask me questions until we have a single sentence I can drop into Quick Launch.')}
              className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Not sure yet? Ask MarQ to help shape it
            </button>
          </section>
        )}

        {stage === 'generating' && (
          <section className="glass rounded-3xl border border-border/30 p-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">MarQ is drafting your launch...</p>
          </section>
        )}

        {stage === 'review' && draft && (
          <section className="glass rounded-3xl border border-border/30 p-6 sm:p-8">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Review · One screen</p>
            <h2 className="mt-2 text-2xl font-serif tracking-tight">Confirm your launch</h2>

            <div className="mt-6 flex flex-col gap-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Headline</label>
                <Input
                  value={draft.headline}
                  onChange={(e) => updateDraft({ headline: e.target.value })}
                  className="mt-1.5 text-base"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Subheadline</label>
                <Textarea
                  value={draft.subheadline}
                  onChange={(e) => updateDraft({ subheadline: e.target.value })}
                  className="mt-1.5 min-h-[70px] resize-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Call to action</label>
                <Input
                  value={draft.cta_text}
                  onChange={(e) => updateDraft({ cta_text: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Social proof</label>
                <Input
                  value={draft.social_proof}
                  onChange={(e) => updateDraft({ social_proof: e.target.value })}
                  className="mt-1.5"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Hero image</label>
                {draft.hero_image ? (
                  <div className="mt-1.5 relative overflow-hidden rounded-xl border border-border/40 group">
                    <img
                      src={draft.hero_image}
                      alt="Generated hero"
                      className="w-full aspect-video object-cover"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={generateHero}
                      disabled={heroLoading}
                      className="absolute bottom-2 right-2 gap-1.5 backdrop-blur"
                    >
                      {heroLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      Regenerate
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateHero}
                    disabled={heroLoading}
                    className="mt-1.5 w-full gap-2 border-dashed h-24"
                  >
                    {heroLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        MarQ is painting...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Let MarQ generate a hero image
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setStage('idea')}>
                Start over
              </Button>
              <Button onClick={deploy} className="gap-2">
                <Rocket className="h-4 w-4" />
                Launch Now
              </Button>
            </div>
          </section>
        )}

        {stage === 'deploying' && (
          <section className="glass rounded-3xl border border-primary/30 p-10 text-center">
            <Rocket className="mx-auto h-8 w-8 animate-pulse text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Deploying your funnel...</p>
          </section>
        )}

        {stage === 'live' && liveUrl && (
          <section className="glass rounded-3xl border border-primary/40 p-8 sm:p-10 text-center shadow-[0_0_40px_hsl(var(--primary)/0.18)]">
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-3xl font-serif tracking-tight">You are live.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Every form submission appears instantly on your dashboard.
            </p>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button asChild variant="outline" className="gap-2">
                <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  View live page
                </a>
              </Button>
              <Button onClick={() => navigate('/dashboard')} className="gap-2">
                Back to dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>
        )}
      </div>

      {winCard && (
        <WinCardDialog
          open={!!winCard}
          onOpenChange={(o) => !o && setWinCard(null)}
          input={winCard}
        />
      )}
    </div>
  );
}
