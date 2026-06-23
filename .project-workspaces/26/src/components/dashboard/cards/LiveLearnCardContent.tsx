import { useState, useEffect } from "react";
import { Play, Loader2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedVideo {
  id: string;
  title: string;
  content_url: string | null;
  video_id: string | null;
  duration_minutes: number | null;
  thumbnail_url: string | null;
}

export const LiveLearnCardContent = () => {
  const [featuredVideo, setFeaturedVideo] = useState<FeaturedVideo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedVideo();
  }, []);

  const fetchFeaturedVideo = async () => {
    try {
      // Fetch the video marked as featured, or fall back to the most recent published video
      const { data, error } = await supabase
        .from("learning_content")
        .select("id, title, content_url, video_id, duration_minutes, thumbnail_url")
        .eq("type", "video")
        .eq("is_published", true)
        .in("age_group", ["adults", "all"])
        .order("sort_order", { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setFeaturedVideo(data);
      }
    } catch (error) {
      console.error("Error fetching featured video:", error);
    } finally {
      setLoading(false);
    }
  };

  const getThumbnail = () => {
    if (!featuredVideo) return null;
    if (featuredVideo.thumbnail_url) return featuredVideo.thumbnail_url;
    
    // Try to extract YouTube ID for thumbnail
    if (featuredVideo.content_url) {
      const youtubeMatch = featuredVideo.content_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (youtubeMatch) {
        return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
      }
    }
    if (featuredVideo.video_id && featuredVideo.video_id.length === 11) {
      return `https://img.youtube.com/vi/${featuredVideo.video_id}/mqdefault.jpg`;
    }
    return null;
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "";
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:00`;
    }
    return `${mins}:00`;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="relative aspect-video rounded-lg bg-muted flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const thumbnail = getThumbnail();

  return (
    <div className="space-y-2">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={featuredVideo?.title || "Featured video"} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="p-2 rounded-full bg-primary/90 shadow-lg">
            <Play className="h-4 w-4 text-primary-foreground" fill="currentColor" />
          </div>
        </div>

        {/* Duration Badge */}
        {featuredVideo?.duration_minutes && (
          <span className="absolute bottom-1 right-1 text-xs bg-black/70 text-white px-1.5 py-0.5 rounded">
            {formatDuration(featuredVideo.duration_minutes)}
          </span>
        )}
      </div>
      
      <p className="text-xs font-medium line-clamp-2">
        {featuredVideo?.title || "No featured video"}
      </p>
      <p className="text-xs text-muted-foreground">Tap to watch</p>
    </div>
  );
};
