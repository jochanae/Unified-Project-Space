import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radio, X, Eye, EyeOff, Users } from "lucide-react";
import { parseStreamUrl } from "@/lib/streamUtils";
import { cn } from "@/lib/utils";

interface LiveStreamBannerProps {
  title: string;
  description: string | null;
  streamUrl: string;
  platform: string;
  viewersCount: number;
  isOptedOut: boolean;
  onToggleOptOut: () => void;
}

export function LiveStreamBanner({
  title,
  description,
  streamUrl,
  platform,
  viewersCount,
  isOptedOut,
  onToggleOptOut,
}: LiveStreamBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const streamInfo = parseStreamUrl(streamUrl);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-loss/10 border border-loss/30 hover:bg-loss/15 transition-colors"
      >
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-loss opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-loss" />
        </span>
        <span className="text-sm font-semibold text-loss">LIVE NOW</span>
        <span className="text-sm text-foreground truncate">{title}</span>
      </button>
    );
  }

  return (
    <div className="space-y-3">
      {/* Live header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-loss text-white border-0 gap-1.5 animate-pulse">
            <Radio className="h-3 w-3" />
            LIVE NOW
          </Badge>
          {viewersCount > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {viewersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onToggleOptOut}
            title="Hide live sessions from dashboard"
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsExpanded(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Stream embed */}
      {streamInfo.embedUrl ? (
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl ring-2 ring-loss/30">
          <iframe
            src={streamInfo.embedUrl}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
        </div>
      ) : (
        <a
          href={streamUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-loss/20 to-primary/20 shadow-lg"
        >
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Radio className="h-12 w-12 text-loss animate-pulse" />
            <p className="text-sm font-medium">Open live stream ↗</p>
          </div>
        </a>
      )}

      {/* Stream info */}
      <div>
        <h4 className="font-semibold text-base">{title}</h4>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
