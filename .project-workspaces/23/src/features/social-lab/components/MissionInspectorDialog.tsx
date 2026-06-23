import { useMemo, useState } from 'react';
import { Code2, Copy, Check, Layers, Target, Radio } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { NARRATIVE_ROLE_META, PLATFORM_META, type SocialCampaign, type SocialPlatform, type NarrativeRole } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignTheme: string;
  campaignId: string | null;
  posts: SocialCampaign[];
}

const PLATFORM_RATIONALE: Record<SocialPlatform, string> = {
  instagram: 'Visual-first scroll. Hook lives in image + first 125 chars. Carousels for Depth, Reels for Hook/Bridge.',
  linkedin: 'Professional context. Credibility-led. Long-form Depth and Proof posts outperform; lead with insight, not pitch.',
  tiktok: 'Pattern interrupt + native sound. Hook = first 1.5s. Algorithm rewards completion + shares over likes.',
  twitter: 'Compression art. Threads for Depth, single-shot for Hook/Bridge. Reply-bait > broadcast.',
  facebook: 'Community + family graph. Story-led Proof posts travel furthest. Native video > links.',
};

const NARRATIVE_ARC: { role: NarrativeRole; day: number }[] = [
  { role: 'Hook', day: 1 },
  { role: 'Depth', day: 2 },
  { role: 'Proof', day: 3 },
  { role: 'Friction', day: 4 },
  { role: 'Bridge', day: 5 },
];

export function MissionInspectorDialog({ open, onOpenChange, campaignTheme, campaignId, posts }: Props) {
  const [copied, setCopied] = useState(false);

  const anatomy = useMemo(() => {
    const platforms = Array.from(new Set(posts.map((p) => p.platform))) as SocialPlatform[];
    const roleMap = new Map<NarrativeRole, SocialCampaign[]>();
    for (const p of posts) {
      if (!p.narrative_role) continue;
      const role = p.narrative_role as NarrativeRole;
      const list = roleMap.get(role) ?? [];
      list.push(p);
      roleMap.set(role, list);
    }
    return { platforms, roleMap };
  }, [posts]);

  const strategyJson = useMemo(
    () => ({
      campaign_id: campaignId,
      theme: campaignTheme,
      generation_mode: posts[0]?.generation_mode ?? 'deep_dive',
      total_posts: posts.length,
      platforms: anatomy.platforms,
      narrative_arc: NARRATIVE_ARC.map(({ role, day }) => ({
        day,
        role,
        intent: NARRATIVE_ROLE_META[role].description,
        post_count: anatomy.roleMap.get(role)?.length ?? 0,
      })),
      posts: posts.map((p) => ({
        id: p.id,
        platform: p.platform,
        content_type: p.content_type,
        narrative_day: p.narrative_day,
        narrative_role: p.narrative_role,
        hook: p.hook,
        cta: p.cta,
        hashtag_count: p.hashtags.length,
        refinement_count: p.refinement_count,
        status: p.status,
      })),
    }),
    [campaignId, campaignTheme, posts, anatomy],
  );

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(strategyJson, null, 2));
    setCopied(true);
    toast({ title: 'Strategy copied', description: 'JSON copied to clipboard.' });
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-primary mb-1">
            <Code2 className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-widest">Open the Hood</span>
          </div>
          <DialogTitle className="text-xl">Strategic Anatomy</DialogTitle>
          <DialogDescription className="text-xs">
            MarQ's underlying reasoning for <span className="text-foreground font-medium">{campaignTheme}</span>. Not a black box — inspect every decision.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-7rem)]">
          <div className="px-6 py-5 space-y-6">
            {/* Mission Theme */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Core Signal</h3>
              </div>
              <div className="glass rounded-xl p-4 border border-border/40">
                <p className="text-sm font-medium text-foreground">{campaignTheme}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[10px]">{posts.length} posts</Badge>
                  <Badge variant="outline" className="text-[10px]">{anatomy.platforms.length} platforms</Badge>
                  <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                    {posts[0]?.generation_mode === 'deep_dive' ? 'Deep Dive' : 'Spray & Pray'}
                  </Badge>
                </div>
              </div>
            </section>

            {/* Narrative Arc */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Narrative Arc — Role Assignments</h3>
              </div>
              <div className="space-y-2">
                {NARRATIVE_ARC.map(({ role, day }) => {
                  const meta = NARRATIVE_ROLE_META[role];
                  const count = anatomy.roleMap.get(role)?.length ?? 0;
                  return (
                    <div key={role} className="glass rounded-xl p-3 border border-border/40 flex items-center gap-3">
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground w-12 shrink-0">Day {day}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold ${meta.tone}`}>{meta.label}</span>
                          <Badge variant="outline" className="text-[10px]">{count} {count === 1 ? 'post' : 'posts'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Platform Rationale */}
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Radio className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Platform Rationale</h3>
              </div>
              <div className="space-y-2">
                {anatomy.platforms.map((platform) => {
                  const meta = PLATFORM_META[platform];
                  const count = posts.filter((p) => p.platform === platform).length;
                  return (
                    <div key={platform} className="glass rounded-xl p-3 border border-border/40">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base">{meta.icon}</span>
                        <span className="text-sm font-semibold">{meta.label}</span>
                        <Badge variant="outline" className="text-[10px] ml-auto">{count} {count === 1 ? 'post' : 'posts'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{PLATFORM_RATIONALE[platform]}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Raw JSON */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Code2 className="h-3.5 w-3.5 text-primary" />
                  <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Strategy JSON</h3>
                </div>
                <Button size="sm" variant="outline" onClick={handleCopy} className="gap-1.5 h-7 text-xs">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <pre className="glass rounded-xl p-4 border border-border/40 text-[11px] leading-relaxed text-muted-foreground overflow-x-auto font-mono">
                {JSON.stringify(strategyJson, null, 2)}
              </pre>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
