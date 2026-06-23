import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { Play, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeaturedVideo {
  id: string;
  title: string;
  content_url: string | null;
  video_id: string | null;
  thumbnail_url: string | null;
  duration_minutes: number | null;
}

interface FeaturedVideosCarouselProps {
  onVideoSelect: (video: FeaturedVideo) => void;
  autoRotateInterval?: number; // milliseconds, default 5000
}

export function FeaturedVideosCarousel({ 
  onVideoSelect, 
  autoRotateInterval = 5000 
}: FeaturedVideosCarouselProps) {
  const { partner, isPartnerBranded } = usePartnerBranding();
  const [videos, setVideos] = useState<FeaturedVideo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetchFeaturedVideos();
  }, [partner?.id, isPartnerBranded]);

  // Auto-rotate effect
  useEffect(() => {
    if (videos.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % videos.length);
    }, autoRotateInterval);

    return () => clearInterval(interval);
  }, [videos.length, autoRotateInterval, isPaused]);

  const fetchFeaturedVideos = async () => {
    try {
      let query = supabase
        .from("learning_content")
        .select("id, title, content_url, video_id, thumbnail_url, duration_minutes")
        .eq("type", "video")
        .eq("is_published", true)
        .eq("is_featured", true)
        .in("age_group", ["adults", "all"])
        .order("featured_order", { ascending: true });

      // Filter by partner or global
      if (isPartnerBranded && partner?.id) {
        query = query.or(`partner_id.eq.${partner.id},partner_id.is.null`);
      }

      const { data, error } = await query.limit(5);

      if (!error && data && data.length > 0) {
        setVideos(data);
      } else {
        // Fallback to sort_order = 1 for backward compatibility
        const fallbackQuery = supabase
          .from("learning_content")
          .select("id, title, content_url, video_id, thumbnail_url, duration_minutes")
          .eq("type", "video")
          .eq("is_published", true)
          .eq("sort_order", 1)
          .in("age_group", ["adults", "all"])
          .limit(1);

        const { data: fallbackData } = await fallbackQuery;
        if (fallbackData) {
          setVideos(fallbackData);
        }
      }
    } catch (error) {
      console.error("Error fetching featured videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getThumbnail = useCallback((video: FeaturedVideo) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    
    if (video.content_url) {
      const youtubeMatch = video.content_url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (youtubeMatch) {
        return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
      }
    }
    if (video.video_id && video.video_id.length === 11) {
      return `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`;
    }
    return null;
  }, []);

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return null;
    if (minutes >= 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hrs}:${mins.toString().padStart(2, "0")}:00`;
    }
    return `${minutes}:00`;
  };

  if (loading) {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a2332] border border-[#243447] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/60" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="relative aspect-video rounded-xl overflow-hidden bg-[#1a2332] border border-[#243447] flex items-center justify-center">
        <p className="text-white/60 text-sm">No featured videos</p>
      </div>
    );
  }

  const currentVideo = videos[currentIndex];
  const thumbnail = getThumbnail(currentVideo);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Video Display */}
      <div 
        className="relative aspect-video rounded-xl overflow-hidden bg-[#1a2332] border border-[#243447] cursor-pointer group"
        onClick={() => onVideoSelect(currentVideo)}
      >
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={currentVideo.title} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[hsl(210,30%,20%)] flex items-center justify-center">
            <p className="text-white/60 text-sm">Video thumbnail</p>
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Button 
            size="icon" 
            className="h-16 w-16 rounded-full bg-[hsl(180,80%,50%)] hover:bg-[hsl(180,80%,45%)] shadow-xl transition-transform group-hover:scale-110"
          >
            <Play className="h-8 w-8 text-white fill-white ml-1" />
          </Button>
        </div>

        {/* Duration Badge */}
        {currentVideo.duration_minutes && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {formatDuration(currentVideo.duration_minutes)}
          </div>
        )}

        {/* Navigation Arrows - Only show if multiple videos */}
        {videos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goToPrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goToNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {videos.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2">
          {videos.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                idx === currentIndex 
                  ? "bg-[hsl(180,80%,55%)] w-4" 
                  : "bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}

      {/* Video Title */}
      <p className="mt-2 text-white/80 text-sm line-clamp-1">
        Featured: {currentVideo.title}
      </p>
    </div>
  );
}
