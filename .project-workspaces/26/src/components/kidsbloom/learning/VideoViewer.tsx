import { motion } from "framer-motion";
import { X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoViewerProps {
  video: {
    id: string;
    title: string;
    description: string | null;
    content_url: string | null;
    category: string;
    duration_minutes: number | null;
    is_premium: boolean;
  };
  variant: "playful" | "modern";
  onClose: () => void;
}

// Extract YouTube video ID from various URL formats
const getYouTubeId = (url: string | null): string | null => {
  if (!url) return null;
  
  // Already just an ID
  if (url.length === 11 && !url.includes('/')) return url;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
};

export const VideoViewer = ({ video, variant, onClose }: VideoViewerProps) => {
  const isPlayful = variant === "playful";
  const youtubeId = getYouTubeId(video.content_url);

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "saving": return "🐷";
      case "basics": return "💵";
      case "earning": return "🍋";
      case "spending": return "🛒";
      case "giving": return "💝";
      default: return "🎬";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`relative w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl ${
          isPlayful 
            ? "bg-gradient-to-b from-blue-50 to-purple-50" 
            : "bg-gradient-to-b from-slate-900 to-slate-800"
        }`}
      >
        {/* Header */}
        <div className={`p-4 ${isPlayful ? "bg-blue-500" : "bg-purple-600"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getCategoryEmoji(video.category)}</span>
              <div>
                <h2 className="font-bold text-white text-lg leading-tight">
                  {video.title}
                </h2>
                {video.duration_minutes && (
                  <p className="text-white/80 text-sm">
                    {video.duration_minutes} min
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Video Player */}
        <div className="aspect-video bg-black">
          {video.is_premium ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500">
              <Lock className="h-16 w-16 text-white mb-4" />
              <p className="text-white font-bold text-xl">Premium Content</p>
              <p className="text-white/80 text-sm mt-2">Complete more lessons to unlock!</p>
            </div>
          ) : youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={video.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <span className="text-6xl mb-4">🎬</span>
              <p className={isPlayful ? "text-gray-600" : "text-white/60"}>
                Video coming soon!
              </p>
            </div>
          )}
        </div>

        {/* Description */}
        {video.description && (
          <div className={`p-4 ${isPlayful ? "bg-white" : "bg-slate-800/50"}`}>
            <p className={`text-sm ${isPlayful ? "text-gray-600" : "text-white/70"}`}>
              {video.description}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
