import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ArrowRight, Sparkles, Rocket, CheckCircle2, Circle, Activity, TrendingUp, ChevronDown, ChevronUp, X, HelpCircle, Globe, FlaskConical, Download, MessageSquare, Search, Wand2, FolderKanban, Pencil } from 'lucide-react';
import { EditableProjectTitle } from '@/components/shared/EditableProjectTitle';
import { useQuery } from '@tanstack/react-query';
import { ParticleMeshBackground } from '@/components/shared/ParticleMeshBackground';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useFunnelHub } from '@/features/projects';
import { supabase } from '@/integrations/supabase/client';
import { CreateFirstProjectModal } from '@/components/shared/CreateFirstProjectModal';
import { QuinnWelcomeOverlay } from '@/components/shared/QuinnWelcomeOverlay';
import { PulseStatsWidget } from '@/components/shared/PulseStatsWidget';
import { LeadCommandFeed } from '@/components/shared/LeadCommandFeed';
import { SignalTaggedLeadFeed } from '@/components/shared/SignalTaggedLeadFeed';
import { SystemArchitectureMap } from '@/components/shared/SystemArchitectureMap';
import { NeuralLinkPanel } from '@/components/shared/NeuralLinkPanel';
import { QuinnHudFeed } from '@/components/shared/QuinnHudFeed';
import { PushPermissionBanner } from '@/components/shared/PushPermissionBanner';
import { PlanTourNudge } from '@/components/shared/PlanTourNudge';
import { WidgetErrorBoundary } from '@/components/ErrorBoundary';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';

import { StrategyLogCard } from '@/components/shared/StrategyLogCard';
import { useCurrentUser } from '@/hooks/use-current-user';
import { MorningBriefing } from '@/features/quinn/components/MorningBriefing';
import { LockedBriefingShell } from '@/features/quinn/components/LockedBriefingShell';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { QuickFlyerDialog } from '@/features/marketing-studio';
import { UnifiedCreateStudio } from '@/components/shared/UnifiedCreateStudio';
import { CampaignAutomations } from '@/components/shared/CampaignAutomations';
import { MarqSuggestionsCard } from '@/components/shared/MarqSuggestionsCard';
import { ProactiveBundlesCard } from '@/components/shared/ProactiveBundlesCard';


export default function DashboardPage() {
  const navigate = useNavigate();
  const { projects, activeProject, theme, setActiveProject, addProject, updateProject, isLoading } = useFunnelHub();
  const { user } = useCurrentUser();
  const { isGrowth } = useSubscription();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(false);
  const [showQuickFlyer, setShowQuickFlyer] = useState(false);
  const [toolkitDismissed, setToolkitDismissed] = useState(() => localStorage.getItem('intoiq_toolkit_dismissed') === 'true');
  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [signalRecovered, setSignalRecovered] = useState<{ projectId: string; headline: string } | null>(() => {
    try {
      const raw = localStorage.getItem('intoiq_signal_recovered');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed?.projectId || !parsed?.headline) return null;
      // Auto-expire after 7 days
      if (parsed.at && Date.now() - parsed.at > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem('intoiq_signal_recovered');
        return null;
      }
      return { projectId: parsed.projectId, headline: parsed.headline };
    } catch {
      return null;
    }
  });

  const dismissSignalRecovered = () => {
    setSignalRecovered(null);
    try { localStorage.removeItem('intoiq_signal_recovered'); } catch { /* noop */ }
  };

  const dismissToolkit = () => {
    setToolkitDismissed(true);
    localStorage.setItem('intoiq_toolkit_dismissed', 'true');
  };

  const hasProjects = projects.length > 0;

  // Org-wide counts (independent of active project) — fixes "0 Notes / 0 Links" bug
  // when notes/links exist on non-active projects
  const { data: totalNotes = 0 } = useQuery({
    queryKey: ['org-notes-count', user?.orgId],
    queryFn: async () => {
      const { count } = await supabase.from('notes').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    enabled: !!user?.orgId,
  });


  const { data: totalLinks = 0 } = useQuery({
    queryKey: ['org-links-count', user?.orgId],
    queryFn: async () => {
      const { count } = await supabase.from('links').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    enabled: !!user?.orgId,
  });

  // Query published pages count for checklist
  const { data: publishedCount = 0 } = useQuery({
    queryKey: ['published-pages-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('pages')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);
      if (error) return 0;
      return count ?? 0;
    },
  });

  // Query all projects' funnel_steps count for checklist (independent of active project)
  const { data: allStepsCount = 0 } = useQuery({
    queryKey: ['all-funnel-steps-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('funnel_steps')
        .select('*', { count: 'exact', head: true });
      if (error) return 0;
      return count ?? 0;
    },
  });

  const totalSteps = allStepsCount;

  const { data: blueprintSignal } = useQuery({
    queryKey: ['blueprint-signal', activeProject?.id],
    queryFn: async () => {
      if (!activeProject?.id) return null;
      const { data } = await supabase
        .from('project_context')
        .select('directive, created_at')
        .eq('project_id', activeProject.id)
        .eq('context_type', 'signal_lab')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      try { return JSON.parse(data.directive); } catch { return null; }
    },
    enabled: !!activeProject?.id,
  });

  const { data: strategyBlueprint } = useQuery({
    queryKey: ['strategy-blueprint-dash', activeProject?.id],
    queryFn: async () => {
      if (!activeProject?.id) return null;
      const { data } = await supabase
        .from('project_context')
        .select('directive, created_at')
        .eq('project_id', activeProject.id)
        .eq('context_type', 'strategy_blueprint')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      try { return JSON.parse(data.directive); } catch { return null; }
    },
    enabled: !!activeProject?.id,
  });

  // Checklist items — note step removed; "Strategy Log" lives as its own dashboard card now
  const checklist = [
    { label: 'Create your first project', done: projects.length > 0, action: () => setShowCreateModal(true) },
    { label: 'Build your first funnel', done: allStepsCount > 0, action: () => navigate('/workspace', { state: { tab: 'funnel' } }) },
    { label: 'Go live', done: publishedCount > 0, action: () => navigate('/workspace', { state: { tab: 'publish' } }) },
  ];
  const completedCount = checklist.filter(i => i.done).length;
  const allComplete = completedCount === checklist.length;

  const displayedProjects = projects.slice(0, 5);

  const firstName = useMemo(() => {
    const raw = (user?.email || '').trim();
    if (!raw) return null;
    const first = raw.split(/[\s@.]/)[0];
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
  }, [user?.email]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Working late';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 22) return 'Good evening';
    return 'Working late';
  }, []);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground relative overflow-x-hidden">
      <ParticleMeshBackground theme={theme} />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl lg:max-w-none flex-col gap-6 px-4 py-6 pb-40 sm:px-6 sm:py-10 sm:pb-44 lg:px-8">
        {/* Unified Focused Hero — greeting, active project anchor, brief, primary action */}
        <section className="glass relative overflow-hidden rounded-3xl border border-primary/25 p-5 sm:p-7 shadow-[0_0_38px_-12px_hsl(var(--primary)/0.25)]">
          <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-gold/10 pointer-events-none opacity-60" />
          <div className="relative">
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary/80">
              {greeting}{firstName ? `, ${firstName}` : ''}
            </p>

            {hasProjects && activeProject ? (
              <>
                <div className="mt-2 flex items-start gap-2">
                  <FolderKanban className="h-4 w-4 text-primary shrink-0 mt-1.5" />
                  <div className="min-w-0 flex-1">
                    <EditableProjectTitle
                      projectId={activeProject.id}
                      name={activeProject.name}
                      onRename={(id, newName) => updateProject(id, { name: newName })}
                      className="min-w-0 text-2xl sm:text-3xl font-serif tracking-tight"
                    />
                  </div>
                </div>
                {activeProject.description && (
                  <div className="mt-3 max-w-2xl">
                    <div className="relative">
                      <p
                        className={cn(
                          'text-sm sm:text-[15px] leading-relaxed text-foreground/80 whitespace-pre-wrap',
                          !briefExpanded && 'line-clamp-4'
                        )}
                      >
                        {activeProject.description}
                      </p>
                      {!briefExpanded && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-background/95" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setBriefExpanded((v) => !v)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-primary/80 hover:text-primary transition-colors"
                    >
                      {briefExpanded ? 'Collapse' : 'View Strategy'}
                      {briefExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  </div>
                )}
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => navigate('/workspace')} className="gap-2">
                    Continue building
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => navigate('/studio')}
                    variant="outline"
                    className="gap-2 border-gold/40 bg-background/40 text-gold hover:bg-gold/10 hover:text-gold hover:border-gold/60"
                  >
                    <Wand2 className="h-4 w-4" />
                    Marketing Studio
                  </Button>
                  <Button
                    onClick={() => navigate('/analytics')}
                    variant="ghost"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <Activity className="h-4 w-4" />
                    Signal Strength
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h1 className="mt-2 text-2xl sm:text-3xl font-serif tracking-tight">
                  Launch your first funnel
                </h1>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Tell MarQ your idea and get a strategy, landing page, and lead capture — ready in minutes.
                </p>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Start a Project
                  </Button>
                  <Button onClick={() => navigate('/launch')} variant="outline" className="gap-2">
                    <Rocket className="h-4 w-4" />
                    Browse Templates
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Ultimate Create — unified prompt + attachments + color + inspired gallery. */}
          <div className="relative mt-6">
            <UnifiedCreateStudio />
          </div>

          {/* Campaign Automations — visual timeline for sequencing generated assets. */}
          <div className="relative mt-6">
            <CampaignAutomations />
          </div>

          <button
            onClick={() => {
              const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
              window.dispatchEvent(event);
            }}
            className="relative flex items-center gap-3 w-full rounded-2xl border border-primary/25 bg-background/60 backdrop-blur-md px-4 py-3 text-left text-sm text-muted-foreground transition-all hover:border-primary/40 hover:bg-background/70 mt-5"
          >
            <Search className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="flex-1">Search projects, pages, notes, help...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border/30 bg-background/40 px-1.5 font-mono text-[10px] text-muted-foreground/60">
              ⌘K
            </kbd>
          </button>
        </section>


        {/* Morning Briefing — HUD slot. Live for Innovation, encrypted-shadow for everyone else. */}
        {signalRecovered && (
          <div className="glass relative rounded-3xl border border-primary/40 p-5 sm:p-6 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 blur-md opacity-60 animate-pulse-glow pointer-events-none" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-medium">Signal Recovered</p>
                <p className="mt-1 text-sm sm:text-base font-serif text-foreground line-clamp-2">
                  {signalRecovered.headline}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  MarQ already mapped your signal from the audit. Open Signal Lab to refine.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => { dismissSignalRecovered(); navigate('/signal-lab'); }} className="gap-1.5">
                    Open Signal Lab <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissSignalRecovered}>
                    Dismiss
                  </Button>
                </div>
              </div>
              <button
                onClick={dismissSignalRecovered}
                aria-label="Dismiss"
                className="text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Quick Launch — primary CTA, kept standalone */}
        <button
          onClick={() => navigate('/launch')}
          className="group glass relative overflow-hidden rounded-3xl border border-primary/30 p-5 sm:p-7 text-left transition-all hover:border-primary/60 hover:shadow-[0_0_40px_hsl(var(--primary)/0.15)] active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Rocket className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.22em] text-primary">New Funnel</p>
              <h2 className="mt-1 text-xl font-serif tracking-tight sm:text-2xl">Start building</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tell MarQ your idea and get a strategy, landing page, and lead capture — ready in minutes.
              </p>
            </div>
            <ArrowRight className="hidden sm:block h-5 w-5 text-primary opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
          </div>
        </button>

        {/* INTELLIGENCE BAND — collapsed by default. Briefings, logs, signal & strategy context. */}
        {hasProjects && (
          <CollapsibleSection title="Intelligence" defaultOpen={false}>
            <div className="flex flex-col gap-6">
              {user?.orgId && (
                <WidgetErrorBoundary>
                  {isGrowth ? (
                    <MorningBriefing orgId={user.orgId} />
                  ) : (
                    <LockedBriefingShell>
                      <MorningBriefing orgId={user.orgId} />
                    </LockedBriefingShell>
                  )}
                </WidgetErrorBoundary>
              )}

              <StrategyLogCard
                projectId={activeProject?.id ?? null}
                projectName={activeProject?.name ?? null}
                orgId={user?.orgId}
              />

              {blueprintSignal && (
                <button
                  onClick={() => navigate('/signal-lab')}
                  className="group glass relative rounded-3xl border border-primary/20 p-5 sm:p-7 text-left transition-all hover:border-primary/40"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase tracking-[0.22em] text-primary">Signal Lab</p>
                      <p className="mt-1 text-sm font-medium text-foreground truncate">
                        {blueprintSignal.oneLiner || 'Your brand signal is locked'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Identity locked · Click to view or update</p>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                  </div>
                </button>
              )}

              <button
                onClick={() => navigate('/strategy')}
                className="group glass relative rounded-3xl border border-primary/20 p-5 sm:p-7 text-left transition-all hover:border-primary/40"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.22em] text-primary">Strategy Blueprint</p>
                    <p className="mt-1 text-sm font-medium text-foreground truncate">
                      {strategyBlueprint
                        ? strategyBlueprint.sections?.[0]?.points?.[0] || 'Blueprint ready'
                        : 'Map your acquisition, retention and revenue'}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {strategyBlueprint ? 'Click to view or update' : 'Generate with MarQ →'}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </button>

              {activeProject && (
                <WidgetErrorBoundary>
                  <NeuralLinkPanel projectId={activeProject.id} orgId={user?.orgId} />
                </WidgetErrorBoundary>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Plan tour nudge — first-time orientation for free-tier users */}
        <PlanTourNudge />

        {/* Push notification permission prompt */}
        <PushPermissionBanner />

        {/* PIPELINE BAND — open by default. Live system + lead flow + onboarding checklist. */}
        {hasProjects && (
          <CollapsibleSection title="Pipeline" defaultOpen={true}>
            <div className="flex flex-col gap-6">
              {activeProject && (
                <WidgetErrorBoundary>
                  <SystemArchitectureMap projectId={activeProject.id} />
                </WidgetErrorBoundary>
              )}

              {activeProject ? (
                <WidgetErrorBoundary>
                  <SignalTaggedLeadFeed projectId={activeProject.id} />
                </WidgetErrorBoundary>
              ) : (
                <WidgetErrorBoundary><LeadCommandFeed /></WidgetErrorBoundary>
              )}

              {!allComplete && (
                <section className="glass rounded-3xl border border-border/30 p-5 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-xl font-serif tracking-tight">Get your first funnel live</h2>
                    <span className="text-xs text-muted-foreground">{completedCount} of {checklist.length} complete</span>
                  </div>
                  <Progress value={(completedCount / checklist.length) * 100} className="mt-3 h-1.5" />
                  <div className="mt-5 flex flex-col gap-2">
                    {checklist.map((item) => (
                      <button
                        key={item.label}
                        onClick={item.done ? undefined : item.action}
                        disabled={item.done}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                          item.done ? 'opacity-60 cursor-default' : 'hover:bg-muted/30 active:scale-[0.99]'
                        }`}
                      >
                        {item.done ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-muted-foreground/40" />
                        )}
                        <span className={`text-sm ${item.done ? 'line-through text-muted-foreground' : 'font-medium text-foreground'}`}>
                          {item.label}
                        </span>
                        {!item.done && <ArrowRight className="ml-auto h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </CollapsibleSection>
        )}


        {/* Pulse Check Widget — single metrics surface (2x2 stats grid + duplicate Active project / Quick actions / Your projects / Template Marketplace removed) */}
        {hasProjects && <WidgetErrorBoundary><PulseStatsWidget /></WidgetErrorBoundary>}

        {/* MarQ Proactive Bundles — one-tap operational packages */}
        {hasProjects && user?.orgId && (
          <WidgetErrorBoundary>
            <ProactiveBundlesCard orgId={user.orgId} />
          </WidgetErrorBoundary>
        )}

        {/* MarQ Suggestions — proactive coaching from live org signals */}
        {hasProjects && user?.orgId && (
          <WidgetErrorBoundary>
            <MarqSuggestionsCard orgId={user.orgId} />
          </WidgetErrorBoundary>
        )}


        {hasProjects && (
          <>


            {/* Optimization Toolkit — collapsible, dismissible */}
            {!toolkitDismissed && (
              <section className="rounded-3xl border border-primary/30 bg-primary/[0.04] backdrop-blur-xl shadow-[0_0_28px_hsl(var(--primary)/0.18)] overflow-hidden">
                <div className="flex items-center justify-between p-5 sm:p-6">
                  <button
                    onClick={() => setToolkitOpen(o => !o)}
                    className="flex items-center gap-2 text-left group"
                  >
                    <ChevronDown className={`h-4 w-4 text-primary transition-transform duration-200 ${toolkitOpen ? 'rotate-180' : ''}`} />
                    <div>
                      <h2 className="text-lg font-serif tracking-tight">Power Moves</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Your optimization toolkit</p>
                    </div>
                  </button>
                  <button
                    onClick={dismissToolkit}
                    className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/30 transition-colors"
                    aria-label="Dismiss toolkit"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {toolkitOpen && (
                  <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-col gap-2">
                    {[
                      { icon: Globe, label: 'Connect your domain', desc: 'Set up a custom domain for your funnels.', action: () => navigate('/settings') },
                      { icon: FlaskConical, label: 'Set up A/B testing', desc: 'Run experiments to optimize conversion.', action: () => navigate('/analytics') },
                      { icon: Download, label: 'Export your leads', desc: 'Download contacts and subscriber data.', action: () => navigate('/analytics') },
                      { icon: MessageSquare, label: 'Need help? Ask MarQ', desc: 'Your AI co-pilot knows the whole platform.', action: () => navigate('/workspace') },
                      { icon: HelpCircle, label: 'Help & FAQs', desc: 'Browse guides and common questions.', action: () => navigate('/help') },
                    ].map((item) => (
                      <button
                        key={item.label}
                        onClick={item.action}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/20 bg-muted/10 px-4 py-3 text-left transition-colors hover:bg-muted/30 active:scale-[0.99]"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <item.icon className="h-4 w-4 shrink-0 text-primary" />
                          <div className="min-w-0">
                            <span className="block text-sm font-medium truncate">{item.label}</span>
                            <span className="block text-xs text-muted-foreground truncate">{item.desc}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {/* MarQ HUD Feed — fixed bottom-right terminal */}
      {hasProjects && (
        <QuinnHudFeed
          projectName={activeProject?.name}
          leadCount={undefined}
          hook={blueprintSignal?.hooks?.instagram?.[0] || blueprintSignal?.hooks?.linkedin?.[0] || blueprintSignal?.oneLiner || null}
          hasArchitecture={!!activeProject}
        />
      )}

      {/* Create project modal for checklist */}
      <CreateFirstProjectModal open={showCreateModal} onOpenChange={setShowCreateModal} onCreateProject={(name, desc) => { addProject(name, desc); setShowCreateModal(false); }} />
      <QuickFlyerDialog open={showQuickFlyer} onOpenChange={setShowQuickFlyer} />
      <QuinnWelcomeOverlay />
    </div>
  );
}