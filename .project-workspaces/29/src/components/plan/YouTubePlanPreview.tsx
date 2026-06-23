import { useState } from 'react';
import { extractYouTubeVideoId, getYouTubeThumbnail } from '@/lib/youtubeUtils';
import { Button } from '@/components/ui/button';
import { Play, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YouTubePlanPreviewProps {
  url: string;
  onRemove?: () => void;
  compact?: boolean;
  className?: string;
}

export function YouTubePlanPreview({ url, onRemove, compact = false, className }: YouTubePlanPreviewProps) {
  const [showEmbed, setShowEmbed] = useState(false);
  const videoId = extractYouTubeVideoId(url);

  if (!videoId) return null;

  const thumbnailUrl = getYouTubeThumbnail(videoId, compact ? 'default' : 'high');

  if (showEmbed && !compact) {
    return (
      <div className={cn('relative rounded-lg overflow-hidden', className)}>
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="YouTube video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 bg-background/80 hover:bg-background"
          onClick={() => setShowEmbed(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      'relative rounded-lg overflow-hidden group bg-muted',
      compact ? 'flex items-center gap-3 p-2' : 'aspect-video',
      className
    )}>
      {compact ? (
        <>
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="w-16 h-12 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">YouTube Video</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Watch <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </>
      ) : (
        <>
          <img
            src={thumbnailUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEmbed(true)}
              className="gap-2"
            >
              <Play className="h-4 w-4" />
              Play
            </Button>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Button variant="secondary" size="icon" className="h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          {onRemove && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
