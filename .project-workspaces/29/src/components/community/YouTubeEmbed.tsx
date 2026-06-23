import { useState } from "react";
import { Play } from "lucide-react";
import { getYouTubeThumbnail, getYouTubeEmbedUrl } from "@/lib/youtubeUtils";
import { cn } from "@/lib/utils";

interface YouTubeEmbedProps {
  videoId: string;
  className?: string;
}

export function YouTubeEmbed({ videoId, className }: YouTubeEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  if (isLoaded) {
    return (
      <div className={cn("relative w-full aspect-video rounded-lg overflow-hidden", className)}>
        <iframe
          src={`${getYouTubeEmbedUrl(videoId)}?autoplay=1`}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsLoaded(true)}
      className={cn(
        "relative w-full aspect-video rounded-lg overflow-hidden group cursor-pointer",
        className
      )}
    >
      <img
        src={getYouTubeThumbnail(videoId, 'high')}
        alt="Video thumbnail"
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
          <Play className="h-8 w-8 text-white ml-1" fill="currentColor" />
        </div>
      </div>
    </button>
  );
}
