import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Brain, Lock, Swords, TrendingUp, Eye, Lightbulb, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { Button } from '@/components/ui/button';

/**
 * NeuralLinkPanel
 * ---------------
 * The 4th sector of the Command Center — Innovation-tier intelligence:
 *  - A/B Vibe Duel results (live ab_tests with view counts)
 *  - MarQ's Performance Suggestions (derived from page CTR + lead score)
 *  - Audience Behavior Logs (recent page_views + their referrers)
 *
 * Visible to all tiers; Innovation users see live data, lower tiers see a
 * locked preview with an upgrade CTA.
 */

interface Props {
  projectId: string;
  orgId: string | null | undefined;
}

export function NeuralLinkPanel({ projectId, orgId }: Props) {
  const navigate = useNavigate();
  const { isGrowth, loading: subLoading } = useSubscription();

  // Always fetch a tiny sample so we can render meaningful previews even when locked
  const { data: pageIds = [] } = useQuery({
    queryKey: ['neural-link-pages', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('pages')
        .select('id')
        .eq('project_id', projectId);
      return (data || []).map((p) => p.id);
    },
  });

  const { data: abTests = [] } = useQuery({
    queryKey: ['neural-link-abtests', projectId, pageIds.join(',')],
    enabled: !!projectId && pageIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('ab_tests')
        .select('id, field_name, variant_a, variant_b, is_active, page_id')
        .in('page_id', pageIds)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
  });

  const { data: views = [] } = useQuery({
    queryKey: ['neural-link-views', projectId, pageIds.join(',')],
    enabled: !!projectId && pageIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from('page_views')
        .select('referrer, country, created_at')
        .in('page_id', pageIds)
        .order('created_at', { ascending: false })
        .limit(8);
      return data || [];
    },
  });

  const { data: leadCount = 0 } = useQuery({
    queryKey: ['neural-link-leads', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { count } = await supabase
        .from('lead_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);
      return count ?? 0;
    },
  });

  // Pull recent leads with attribution metadata to compute the top-performing block.
  const { data: recentLeads = [] } = useQuery({
    queryKey: ['neural-link-attribution', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data } = await supabase
        .from('lead_notifications')
        .select('metadata')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const topBlock = useMemo(() => {
    const counts: Record<string, number> = {};
    recentLeads.forEach((l: any) => {
      const id = l?.metadata?.attribution?.primary_block_id;
      if (typeof id === 'string' && id) counts[id] = (counts[id] || 0) + 1;
    });
    let winner: string | null = null;
    let max = 0;
    let total = 0;
    Object.entries(counts).forEach(([id, n]) => {
      total += n;
      if (n > max) { max = n; winner = id; }
    });
    if (!winner || total < 3) return null;
    return { id: winner, count: max, share: Math.round((max / total) * 100) };
  }, [recentLeads]);

  const totalViews = views.length; // sample-based
  const suggestions = useMemo(() => {
    const out: { icon: any; tone: string; text: string }[] = [];
    if (topBlock) {
      const pretty = topBlock.id.replace(/[_-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
      out.push({
        icon: TrendingUp,
        tone: 'text-emerald-400',
        text: `Performance Insight: "${pretty}" is converting ${topBlock.share}% of recent leads — double down on this hook.`,
      });
    }
    if (pageIds.length === 0) {
      out.push({
        icon: Lightbulb,
        tone: 'text-amber-400',
        text: 'Deploy a landing page so MarQ can start optimizing variants.',
      });
    } else if (abTests.length === 0) {
      out.push({
        icon: Swords,
        tone: 'text-primary',
        text: 'No live Vibe Duel — start an A/B test on the hero hook to learn what converts.',
      });
    } else {
      out.push({
        icon: TrendingUp,
        tone: 'text-emerald-400',
        text: `${abTests.length} active test${abTests.length === 1 ? '' : 's'} running. MarQ will surface a winner once each variant has 50+ views.`,
      });
    }
    if (leadCount > 0 && totalViews > 0) {
      const ratio = Math.round((leadCount / Math.max(totalViews, 1)) * 100);
      if (ratio < 5) {
        out.push({
          icon: Lightbulb,
          tone: 'text-amber-400',
          text: `Lead-to-view ratio is ${ratio}% in recent activity — sharpen your hero hook in Signal Lab.`,
        });
      }
    }
    if (views.length > 0) {
      const refs = views.filter((v) => v.referrer).length;
      if (refs / views.length > 0.5) {
        out.push({
          icon: Eye,
          tone: 'text-primary',
          text: 'Most recent traffic has referrers — your distribution channels are working.',
        });
      }
    }
    return out.slice(0, 3);
  }, [abTests, leadCount, totalViews, views, pageIds.length, topBlock]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl">
      <div className="p-5 sm:p-6 border-b border-border/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15 border border-primary/25">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
              Neural Link
            </p>
            <p className="text-xs text-muted-foreground">
              Performance memory · Innovation tier
            </p>
          </div>
        </div>
        {!subLoading && !isGrowth && (
          <span className="px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-black text-amber-400 uppercase tracking-tight flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Locked
          </span>
        )}
      </div>

      <div className="relative">
        <div className={!isGrowth ? 'pointer-events-none select-none blur-[2px] opacity-70' : ''}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border/15">
            {/* Vibe Duel column */}
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Swords className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  Vibe Duel
                </p>
              </div>
              {abTests.length === 0 ? (
                <p className="text-xs text-muted-foreground">No live duels — start one in the page builder.</p>
              ) : (
                <ul className="space-y-3">
                  {abTests.map((t) => (
                    <li key={t.id} className="rounded-xl border border-border/30 bg-background/40 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        {t.field_name}
                      </p>
                      <p className="text-xs text-foreground/90 line-clamp-1">A: {t.variant_a}</p>
                      <p className="text-xs text-foreground/60 line-clamp-1">B: {t.variant_b}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Suggestions column */}
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  MarQ Suggests
                </p>
              </div>
              <ul className="space-y-2.5">
                {suggestions.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-foreground/85">
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${s.tone}`} />
                      <span>{s.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Behavior column */}
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-3.5 h-3.5 text-primary" />
                <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                  Audience Log
                </p>
              </div>
              {views.length === 0 ? (
                <p className="text-xs text-muted-foreground">No page views yet.</p>
              ) : (
                <ul className="space-y-1.5 font-mono text-[11px] text-muted-foreground/80">
                  {views.slice(0, 5).map((v, i) => {
                    const ref = v.referrer ? new URL(v.referrer.startsWith('http') ? v.referrer : `https://${v.referrer}`).hostname.replace('www.', '') : 'direct';
                    const ago = Math.max(1, Math.floor((Date.now() - new Date(v.created_at).getTime()) / 60000));
                    return (
                      <li key={i} className="flex justify-between gap-2">
                        <span className="truncate">{v.country || '—'} · {ref}</span>
                        <span className="text-muted-foreground/50">{ago}m</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

        {!subLoading && !isGrowth && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="p-3 rounded-2xl bg-primary/15 border border-primary/30">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              Neural Link is an Innovation-tier capability
            </p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Unlock A/B Vibe Duel results, MarQ's performance suggestions, and live audience behavior logs.
            </p>
            <Button size="sm" className="gap-1.5" onClick={() => navigate('/pricing')}>
              Unlock Innovation
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
