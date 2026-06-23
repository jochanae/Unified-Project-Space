import { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useSignalLab, QUESTIONS } from '@/features/signal-lab/hooks/use-signal-lab';
import SignalQuestionFlow from '@/features/signal-lab/components/SignalQuestionFlow';
import SignalResultsPanel from '@/features/signal-lab/components/SignalResultsPanel';
import SignalThinkingBar from '@/features/signal-lab/components/SignalThinkingBar';
import ProjectSelector from '@/features/signal-lab/components/ProjectSelector';
import { IdentityLockPanel } from '@/features/signal-lab/components/IdentityLockPanel';
import { StrategyEvolutionPanel } from '@/features/signal-lab/components/StrategyEvolutionPanel';
import LiveUrlAudit from '@/features/signal-lab/components/LiveUrlAudit';
import CompetitorIntel from '@/features/signal-lab/components/CompetitorIntel';
import { useAnalysisPhase } from '@/features/signal-lab/hooks/use-signal-lab';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function SignalLabPage() {
  const lab = useSignalLab();
  const analysisLabel = useAnalysisPhase(lab.barState === 'analyzing');
  const { user } = useCurrentUser();

  const needsProjectSelection = !lab.projectConfirmed && !lab.showResults;

  // Load the persisted Identity Lock for the active project (shown above results)
  const [lockedBlueprint, setLockedBlueprint] = useState<any>(null);
  useEffect(() => {
    if (!lab.activeProjectId || !lab.showResults) { setLockedBlueprint(null); return; }
    let cancelled = false;
    supabase
      .from('project_context')
      .select('directive')
      .eq('project_id', lab.activeProjectId)
      .eq('context_type', 'signal_lab')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data?.directive) return;
        try { setLockedBlueprint(JSON.parse(data.directive)); } catch { /* ignore */ }
      });
    return () => { cancelled = true; };
  }, [lab.activeProjectId, lab.showResults]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-auto pb-36"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 4rem)' }}
    >
      {/* Cinematic blur background */}
      <div
        className={cn(
          'absolute inset-0 bg-background/95 backdrop-blur-2xl transition-opacity duration-700',
          lab.entered ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Gold pulse glow */}
      <div
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full transition-all duration-1000 pointer-events-none',
          lab.entered ? 'opacity-20 scale-100' : 'opacity-0 scale-50',
        )}
        style={{
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite',
        }}
      />

      {/* Handoff Overlay */}
      {lab.handingOff && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/98 backdrop-blur-3xl animate-in fade-in-0 duration-500">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 60%)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
          <div className="relative z-10 w-64 mb-8">
            <div className="h-0.5 w-full rounded-full bg-muted/30 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${((lab.handoffPhase + 1) / lab.HANDOFF_PHASES.length) * 100}%` }}
              />
            </div>
          </div>
          <p
            key={lab.handoffPhase}
            className="relative z-10 text-lg font-semibold text-foreground animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            {lab.HANDOFF_PHASES[lab.handoffPhase]}
          </p>
          <p className="relative z-10 mt-3 text-xs text-muted-foreground/60">
            From Into Innovations — Intelligence First.
          </p>
        </div>
      )}

      {/* Content */}
      <div
        className={cn(
          'relative z-10 flex-1 flex flex-col items-center w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 transition-all duration-700',
          lab.showResults ? 'max-w-6xl justify-start' : 'max-w-2xl justify-center',
          lab.entered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
          lab.handingOff && 'pointer-events-none',
        )}
      >
        <div className="w-full">
          {/* Identity Lock — only when results are showing */}
          {lab.showResults && lockedBlueprint && (
            <div className="mb-8 space-y-4">
              <IdentityLockPanel
                blueprint={lockedBlueprint}
                projectName={lab.activeProjectName || undefined}
                versionLabel="v1.0_STABLE"
              />
              <StrategyEvolutionPanel
                projectId={lab.activeProjectId}
                orgId={user?.orgId}
              />
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary mb-4">
              <Sparkles className="h-3.5 w-3.5" />
              Signal Lab
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-foreground mb-3"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {needsProjectSelection ? 'Choose your workspace.' : 'Find your Signal.'}
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {needsProjectSelection
                ? 'Select a project to anchor your Signal, or start a new identity.'
                : "Before we build the pipes, let\u2019s distill your vision into a message that demands attention."}
            </p>
            {/* Project breadcrumb */}
            {lab.projectConfirmed && lab.activeProjectName && !lab.showResults && (
              <p className="mt-3 text-xs text-primary/70 font-medium">
                Refining: {lab.activeProjectName}
              </p>
            )}
          </div>

          {/* Project Selector */}
          {needsProjectSelection && !lab.generating && (
            <ProjectSelector
              projects={(lab.projects || []).map(p => ({ id: p.id, name: p.name, description: p.description || '' }))}
              onSelect={lab.selectProject}
              onCreate={lab.createAndSelectProject}
            />
          )}

          {/* Live URL Audit — available once a project is locked, before/while answering */}
          {!lab.showResults && !lab.generating && lab.projectConfirmed && lab.step === 0 && (
            <div className="mb-6">
              <LiveUrlAudit projectId={lab.activeProjectId} />
            </div>
          )}

          {/* Question Flow */}
          {!lab.showResults && !lab.generating && lab.projectConfirmed && lab.step < QUESTIONS.length && (
            <SignalQuestionFlow
              step={lab.step}
              currentQ={lab.currentQ}
              currentAnswer={lab.currentAnswer}
              isLastQuestion={lab.isLastQuestion}
              onInputChange={lab.handleInputChange}
              onNext={lab.handleNext}
              onBack={() => lab.setStep(s => s - 1)}
            />
          )}

          {/* Generating state */}
          {lab.generating && (
            <div className="flex flex-col items-center gap-4 py-12 animate-in fade-in-0 duration-500">
              <div className="relative">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    boxShadow: '0 0 30px hsl(var(--primary) / 0.3)',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              </div>
              <p
                className="text-muted-foreground text-sm transition-opacity duration-500"
                style={{ fontFamily: 'var(--font-heading)' }}
                key={analysisLabel}
              >
                {analysisLabel}
              </p>
            </div>
          )}

          {/* Live URL Audit — also available in results view for ongoing iteration */}
          {lab.showResults && (
            <div className="mb-6 space-y-6">
              <LiveUrlAudit projectId={lab.activeProjectId} />
              <CompetitorIntel projectId={lab.activeProjectId} />
            </div>
          )}

          {/* Results */}
          {lab.showResults && lab.outputs && (
            <SignalResultsPanel
              outputs={lab.outputs}
              copiedField={lab.copiedField}
              isSharpened={lab.isSharpened}
              sharpening={lab.sharpening}
              activeTab={lab.activeTab}
              activeProjectId={lab.activeProjectId}
              activeProjectName={lab.activeProjectName}
              signalHistory={lab.signalHistory}
              historyOpen={lab.historyOpen}
              onCopy={lab.handleCopy}
              onSharpen={lab.handleSharpen}
              onBuildFunnel={lab.handleBuildFunnel}
              onReset={lab.handleReset}
              onTabChange={lab.setActiveTab}
              onHistoryToggle={() => lab.setHistoryOpen(h => !h)}
              onLoadSignal={lab.loadSignal}
            />
          )}
        </div>
      </div>

      {/* Thinking Bar */}
      {!lab.showResults && lab.projectConfirmed && <SignalThinkingBar barState={lab.barState} />}
    </div>
  );
}
