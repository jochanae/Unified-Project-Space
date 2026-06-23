import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowUpRight, Linkedin, Copy, CheckCircle2, Mail, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { useSocialCampaigns } from '../hooks/use-social-campaigns';
import { PLATFORM_META, type SocialCampaign, type SocialPlatform } from '../types';

interface DeployToSocialDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  projectName?: string;
}

const PLATFORMS: SocialPlatform[] = ['linkedin', 'instagram', 'twitter'];
const FRESH_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function DeployToSocialDrawer({ open, onOpenChange, projectId, projectName }: DeployToSocialDrawerProps) {
  const navigate = useNavigate();
  const { campaigns, isLoading, generate } = useSocialCampaigns(projectId);
  const triggeredRef = useRef<string | null>(null);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform>('linkedin');

  // Group most-recent campaign by campaign_id
  const latestSet = useMemo(() => {
    if (!campaigns?.length) return null;
    const newest = campaigns[0];
    const groupId = newest.campaign_id;
    if (!groupId) return [newest];
    return campaigns.filter((c) => c.campaign_id === groupId);
  }, [campaigns]);

  const isFresh = useMemo(() => {
    if (!latestSet?.length) return false;
    const created = new Date(latestSet[0].created_at).getTime();
    return Date.now() - created < FRESH_WINDOW_MS;
  }, [latestSet]);

  // Auto-trigger generation on open if no fresh campaign exists
  useEffect(() => {
    if (!open || !projectId) return;
    if (isLoading) return;
    if (triggeredRef.current === projectId) return;
    if (isFresh) {
      triggeredRef.current = projectId;
      return;
    }
    triggeredRef.current = projectId;
    generate.mutate({ platforms: PLATFORMS, daysOfContent: 3, mode: 'deep_dive' });
  }, [open, projectId, isLoading, isFresh, generate]);

  // Reset trigger when drawer closes
  useEffect(() => {
    if (!open) {
      // small delay so re-opens for the same project don't immediately re-fire
      const t = setTimeout(() => {
        if (!open) triggeredRef.current = null;
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  const generating = generate.isPending;
  const posts = latestSet ?? [];
  const byPlatform = useMemo(() => {
    const m: Record<string, SocialCampaign[]> = {};
    for (const p of posts) {
      (m[p.platform] ||= []).push(p);
    }
    return m;
  }, [posts]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleOpenSocialLab = () => {
    onOpenChange(false);
    navigate('/studio?tab=social');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg glass border-l border-primary/20 overflow-y-auto p-0"
      >
        <div className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-border/40 p-6">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/15 p-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-primary/30">
                Omnichannel Handoff
              </Badge>
            </div>
            <SheetTitle className="text-2xl tracking-tight mt-2">
              Your funnel is live. Now amplify it.
            </SheetTitle>
            <SheetDescription>
              {projectName ? `MarQ translated "${projectName}" into a 3-platform launch sequence.` : 'MarQ translated your funnel into a launch sequence.'}
            </SheetDescription>

            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-2.5 py-1 text-[10px] uppercase tracking-wider text-amber-300/90 cursor-help">
                    <Zap className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span>IntoIQ Engine · Direct-Response Active</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                  Funnel-aligned AIDA/PAS copy with tracked links routing back to your landing page — not generic calendar automation.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-5">
          {generating || (isLoading && !posts.length) ? (
            <LoadingState />
          ) : posts.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No campaign generated yet. Open Social Lab to compose one.
            </div>
          ) : (
            <Tabs value={activePlatform} onValueChange={(v) => setActivePlatform(v as SocialPlatform)}>
              <TabsList className="grid grid-cols-3 w-full">
                {PLATFORMS.map((p) => {
                  const meta = PLATFORM_META[p];
                  const count = byPlatform[p]?.length ?? 0;
                  return (
                    <TabsTrigger key={p} value={p} className="text-xs gap-1.5">
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      {count > 0 && (
                        <span className="text-[10px] text-muted-foreground">({count})</span>
                      )}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {PLATFORMS.map((p) => (
                <TabsContent key={p} value={p} className="space-y-3 mt-4">
                  {(byPlatform[p] ?? []).length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center">
                      No {PLATFORM_META[p].label} post in this batch.
                    </div>
                  ) : (
                    (byPlatform[p] ?? []).map((post) => (
                      <PostCard key={post.id} post={post} onCopy={handleCopy} />
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <div className="sticky bottom-0 backdrop-blur bg-background/90 border-t border-border/40 p-6 space-y-2">
          <Button
            onClick={handleOpenSocialLab}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-500/90 hover:to-amber-600/90 text-black font-medium gap-2"
            size="lg"
          >
            Open in Social Lab
            <ArrowUpRight className="h-4 w-4" />
          </Button>
          {posts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => {
                onOpenChange(false);
                // Hand off to Social Lab where the user can convert to nurture
                navigate('/studio?tab=social&handoff=email');
              }}
            >
              <Mail className="h-3.5 w-3.5" />
              Convert this into a nurture sequence
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground text-center">
            Refine, schedule, and post — your campaign is saved.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Sparkles className="h-3 w-3 animate-pulse text-primary" />
        MarQ is translating your funnel into platform-native posts…
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border/40 p-4 space-y-2 bg-card/40">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function PostCard({ post, onCopy }: { post: SocialCampaign; onCopy: (text: string) => void }) {
  const meta = PLATFORM_META[post.platform];
  const fullText = [post.hook, post.body, post.cta, post.hashtags?.join(' ')]
    .filter(Boolean)
    .join('\n\n');

  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 space-y-3 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {post.narrative_role && (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {post.narrative_role}
            </Badge>
          )}
          {post.narrative_day && (
            <span className="text-[10px] text-muted-foreground">Day {post.narrative_day}</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] gap-1"
          onClick={() => onCopy(fullText)}
        >
          <Copy className="h-3 w-3" />
          Copy
        </Button>
      </div>

      <p className="text-sm font-medium leading-snug">{post.hook}</p>
      {post.body && (
        <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line line-clamp-6">
          {post.body}
        </p>
      )}
      {post.cta && (
        <p className="text-xs text-primary font-medium">→ {post.cta}</p>
      )}
      {post.hashtags?.length > 0 && (
        <p className="text-[11px] text-muted-foreground/80 line-clamp-1">
          {post.hashtags.slice(0, 6).map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
        </p>
      )}
    </div>
  );
}
