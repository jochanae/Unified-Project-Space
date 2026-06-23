import { useEffect, useMemo, useState } from 'react';
import { Loader2, Star, Trash2, BookMarked, Sparkles, RefreshCw, Link2, TrendingUp, Eye, Users, RotateCw, Search, X } from 'lucide-react';
import { RemixDialog } from './RemixDialog';
import { CampaignDetailDrawer } from './CampaignDetailDrawer';
import { useBrandKits } from '../hooks/use-brand-kits';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSavedCampaigns, type PerformanceTier, type SavedCampaignRow } from '../hooks/use-saved-campaigns';
import { useFunnelHub } from '@/features/projects';
import { formatDistanceToNow } from 'date-fns';
import { WinCardDialog } from '@/components/shared/WinCardDialog';
import { useMilestoneCelebration } from '@/hooks/use-milestone-celebration';

interface Props {
  projectId?: string | null;
}

const TIER_STYLE: Record<PerformanceTier, { label: string; cls: string }> = {
  elite: { label: 'Elite', cls: 'border-gold/50 bg-gold/15 text-gold' },
  high: { label: 'High', cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
  standard: { label: 'Standard', cls: 'border-border/50 bg-muted/30 text-muted-foreground' },
};

/** Campaign Memory — MarQ's library of past Strategist plans, now wired to real outcomes. */
export function CampaignLibraryPanel({ projectId }: Props) {
  const { campaigns, isLoading, toggleWinner, remove, recalcAll, recalc, linkPages } =
    useSavedCampaigns(null);
  const { active: activeKit } = useBrandKits();
  const { user } = useCurrentUser();
  const { projects } = useFunnelHub();
  const { winCard, setWinCard, celebrate } = useMilestoneCelebration(user?.orgId);
  const [linkTarget, setLinkTarget] = useState<SavedCampaignRow | null>(null);
  const [remixTarget, setRemixTarget] = useState<SavedCampaignRow | null>(null);
  const [detailTarget, setDetailTarget] = useState<SavedCampaignRow | null>(null);

  // Keep the drawer's data fresh as campaigns refetch (e.g., after recalc).
  const detailLive = detailTarget
    ? campaigns.find((c) => c.id === detailTarget.id) ?? detailTarget
    : null;

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'winner' | PerformanceTier>('all');
  const [projectFilter, setProjectFilter] = useState<string>(projectId ?? 'all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const projectName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const channels = useMemo(() => {
    const set = new Set<string>();
    campaigns.forEach((c) => c.plan?.assets?.forEach((a) => a?.channel && set.add(a.channel)));
    return Array.from(set).sort();
  }, [campaigns]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (q) {
        const hay = `${c.name} ${c.rationale ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter === 'winner') {
        if (!(c.is_winner || c.auto_winner)) return false;
      } else if (statusFilter !== 'all') {
        if (c.performance_tier !== statusFilter) return false;
      }
      if (projectFilter !== 'all' && c.project_id !== projectFilter) return false;
      if (channelFilter !== 'all') {
        const has = c.plan?.assets?.some((a) => a?.channel === channelFilter);
        if (!has) return false;
      }
      return true;
    });
  }, [campaigns, search, statusFilter, projectFilter, channelFilter]);

  const filtersActive =
    !!search || statusFilter !== 'all' || projectFilter !== 'all' || channelFilter !== 'all';

  // Celebrate the first elite-tier campaign once per org.
  useEffect(() => {
    const eliteCampaign = campaigns.find((c) => c.performance_tier === 'elite');
    if (eliteCampaign) {
      celebrate('first_elite_campaign', {
        milestone: 'campaign_winner',
        headline: 'Elite campaign unlocked',
        metric: `${eliteCampaign.metrics?.cvr ?? 0}% CVR`,
        subtitle: eliteCampaign.name,
      });
    }
  }, [campaigns, celebrate]);

  return (
    <section className="glass rounded-3xl border border-gold/20 p-5 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookMarked className="h-4 w-4 text-gold" />
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
              Campaign Memory
            </p>
          </div>
          <h2 className="text-xl font-serif tracking-tight">MarQ's winning plays.</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Link campaigns to their landing pages — MarQ auto-detects winners from real conversion data.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            recalcAll.mutate(undefined, {
              onSuccess: () => toast.success('Metrics refreshed'),
              onError: (e) => toast.error(e instanceof Error ? e.message : 'Refresh failed'),
            });
          }}
          disabled={recalcAll.isPending || campaigns.length === 0}
        >
          {recalcAll.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          )}
          Refresh metrics
        </Button>
      </div>

      {/* Filters */}
      <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns…"
            className="h-9 pl-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="h-9 text-xs sm:w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="winner">Winners</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="h-9 text-xs sm:w-[150px]"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="h-9 text-xs sm:w-[130px]"><SelectValue placeholder="Channel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch} value={ch} className="capitalize">{ch}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtersActive && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9 text-xs"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
              setProjectFilter('all');
              setChannelFilter('all');
            }}
          >
            <X className="h-3.5 w-3.5 mr-1" /> Clear
          </Button>
        )}
      </div>

      <div className="mt-4 grid gap-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gold/30 bg-gold/5 p-6 text-center">
            <Sparkles className="h-5 w-5 text-gold mx-auto" />
            <p className="mt-2 text-sm font-medium">No campaigns yet</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
              MarQ drafts a 3-asset launch in under a minute. Start one from the Strategist tab above.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-gold/40 text-gold hover:bg-gold/10"
              onClick={() => {
                const params = new URLSearchParams(window.location.search);
                params.set('tab', 'strategist');
                window.history.replaceState(null, '', `?${params.toString()}`);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Start a campaign
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 p-6 text-center">
            <p className="text-xs text-muted-foreground">
              No campaigns match these filters.
            </p>
          </div>
        ) : (
          filtered.map((c) => {
            const tier = TIER_STYLE[c.performance_tier] || TIER_STYLE.standard;
            const isWinner = c.is_winner || c.auto_winner;
            return (
              <div
                key={c.id}
                role="button"
                tabIndex={0}
                onClick={() => setDetailTarget(c)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDetailTarget(c);
                  }
                }}
                className="rounded-2xl border border-border/40 bg-muted/20 p-4 cursor-pointer transition-colors hover:border-gold/40 hover:bg-gold/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                style={isWinner ? { borderColor: 'hsl(var(--gold) / 0.5)', background: 'hsl(var(--gold) / 0.06)' } : undefined}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-semibold truncate">{c.name}</h3>
                      {isWinner && (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gold">
                          <Star className="h-2.5 w-2.5 fill-current" />
                          {c.auto_winner ? 'auto-winner' : 'winner'}
                        </span>
                      )}
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${tier.cls}`}>
                        {tier.label}
                      </span>
                      {c.project_id && projectName[c.project_id] && (
                        <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                          {projectName[c.project_id]}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground italic line-clamp-2">{c.rationale}</p>

                    {/* Metrics row */}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        <span className="text-foreground font-medium">{c.metrics?.views ?? 0}</span> views
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span className="text-foreground font-medium">{c.metrics?.leads ?? 0}</span> leads
                      </span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-foreground font-medium">{c.metrics?.cvr ?? 0}%</span> CVR
                      </span>
                      <span className="text-muted-foreground/60">
                        · {(c.linked_page_ids?.length ?? 0)} page{(c.linked_page_ids?.length ?? 0) === 1 ? '' : 's'} linked
                      </span>
                    </div>

                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })} ·{' '}
                      {c.plan?.assets?.length ?? 0} assets
                      {c.metrics_updated_at && (
                        <> · refreshed {formatDistanceToNow(new Date(c.metrics_updated_at), { addSuffix: true })}</>
                      )}
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(c.performance_tier === 'elite' || c.performance_tier === 'high') && (
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Remix this winner"
                        onClick={() => setRemixTarget(c)}
                      >
                        <RotateCw className="h-3.5 w-3.5 text-gold" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Link landing pages"
                      onClick={() => setLinkTarget(c)}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Refresh metrics"
                      onClick={() => {
                        recalc.mutate(c.id, {
                          onSuccess: () => toast.success('Metrics refreshed'),
                          onError: (e) => toast.error(e instanceof Error ? e.message : 'Refresh failed'),
                        });
                      }}
                      disabled={recalc.isPending}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={c.is_winner ? 'Unmark winner' : 'Mark winner'}
                      onClick={() => toggleWinner.mutate({ id: c.id, is_winner: !c.is_winner })}
                    >
                      <Star className={`h-3.5 w-3.5 ${isWinner ? 'fill-gold text-gold' : ''}`} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete "${c.name}"?`)) {
                          remove.mutate(c.id);
                          toast.success('Removed');
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <LinkPagesDialog
        campaign={linkTarget}
        onClose={() => setLinkTarget(null)}
        onSave={async (ids) => {
          if (!linkTarget) return;
          await linkPages.mutateAsync({ id: linkTarget.id, pageIds: ids });
          toast.success('Pages linked — metrics updated');
          setLinkTarget(null);
        }}
        saving={linkPages.isPending}
      />

      <RemixDialog
        open={!!remixTarget}
        onOpenChange={(o) => !o && setRemixTarget(null)}
        source={remixTarget}
        projectId={projectId ?? null}
        brand={activeKit?.kit}
      />

      <CampaignDetailDrawer
        campaign={detailLive}
        onClose={() => setDetailTarget(null)}
        onToggleWinner={(id, next) => toggleWinner.mutate({ id, is_winner: next })}
        onRecalc={(id) => {
          recalc.mutate(id, {
            onSuccess: () => toast.success('Metrics refreshed'),
            onError: (e) => toast.error(e instanceof Error ? e.message : 'Refresh failed'),
          });
        }}
        onDelete={(id) => remove.mutate(id)}
        onLinkPages={(c) => {
          setDetailTarget(null);
          setLinkTarget(c);
        }}
        onRemix={(c) => {
          setDetailTarget(null);
          setRemixTarget(c);
        }}
        recalcPending={recalc.isPending}
      />

      {winCard && (
        <WinCardDialog
          open={!!winCard}
          onOpenChange={(o) => !o && setWinCard(null)}
          input={winCard}
        />
      )}
    </section>
  );
}

/** Lets the user attach landing pages to a campaign so the auto-metrics loop can fire. */
function LinkPagesDialog({
  campaign,
  onClose,
  onSave,
  saving,
}: {
  campaign: SavedCampaignRow | null;
  onClose: () => void;
  onSave: (pageIds: string[]) => void;
  saving: boolean;
}) {
  const { user } = useCurrentUser();
  const orgId = user?.orgId;
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: pages, isLoading } = useQuery({
    queryKey: ['org-pages', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('pages')
        .select('id, slug, title, is_published, project_id')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId && !!campaign,
  });

  // Sync selected state when campaign opens
  useMemo(() => {
    if (campaign) setSelected(new Set(campaign.linked_page_ids ?? []));
  }, [campaign]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={!!campaign} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4 text-gold" />
            Link pages to campaign
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Select the landing pages this campaign drives traffic to. MarQ will use real views and leads
          from these pages to score the campaign.
        </p>

        <div className="grid gap-1.5 mt-2 max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : !pages || pages.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No pages yet. Build a landing page first.
            </p>
          ) : (
            pages.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
              >
                <Checkbox
                  checked={selected.has(p.id)}
                  onCheckedChange={() => toggle(p.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.title || p.slug}</div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    /{p.slug} · {p.is_published ? 'published' : 'draft'}
                  </div>
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            className="bg-gold text-black hover:bg-gold/90"
            onClick={() => onSave(Array.from(selected))}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            Save links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
