import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Play, Clock, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface VideoItem {
  id: string;
  title: string;
  description: string | null;
  content_url: string | null;
  video_id: string | null;
  video_type: string | null;
  duration_minutes: number | null;
  category: string;
  is_premium: boolean;
  thumbnail_url: string | null;
}

const categoryLabels: Record<string, string> = {
  all: "All",
  budgeting: "Budgeting",
  saving: "Saving",
  investing: "Investing",
  credit: "Credit",
  debt: "Debt",
  taxes: "Taxes",
  retirement: "Retirement",
  insurance: "Insurance",
  real_estate: "Real Estate",
  general: "General",
};

const categoryEmojis: Record<string, string> = {
  budgeting: "📊",
  saving: "💰",
  investing: "📈",
  credit: "💳",
  debt: "🏦",
  taxes: "📋",
  retirement: "🏖️",
  insurance: "🛡️",
  real_estate: "🏠",
  general: "📚",
};

interface VideoLibraryProps {
  searchQuery?: string;
}

export const VideoLibrary = ({ searchQuery = "" }: VideoLibraryProps) => {
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(6);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const { data, error } = await supabase
        .from("learning_content")
        .select("id, title, description, content_url, video_id, video_type, duration_minutes, category, is_premium, thumbnail_url")
        .eq("type", "video")
        .eq("is_published", true)
        .in("age_group", ["adults", "all"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
      toast.error("Failed to load videos");
    } finally {
      setLoading(false);
    }
  };

  const getVideoEmbedUrl = (video: VideoItem) => {
    // Extract YouTube ID from various URL formats
    if (video.content_url) {
      const youtubeMatch = video.content_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (youtubeMatch) {
        return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`;
      }
      const vimeoMatch = video.content_url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
      }
    }
    if (video.video_type === "youtube" && video.video_id && video.video_id.length === 11) {
      return `https://www.youtube.com/embed/${video.video_id}?autoplay=1`;
    }
    if (video.video_type === "vimeo" && video.video_id) {
      return `https://player.vimeo.com/video/${video.video_id}?autoplay=1`;
    }
    return null;
  };

  const getYouTubeThumbnail = (video: VideoItem) => {
    if (video.thumbnail_url) return video.thumbnail_url;
    
    // Try to extract YouTube ID for thumbnail
    if (video.content_url) {
      const youtubeMatch = video.content_url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (youtubeMatch) {
        return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
      }
    }
    if (video.video_id && video.video_id.length === 11) {
      return `https://img.youtube.com/vi/${video.video_id}/mqdefault.jpg`;
    }
    return null;
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "budgeting": return "from-blue-500 to-indigo-600";
      case "investing": return "from-emerald-500 to-teal-600";
      case "credit": return "from-purple-500 to-violet-600";
      case "debt": return "from-red-500 to-rose-600";
      case "saving": return "from-amber-500 to-orange-600";
      case "retirement": return "from-cyan-500 to-blue-600";
      case "taxes": return "from-gray-500 to-slate-600";
      case "insurance": return "from-pink-500 to-rose-600";
      case "real_estate": return "from-green-500 to-emerald-600";
      default: return "from-primary/60 to-primary";
    }
  };

  // Get unique categories from videos - sort alphabetically but keep "all" first
  const uniqueCategories = Array.from(new Set(videos.map(v => v.category.toLowerCase()))).sort();
  const availableCategories = ["all", ...uniqueCategories];
  
  // Filter videos by category and search query
  const filteredVideos = videos.filter(v => {
    const matchesCategory = activeCategory === "all" || v.category.toLowerCase() === activeCategory;
    const matchesSearch = !searchQuery || 
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });
  
  // Paginated videos
  const paginatedVideos = filteredVideos.slice(0, visibleCount);
  const hasMore = filteredVideos.length > visibleCount;
  
  // Reset visible count when category changes
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setVisibleCount(6);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading videos..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Fullscreen Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            onClick={() => setSelectedVideo(null)}
          >
            {/* Close Button */}
            <div className="flex justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedVideo(null)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Video Player */}
            <div 
              className="flex-1 flex flex-col items-center justify-center px-4 pb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-4xl">
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  {getVideoEmbedUrl(selectedVideo) ? (
                    <iframe
                      src={getVideoEmbedUrl(selectedVideo) || ""}
                      title={selectedVideo.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60">
                      <div className="text-center">
                        <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                        <p>Video URL not available</p>
                        <p className="text-sm mt-2">This video needs a valid YouTube or Vimeo link</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Video Info */}
                <div className="mt-4 text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{categoryEmojis[selectedVideo.category.toLowerCase()] || "📚"}</span>
                    <span className="text-sm text-white/60 capitalize">{selectedVideo.category}</span>
                    {selectedVideo.duration_minutes && (
                      <>
                        <span className="text-white/40">•</span>
                        <span className="text-sm text-white/60">{selectedVideo.duration_minutes} min</span>
                      </>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold">{selectedVideo.title}</h2>
                  {selectedVideo.description && (
                    <p className="text-white/70 mt-2 line-clamp-3">{selectedVideo.description}</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className="w-full flex overflow-x-auto gap-1 bg-muted/50 p-1 rounded-lg justify-start scroll-smooth [&::-webkit-scrollbar]:hidden">
          {availableCategories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="flex-shrink-0 px-2 py-1.5 text-xs capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                {cat === "all" ? (
                  <>
                    <span>📚</span>
                    <span>All</span>
                  </>
                ) : (
                  <>
                    <span>{categoryEmojis[cat] || "📚"}</span>
                    <span>{categoryLabels[cat] || cat}</span>
                  </>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {paginatedVideos.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {paginatedVideos.map((video) => {
                  const thumbnail = getYouTubeThumbnail(video);
                  return (
                    <Card 
                      key={video.id}
                      className="overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border/50"
                      onClick={() => setSelectedVideo(video)}
                    >
                      <div className="aspect-video relative">
                        {thumbnail ? (
                          <img 
                            src={thumbnail} 
                            alt={video.title}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                          />
                        ) : null}
                        <div className={`${thumbnail ? 'hidden' : ''} absolute inset-0 bg-gradient-to-br ${getCategoryColor(video.category)} flex items-center justify-center`}>
                          <span className="text-4xl">{categoryEmojis[video.category.toLowerCase()] || "📚"}</span>
                        </div>
                        
                        {/* Play Button Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play className="h-5 w-5 text-gray-800 ml-0.5" fill="currentColor" />
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div className="absolute top-2 left-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-black/60 text-white capitalize">
                            {categoryEmojis[video.category.toLowerCase()] || "📚"}
                          </span>
                        </div>

                        {/* Duration */}
                        {video.duration_minutes && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            <Clock className="h-3 w-3" />
                            {video.duration_minutes}m
                          </div>
                        )}
                      </div>
                      
                      <CardContent className="p-2 bg-black dark:bg-black">
                        <p className="text-sm font-medium line-clamp-2 leading-tight text-white">{video.title}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              
              {/* Load More Button */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setVisibleCount(prev => prev + 6)}
                    className="w-full max-w-xs"
                  >
                    Load More ({filteredVideos.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Card className="border-none bg-muted/50">
              <CardContent className="py-12 text-center">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Videos in This Category</h3>
                <p className="text-sm text-muted-foreground">
                  Check back soon for more content!
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Total count */}
      <div className="text-center text-sm text-muted-foreground">
        {filteredVideos.length} video{filteredVideos.length !== 1 ? 's' : ''} 
        {activeCategory !== "all" && ` in ${categoryLabels[activeCategory] || activeCategory}`}
      </div>
    </div>
  );
};
