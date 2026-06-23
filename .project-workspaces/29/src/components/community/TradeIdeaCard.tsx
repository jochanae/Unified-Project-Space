import { useState, useMemo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Share2, Flag, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { TradeIdea } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { parseYouTubeLinks } from "@/lib/youtubeUtils";
import { YouTubeEmbed } from "./YouTubeEmbed";

interface TradeIdeaCardProps {
  idea: TradeIdea;
  onLike: (ideaId: string, hasLiked: boolean) => void;
  onComment: (ideaId: string) => void;
  onReport: (ideaId: string) => void;
}

const directionConfig = {
  long: { icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10", label: "Long" },
  short: { icon: TrendingDown, color: "text-red-500", bg: "bg-red-500/10", label: "Short" },
  neutral: { icon: Minus, color: "text-yellow-500", bg: "bg-yellow-500/10", label: "Neutral" },
};

const assetClassColors: Record<string, string> = {
  stocks: "bg-blue-500/10 text-blue-500",
  options: "bg-purple-500/10 text-purple-500",
  crypto: "bg-orange-500/10 text-orange-500",
  forex: "bg-green-500/10 text-green-500",
  futures: "bg-cyan-500/10 text-cyan-500",
  etfs: "bg-pink-500/10 text-pink-500",
};

export function TradeIdeaCard({ idea, onLike, onComment, onReport }: TradeIdeaCardProps) {
  const { user } = useAuth();
  const [isLiking, setIsLiking] = useState(false);

  const DirectionIcon = directionConfig[idea.trade_direction].icon;
  const directionStyle = directionConfig[idea.trade_direction];
  
  // Parse YouTube links from content
  const parsedContent = useMemo(() => parseYouTubeLinks(idea.content), [idea.content]);

  const handleLike = async () => {
    if (!user || isLiking) return;
    setIsLiking(true);
    await onLike(idea.id, idea.user_has_liked || false);
    setIsLiking(false);
  };

  const getInitials = (name: string | null, username: string | null) => {
    if (name) return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    if (username) return username.slice(0, 2).toUpperCase();
    return "U";
  };

  // Determine display name based on author's preference
  const getDisplayName = () => {
    if (!idea.author) return "Anonymous";
    if (idea.author.show_real_name && idea.author.full_name) {
      return idea.author.full_name;
    }
    if (idea.author.username) {
      return `@${idea.author.username}`;
    }
    return idea.author.full_name || "Anonymous";
  };

  const showUsername = idea.author?.username && idea.author?.show_real_name;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={idea.author?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(idea.author?.full_name || null, idea.author?.username || null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{getDisplayName()}</p>
              {showUsername && (
                <p className="text-xs text-primary font-medium">@{idea.author.username}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("text-xs", assetClassColors[idea.asset_class])}>
              {idea.asset_class.toUpperCase()}
            </Badge>
            <Badge className={cn("flex items-center gap-1 text-xs", directionStyle.bg, directionStyle.color)}>
              <DirectionIcon className="h-3 w-3" />
              {directionStyle.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-lg">${idea.symbol}</span>
          <span className="text-muted-foreground">•</span>
          <span className="font-medium">{idea.title}</span>
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-3">{parsedContent.text || idea.content}</p>

        {/* YouTube embeds */}
        {parsedContent.videoIds.length > 0 && (
          <div className="mt-3 space-y-2">
            {parsedContent.videoIds.slice(0, 2).map((videoId) => (
              <YouTubeEmbed key={videoId} videoId={videoId} />
            ))}
          </div>
        )}

        {/* Price levels */}
        {(idea.entry_price || idea.target_price || idea.stop_loss) && (
          <div className="flex flex-wrap gap-4 mt-3 text-xs">
            {idea.entry_price && (
              <div>
                <span className="text-muted-foreground">Entry:</span>{" "}
                <span className="font-medium">${idea.entry_price}</span>
              </div>
            )}
            {idea.target_price && (
              <div>
                <span className="text-muted-foreground">Target:</span>{" "}
                <span className="font-medium text-green-500">${idea.target_price}</span>
              </div>
            )}
            {idea.stop_loss && (
              <div>
                <span className="text-muted-foreground">Stop:</span>{" "}
                <span className="font-medium text-red-500">${idea.stop_loss}</span>
              </div>
            )}
          </div>
        )}

        {/* Chart image */}
        {idea.chart_image_url && (
          <div className="mt-3 rounded-lg overflow-hidden border">
            <img 
              src={idea.chart_image_url} 
              alt="Chart" 
              className="w-full h-48 object-cover"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={!user || isLiking}
            className={cn(
              "flex items-center gap-1.5 h-8 px-2",
              idea.user_has_liked && "text-red-500"
            )}
          >
            <Heart className={cn("h-4 w-4", idea.user_has_liked && "fill-current")} />
            <span className="text-sm">{idea.likes_count}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onComment(idea.id)}
            className="flex items-center gap-1.5 h-8 px-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-sm">{idea.comments_count}</span>
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Share2 className="h-4 w-4" />
          </Button>
          {user && idea.user_id !== user.id && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onReport(idea.id)}
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
