import { useState, useEffect, useRef } from 'react';
import { Rocket, Check, Shield, ChevronUp, X, ExternalLink, Sparkles, Copy, Link2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaywallModal } from '@/features/billing';
import { useSubscription } from '@/features/billing';
import { useQuery } from '@tanstack/react-query';
import { CustomDomainSetup } from './CustomDomainSetup';
import { QuinnAnalyticsUpgradeNudge } from '@/components/shared/QuinnUpgradeNudge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Globe, ChevronDown } from 'lucide-react';

interface AuditIssue {
  type: 'warning' | 'suggestion' | 'pass';
  label: string;
  detail: string;
  autoFixed?: boolean;
}

interface LaunchBarProps {
  projectId: string;
  result: {
    strategy: { audience: string; offer: string; positioning: string; hook: string };
    funnel_steps: { title: string; step_type: string; description: string }[];
    landing_page: {
      headline: string;
      subheadline: string;
      cta_text: string;
      features: { title: string; description: string }[];
      social_proof: string;
    };
  } | null;
  onDeploy: () => Promise<string | undefined>;
  deploying: boolean;
  deployed: boolean;
}

function IQScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (circumference * score / 100);
  const color = score >= 80
    ? 'hsl(142 71% 45%)'
    : score >= 50
      ? 'hsl(48 96% 53%)'
      : 'hsl(0 72% 51%)';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" fill="none" strokeWidth={3} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

/** MarQ's typewriter for the audit overlay */
function QuinnNarration({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 22);
    return () => clearInterval(iv);
  }, [started, text]);

  return (
    <p className="text-sm text-muted-foreground italic min-h-[1.25rem]">
      {displayed}<span className="animate-pulse text-primary">|</span>
    </p>
  );
}

/** Single audit finding card with staggered reveal */
function AuditCard({ issue, index }: { issue: AuditIssue; index: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 600 + index * 350);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div
      className={cn(
        'rounded-xl px-4 py-3 border transition-all duration-700 ease-out',
        !visible && 'opacity-0 translate-y-4 scale-95 blur-[4px]',
        visible && 'opacity-100 translate-y-0 scale-100 blur-0',
        issue.type === 'pass' && 'bg-green-500/10 border-green-500/20 text-green-400',
        issue.type === 'warning' && 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
        issue.type === 'suggestion' && 'bg-primary/10 border-primary/20 text-primary',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 text-base shrink-0">
          {issue.type === 'pass' ? '✓' : issue.type === 'warning' ? '⚠' : '💡'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{issue.label}</p>
          <p className="text-xs opacity-70 mt-0.5">{issue.detail}</p>
          {issue.autoFixed && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Auto-fixed by MarQ
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Triumphant deploy success overlay */
function DeploySuccess({ url }: { url?: string }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 100);
    const t2 = setTimeout(() => setStage(2), 800);
    const t3 = setTimeout(() => setStage(3), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop with cinematic bloom */}
      <div className={cn(
        'absolute inset-0 bg-background/80 backdrop-blur-xl transition-opacity duration-700',
        stage >= 1 ? 'opacity-100' : 'opacity-0'
      )} />

      {/* Success content */}
      <div className={cn(
        'relative z-10 text-center transition-all duration-1000 ease-out',
        stage >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      )}>
        {/* Glow ring */}
        <div className={cn(
          'mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-1000',
          stage >= 2
            ? 'bg-green-500/20 shadow-[0_0_60px_hsl(142_71%_45%/0.4),0_0_120px_hsl(142_71%_45%/0.15)]'
            : 'bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
        )}>
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-all duration-700',
            stage >= 2 ? 'bg-green-500/30' : 'bg-primary/20'
          )}>
            <Check className={cn(
              'transition-all duration-500',
              stage >= 2 ? 'h-8 w-8 text-green-400' : 'h-6 w-6 text-primary'
            )} />
          </div>
        </div>

        <h2 className={cn(
          'text-3xl font-[var(--font-heading)] tracking-tight mb-2 transition-all duration-700',
          stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}>
          Your asset is live.
        </h2>

        <p className={cn(
          'text-muted-foreground mb-6 transition-all duration-700 delay-200',
          stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        )}>
          From idea to deployed funnel — MarQ handled the rest.
        </p>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-700',
              'bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30',
              'shadow-[0_0_30px_hsl(142_71%_45%/0.2)]',
              stage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            )}
          >
            <ExternalLink className="h-4 w-4" />
            <span className="font-semibold text-sm">Visit your live page</span>
          </a>
        )}
      </div>
    </div>
  );
}

/** Deployed URL bar with live view count and optional custom domain */
function DeployedUrlBar({ deployUrl, projectId, customDomain }: { deployUrl: string; projectId: string; customDomain?: string | null }) {
  const slug = deployUrl.split('/p/')[1];
  const customUrl = customDomain ? `https://${customDomain}/p/${slug}` : null;

  const { data: viewCount } = useQuery({
    queryKey: ['page-views', projectId, slug],
    queryFn: async () => {
      const { data: page } = await supabase
        .from('pages')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (!page) return 0;
      const { count } = await supabase
        .from('page_views')
        .select('*', { count: 'exact', head: true })
        .eq('page_id', page.id);
      return count || 0;
    },
    refetchInterval: 30000,
    enabled: !!slug,
  });

  const primaryUrl = customUrl || deployUrl;
  const fallbackUrl = customUrl ? deployUrl : null;

  return (
    <div className="space-y-2 w-full max-w-md">
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass border border-border/30 w-full">
        <Link2 className="h-4 w-4 text-primary shrink-0" />
        <span className="text-xs text-muted-foreground truncate flex-1 font-mono">
          {primaryUrl}
        </span>
        {typeof viewCount === 'number' && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Eye className="h-3.5 w-3.5" />
            {viewCount}
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 gap-1 text-xs shrink-0"
          onClick={() => {
            navigator.clipboard.writeText(primaryUrl);
            toast.success('Link copied!', { description: 'Share this URL with your audience.' });
          }}
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </Button>
      </div>
      {fallbackUrl && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/60">
          <span className="truncate font-mono">{fallbackUrl}</span>
          <span className="text-[10px] shrink-0">(fallback)</span>
        </div>
      )}
    </div>
  );
}

export function LaunchBar({ projectId, result, onDeploy, deploying, deployed }: LaunchBarProps) {
  const { canPublish, startCheckout, tier } = useSubscription();
  const [auditing, setAuditing] = useState(false);
  const [auditDone, setAuditDone] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditIssue[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deployUrl, setDeployUrl] = useState<string>();
  const [quinnPhase, setQuinnPhase] = useState<'scanning' | 'analyzing' | 'verdict' | 'idle'>('idle');
  const [showPaywall, setShowPaywall] = useState(false);

  // Fetch custom domain for the active project
  const { data: projectDomainData } = useQuery({
    queryKey: ['project-custom-domain', projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from('projects')
        .select('custom_domain, domain_verified')
        .eq('id', projectId)
        .single();
      return data as { custom_domain: string | null; domain_verified: boolean | null } | null;
    },
    enabled: !!projectId,
  });
  const customDomain = projectDomainData?.domain_verified ? projectDomainData.custom_domain : null;

  const runAudit = async () => {
    if (!result || auditing) return;
    setAuditing(true);
    setShowAudit(true);
    setAuditResults([]);
    setQuinnPhase('scanning');

    try {
      const analyzeTimer = setTimeout(() => setQuinnPhase('analyzing'), 1500);

      const { data, error } = await supabase.functions.invoke('iq-audit', {
        body: {
          projectId,
          strategy: result.strategy,
          landingPage: result.landing_page,
          funnelSteps: result.funnel_steps,
        },
      });

      clearTimeout(analyzeTimer);

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      setQuinnPhase('analyzing');
      await new Promise(r => setTimeout(r, 600));

      setAuditResults(data.issues || []);
      setScore(data.score || 0);
      setAuditDone(true);

      const verdictDelay = 600 + (data.issues?.length || 0) * 350 + 400;
      setTimeout(() => setQuinnPhase('verdict'), verdictDelay);
    } catch (e) {
      toast.error('Audit failed', {
        description: e instanceof Error ? e.message : 'Please try again.',
      });
      setShowAudit(false);
      setQuinnPhase('idle');
    } finally {
      setAuditing(false);
    }
  };

  const handleLaunch = async () => {
    if (!auditDone) {
      await runAudit();
      return;
    }
    // Gate behind subscription
    if (!canPublish) {
      setShowPaywall(true);
      return;
    }
    try {
      const slug = await onDeploy();
      if (slug) {
        const shareUrl = `${window.location.origin}/p/${slug}`;
        setDeployUrl(shareUrl);
      }
      setShowAudit(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 8000);
    } catch {
      // onDeploy handles its own errors
    }
  };

  if (!result) return null;

  const passCount = auditResults.filter(i => i.type === 'pass').length;
  const totalChecks = auditResults.length || 1;
  const displayScore = score ?? Math.round((passCount / totalChecks) * 100);

  const quinnMessages: Record<string, string> = {
    scanning: "Scanning your funnel architecture… checking conversion signals…",
    analyzing: `Evaluating headline urgency: "${result.landing_page.headline.slice(0, 50)}…"`,
    verdict: displayScore >= 80
      ? "Your funnel is sharp. This is ready to convert."
      : "I've flagged a few optimizations. Let's tighten this up.",
    idle: '',
  };

  return (
    <>
      {/* Paywall */}
      <PaywallModal
        open={showPaywall}
        onClose={() => setShowPaywall(false)}
        trigger="publish"
        onCheckout={startCheckout}
      />

      {/* Deploy Success Celebration */}
      {showSuccess && <DeploySuccess url={deployUrl} />}

      {/* Full-screen Glassmorphic Audit Overlay */}
      {showAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-2xl animate-fade-in"
            onClick={() => !auditing && setShowAudit(false)}
          />

          {/* Audit Panel */}
          <div className={cn(
            'relative z-10 w-full max-w-2xl rounded-3xl border border-primary/20 p-6 sm:p-8',
            'bg-card/40 backdrop-blur-xl',
            'shadow-[0_0_80px_hsl(var(--primary)/0.12),0_0_200px_hsl(var(--primary)/0.06)]',
            'transition-all duration-700 ease-out',
            'max-h-[85vh] overflow-y-auto'
          )}
            style={{ animation: 'audit-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  'bg-primary/15 border border-primary/25',
                  auditing && 'ai-pulse-border'
                )}>
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">MarQ IQ Audit</h3>
                  <p className="text-xs text-muted-foreground">Pre-flight conversion check</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowAudit(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* MarQ narration */}
            {quinnPhase !== 'idle' && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
                <QuinnNarration
                  key={quinnPhase}
                  text={quinnMessages[quinnPhase]}
                  delay={0}
                />
              </div>
            )}

            {/* Scanning animation */}
            {auditing && auditResults.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-10">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
                  <div className="absolute inset-2 rounded-full border border-primary/10" />
                  <div className="absolute inset-2 rounded-full border border-transparent border-b-primary/60 animate-spin"
                    style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">
                  MarQ is analyzing your funnel…
                </p>
              </div>
            )}

            {/* Audit results with staggered reveal */}
            {auditResults.length > 0 && (
              <div className="space-y-3 mb-6">
                {auditResults.map((issue, i) => (
                  <AuditCard key={i} issue={issue} index={i} />
                ))}
              </div>
            )}

            {/* Score + Deploy CTA */}
            {auditDone && score !== null && (
              <div className={cn(
                'flex items-center justify-between pt-4 border-t border-border/30',
                'transition-all duration-700 delay-300'
              )}
                style={{
                  animation: `audit-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${600 + auditResults.length * 350 + 200}ms both`
                }}
              >
                <div className="flex items-center gap-3">
                  <IQScoreRing score={displayScore} />
                  <div>
                    <p className="text-sm font-semibold">
                      {displayScore >= 80 ? 'Launch Ready' : displayScore >= 50 ? 'Needs Work' : 'Not Ready'}
                    </p>
                    <p className="text-xs text-muted-foreground">{passCount}/{auditResults.length} checks passed</p>
                  </div>
                </div>

                <Button
                  onClick={handleLaunch}
                  disabled={deploying || deployed}
                  className={cn(
                    'gap-2 px-6 rounded-xl transition-all duration-300',
                    deployed
                      ? 'bg-green-600 text-foreground hover:bg-green-600 shadow-[0_0_30px_hsl(142_71%_45%/0.3)]'
                      : 'glow-button shadow-[0_0_20px_hsl(var(--primary)/0.25)]'
                  )}
                >
                  {deployed ? (
                    <><Check className="h-4 w-4" /> Live</>
                  ) : deploying ? (
                    <><Rocket className="h-4 w-4 animate-bounce" /> Deploying…</>
                  ) : (
                    <><Rocket className="h-4 w-4" /> Deploy Live</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Audit & Launch button — no longer a full bottom bar */}
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="flex items-center gap-3">
          {auditDone && score !== null && (
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowAudit(true)}>
              <IQScoreRing score={displayScore} size={40} />
              <span className="text-sm text-muted-foreground">
                {displayScore >= 80 ? 'Ready to Launch' : displayScore >= 50 ? 'Needs Improvement' : 'Not Ready'}
              </span>
            </div>
          )}

          <Button
            size="sm"
            onClick={handleLaunch}
            disabled={deploying || deployed || auditing}
            className={cn(
              'gap-2 glow-button',
              deployed
                ? 'bg-green-600 text-foreground hover:bg-green-600'
                : 'bg-primary text-primary-foreground'
            )}
          >
            {deployed ? (
              <><Check className="h-3.5 w-3.5" /> Live</>
            ) : deploying ? (
              <><Rocket className="h-3.5 w-3.5 animate-bounce" /> Deploying…</>
            ) : auditDone ? (
              <><Rocket className="h-3.5 w-3.5" /> Deploy Live</>
            ) : (
              <><Shield className="h-3.5 w-3.5" /> Audit & Launch</>
            )}
          </Button>
        </div>

        {/* Shareable URL after deploy */}
        {deployed && deployUrl && (
          <DeployedUrlBar deployUrl={deployUrl} projectId={projectId} customDomain={customDomain} />
        )}

        {/* Upgrade nudge — show to Operator users after deploy */}
        {deployed && tier === 'operator' && (
          <div className="max-w-md mx-auto mt-3">
            <QuinnAnalyticsUpgradeNudge />
          </div>
        )}

        {/* Custom Domain — paid plan only */}
        {canPublish && deployed && (
          <Collapsible className="w-full max-w-md mt-2">
            <CollapsibleTrigger className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center">
              <Globe className="h-3.5 w-3.5" />
              Custom Domain
              <ChevronDown className="h-3 w-3" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <CustomDomainSetup projectId={projectId} />
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </>
  );
}
