import { useEffect, useState } from 'react';
import { ArrowRight, User, Target, FolderPlus, Sparkles, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { LogoCapsule } from '@/components/shared/LogoCapsule';
import { toast } from 'sonner';
import { PENDING_PREVIEW_KEY } from '@/components/landing/AnonymousPreviewOverlay';

type PendingPreview = {
  idea: string;
  preview: Record<string, string>;
  savedAt: number;
};

const PENDING_AUDIT_KEY = 'intoiq_signal_audit';

type PendingAudit = {
  input: string;
  audit: Partial<Record<'signal' | 'positioning' | 'void' | 'hook' | 'funnel' | 'next', string>>;
  email?: string;
  at: number;
};

function readPendingPreview(): PendingPreview | null {
  try {
    const raw = sessionStorage.getItem(PENDING_PREVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingPreview;
    if (!parsed?.idea || !parsed?.preview) return null;
    return parsed;
  } catch {
    return null;
  }
}

function readPendingAudit(): PendingAudit | null {
  try {
    const raw = sessionStorage.getItem(PENDING_AUDIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingAudit;
    if (!parsed?.input || !parsed?.audit) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface OnboardingWizardProps {
  userId: string;
  userEmail: string;
  onComplete: () => void;
}

const GOALS = [
  { value: 'sell-digital', label: 'Sell a digital product', icon: '📦' },
  { value: 'grow-audience', label: 'Grow my audience', icon: '📣' },
  { value: 'build-brand', label: 'Build my brand', icon: '✨' },
  { value: 'client-funnels', label: 'Build funnels for clients', icon: '🏗️' },
] as const;

const VIBES = [
  { value: 'cinematic', label: 'Cinematic', desc: 'Deep charcoal, teal accents — bold & dramatic', swatch: ['#0E1612', '#0F8B8D', '#C9A84C'] },
  { value: 'editorial', label: 'Editorial', desc: 'Warm cream, classic serif — magazine refined', swatch: ['#F5F0E8', '#2D2D2D', '#A0522D'] },
  { value: 'minimal', label: 'Minimal', desc: 'Crisp white, blue accent — quiet & focused', swatch: ['#FAFBFC', '#3B82F6', '#94A3B8'] },
] as const;

export function OnboardingWizard({ userId, userEmail, onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedVibe, setSelectedVibe] = useState<string>('cinematic');
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(false);

  const [pendingPreview, setPendingPreview] = useState<PendingPreview | null>(null);
  const [pendingAudit, setPendingAudit] = useState<PendingAudit | null>(null);

  // Detect pending preview / audit from anonymous flow
  useEffect(() => {
    const pending = readPendingPreview();
    if (pending) {
      setPendingPreview(pending);
      const headline = pending.preview.headline || pending.idea;
      setProjectName(headline.slice(0, 60));
      return;
    }
    const audit = readPendingAudit();
    if (audit) {
      setPendingAudit(audit);
      setProjectName(audit.input.slice(0, 60));
    }
  }, []);

  const steps = [
    { label: 'Your name', icon: User },
    { label: 'Your goal', icon: Target },
    { label: 'Your vibe', icon: Palette },
    { label: 'First project', icon: FolderPlus },
  ];

  async function handleFinish() {
    setLoading(true);
    try {
      // Persist vibe preference for future project defaults
      try { localStorage.setItem('intoiq_default_vibe', selectedVibe); } catch { /* noop */ }
      // Update display name + mark onboarding complete
      await supabase
        .from('users')
        .update({
          display_name: displayName.trim() || userEmail.split('@')[0],
          has_completed_onboarding: true,
        })
        .eq('id', userId);

      // Get org_id for project creation
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', userId)
        .single();

      if (userData?.org_id && projectName.trim()) {
        const slug = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'my-project';
        const { data: newProject } = await supabase
          .from('projects')
          .insert({
            name: projectName.trim(),
            slug: `${slug}-${Date.now().toString(36)}`,
            org_id: userData.org_id,
            goal: selectedGoal || null,
          })
          .select('id')
          .single();

        // Materialize the anonymous preview into the new project
        if (newProject?.id && pendingPreview) {
          const p = pendingPreview.preview;
          const directive = [
            p.audience && `AUDIENCE: ${p.audience}`,
            p.offer && `OFFER: ${p.offer}`,
            p.hook && `HOOK: ${p.hook}`,
            p.lead_magnet && `LEAD MAGNET: ${p.lead_magnet}`,
            `ORIGINAL IDEA: ${pendingPreview.idea}`,
          ].filter(Boolean).join('\n');

          await supabase.from('project_context').insert({
            project_id: newProject.id,
            org_id: userData.org_id,
            context_type: 'signal_lab',
            directive,
          });

          // Seed stream blocks so the workspace lands pre-built
          const blocks = [
            { block_type: 'strategy', content: { audience: p.audience, offer: p.offer, hook: p.hook }, order_index: 0 },
            { block_type: 'headline', content: { text: p.headline, subheadline: p.subheadline }, order_index: 1 },
            { block_type: 'cta', content: { text: p.cta, lead_magnet: p.lead_magnet }, order_index: 2 },
          ].filter((b) => Object.values(b.content).some(Boolean));

          if (blocks.length > 0) {
            await supabase.from('stream_blocks').insert(
              blocks.map((b) => ({
                ...b,
                project_id: newProject.id,
                org_id: userData.org_id,
                status: 'complete',
              })),
            );
          }

          // Materialize a draft landing page so user can hit Publish in one click
          const pageBlocks: Array<Record<string, unknown>> = [];
          if (p.headline) {
            pageBlocks.push({
              id: `block-${Date.now()}-hero`,
              type: 'hero',
              content: {
                headline: p.headline,
                subheadline: p.subheadline || '',
                ctaText: p.cta || 'Get Instant Access',
              },
            });
          }
          pageBlocks.push({
            id: `block-${Date.now()}-form`,
            type: 'form',
            content: {
              title: p.cta || 'Get Instant Access',
              description: p.lead_magnet || 'Drop your email and we\'ll send it over.',
              buttonText: p.cta || 'Get Instant Access',
              fields: [{ name: 'email', label: 'Email', type: 'email', required: true }],
            },
          });

          const pageSlug = `${slug}-${Date.now().toString(36)}`;
          await supabase.from('pages').insert([{
            org_id: userData.org_id,
            project_id: newProject.id,
            slug: pageSlug,
            title: p.headline?.slice(0, 80) || projectName.trim(),
            theme: selectedVibe,
            content_blocks: pageBlocks as never,
            is_published: false,
          }]);

          // Clear pending preview — claimed
          try { sessionStorage.removeItem(PENDING_PREVIEW_KEY); } catch { /* noop */ }
          try {
            localStorage.setItem('intoiq_signal_recovered', JSON.stringify({
              projectId: newProject.id,
              headline: p.headline || pendingPreview.idea,
              at: Date.now(),
            }));
          } catch { /* noop */ }
        }

        // OR: Materialize the standalone Signal Audit (no full preview)
        if (newProject?.id && !pendingPreview && pendingAudit) {
          const a = pendingAudit.audit;
          const directive = JSON.stringify({
            oneLiner: a.signal || pendingAudit.input.slice(0, 120),
            signal: a.signal || '',
            positioning: a.positioning || '',
            void: a.void || '',
            hook: a.hook || '',
            funnel: a.funnel || '',
            originalInput: pendingAudit.input,
            source: 'landing_audit',
            at: pendingAudit.at,
          });
          await supabase.from('project_context').insert({
            project_id: newProject.id,
            org_id: userData.org_id,
            context_type: 'signal_lab',
            directive,
          });
          try { sessionStorage.removeItem(PENDING_AUDIT_KEY); } catch { /* noop */ }
          try {
            localStorage.setItem('intoiq_signal_recovered', JSON.stringify({
              projectId: newProject.id,
              headline: a.signal?.slice(0, 80) || pendingAudit.input.slice(0, 80),
              at: Date.now(),
            }));
          } catch { /* noop */ }
        }
      }

      onComplete();
    } catch (err) {
      toast.error('Something went wrong', {
        description: 'Your account is ready but we could not create your first project. You can create one from the dashboard.',
      });
      onComplete();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Pending preview / audit banner */}
        {(pendingPreview || pendingAudit) && (
          <div className="mb-4 glass rounded-2xl border border-primary/30 px-4 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.18em] text-primary font-medium">
                {pendingPreview ? 'Claiming your system' : 'Attaching your Signal Audit'}
              </div>
              <div className="text-xs text-foreground truncate">
                {pendingPreview
                  ? (pendingPreview.preview.headline || pendingPreview.idea)
                  : (pendingAudit?.audit.signal || pendingAudit?.input || '')}
              </div>
            </div>
          </div>
        )}

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-primary scale-110' : 'bg-muted-foreground/20'
              }`} />
              {i < steps.length - 1 && (
                <div className={`h-px w-8 transition-colors duration-300 ${
                  i < step ? 'bg-primary/50' : 'bg-muted-foreground/10'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl border border-border/30 p-6 sm:p-8">
          {/* Step 0: Name */}
          {step === 0 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <LogoCapsule size="lg" />
              <h1 className="mt-4 text-2xl font-serif tracking-tight">What should we call you?</h1>
              <p className="mt-2 text-sm text-muted-foreground">This shows up in greetings and your workspace.</p>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={userEmail.split('@')[0]}
                className="mt-6 text-center border-border/50 bg-background/50 focus-visible:ring-primary"
                autoFocus
                maxLength={50}
                onKeyDown={(e) => e.key === 'Enter' && setStep(1)}
              />
              <Button onClick={() => setStep(1)} className="mt-5 gap-2 w-full">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Goal */}
          {step === 1 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Target className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-2xl font-serif tracking-tight">What's your main goal?</h1>
              <p className="mt-2 text-sm text-muted-foreground">This helps MarQ tailor suggestions for you.</p>
              <div className="mt-6 grid grid-cols-1 gap-2 w-full">
                {GOALS.map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => setSelectedGoal(goal.value)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                      selectedGoal === goal.value
                        ? 'border-primary bg-primary/5 text-foreground shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
                        : 'border-border/30 hover:bg-muted/30 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className="text-lg">{goal.icon}</span>
                    <span className="font-medium">{goal.label}</span>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedGoal}
                className="mt-5 gap-2 w-full"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setStep(0)}
                className="mt-3 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 2: Vibe */}
          {step === 2 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Palette className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-2xl font-serif tracking-tight">Pick your vibe</h1>
              <p className="mt-2 text-sm text-muted-foreground">MarQ uses this aesthetic across your funnels. You can change it anytime.</p>
              <div className="mt-6 grid grid-cols-1 gap-2 w-full">
                {VIBES.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setSelectedVibe(v.value)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      selectedVibe === v.value
                        ? 'border-primary bg-primary/5 shadow-[0_0_12px_hsl(var(--primary)/0.15)]'
                        : 'border-border/30 hover:bg-muted/30'
                    }`}
                  >
                    <div className="flex gap-1 shrink-0">
                      {v.swatch.map((c) => (
                        <span
                          key={c}
                          className="h-6 w-3 rounded-sm border border-border/40"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground">{v.label}</div>
                      <div className="text-xs text-muted-foreground truncate">{v.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedVibe}
                className="mt-5 gap-2 w-full"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
              <button
                onClick={() => setStep(1)}
                className="mt-3 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {/* Step 3: First project */}
          {step === 3 && (
            <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <FolderPlus className="h-6 w-6" />
              </div>
              <h1 className="mt-4 text-2xl font-serif tracking-tight">Name your first project</h1>
              <p className="mt-2 text-sm text-muted-foreground">Pick something memorable — you can rename it anytime from the dashboard.</p>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Q4 Authority Launch"
                className="mt-6 text-center border-border/50 bg-background/50 focus-visible:ring-primary"
                autoFocus
                maxLength={80}
                onKeyDown={(e) => e.key === 'Enter' && projectName.trim() && handleFinish()}
              />
              <Button
                onClick={handleFinish}
                disabled={!projectName.trim() || loading}
                className="mt-5 gap-2 w-full"
              >
                {loading ? (
                  'Setting up…'
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Launch my workspace
                  </>
                )}
              </Button>
              <button
                onClick={() => setStep(2)}
                className="mt-3 text-xs text-muted-foreground/60 hover:text-foreground transition-colors"
              >
                Back
              </button>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/40">
          Step {step + 1} of {steps.length}
        </p>
      </div>
    </div>
  );
}
