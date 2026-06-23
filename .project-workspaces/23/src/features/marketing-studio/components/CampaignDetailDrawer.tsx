import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star, Eye, Users, TrendingUp, RefreshCw, Trash2, Link2, RotateCw, Sparkles, Loader2, ExternalLink, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFunnelHub } from '@/features/projects';
import type { SavedCampaignRow, PerformanceTier } from '../hooks/use-saved-campaigns';

const TIER_STYLE: Record<PerformanceTier, { label: string; cls: string }> = {
  elite: { label: 'Elite', cls: 'border-gold/50 bg-gold/15 text-gold' },
  high: { label: 'High', cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
  standard: { label: 'Standard', cls: 'border-border/50 bg-muted/30 text-muted-foreground' },
};

const STAGE_TINT: Record<string, string> = {
  awareness: 'border-cyan-400/30 bg-cyan-400/5 text-cyan-300',
  desire: 'border-gold/40 bg-gold/10 text-gold',
  action: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300',
};

interface Props {
  campaign: SavedCampaignRow | null;
  onClose: () => void;
  onToggleWinner: (id: string, next: boolean) => void;
  onRecalc: (id: string) => void;
  onDelete: (id: string) => void;
  onLinkPages: (c: SavedCampaignRow) => void;
  onRemix: (c: SavedCampaignRow) => void;
  recalcPending: boolean;
}

export function CampaignDetailDrawer({
  campaign,
  onClose,
  onToggleWinner,
  onRecalc,
  onDelete,
  onLinkPages,
  onRemix,
  recalcPending,
}: Props) {
  const { projects } = useFunnelHub();
  const projectName = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const linkedIds = campaign?.linked_page_ids ?? [];

  const { data: linkedPages, isLoading: pagesLoading } = useQuery({
    queryKey: ['campaign-linked-pages', campaign?.id, linkedIds.join(',')],
    queryFn: async () => {
      if (!linkedIds.length) return [];
      const { data, error } = await supabase
        .from('pages')
        .select('id, slug, title, is_published, project_id')
        .in('id', linkedIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!campaign && linkedIds.length > 0,
  });

  if (!campaign) return null;

  const tier = TIER_STYLE[campaign.performance_tier] || TIER_STYLE.standard;
  const isWinner = campaign.is_winner || campaign.auto_winner;
  const canRemix = campaign.performance_tier === 'elite' || campaign.performance_tier === 'high';

  return (
    <Sheet open={!!campaign} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-0 bg-background/95 backdrop-blur-xl border-l border-gold/20"
      >
        <div className="p-5 sm:p-6">
          <SheetHeader className="text-left">
            <div className="flex flex-wrap items-center gap-1.5">
              {isWinner && (
                <span className="inline-flex items-center gap-0.5 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-gold">
                  <Star className="h-2.5 w-2.5 fill-current" />
                  {campaign.auto_winner ? 'auto-winner' : 'winner'}
                </span>
              )}
              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${tier.cls}`}>
                {tier.label}
              </span>
              {campaign.project_id && projectName[campaign.project_id] && (
                <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                  {projectName[campaign.project_id]}
                </span>
              )}
            </div>
            <SheetTitle className="mt-2 font-serif text-xl tracking-tight">
              {campaign.name}
            </SheetTitle>
            <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDistanceToNow(new Date(campaign.created_at), { addSuffix: true })}
              {campaign.metrics_updated_at && (
                <> · refreshed {formatDistanceToNow(new Date(campaign.metrics_updated_at), { addSuffix: true })}</>
              )}
            </p>
          </SheetHeader>

          {/* Metrics */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <MetricTile icon={<Eye className="h-3.5 w-3.5" />} label="Views" value={campaign.metrics?.views ?? 0} />
            <MetricTile icon={<Users className="h-3.5 w-3.5" />} label="Leads" value={campaign.metrics?.leads ?? 0} />
            <MetricTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="CVR" value={`${campaign.metrics?.cvr ?? 0}%`} />
          </div>

          {/* Quick actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => onLinkPages(campaign)}>
              <Link2 className="h-3.5 w-3.5 mr-1.5" /> Link pages
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRecalc(campaign.id)}
              disabled={recalcPending}
            >
              {recalcPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onToggleWinner(campaign.id, !campaign.is_winner)}
            >
              <Star className={`h-3.5 w-3.5 mr-1.5 ${isWinner ? 'fill-gold text-gold' : ''}`} />
              {campaign.is_winner ? 'Unmark winner' : 'Mark winner'}
            </Button>
            {canRemix && (
              <Button size="sm" variant="outline" onClick={() => onRemix(campaign)}>
                <RotateCw className="h-3.5 w-3.5 mr-1.5 text-gold" /> Remix
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete "${campaign.name}"?`)) {
                  onDelete(campaign.id);
                  toast.success('Removed');
                  onClose();
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
            </Button>
          </div>

          <Separator className="my-5 bg-border/40" />

          {/* Rationale */}
          {campaign.rationale && (
            <section>
              <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90 mb-1.5">
                Strategic Rationale
              </h3>
              <p className="text-xs text-muted-foreground italic leading-relaxed">{campaign.rationale}</p>
            </section>
          )}

          {/* Assets */}
          {campaign.plan?.assets?.length > 0 && (
            <section className="mt-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90 mb-2">
                Campaign Assets · {campaign.plan.assets.length}
              </h3>
              <div className="grid gap-2.5">
                {campaign.plan.assets.map((a, i) => (
                  <div key={i} className="rounded-xl border border-border/40 bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${STAGE_TINT[a.stage] ?? STAGE_TINT.awareness}`}>
                        {a.stage}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-muted-foreground">
                        {a.channel}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">· {a.template_id}</span>
                    </div>
                    <p className="text-sm font-semibold leading-tight">{a.headline}</p>
                    {a.subhead && <p className="mt-0.5 text-xs text-muted-foreground">{a.subhead}</p>}
                    {a.cta && (
                      <p className="mt-1.5 text-[11px]">
                        <span className="text-muted-foreground/70 uppercase tracking-wider mr-1">CTA:</span>
                        <span className="text-foreground font-medium">{a.cta}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Distribution plan */}
          {campaign.plan?.distribution_plan && campaign.plan.distribution_plan.length > 0 && (
            <section className="mt-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90 mb-2">
                Distribution Plan
              </h3>
              <ul className="space-y-1">
                {campaign.plan.distribution_plan.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="text-gold/70 shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Linked pages */}
          <section className="mt-5">
            <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90 mb-2">
              Linked Pages · {linkedIds.length}
            </h3>
            {linkedIds.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/40 p-4 text-center">
                <Sparkles className="h-4 w-4 text-gold/60 mx-auto" />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  No pages linked yet. Link a landing page so MarQ can score this campaign on real conversions.
                </p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => onLinkPages(campaign)}>
                  <Link2 className="h-3.5 w-3.5 mr-1.5" /> Link pages
                </Button>
              </div>
            ) : pagesLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-1.5">
                {linkedPages?.map((p) => (
                  <a
                    key={p.id}
                    href={`/p/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs hover:border-gold/40 hover:bg-gold/5 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.title || p.slug}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        /{p.slug} {p.is_published ? '· live' : '· draft'}
                      </p>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </section>

          {campaign.notes && (
            <section className="mt-5">
              <h3 className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90 mb-1.5">
                Notes
              </h3>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{campaign.notes}</p>
            </section>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function MetricTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[9px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="mt-1 text-lg font-serif tracking-tight">{value}</p>
    </div>
  );
}
