import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Trash2, Check, Wand2, Pencil, ImageIcon, Loader2, RefreshCw, Send, Instagram } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SocialCampaign, SocialPlatform } from '../types';
import { PLATFORM_META, NARRATIVE_ROLE_META } from '../types';
import { RefineToneDialog } from './RefineToneDialog';
import { supabase } from '@/integrations/supabase/client';
import { NextStepPrompt } from '@/components/shared/NextStepPrompt';
import { useCurrentUser } from '@/hooks/use-current-user';
import { buildTrackedShareUrl, openInstagram, openTwitterIntent, openFacebookSharer, openTikTok } from '../lib/share-link';

interface Props {
  post: SocialCampaign;
  onUpdate: (id: string, patch: Partial<SocialCampaign>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

// Map social-lab platforms to the surface platforms quinn-generate-image accepts.
function mapVisualPlatform(p: SocialPlatform): 'instagram' | 'linkedin' | 'twitter' {
  if (p === 'linkedin') return 'linkedin';
  if (p === 'twitter') return 'twitter';
  // Instagram, TikTok, Facebook → square Instagram crop
  return 'instagram';
}

export function SocialPostCard({ post, onUpdate, onDelete }: Props) {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [editing, setEditing] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);
  const [bodyDraft, setBodyDraft] = useState(post.body);
  const [hookDraft, setHookDraft] = useState(post.hook);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const meta = PLATFORM_META[post.platform];

  const fullText = `${post.hook}\n\n${post.body}${post.hashtags.length ? `\n\n${post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}` : ''}`;

  const copy = async () => {
    await navigator.clipboard.writeText(fullText);
    toast.success(`${meta.label} post copied.`);
  };

  const save = async () => {
    await onUpdate(post.id, { hook: hookDraft, body: bodyDraft });
    setEditing(false);
    toast.success('Refined.');
  };

  const generateVisual = async () => {
    setGeneratingImage(true);
    try {
      const captionSeed = `${post.hook}\n${post.body}`.slice(0, 200);
      const visualPrompt = `Social post visual for ${meta.label}: ${captionSeed}. ${
        post.media_suggestion ? `Visual idea: ${post.media_suggestion}.` : ''
      } On-brand, scroll-stopping, single focal subject.`;
      const { data, error } = await supabase.functions.invoke('studio-generate', {
        body: {
          mode: 'social',
          prompt: visualPrompt,
          platform: mapVisualPlatform(post.platform),
          projectId: post.project_id ?? undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.imageUrl) throw new Error('No image returned');
      await onUpdate(post.id, { image_url: data.imageUrl });
      toast.success('Visual generated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Image generation failed');
    } finally {
      setGeneratingImage(false);
    }
  };

  const turnIntoPage = async () => {
    if (!post.project_id) {
      toast.error('Post is not linked to a project yet.');
      return;
    }
    if (!user?.orgId) {
      toast.error('Sign in required.');
      return;
    }
    setCreatingPage(true);
    try {
      const headline = post.hook.slice(0, 80) || (post.campaign_theme ?? 'New campaign');
      const subhead = post.body.replace(/\s+/g, ' ').slice(0, 200);
      const slug = `${headline
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'campaign'}-${crypto.randomUUID().slice(0, 6)}`;
      const { data, error } = await supabase
        .from('pages')
        .insert({
          project_id: post.project_id,
          org_id: user.orgId,
          title: post.campaign_theme || headline,
          slug,
          content_blocks: [
            {
              type: 'hero',
              headline,
              subhead,
              ...(post.image_url ? { hero_image_url: post.image_url } : {}),
            },
          ],
        })
        .select('id')
        .single();
      if (error) throw error;
      // Mark this post so the prompt becomes a receipt.
      await onUpdate(post.id, { created_page_id: data.id });
      toast.success('Funnel page drafted from this post');
      navigate(`/projects?projectId=${post.project_id}&tab=pages&pageId=${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not create page');
    } finally {
      setCreatingPage(false);
    }
  };

  const publishToLinkedIn = async () => {
    setPublishing(true);
    try {
      const text = fullText.slice(0, 2900);
      const { data, error } = await supabase.functions.invoke('linkedin-publish', {
        body: { text, imageUrl: post.image_url ?? undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Published to LinkedIn');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Publish failed';
      if (/not connected|expired/i.test(msg)) {
        toast.error(msg, {
          action: { label: 'Connect', onClick: () => navigate('/settings') },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setPublishing(false);
    }
  };

  const prepareTrackedShare = async () => {
    const trackedUrl = await buildTrackedShareUrl({
      platform: post.platform === 'twitter' ? 'twitter' : post.platform === 'facebook' ? 'facebook' : post.platform === 'tiktok' ? 'tiktok' : 'instagram',
      campaign: post.campaign_theme ?? post.campaign_id,
      pageId: post.created_page_id ?? null,
    });
    const tip = post.created_page_id
      ? ''
      : '\n(Tip: link a funnel page to this post for a tracked URL)';
    return { trackedUrl, tip };
  };

  const shareToInstagram = async () => {
    try {
      const { trackedUrl, tip } = await prepareTrackedShare();
      await navigator.clipboard.writeText(`${fullText}\n\n${trackedUrl}${tip}`);
      toast.success('Caption + tracked link copied — opening Instagram', {
        description: 'Paste into your IG post, Story, or Reel caption.',
      });
      openInstagram();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not prepare share');
    }
  };

  const shareToTwitter = async () => {
    try {
      const { trackedUrl } = await prepareTrackedShare();
      // Web Intent pre-fills both text and url — no clipboard needed.
      openTwitterIntent(fullText, trackedUrl);
      toast.success('Opening X with your post pre-filled');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not prepare share');
    }
  };

  const shareToFacebook = async () => {
    try {
      const { trackedUrl, tip } = await prepareTrackedShare();
      // FB strips pre-filled text, so copy caption to clipboard as a fallback.
      await navigator.clipboard.writeText(`${fullText}\n\n${trackedUrl}${tip}`);
      toast.success('Caption copied — opening Facebook', {
        description: 'Facebook won\'t pre-fill text; paste it into the share dialog.',
      });
      openFacebookSharer(trackedUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not prepare share');
    }
  };

  const shareToTikTok = async () => {
    try {
      const { trackedUrl, tip } = await prepareTrackedShare();
      await navigator.clipboard.writeText(`${fullText}\n\n${trackedUrl}${tip}`);
      toast.success('Caption + tracked link copied — opening TikTok', {
        description: 'Paste into your TikTok caption when uploading.',
      });
      openTikTok();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not prepare share');
    }
  };

  const showFunnelPrompt = !!post.campaign_id;

  return (
    <Card className="glass overflow-hidden border-border/50">
      <div className={cn('h-1 w-full bg-gradient-to-r', meta.accent)} />
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-lg">{meta.icon}</span>
            <Badge variant="secondary" className="text-xs">{meta.label}</Badge>
            <Badge variant="outline" className="text-xs capitalize">{post.content_type}</Badge>
            {post.narrative_day && (
              <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                Day {post.narrative_day}
              </Badge>
            )}
            {post.narrative_role && NARRATIVE_ROLE_META[post.narrative_role] && (
              <Badge
                variant="outline"
                className={cn('text-[10px] border-current/40', NARRATIVE_ROLE_META[post.narrative_role].tone)}
                title={NARRATIVE_ROLE_META[post.narrative_role].description}
              >
                {post.narrative_role}
              </Badge>
            )}
          </div>
          {post.refinement_count > 0 && (
            <span className="text-[10px] text-muted-foreground">Refined ×{post.refinement_count}</span>
          )}
        </div>

        {/* AI visual (if present or generating) */}
        {(post.image_url || generatingImage) && (
          <div className="relative aspect-square overflow-hidden rounded-lg border border-border/30 bg-muted/20">
            {post.image_url && (
              <img src={post.image_url} alt="" className="h-full w-full object-cover" />
            )}
            {generatingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {post.image_url && !generatingImage && (
              <button
                type="button"
                onClick={generateVisual}
                title="Regenerate visual"
                className="absolute top-2 right-2 rounded-md bg-black/60 p-1.5 text-white/80 hover:text-white"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {editing ? (
          <>
            <Textarea
              value={hookDraft}
              onChange={(e) => setHookDraft(e.target.value)}
              className="font-semibold text-sm min-h-[60px]"
              placeholder="Hook"
            />
            <Textarea
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              className="text-sm min-h-[120px]"
              placeholder="Body"
            />
          </>
        ) : (
          <>
            <p className="font-semibold text-sm leading-snug text-foreground">{post.hook}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{post.body}</p>
            {post.hashtags.length > 0 && (
              <p className="text-xs text-primary/80">
                {post.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' ')}
              </p>
            )}
            {post.media_suggestion && (
              <p className="text-[11px] text-muted-foreground italic border-l-2 border-primary/30 pl-2">
                🎬 {post.media_suggestion}
              </p>
            )}
            {post.audio_suggestion && (
              <p className="text-[11px] text-muted-foreground italic border-l-2 border-accent/30 pl-2">
                🎵 {post.audio_suggestion}
              </p>
            )}
          </>
        )}

        {/* Inline next-step prompt — only for posts that belong to a real mission */}
        {!editing && showFunnelPrompt && (
          post.created_page_id ? (
            <NextStepPrompt
              mode="receipt"
              text="Funnel page drafted · View page"
              pulse
              onClick={() =>
                navigate(`/projects?projectId=${post.project_id}&tab=pages&pageId=${post.created_page_id}`)
              }
            />
          ) : (
            <NextStepPrompt
              mode="action"
              text="Turn this into a funnel page"
              loading={creatingPage}
              onClick={turnIntoPage}
            />
          )
        )}

        <div className="flex items-center gap-1.5 pt-2 border-t border-border/30 flex-wrap">
          {editing ? (
            <Button size="sm" onClick={save} className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRefineOpen(true)}
                className="gap-1.5 text-primary"
                title="Refine tone with MarQ"
              >
                <Wand2 className="h-3.5 w-3.5" /> Refine
              </Button>
              {!post.image_url && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={generateVisual}
                  disabled={generatingImage}
                  className="gap-1.5 text-primary"
                  title="Generate AI visual"
                >
                  {generatingImage ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ImageIcon className="h-3.5 w-3.5" />
                  )}
                  Generate visual
                </Button>
              )}
              {post.platform === 'linkedin' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={publishToLinkedIn}
                  disabled={publishing}
                  className="gap-1.5 text-[#0a66c2]"
                  title="Publish directly to LinkedIn"
                >
                  {publishing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Publish
                </Button>
              )}
              {post.platform === 'instagram' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={shareToInstagram}
                  className="gap-1.5 text-pink-500"
                  title="Copy caption + tracked link, then open Instagram"
                >
                  <Instagram className="h-3.5 w-3.5" />
                  Share to IG
                </Button>
              )}
              {post.platform === 'twitter' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={shareToTwitter}
                  className="gap-1.5 text-sky-400"
                  title="Open X with caption + link pre-filled"
                >
                  <Send className="h-3.5 w-3.5" />
                  Post to X
                </Button>
              )}
              {post.platform === 'facebook' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={shareToFacebook}
                  className="gap-1.5 text-blue-500"
                  title="Copy caption + tracked link, then open Facebook"
                >
                  <Send className="h-3.5 w-3.5" />
                  Share to FB
                </Button>
              )}
              {post.platform === 'tiktok' && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={shareToTikTok}
                  className="gap-1.5 text-foreground"
                  title="Copy caption + tracked link, then open TikTok"
                >
                  <Send className="h-3.5 w-3.5" />
                  Share to TikTok
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="gap-1.5 text-muted-foreground"
                title="Edit manually"
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(post.id)}
            className="ml-auto text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <RefineToneDialog
        post={post}
        open={refineOpen}
        onOpenChange={setRefineOpen}
        onRefined={() => onUpdate(post.id, {})}
      />
    </Card>
  );
}
