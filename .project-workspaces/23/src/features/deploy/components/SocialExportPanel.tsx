import { useState, useCallback } from 'react';
import { Instagram, Linkedin, Mail, Copy, Download, Loader2, RefreshCw, Sparkles, Send, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SocialExportPanelProps {
  headline: string;
  subheadline: string;
  heroImage?: string;
  socialPromo: {
    instagram_caption: string;
    linkedin_post: string;
    twitter_post: string;
    email_teaser: string;
  };
  brandColor?: string;
}

function copyText(text: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied to clipboard`);
}

function copyAndOpen(text: string, url: string, label: string) {
  navigator.clipboard.writeText(text);
  toast.success(`${label} copied — opening platform`);
  window.open(url, '_blank', 'noopener');
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function AIImageButton({ platform, headline, subheadline, brandColor, onGenerated }: {
  platform: string;
  headline: string;
  subheadline: string;
  brandColor?: string;
  onGenerated: (url: string) => void;
}) {
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('studio-generate', {
        body: {
          mode: 'social',
          platform,
          prompt: `${headline}${subheadline ? `. ${subheadline}` : ''}${brandColor ? ` — accent color ${brandColor}` : ''}`,
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      if (data?.imageUrl) {
        onGenerated(data.imageUrl);
        toast.success('Image generated!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full" onClick={generate} disabled={loading}>
        {loading ? (
          <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</>
        ) : (
          <><Sparkles className="h-3 w-3" /> Generate AI Image</>
        )}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground/50">Uses 1 AI credit</p>
    </div>
  );
}

export function SocialExportPanel({ headline, subheadline, heroImage, socialPromo, brandColor }: SocialExportPanelProps) {
  const [downloading, setDownloading] = useState(false);
  const [igAiImage, setIgAiImage] = useState<string | null>(null);
  const [liAiImage, setLiAiImage] = useState<string | null>(null);
  const [twAiImage, setTwAiImage] = useState<string | null>(null);
  const [publishingLi, setPublishingLi] = useState(false);

  const publishLinkedIn = async () => {
    setPublishingLi(true);
    try {
      const { data, error } = await supabase.functions.invoke('linkedin-publish', {
        body: {
          text: socialPromo.linkedin_post,
          imageUrl: liAiImage ?? heroImage ?? undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Published to LinkedIn');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Publish failed';
      if (/not connected|expired/i.test(msg)) {
        toast.error(msg, {
          action: { label: 'Connect', onClick: () => { window.location.href = '/settings'; } },
        });
      } else {
        toast.error(msg);
      }
    } finally {
      setPublishingLi(false);
    }
  };

  const downloadInstagramImage = useCallback(async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 1080;
      canvas.height = 1080;

      if (heroImage) {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const i = new Image();
          i.crossOrigin = 'anonymous';
          i.onload = () => resolve(i);
          i.onerror = reject;
          i.src = heroImage;
        });
        const scale = Math.max(1080 / img.width, 1080 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (1080 - w) / 2, (1080 - h) / 2, w, h);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
        grad.addColorStop(0, '#0a2a2a');
        grad.addColorStop(1, '#070b10');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1080);
      }

      const overlay = ctx.createLinearGradient(0, 540, 0, 1080);
      overlay.addColorStop(0, 'rgba(0,0,0,0)');
      overlay.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, 1080, 1080);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 56px sans-serif';
      const words = headline.split(' ');
      const lines: string[] = [];
      let line = '';
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > 900) { lines.push(line); line = word; } else { line = test; }
      }
      if (line) lines.push(line);
      const lineHeight = 68;
      const startY = 1080 - 120 - lines.length * lineHeight;
      lines.forEach((l, i) => ctx.fillText(l, 540, startY + i * lineHeight));

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '20px sans-serif';
      ctx.fillText('Built with IntoIQ', 540, 1050);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'intoiq-social-post.png';
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Instagram image downloaded');
      }, 'image/png');
    } catch {
      toast.error('Failed to generate image');
    } finally {
      setDownloading(false);
    }
  }, [headline, heroImage]);

  return (
    <div className="space-y-4">
      {/* Instagram */}
      <div className="glass rounded-xl p-4 border border-border/50 space-y-3">
        <div className="flex items-center gap-2">
          <Instagram className="h-4 w-4 text-pink-400" />
          <span className="text-sm font-semibold">Instagram</span>
        </div>
        <div className="rounded-lg overflow-hidden" style={{ background: '#070b10' }}>
          <div className="relative aspect-square max-h-[280px] overflow-hidden">
            {igAiImage ? (
              <img src={igAiImage} alt="AI Generated" className="w-full h-full object-cover" />
            ) : heroImage ? (
              <img src={heroImage} alt="Hero" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, #0a2a2a, #070b10)' }} />
            )}
            {!igAiImage && (
              <>
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }} />
                <p className="absolute bottom-4 left-4 right-4 text-sm font-bold leading-tight" style={{ color: '#fff' }}>{headline}</p>
              </>
            )}
          </div>
          <p className="p-3 text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(232,240,248,0.55)' }}>
            {socialPromo.instagram_caption.slice(0, 200)}…
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => copyText(socialPromo.instagram_caption, 'Caption')}>
            <Copy className="h-3 w-3" /> Copy Caption
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={downloadInstagramImage} disabled={downloading}>
            <Download className="h-3 w-3" /> {downloading ? 'Generating…' : 'Download Image'}
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs w-full"
          onClick={() => copyAndOpen(socialPromo.instagram_caption, 'https://www.instagram.com/', 'Caption')}
        >
          <ExternalLink className="h-3 w-3" /> Copy + Open Instagram
        </Button>
        {igAiImage ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => downloadDataUrl(igAiImage, 'intoiq-ig-ai.png')}>
              <Download className="h-3 w-3" /> Download AI Image
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setIgAiImage(null)}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        ) : null}
        <AIImageButton platform="instagram" headline={headline} subheadline={subheadline} brandColor={brandColor} onGenerated={setIgAiImage} />
      </div>

      {/* LinkedIn */}
      <div className="glass rounded-xl p-4 border border-border/50 space-y-3">
        <div className="flex items-center gap-2">
          <Linkedin className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold">LinkedIn</span>
        </div>
        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(232,240,248,0.55)' }}>
          {socialPromo.linkedin_post}
        </p>
        <div className="rounded-lg overflow-hidden border border-border/30" style={{ background: '#111' }}>
          {liAiImage ? (
            <img src={liAiImage} alt="AI Generated" className="w-full h-32 object-cover" />
          ) : heroImage ? (
            <img src={heroImage} alt="OG" className="w-full h-32 object-cover" />
          ) : null}
          <div className="p-3 space-y-1">
            <p className="text-xs font-semibold truncate">{headline}</p>
            <p className="text-[10px] truncate" style={{ color: 'rgba(232,240,248,0.4)' }}>{subheadline}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full" onClick={() => copyText(socialPromo.linkedin_post, 'LinkedIn post')}>
          <Copy className="h-3 w-3" /> Copy Post
        </Button>
        <Button
          size="sm"
          className="gap-1.5 text-xs w-full bg-[#0a66c2] hover:bg-[#0a66c2]/90 text-white"
          onClick={publishLinkedIn}
          disabled={publishingLi}
        >
          {publishingLi ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          {publishingLi ? 'Publishing…' : 'Publish to LinkedIn'}
        </Button>
        {liAiImage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => downloadDataUrl(liAiImage, 'intoiq-linkedin-ai.png')}>
              <Download className="h-3 w-3" /> Download AI Image
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setLiAiImage(null)}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}
        <AIImageButton platform="linkedin" headline={headline} subheadline={subheadline} brandColor={brandColor} onGenerated={setLiAiImage} />
      </div>

      {/* Twitter/X */}
      <div className="glass rounded-xl p-4 border border-border/50 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">𝕏</span>
          <span className="text-sm font-semibold">Twitter / X</span>
        </div>
        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(232,240,248,0.55)' }}>
          {socialPromo.twitter_post}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full" onClick={() => copyText(socialPromo.twitter_post, 'Tweet')}>
          <Copy className="h-3 w-3" /> Copy Tweet
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 text-xs w-full"
          onClick={() =>
            copyAndOpen(
              socialPromo.twitter_post,
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialPromo.twitter_post)}`,
              'Tweet'
            )
          }
        >
          <ExternalLink className="h-3 w-3" /> Copy + Open X
        </Button>
        {twAiImage && (
          <div className="flex gap-2 mt-2">
            <img src={twAiImage} alt="AI Generated" className="w-full h-32 object-cover rounded-lg" />
          </div>
        )}
        {twAiImage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs flex-1" onClick={() => downloadDataUrl(twAiImage, 'intoiq-twitter-ai.png')}>
              <Download className="h-3 w-3" /> Download AI Image
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setTwAiImage(null)}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}
        <AIImageButton platform="twitter" headline={headline} subheadline={subheadline} brandColor={brandColor} onGenerated={setTwAiImage} />
      </div>

      {/* Email */}
      <div className="glass rounded-xl p-4 border border-border/50 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold">Email Teaser</span>
        </div>
        <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(232,240,248,0.55)' }}>
          {socialPromo.email_teaser}
        </p>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full" onClick={() => copyText(socialPromo.email_teaser, 'Email teaser')}>
          <Copy className="h-3 w-3" /> Copy
        </Button>
      </div>

    </div>
  );
}
