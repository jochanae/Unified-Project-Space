import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFunnelHub } from '@/features/projects';
import { Zap, TrendingDown, ArrowRight, Loader2, Check, History, Instagram, Music2, Twitter, Linkedin } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type BundleType = 'zero_to_launch' | 'weekend_push';
type Platform = 'instagram' | 'tiktok' | 'x' | 'linkedin';

interface Bundle {
  id: string;
  type: BundleType;
  projectId: string;
  projectName: string;
  badge: string;
  badgeIcon: typeof Zap;
  headline: string;
  assets: string[];
  tone: 'teal' | 'amber';
}

interface Props { orgId: string }

const PLATFORMS: { id: Platform; label: string; Icon: typeof Instagram }[] = [
  { id: 'instagram', label: 'IG', Icon: Instagram },
  { id: 'tiktok',    label: 'TT', Icon: Music2 },
  { id: 'x',         label: 'X',  Icon: Twitter },
  { id: 'linkedin',  label: 'IN', Icon: Linkedin },
];

function isWeekendPushWindow(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hr = now.getHours();
  if (day === 6) return true;
  if (day === 5 && hr >= 17) return true;
  if (day === 0 && hr <= 23) return true;
  return false;
}

export function ProactiveBundlesCard({ orgId }: Props) {
  const navigate = useNavigate();
  const { setActiveProject } = useFunnelHub();
  const [deploying, setDeploying] = useState<string | null>(null);
  const [deployed, setDeployed] = useState<Set<string>>(new Set());
  const [platformByBundle, setPlatformByBundle] = useState<Record<string, Platform>>({});
  const [showHistory, setShowHistory] = useState(false);

  const { data: bundles = [] } = useQuery<Bundle[]>({
    queryKey: ['proactive-bundles', orgId],
    enabled: !!orgId,
    refetchInterval: 5 * 60_000,
    queryFn: async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      const sixDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString();
      const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

      const { data: newProjects } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('org_id', orgId)
        .is('deleted_at', null)
        .gte('created_at', twoDaysAgo)
        .order('created_at', { ascending: false })
        .limit(2);

      const { data: igViewsRecent } = await supabase
        .from('page_views').select('page_id, created_at')
        .eq('org_id', orgId).eq('utm_source', 'instagram')
        .gte('created_at', threeDaysAgo);
      const { data: igViewsPrior } = await supabase
        .from('page_views').select('page_id, created_at')
        .eq('org_id', orgId).eq('utm_source', 'instagram')
        .gte('created_at', sixDaysAgo).lt('created_at', threeDaysAgo);
      const { data: anyRecentView } = await supabase
        .from('page_views').select('id')
        .eq('org_id', orgId).gte('created_at', oneDayAgo).limit(1);

      const recentCount = igViewsRecent?.length ?? 0;
      const priorCount = igViewsPrior?.length ?? 0;
      const dipPct = priorCount > 0 ? (priorCount - recentCount) / priorCount : 0;
      const weekendWindow = isWeekendPushWindow();
      const zeroToday = (anyRecentView?.length ?? 0) === 0;
      const dipTriggered = (priorCount >= 5 && dipPct >= 0.3) || (weekendWindow && zeroToday);

      let lagProjectId: string | null = null;
      let lagProjectName: string | null = null;
      if (dipTriggered) {
        const { data: latestProjects } = await supabase
          .from('projects').select('id, name')
          .eq('org_id', orgId).is('deleted_at', null)
          .order('created_at', { ascending: false }).limit(1);
        lagProjectId = latestProjects?.[0]?.id ?? null;
        lagProjectName = latestProjects?.[0]?.name ?? null;
      }

      const out: Bundle[] = [];
      newProjects?.forEach((p) => {
        out.push({
          id: `zero_to_launch:${p.id}`,
          type: 'zero_to_launch',
          projectId: p.id,
          projectName: p.name,
          badge: '⚡ New Project Momentum',
          badgeIcon: Zap,
          headline: 'The 48-Hour Waitlist Sprint',
          assets: [
            'Layout Foundation: Glassmorphic waitlist step',
            'Copy Deck: 3-touch welcome sequence',
            'Social Bridge: AI caption + tracked link',
            'Auto-Queue: 48h performance reminder email',
          ],
          tone: 'teal',
        });
      });
      if (dipTriggered && lagProjectId && lagProjectName) {
        out.push({
          id: `weekend_push:${lagProjectId}`,
          type: 'weekend_push',
          projectId: lagProjectId,
          projectName: lagProjectName,
          badge: '📉 Weekend Traffic Lag',
          badgeIcon: TrendingDown,
          headline: 'Weekend Audience Push',
          assets: [
            'Layout Variant: High-contrast story-friendly landing',
            'Copy Deck: Late-night browser hook',
            'Social Bridge: AI weekend caption + UTM link',
            'Auto-Queue: 48h performance reminder email',
          ],
          tone: 'amber',
        });
      }

      const seen = new Set<string>();
      return out.filter((b) => (seen.has(b.id) ? false : (seen.add(b.id), true))).slice(0, 2);
    },
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['bundle-deployments', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from('bundle_deployments')
        .select('id, bundle_type, platform, utm_campaign, created_at, project_id, projects(name)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  useEffect(() => {
    const raw = localStorage.getItem(`intoiq_deployed_bundles_${orgId}`);
    if (raw) { try { setDeployed(new Set(JSON.parse(raw))); } catch {} }
  }, [orgId]);

  const visible = useMemo(() => bundles.filter((b) => !deployed.has(b.id)), [bundles, deployed]);

  async function handleDeploy(b: Bundle) {
    const platform: Platform = platformByBundle[b.id] || 'instagram';
    setDeploying(b.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-bundle-caption', {
        body: { project_id: b.projectId, bundle_type: b.type, platform },
      });
      if (error) throw error;
      if ((data as any)?.error === 'rate_limited') throw new Error('AI is busy — try again in a minute.');
      if ((data as any)?.error === 'credits_exhausted') throw new Error('AI credits exhausted. Add credits in Settings.');

      const caption: string = (data as any)?.caption || '';
      const trackedLink: string = (data as any)?.tracked_link || '';
      const payload = `${caption}\n\n${trackedLink}`.trim();
      try { await navigator.clipboard.writeText(payload); }
      catch {
        const ta = document.createElement('textarea');
        ta.value = payload; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }

      toast.success('Strategic assets deployed!', {
        description: `${platform.toUpperCase()} caption + tracked link copied. 48h reminder queued.`,
      });

      const next = new Set(deployed); next.add(b.id);
      setDeployed(next);
      localStorage.setItem(`intoiq_deployed_bundles_${orgId}`, JSON.stringify(Array.from(next)));
      refetchHistory();

      setActiveProject(b.projectId);
      setTimeout(() => navigate('/workspace#funnel-map'), 350);
    } catch (e: any) {
      toast.error('Bundle deploy failed', { description: e?.message ?? 'Try again in a moment.' });
    } finally {
      setDeploying(null);
    }
  }

  if (visible.length === 0 && history.length === 0) return null;

  return (
    <section className="space-y-3">
      {visible.map((b) => {
        const isDeploying = deploying === b.id;
        const isDone = deployed.has(b.id);
        const currentPlatform: Platform = platformByBundle[b.id] || 'instagram';
        const accent = b.tone === 'amber'
          ? 'border-amber-500/30 shadow-[0_0_32px_hsl(40_85%_55%/0.18)]'
          : 'border-primary/30 shadow-[0_0_32px_hsl(var(--primary)/0.18)]';
        const glowBtn = b.tone === 'amber'
          ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_24px_hsl(40_85%_55%/0.45)]'
          : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.5)]';
        const BadgeIcon = b.badgeIcon;
        return (
          <article
            key={b.id}
            className={cn('relative overflow-hidden rounded-3xl border bg-background/40 backdrop-blur-xl p-5 sm:p-6', accent)}
          >
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
              style={{ background: b.tone === 'amber'
                ? 'radial-gradient(ellipse at 80% 0%, hsl(40 90% 55%), transparent 60%)'
                : 'radial-gradient(ellipse at 80% 0%, hsl(var(--primary)), transparent 60%)' }}
            />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] uppercase tracking-[0.18em] font-medium',
                  b.tone === 'amber' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-primary/40 bg-primary/10 text-primary')}>
                  <BadgeIcon className="h-3 w-3" />
                  {b.badge}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground truncate">· {b.projectName}</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-serif tracking-tight">{b.headline}</h3>
              <p className="text-xs text-muted-foreground mt-1">MarQ pre-staged the full bundle. Pick a platform, deploy, jump in.</p>

              <ul className="mt-4 space-y-1.5">
                {b.assets.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/85">
                    <Check className={cn('h-3.5 w-3.5 mt-0.5 shrink-0', b.tone === 'amber' ? 'text-amber-400' : 'text-primary')} />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>

              {/* Platform selector */}
              <div className="mt-4 inline-flex rounded-full border border-border bg-background/60 p-1">
                {PLATFORMS.map((p) => {
                  const active = currentPlatform === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlatformByBundle((s) => ({ ...s, [b.id]: p.id }))}
                      className={cn(
                        'flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] uppercase tracking-wider transition-all',
                        active
                          ? b.tone === 'amber' ? 'bg-amber-500/20 text-amber-300' : 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      aria-pressed={active}
                    >
                      <p.Icon className="h-3 w-3" /> {p.label}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handleDeploy(b)}
                disabled={isDeploying || isDone}
                className={cn('mt-4 w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium transition-all active:scale-[0.99] disabled:opacity-60', glowBtn)}
              >
                {isDeploying ? (<><Loader2 className="h-4 w-4 animate-spin" />Generating bundle...</>)
                  : isDone ? (<><Check className="h-4 w-4" />Deployed</>)
                  : (<>Deploy Bundle<ArrowRight className="h-4 w-4" /></>)}
              </button>
            </div>
          </article>
        );
      })}

      {history.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-background/30 backdrop-blur-xl p-4">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="w-full flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground"
          >
            <span className="inline-flex items-center gap-2"><History className="h-3.5 w-3.5" /> Deployed Bundles</span>
            <span>{history.length}</span>
          </button>
          {showHistory && (
            <ul className="mt-3 space-y-2">
              {history.map((h: any) => {
                const d = new Date(h.created_at);
                const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <li key={h.id} className="flex items-center justify-between gap-2 text-xs text-foreground/85">
                    <span className="truncate">
                      <span className="text-muted-foreground">{date}</span>
                      {' · '}
                      <span className="uppercase tracking-wider">{h.platform}</span>
                      {' · '}
                      {h.bundle_type === 'weekend_push' ? 'Weekend Push' : 'Launch Sprint'}
                      {' · '}
                      <span className="text-muted-foreground">{h.projects?.name ?? ''}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
