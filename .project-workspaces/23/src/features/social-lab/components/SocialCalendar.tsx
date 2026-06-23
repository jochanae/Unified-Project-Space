import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Sparkles, Zap, Code2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SocialPostCard } from './SocialPostCard';
import { RemixMissionDialog } from './RemixMissionDialog';
import { MissionInspectorDialog } from './MissionInspectorDialog';
import { PLATFORM_META, type SocialCampaign, type SocialPlatform } from '../types';
import { EmptyState } from '@/components/shared/EmptyState';

interface Props {
  campaigns: SocialCampaign[];
  isLoading: boolean;
  onUpdate: (id: string, patch: Partial<SocialCampaign>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

interface MissionGroup {
  campaign_id: string | null;
  campaign_theme: string;
  mode: string;
  created_at: string;
  posts: SocialCampaign[];
}

export function SocialCalendar({ campaigns, isLoading, onUpdate, onDelete }: Props) {
  const navigate = useNavigate();
  const [remixTarget, setRemixTarget] = useState<{ id: string; theme: string; projectId: string | null } | null>(null);
  const [inspectTarget, setInspectTarget] = useState<{ id: string | null; theme: string; posts: SocialCampaign[] } | null>(null);

  // Group by campaign_id (mission). Posts without a campaign_id fall under "Legacy".
  const missions = useMemo<MissionGroup[]>(() => {
    const map = new Map<string, MissionGroup>();
    for (const c of campaigns) {
      const key = c.campaign_id ?? '__legacy__';
      const existing = map.get(key);
      if (existing) {
        existing.posts.push(c);
      } else {
        map.set(key, {
          campaign_id: c.campaign_id,
          campaign_theme: c.campaign_theme ?? (c.campaign_id ? 'Untitled Campaign' : 'Earlier posts'),
          mode: c.generation_mode ?? 'deep_dive',
          created_at: c.created_at,
          posts: [c],
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [campaigns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner />
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title="No campaigns yet"
        description="Generate a 7-day Deep Dive from your Strategy Blueprint. MarQ will dissect one Signal across the full narrative arc."
        ctaLabel="Open Strategy Blueprint"
        onCta={() => navigate('/strategy')}
        secondaryLabel="Generate from Signal Lab"
        onSecondary={() => navigate('/signal-lab')}
      />
    );
  }

  return (
    <div className="space-y-10">
      {missions.map((mission) => {
        const platformMap = new Map<SocialPlatform, SocialCampaign[]>();
        for (const p of mission.posts) {
          const list = platformMap.get(p.platform) ?? [];
          list.push(p);
          // Sort posts inside a lane by narrative day so the arc reads top-to-bottom
          platformMap.set(p.platform, list);
        }
        for (const [, list] of platformMap) {
          list.sort((a, b) => (a.narrative_day ?? 99) - (b.narrative_day ?? 99));
        }
        const platforms = Array.from(platformMap.keys());
        const isDeepDive = mission.mode === 'deep_dive';

        return (
          <section key={mission.campaign_id ?? 'legacy'} className="space-y-4">
            {/* Mission banner */}
            <div className="glass rounded-2xl border border-primary/20 p-4 md:p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  {isDeepDive ? <Sparkles className="h-4 w-4" /> : <Radio className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={isDeepDive ? 'border-primary/40 text-primary text-[10px]' : 'text-[10px]'}
                    >
                      {isDeepDive ? 'Deep Dive' : 'Spray & Pray'}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {mission.posts.length} posts · {platforms.length} platform{platforms.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <h2 className="text-base md:text-lg font-semibold mt-1 truncate">
                    {mission.campaign_theme}
                  </h2>
                  {isDeepDive && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      One Signal · 7-day narrative arc · Hook → Depth → Proof → Friction → Bridge
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setInspectTarget({
                        id: mission.campaign_id,
                        theme: mission.campaign_theme,
                        posts: mission.posts,
                      })
                    }
                    className="gap-1.5"
                    title="Inspect the strategic reasoning"
                  >
                    <Code2 className="h-3.5 w-3.5" /> Open the Hood
                  </Button>
                  {isDeepDive && mission.campaign_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setRemixTarget({
                          id: mission.campaign_id!,
                          theme: mission.campaign_theme,
                          projectId: mission.posts[0]?.project_id ?? null,
                        })
                      }
                      className="gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      title="Same Signal, new angle"
                    >
                      <Zap className="h-3.5 w-3.5" /> Remix
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Platform lanes */}
            <div className="grid gap-6 lg:grid-cols-3">
              {platforms.map((platform) => {
                const meta = PLATFORM_META[platform];
                const posts = platformMap.get(platform) ?? [];
                return (
                  <div key={platform} className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-lg">{meta.icon}</span>
                      <h3 className="font-semibold text-sm">{meta.label}</h3>
                      <span className="ml-auto text-xs text-muted-foreground">{posts.length} posts</span>
                    </div>
                    <div className="space-y-3">
                      {posts.map((p) => (
                        <SocialPostCard key={p.id} post={p} onUpdate={onUpdate} onDelete={onDelete} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {remixTarget && (
        <RemixMissionDialog
          campaignId={remixTarget.id}
          campaignTheme={remixTarget.theme}
          projectId={remixTarget.projectId}
          open={!!remixTarget}
          onOpenChange={(open) => !open && setRemixTarget(null)}
        />
      )}

      {inspectTarget && (
        <MissionInspectorDialog
          open={!!inspectTarget}
          onOpenChange={(open) => !open && setInspectTarget(null)}
          campaignId={inspectTarget.id}
          campaignTheme={inspectTarget.theme}
          posts={inspectTarget.posts}
        />
      )}
    </div>
  );
}
