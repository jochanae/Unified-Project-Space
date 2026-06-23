import { useFunnelHub } from '@/features/projects';
import { BuildStream } from '@/features/quinn';
import { LaunchBar, MissionControl, FunnelAnalytics, PulseCommandMap, LeakRecoveryPanel, useLeakDetection } from '@/features/deploy';
import type { StepNode } from '@/features/deploy';

import { CRMDashboard } from '@/features/contacts';

import { StreamToolbar } from '@/components/shared/StreamToolbar';
import { CollapsibleSection } from '@/components/shared/CollapsibleSection';
import { EmailSequenceBlock, SubscriberDashboard, BehaviorTriggerAudit } from '@/features/email-sequences';
import { AutoFollowupToggle } from './AutoFollowupToggle';
import { ExperimentDashboard } from '@/features/analytics';
import { IdleSuggestions } from '@/features/quinn';
import { IntelligencePulseTerminal } from '@/features/quinn';
import { QuinnChat } from '@/features/quinn';
import { useBuildStream } from '@/features/quinn';
import { useRealtimeStream } from '@/features/quinn';
import { useNotes } from '@/features/notes';
import { useFunnelSteps } from '@/features/funnel-steps';
import { useCurrentUser } from '@/hooks/use-current-user';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { CreateFirstProjectModal } from '@/components/shared/CreateFirstProjectModal';
import { StrategyLogCard } from '@/components/shared/StrategyLogCard';
import { MarketingQuickStart } from '@/features/marketing-studio';
import { Button } from '@/components/ui/button';
import { WinCardDialog } from '@/components/shared/WinCardDialog';
import { useMilestoneCelebration } from '@/hooks/use-milestone-celebration';
import { DeployToSocialDrawer } from '@/features/social-lab';

interface ProjectViewProps {
  buildStream: ReturnType<typeof useBuildStream>;
  initialPrompt?: string;
}

export function ProjectView({ buildStream, initialPrompt }: ProjectViewProps) {
  const { activeProject, addProject } = useFunnelHub();
  const { user } = useCurrentUser();
  const { notes } = useNotes(activeProject?.id ?? null, user?.orgId);
  const { steps: dbSteps, addStep: addStepMutation, removeStep, reorder } = useFunnelSteps(activeProject?.id ?? null, user?.orgId);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [briefExpanded, setBriefExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#funnel-map') return;
    const tryScroll = (attempt = 0) => {
      const el = document.getElementById('funnel-map');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (attempt < 20) setTimeout(() => tryScroll(attempt + 1), 200);
    };
    tryScroll();
  }, [activeProject?.id]);
  const [deploying, setDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [showIdleSuggestion, setShowIdleSuggestion] = useState(false);
  const [powerUp, setPowerUp] = useState(false);
  const [pulseNodes, setPulseNodes] = useState<StepNode[]>([]);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevProjectRef = useRef<string | null>(null);
  const loadedProjectRef = useRef<string | null>(null);
  const handleLeakNodes = useCallback((nodes: StepNode[]) => setPulseNodes(nodes), []);
  const leaks = useLeakDetection(pulseNodes);
  const { winCard, setWinCard, celebrate } = useMilestoneCelebration(user?.orgId);
  
  const [socialDrawerOpen, setSocialDrawerOpen] = useState(false);

  // Realtime subscription
  useRealtimeStream(activeProject?.id ?? null, user?.orgId);

  // Load existing build when switching to a project
  useEffect(() => {
    if (!activeProject || activeProject.id === loadedProjectRef.current) return;
    loadedProjectRef.current = activeProject.id;
    buildStream.reset();
    buildStream.loadExistingBuild(activeProject.id);
  }, [activeProject]);

  // Power-up transition on project switch
  useEffect(() => {
    if (activeProject && activeProject.id !== prevProjectRef.current) {
      setPowerUp(true);
      const t = setTimeout(() => setPowerUp(false), 900);
      prevProjectRef.current = activeProject.id;
      return () => clearTimeout(t);
    }
  }, [activeProject]);

  // Idle detection
  useEffect(() => {
    if (buildStream.phase !== 'complete') {
      setShowIdleSuggestion(false);
      return;
    }

    const resetIdle = () => {
      setShowIdleSuggestion(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setShowIdleSuggestion(true);
      }, 5000);
    };

    resetIdle();
    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('keydown', resetIdle);

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [buildStream.phase]);

  if (!activeProject) {
    return (
      <>
        <IntelligencePulseTerminal streamPhase={buildStream.phase} onActionClick={() => setShowCreateModal(true)} />
        <CreateFirstProjectModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onCreateProject={(name, desc) => {
            addProject(name, desc);
            setShowCreateModal(false);
          }}
        />
      </>
    );
  }

  const handleDeploy = async (): Promise<string | undefined> => {
    if (!buildStream.result || !activeProject || deploying) return undefined;
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke('deploy-landing-page', {
        body: {
          projectId: activeProject.id,
          landingPage: buildStream.result.landing_page,
          strategy: buildStream.result.strategy,
          thankYouPage: buildStream.result.thank_you_page || null,
          theme: localStorage.getItem('intoiq_theme') || 'cinematic',
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setDeployed(true);
      toast.success('Landing page deployed!', {
        description: data?.url ? `Live at ${data.url}` : 'Your page is now live.',
      });
      // Open the omnichannel handoff drawer — MarQ translates the funnel into a social launch sequence.
      setSocialDrawerOpen(true);
      // First-ever deploy for this org → celebrate with a shareable win card.
      celebrate('first_deploy', {
        milestone: 'first_deploy',
        headline: 'First funnel live',
        metric: activeProject.name,
        subtitle: 'You just shipped your first lead engine.',
      });
      // Return the slug for the shareable URL
      return data?.slug || data?.url?.split('/').pop() || undefined;
    } catch (e) {
      toast.error('Deploy failed', {
        description: e instanceof Error ? e.message : 'Please try again.',
      });
      return undefined;
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className={cn(
      'p-4 sm:p-6 lg:p-8 max-w-5xl pb-32 mesh-gradient min-h-full',
      powerUp && 'power-up'
    )}>
      <div className="relative z-10">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl tracking-tight">{activeProject.name}</h1>
          {activeProject.description && (
            <div className="mt-3 max-w-2xl">
              <div className="relative">
                <p
                  className={cn(
                    'text-sm sm:text-[15px] leading-relaxed text-foreground/80 whitespace-pre-wrap',
                    !briefExpanded && 'line-clamp-4',
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
                onClick={() => setBriefExpanded(v => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] text-primary/80 hover:text-primary transition-colors"
              >
                {briefExpanded ? 'Collapse' : 'View Strategy'}
                <span className="text-[10px]">{briefExpanded ? '▲' : '▼'}</span>
              </button>
            </div>
          )}
        </div>

        {/* The Build Stream — single continuous canvas */}
        <BuildStream buildStream={buildStream} initialPrompt={initialPrompt} />

        {/* MarQ Conversational Chat — refine ideas iteratively */}
        {buildStream.phase === 'complete' && (
          <div className="mt-6">
            <QuinnChat />
          </div>
        )}

        {/* Audit & Launch Bar */}
        {buildStream.phase === 'complete' && (
          <LaunchBar
            projectId={activeProject.id}
            result={buildStream.result}
            onDeploy={handleDeploy}
            deploying={deploying}
            deployed={deployed}
          />
        )}

        {/* Everything below is intentionally secondary. It should not bury the core build flow. */}
        {buildStream.phase === 'complete' && (
          <CollapsibleSection title="After launch tools">
            <div className="space-y-6">
              <div className="grid gap-4 lg:grid-cols-2">
                <StrategyLogCard projectId={activeProject.id} projectName={activeProject.name} orgId={user?.orgId} />
                <MarketingQuickStart projectId={activeProject.id} projectName={activeProject.name} projectGoal={activeProject.description} />
              </div>


              <PulseCommandMap projectId={activeProject.id} onLeakNodes={handleLeakNodes} />
              {leaks.length > 0 && (
                <LeakRecoveryPanel leaks={leaks} projectId={activeProject.id} projectGoal={activeProject.description || activeProject.name} />
              )}
              {deployed && buildStream.result && (
                <MissionControl
                  projectId={activeProject.id}
                  projectSlug={activeProject.name.toLowerCase().replace(/\s+/g, '-')}
                  result={buildStream.result}
                  deployed={deployed}
                />
              )}
              <CRMDashboard projectId={activeProject.id} />
              
              <FunnelAnalytics projectId={activeProject.id} />
              <ExperimentDashboard projectId={activeProject.id} />
              <SubscriberDashboard projectId={activeProject.id} />
              <div className="space-y-3">
                <AutoFollowupToggle projectId={activeProject.id} />
                <EmailSequenceBlock
                  projectId={activeProject.id}
                  projectGoal={activeProject.description || activeProject.name}
                  buildResult={buildStream.result}
                />
                <BehaviorTriggerAudit projectId={activeProject.id} />
              </div>
              <StreamToolbar />
            </div>
          </CollapsibleSection>
        )}

        {/* Idle AI Suggestions */}
        {showIdleSuggestion && buildStream.phase === 'complete' && (
          <div className="mt-4">
            <IdleSuggestions
              visible={showIdleSuggestion}
              projectName={activeProject.name}
              projectGoal={activeProject.description || ''}
              onAccept={() => setShowIdleSuggestion(false)}
              onDismiss={() => setShowIdleSuggestion(false)}
            />
          </div>
        )}

      </div>

      {winCard && (
        <WinCardDialog
          open={!!winCard}
          onOpenChange={(o) => !o && setWinCard(null)}
          input={winCard}
        />
      )}

      <DeployToSocialDrawer
        open={socialDrawerOpen}
        onOpenChange={setSocialDrawerOpen}
        projectId={activeProject.id}
        projectName={activeProject.name}
      />
    </div>
  );
}
