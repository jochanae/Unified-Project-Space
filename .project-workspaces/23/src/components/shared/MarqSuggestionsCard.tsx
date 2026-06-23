import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight,
  Globe,
  Share2,
  Sparkles,
  Mail,
  TrendingUp,
  MessageSquare,
  Eye,
  Lightbulb,
} from 'lucide-react';

type Severity = 'info' | 'warn' | 'win';

interface Suggestion {
  id: string;
  severity: Severity;
  icon: typeof Globe;
  title: string;
  desc: string;
  ctaLabel: string;
  route: string;
  priority: number; // lower = higher priority
}

interface Props {
  orgId: string;
}

export function MarqSuggestionsCard({ orgId }: Props) {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        projectsRes,
        viewsRes,
        leadsRes,
        socialRes,
        sequencesRes,
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, custom_domain, domain_verified')
          .eq('org_id', orgId),
        supabase
          .from('page_views')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('lead_notifications')
          .select('id, created_at', { count: 'exact' })
          .eq('org_id', orgId)
          .gte('created_at', sevenDaysAgo)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('social_campaigns')
          .select('posted_at')
          .eq('org_id', orgId)
          .eq('status', 'posted')
          .order('posted_at', { ascending: false })
          .limit(1),
        supabase
          .from('email_sequences')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId),
      ]);

      if (cancelled) return;

      const projects = projectsRes.data || [];
      const viewCount = viewsRes.count ?? 0;
      const leadCount = leadsRes.count ?? 0;
      const lastPostAt = socialRes.data?.[0]?.posted_at
        ? new Date(socialRes.data[0].posted_at as string)
        : null;
      const sequenceCount = sequencesRes.count ?? 0;
      const hasVerifiedDomain = projects.some((p: any) => p.domain_verified);
      const cvr = viewCount > 0 ? (leadCount / viewCount) * 100 : 0;

      const candidates: Suggestion[] = [];

      // WIN — elite conversion: scale traffic
      if (viewCount >= 30 && cvr >= 8) {
        candidates.push({
          id: 'win-elite-cvr',
          severity: 'win',
          icon: TrendingUp,
          title: `You're converting at ${cvr.toFixed(1)}% — scale it`,
          desc: 'Elite-tier funnel. Pour traffic in: post 3x this week, launch a paid test.',
          ctaLabel: 'Open Social Lab',
          route: '/marketing',
          priority: 1,
        });
      }

      // WARN — traffic but no leads
      if (viewCount >= 25 && leadCount === 0) {
        candidates.push({
          id: 'warn-no-leads',
          severity: 'warn',
          icon: Lightbulb,
          title: 'Traffic landing, no one opting in',
          desc: `${viewCount} views this week, 0 leads. Sharpen the headline or simplify the form.`,
          ctaLabel: 'Edit funnel',
          route: '/workspace',
          priority: 2,
        });
      }

      // WARN — no traffic at all
      if (viewCount < 10) {
        candidates.push({
          id: 'warn-low-traffic',
          severity: 'warn',
          icon: Eye,
          title: 'Funnel is quiet this week',
          desc: `Only ${viewCount} views in 7 days. Share the link in your bio + a story.`,
          ctaLabel: 'Get share toolkit',
          route: '/marketing',
          priority: 3,
        });
      }

      // INFO — stale social
      const daysSincePost = lastPostAt
        ? Math.floor((Date.now() - lastPostAt.getTime()) / 86400000)
        : null;
      if (daysSincePost === null || daysSincePost >= 7) {
        candidates.push({
          id: 'info-stale-social',
          severity: 'info',
          icon: Share2,
          title: daysSincePost === null ? 'Push your first post' : `${daysSincePost} days since your last post`,
          desc: 'Momentum compounds. Generate a hook + caption in under 30 seconds.',
          ctaLabel: 'Open Social Lab',
          route: '/marketing',
          priority: 4,
        });
      }

      // INFO — leads but no sequence
      if (leadCount > 0 && sequenceCount === 0) {
        candidates.push({
          id: 'info-no-sequence',
          severity: 'info',
          icon: Mail,
          title: `${leadCount} new lead${leadCount === 1 ? '' : 's'} — no follow-up running`,
          desc: 'Add a 3-step email or SMS sequence so leads don\'t go cold.',
          ctaLabel: 'Build sequence',
          route: '/workspace',
          priority: 2,
        });
      }

      // INFO — no custom domain
      if (projects.length > 0 && !hasVerifiedDomain) {
        candidates.push({
          id: 'info-no-domain',
          severity: 'info',
          icon: Globe,
          title: 'Run on your own domain',
          desc: 'Custom domain = trust + better SEO + branded links you can share anywhere.',
          ctaLabel: 'Set up domain',
          route: '/settings',
          priority: 5,
        });
      }

      // Fallback
      if (candidates.length === 0) {
        candidates.push({
          id: 'info-ask-marq',
          severity: 'info',
          icon: MessageSquare,
          title: 'Ask MarQ what to do next',
          desc: 'Your AI co-pilot reads your funnel, traffic, and leads to call the next move.',
          ctaLabel: 'Open MarQ',
          route: '/workspace',
          priority: 9,
        });
      }

      candidates.sort((a, b) => a.priority - b.priority);
      setSuggestions(candidates.slice(0, 3));
      setLoading(false);
    }

    load().catch(() => setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (loading || suggestions.length === 0) return null;

  const sevColor = (s: Severity) =>
    s === 'win' ? 'text-emerald-400' : s === 'warn' ? 'text-amber-400' : 'text-primary';
  const sevBorder = (s: Severity) =>
    s === 'win'
      ? 'border-emerald-500/30 shadow-[0_0_28px_hsl(160_85%_45%/0.15)]'
      : s === 'warn'
      ? 'border-amber-500/30 shadow-[0_0_28px_hsl(40_85%_55%/0.15)]'
      : 'border-primary/30 shadow-[0_0_28px_hsl(var(--primary)/0.15)]';

  return (
    <section className={`rounded-3xl border ${sevBorder(suggestions[0].severity)} bg-background/40 backdrop-blur-xl overflow-hidden`}>
      <div className="flex items-center gap-2 p-5 sm:p-6 pb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-lg font-serif tracking-tight">MarQ suggests</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reading your live signals — refreshes every visit
          </p>
        </div>
      </div>
      <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s.id}
            onClick={() => navigate(s.route)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border/20 bg-muted/10 px-4 py-3 text-left transition-colors hover:bg-muted/30 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <s.icon className={`h-4 w-4 shrink-0 ${sevColor(s.severity)}`} />
              <div className="min-w-0">
                <span className="block text-sm font-medium truncate">{s.title}</span>
                <span className="block text-xs text-muted-foreground line-clamp-2">{s.desc}</span>
              </div>
            </div>
            <ArrowRight className={`h-4 w-4 shrink-0 ${sevColor(s.severity)}`} />
          </button>
        ))}
      </div>
    </section>
  );
}
