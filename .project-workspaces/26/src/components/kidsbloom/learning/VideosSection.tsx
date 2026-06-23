import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Clock, Lock, Volume2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VideoViewer } from "./VideoViewer";
import { toast } from "sonner";

interface VideosSectionProps {
  variant?: "playful" | "modern";
}

interface Video {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  duration_minutes: number | null;
  category: string;
  is_premium: boolean;
}

// Extract YouTube video ID from various URL formats
const getYouTubeVideoId = (url: string | null): string | null => {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

// Get YouTube thumbnail URL
const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

export function VideosSection({ variant = "playful" }: VideosSectionProps) {
  const isPlayful = variant === "playful";
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from("learning_content")
        .select("id, title, description, content_url, duration_minutes, category, is_premium")
        .eq("type", "video")
        .in("age_group", ["kids", "teens"])
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data) setVideos(data);
      setIsLoading(false);
    };

    fetchVideos();
  }, []);

  const categories = [
    { id: "all", label: isPlayful ? "All Videos" : "All" },
    { id: "basics", label: isPlayful ? "Money Basics" : "Fundamentals" },
    { id: "saving", label: "Saving" },
    { id: "spending", label: "Spending" },
    { id: "budgeting", label: "Budgeting" },
  ];

  const filteredVideos = activeCategory === "all" 
    ? videos 
    : videos.filter(v => v.category === activeCategory);

  const getVideoEmoji = (category: string) => {
    switch (category) {
      case "basics": return "💵";
      case "saving": return "🐷";
      case "spending": return "🛒";
      case "budgeting": return "📊";
      case "earning": return "💼";
      default: return "🎬";
    }
  };

  const handlePlayVideo = (video: Video) => {
    if (video.is_premium) {
      toast.info(isPlayful ? "Ask a parent to unlock! 🔓" : "Premium content");
      return;
    }
    setSelectedVideo(video);
  };

  const handleCloseVideo = () => {
    setSelectedVideo(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin text-2xl">🎬</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? isPlayful
                  ? "bg-purple-500 text-white"
                  : "bg-violet-600 text-white"
                : isPlayful
                ? "bg-purple-100 text-purple-600 hover:bg-purple-200"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Full-Size Video Cards */}
      {filteredVideos.length > 0 ? (
        <div className="space-y-6">
          {filteredVideos.map((video, index) => {
            const youtubeId = getYouTubeVideoId(video.content_url);
            const thumbnailUrl = youtubeId ? getYouTubeThumbnail(youtubeId) : null;
            
            return (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-2xl overflow-hidden cursor-pointer group ${
                  isPlayful
                    ? "bg-white border-2 border-purple-200 shadow-lg"
                    : "bg-white/5 border border-white/10"
                }`}
                onClick={() => handlePlayVideo(video)}
              >
                {/* Video Thumbnail - Full Width */}
                <div className="relative aspect-video w-full overflow-hidden">
                  {thumbnailUrl ? (
                    <img 
                      src={thumbnailUrl} 
                      alt={video.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback to medium quality if maxres fails
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes('maxresdefault')) {
                          target.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
                        }
                      }}
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        isPlayful
                          ? "bg-gradient-to-br from-purple-400 to-pink-400"
                          : "bg-gradient-to-br from-violet-600 to-indigo-600"
                      }`}
                    >
                      <span className="text-6xl">{getVideoEmoji(video.category)}</span>
                    </div>
                  )}
                  
                  {/* Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                    <motion.div 
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl ${
                        isPlayful 
                          ? "bg-white" 
                          : "bg-white/90"
                      }`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play 
                        className={`h-7 w-7 ml-1 ${
                          isPlayful ? "text-purple-600" : "text-violet-600"
                        }`} 
                        fill="currentColor" 
                      />
                    </motion.div>
                  </div>

                  {/* Premium Badge */}
                  {video.is_premium && (
                    <div className="absolute top-3 right-3">
                      <span
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
                          isPlayful
                            ? "bg-yellow-400 text-yellow-900"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        <Lock className="h-3 w-3" />
                        PRO
                      </span>
                    </div>
                  )}

                  {/* Duration Badge */}
                  <div className="absolute bottom-3 right-3">
                    <span
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        isPlayful
                          ? "bg-black/60 text-white"
                          : "bg-black/70 text-white"
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {video.duration_minutes || 5} min
                    </span>
                  </div>
                </div>

                {/* Video Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4
                        className={`font-bold text-base leading-tight mb-1 ${
                          isPlayful ? "text-purple-700" : "text-white"
                        }`}
                      >
                        {video.title}
                      </h4>
                      <p
                        className={`text-sm line-clamp-2 ${
                          isPlayful ? "text-gray-600" : "text-white/60"
                        }`}
                      >
                        {video.description}
                      </p>
                    </div>
                    <span className="text-2xl flex-shrink-0">
                      {getVideoEmoji(video.category)}
                    </span>
                  </div>
                  
                  {/* Category Tag */}
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        isPlayful 
                          ? "bg-purple-100 text-purple-600" 
                          : "bg-white/10 text-white/70"
                      }`}
                    >
                      {video.category}
                    </span>
                    <span
                      className={`flex items-center gap-1 text-xs ${
                        isPlayful ? "text-purple-400" : "text-white/40"
                      }`}
                    >
                      <Volume2 className="h-3 w-3" />
                      Watch & Learn
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className={`text-center py-8 rounded-xl ${isPlayful ? "bg-purple-50" : "bg-white/5"}`}>
          <span className="text-4xl">🎬</span>
          <p className={`mt-2 ${isPlayful ? "text-purple-500" : "text-white/60"}`}>
            {isPlayful ? "No videos yet! Check back soon!" : "No videos available"}
          </p>
        </div>
      )}

      {/* Watch More CTA */}
      {filteredVideos.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className={`text-center py-4 rounded-xl ${
            isPlayful ? "bg-purple-50" : "bg-white/5"
          }`}
        >
          <p className={`text-sm ${isPlayful ? "text-purple-500" : "text-white/60"}`}>
            {isPlayful ? "🎬 More videos coming soon!" : "More content coming soon"}
          </p>
        </motion.div>
      )}

      {/* Video Viewer Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoViewer
            video={selectedVideo}
            variant={variant}
            onClose={handleCloseVideo}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
