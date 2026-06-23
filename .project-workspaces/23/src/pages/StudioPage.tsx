import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectBrandBar } from '@/components/shared/ProjectBrandBar';
import { Sparkles, Brain, Loader2, Palette, Zap, Wand2 } from 'lucide-react';
import { QuickFlyerDialog } from '@/features/marketing-studio';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  BrandVaultPanel,
  BrandEnvironmentsPanel,
  TemplateGallery,
  AssetLibrary,
  
  StrategistPerformancePanel,
  StrategistDialog,
  useBrandKit,
  type StrategistPlan,
} from '@/features/marketing-studio';
import { LogoGenerator } from '@/features/logo-generator';
import { StudioEngine } from '@/features/studio-engine';
import { BrandVoicePanel } from '@/features/brand-voice';
import { useFunnelHub } from '@/features/projects';
import { HeaderProjectSwitcher } from '@/components/shared/HeaderProjectSwitcher';
import SocialLabPage from '@/pages/SocialLabPage';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';

const VALID_TABS = ['engine', 'strategist', 'create', 'logo', 'social'] as const;
type StudioTab = typeof VALID_TABS[number];
const TAB_STORAGE_KEY = 'intoiq_studio_tab';

export default function StudioPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = searchParams.get('tab') as StudioTab | null;
  const stored = (typeof window !== 'undefined'
    ? (localStorage.getItem(TAB_STORAGE_KEY) as StudioTab | null)
    : null);
  const incomingPrompt = searchParams.get('prompt') ?? undefined;
  const incomingAsset = searchParams.get('asset') ?? undefined;
  const incomingMode = searchParams.get('mode') as
    | 'logo' | 'flyer' | 'social' | 'hero' | 'freeform' | null;
  // If the user arrived via a MarQ chat handoff (prompt or asset query),
  // force the Engine tab so they see what they just made.
  const handoff = !!(incomingPrompt || incomingAsset);
  const activeTab: StudioTab = handoff
    ? 'engine'
    : initial && VALID_TABS.includes(initial)
      ? initial
      : stored && VALID_TABS.includes(stored)
        ? stored
        : 'strategist';


  const { activeProject } = useFunnelHub();
  const projectId = activeProject?.id ?? null;
  const projectName = activeProject?.name ?? null;
  const { effective: brand } = useBrandKit(projectId);
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  const [strategistOpen, setStrategistOpen] = useState(false);
  const [scaffolding, setScaffolding] = useState(false);
  const [quickFlyerOpen, setQuickFlyerOpen] = useState(false);

  const handleStrategistApply = async (plan: StrategistPlan) => {
    if (!projectId || !activeProject) return;
    if (scaffolding) return;
    setScaffolding(true);
    try {
      const orgId = user?.orgId;
      if (!orgId) throw new Error('No org');

      // 1. Page stub seeded with the awareness asset
      const awarenessAsset = plan.assets.find((a) => a.stage === 'awareness') ?? plan.assets[0];
      if (!awarenessAsset) throw new Error('Plan has no assets');
      const slug = `${plan.campaign_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'campaign'}-${Date.now()}`;

      const { data: newPage, error: pageError } = await supabase
        .from('pages')
        .insert([
          {
            org_id: orgId,
            project_id: projectId,
            slug,
            title: awarenessAsset.headline.slice(0, 80),
            theme: 'cinematic',
            content_blocks: [
              {
                type: 'hero',
                headline: awarenessAsset.headline,
                subhead: awarenessAsset.subhead,
                cta_text: awarenessAsset.cta,
              },
            ] as never,
            is_published: false,
          },
        ])
        .select('id')
        .single();
      if (pageError) throw pageError;

      // 2. Email sequence seeds — additive, one per stage
      const emailRows = plan.assets.map((asset, i) => ({
        project_id: projectId,
        org_id: orgId,
        subject: asset.headline.slice(0, 80),
        body: `${asset.subhead}\n\n${asset.cta}`,
        purpose: asset.stage,
        delay_days: i * 2,
        trigger_stage:
          asset.stage === 'awareness' ? 'new' : asset.stage === 'desire' ? 'contacted' : 'qualified',
        order_index: i,
      }));
      if (emailRows.length > 0) {
        const { error: seqError } = await supabase.from('email_sequences').insert(emailRows);
        if (seqError) throw seqError;
      }

      // 3. Build MarQ handoff prompt
      const prompt = `Campaign scaffold ready: "${plan.campaign_name}". ${plan.strategic_rationale} I've created a funnel page (${awarenessAsset.headline}) and seeded ${emailRows.length} emails across the awareness → desire → action arc. Let's build the page copy and complete the funnel flow now.`;

      // 4. Hand off into the workspace — BuildStream will auto-fire on initialPrompt
      toast.success(`"${plan.campaign_name}" scaffold created — building now`);
      void newPage; // page id available for future deep-link
      navigate('/workspace', { state: { prompt } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Scaffold failed');
    } finally {
      setScaffolding(false);
    }
  };

  const handleStartCampaign = () => {
    if (!projectId) {
      toast.error('Open a project first to launch the Strategist');
      return;
    }
    setStrategistOpen(true);
  };

  // Keep URL in sync so deep-links + back button work cleanly.
  useEffect(() => {
    if (initial !== activeTab) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', activeTab);
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist active tab across sessions.
  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {
      /* storage may be blocked — non-fatal */
    }
  }, [activeTab]);

  const handleTabChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    setSearchParams(next, { replace: true });
  };

  const isFullBleed = activeTab === 'logo' || activeTab === 'social';

  return (
    <>
      <Helmet>
        <title>Marketing Studio · IntoIQ</title>
        <meta
          name="description"
          content="Strategist, brand vault, logos and social — your full marketing studio in one place."
        />
      </Helmet>

      <div
        data-fullbleed={isFullBleed ? 'true' : undefined}
        className={isFullBleed ? 'min-w-0 overflow-x-hidden pb-40' : 'p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto pb-32'}
      >
        {!isFullBleed && (
          <header className="mb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-gold" />
                  <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
                    Marketing Studio
                  </p>
                </div>
                <h1 className="mt-1 text-3xl sm:text-4xl tracking-tight font-serif">
                  Brand, build, distribute.
                </h1>
                <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                  Brand once, deploy everywhere. Templates, logos, and social — locked to your signature look.
                </p>
              </div>
              <div className="shrink-0 pt-1 flex items-center gap-2">
                <button
                  onClick={() => setQuickFlyerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1.5 text-[11px] font-medium text-gold hover:bg-gold/20 hover:border-gold/60 transition-colors"
                >
                  <Zap className="h-3 w-3" />
                  Quick Flyer
                </button>
                <HeaderProjectSwitcher />
              </div>
            </div>
          </header>
        )}

        {!isFullBleed && (
          <ActiveBrandStrip brand={brand} />
        )}

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="-mx-4 sm:mx-0 overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex w-max sm:grid sm:w-full sm:grid-cols-5 gap-1 px-4 sm:px-0">
              <TabsTrigger value="engine" className="text-xs sm:text-sm">Engine</TabsTrigger>
              <TabsTrigger value="strategist" className="text-xs sm:text-sm">Strategist</TabsTrigger>
              <TabsTrigger value="create" className="text-xs sm:text-sm">Create</TabsTrigger>
              <TabsTrigger value="logo" className="text-xs sm:text-sm">Logo</TabsTrigger>
              <TabsTrigger value="social" className="text-xs sm:text-sm">Social</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="engine" className="mt-5 space-y-4">
            <section className="glass rounded-3xl border border-border/40 p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5 shrink-0">
                  <Wand2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Studio Engine</h2>
                  <p className="text-xs text-muted-foreground">
                    {handoff
                      ? "Here's the asset you just generated in chat — refine the prompt and regenerate, or download below."
                      : 'One unified generator for logos, flyers, social, hero, and free-form visuals — brand-aware by default.'}
                  </p>
                </div>
              </div>
              <StudioEngine
                mode={incomingMode ?? undefined}
                defaultPrompt={incomingPrompt}
                initialImageUrl={incomingAsset}
              />
            </section>
          </TabsContent>


          <TabsContent value="strategist" className="mt-5 space-y-6">
            <section className="glass rounded-3xl border border-gold/30 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-gold/30 bg-gold/10 p-2.5 shrink-0">
                    <Brain className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-gold/80">
                      MarQ · Marketing Strategist
                    </div>
                    <h2 className="mt-1 font-serif text-lg sm:text-xl leading-tight">
                      Start a campaign with MarQ
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground max-w-md">
                      {projectId
                        ? 'MarQ drafts a 3-asset launch campaign — awareness, desire, action — locked to your brand.'
                        : 'Open a project from the switcher to launch the Strategist.'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleStartCampaign}
                  disabled={!projectId || scaffolding}
                  className="bg-gold text-black hover:bg-gold/90 shrink-0"
                >
                  {scaffolding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {scaffolding ? 'Scaffolding…' : 'Start a campaign'}
                </Button>
              </div>
            </section>
            <StrategistPerformancePanel projectId={projectId} />
            {/* Campaign history now lives in the Project Vault on the dashboard. */}
          </TabsContent>

          <TabsContent value="create" className="mt-5 space-y-6">
            {/* Hero CTA — fastest path to a branded asset */}
            <section className="glass rounded-3xl border border-gold/30 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-gold/30 bg-gold/10 p-2.5 shrink-0">
                    <Wand2 className="h-4 w-4 text-gold" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.22em] text-gold/80">
                      Generate
                    </div>
                    <h2 className="mt-1 font-serif text-lg sm:text-xl leading-tight">
                      Make an asset now
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground max-w-md">
                      Flyer, social tile, or story — pre-filled with your brand. No project required.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setQuickFlyerOpen(true)}
                  className="bg-gold text-black hover:bg-gold/90 shrink-0"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Flyer
                </Button>
              </div>
            </section>

            {/* Recents up front */}
            <AssetLibrary />

            {/* Brand setup tucked into accordions */}
            <CollapsibleSection title="Brand Vault" defaultOpen={false}>
              <BrandVaultPanel />
            </CollapsibleSection>
            <CollapsibleSection title="Brand Voice" defaultOpen={false}>
              <BrandVoicePanel />
            </CollapsibleSection>
            <CollapsibleSection title="Brand Environments" defaultOpen={false}>
              <BrandEnvironmentsPanel />
            </CollapsibleSection>
            <CollapsibleSection title="Templates" defaultOpen={false}>
              <TemplateGallery />
            </CollapsibleSection>
          </TabsContent>

          <TabsContent value="logo" className="mt-5">
            {/* TODO: move into Create tab with full-screen expand trigger — next UX pass */}
            {/* Logo Generator folded in — full feature, no separate route needed */}
            <div className="-mx-4 sm:-mx-6 lg:-mx-8">
              <LogoGenerator />
            </div>
          </TabsContent>

          <TabsContent value="social" className="mt-5">
            {/* Social Lab folded in. The page already manages its own header + spacing. */}
            <div className="min-w-0 overflow-x-hidden -mt-4">
              <SocialLabPage />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <StrategistDialog
        open={strategistOpen}
        onOpenChange={setStrategistOpen}
        projectId={projectId}
        brand={brand}
        onApply={handleStrategistApply}
      />

      <QuickFlyerDialog open={quickFlyerOpen} onOpenChange={setQuickFlyerOpen} />
    </>
  );
}

function ActiveBrandStrip({ brand }: { brand: ReturnType<typeof useBrandKit>['effective'] }) {
  const accent = brand.accent_hex || '#D4AF37';
  const name = brand.brand_name || 'Untitled brand';
  const voice = brand.voice?.trim();
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="mb-5 glass rounded-2xl border border-border/30 px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3">
      {brand.logo_url ? (
        <img
          src={brand.logo_url}
          alt={`${name} logo`}
          className="h-9 w-9 rounded-lg object-cover border border-border/40 shrink-0"
        />
      ) : (
        <div
          className="h-9 w-9 rounded-lg shrink-0 flex items-center justify-center font-serif text-sm border border-border/40"
          style={{ background: `${accent}1a`, color: accent }}
        >
          {initial}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            Active brand
          </span>
          <span
            className="h-2 w-2 rounded-full shrink-0 ring-1 ring-border/40"
            style={{ background: accent }}
            aria-label={`Accent ${accent}`}
          />
        </div>
        <div className="mt-0.5 flex items-baseline gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{name}</span>
          {voice && (
            <span className="hidden sm:inline text-xs text-muted-foreground truncate">
              · {voice}
            </span>
          )}
        </div>
      </div>
      <Link
        to="/settings/brand"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border/40 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-border transition-colors"
      >
        <Palette className="h-3 w-3" />
        Edit
      </Link>
    </div>
  );
}

