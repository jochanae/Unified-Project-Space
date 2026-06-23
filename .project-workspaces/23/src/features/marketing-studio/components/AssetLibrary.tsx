import { Loader2, Trash2, Download, FolderOpen, Share2, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useMarketingAssets } from '../hooks/use-marketing-assets';

export function AssetLibrary() {
  const { assets, isLoading, deleteAsset } = useMarketingAssets(null);

  const handleDelete = async (id: string) => {
    const asset = assets.find((a) => a.id === id);
    if (!asset) return;
    try {
      await deleteAsset.mutateAsync(asset);
      toast.success('Deleted');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const shareUrl = (token: string) => `${window.location.origin}/s/${token}`;

  const handleShare = async (token: string, title: string) => {
    const url = shareUrl(token);
    try {
      if (navigator.share) {
        await navigator.share({ title: `${title} · IntoIQ`, text: 'You\u2019re invited', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Share link copied', { description: url });
      }
    } catch {
      // user cancelled — no-op
    }
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  };

  return (
    <section className="glass rounded-3xl border border-gold/20 p-5 sm:p-7">
      <div className="flex items-center gap-2 mb-1">
        <FolderOpen className="h-4 w-4 text-gold" />
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-gold/90">
          Social Funnel Library
        </p>
      </div>
      <h2 className="text-xl font-serif tracking-tight">Everything you've created.</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Latest 60 Living Flyers across all your projects. Tap a share icon to send via SMS or social.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-border/30 px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No funnels yet. Build your first one from a project's Marketing Toolkit.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {assets.map((a) => (
            <div
              key={a.id}
              className="group relative rounded-2xl border border-border/30 bg-muted/20 overflow-hidden"
            >
              {a.image_url && (
                <img
                  src={a.image_url}
                  alt={a.title}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-2.5">
                <p className="text-xs font-medium truncate">{a.title}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  {a.template_id}
                </p>
              </div>
              <div className="absolute inset-x-0 top-0 flex items-center justify-end gap-1 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-black/70 to-transparent">
                <button
                  onClick={() => handleShare(a.share_token, a.title)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-gold/80"
                  aria-label="Share Living Flyer"
                  title="Share"
                >
                  <Share2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleCopy(a.share_token)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80"
                  aria-label="Copy share link"
                  title="Copy link"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                </button>
                {a.image_url && (
                  <a
                    href={a.image_url}
                    download={`${a.title}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-white hover:bg-black/80"
                    aria-label="Download"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => handleDelete(a.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-destructive hover:bg-black/80"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
