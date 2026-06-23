import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { StoryViewer } from "./StoryViewer";
import { toast } from "sonner";

interface StoriesSectionProps {
  variant: "playful" | "modern";
}

interface Story {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string;
  duration_minutes: number | null;
}

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case "saving": return "🐷";
    case "basics": return "💵";
    case "earning": return "🍋";
    case "spending": return "🛒";
    case "giving": return "💝";
    default: return "📖";
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "saving": return "from-pink-300 to-pink-400";
    case "basics": return "from-blue-300 to-blue-400";
    case "earning": return "from-yellow-300 to-yellow-400";
    case "spending": return "from-green-300 to-green-400";
    case "giving": return "from-purple-300 to-purple-400";
    default: return "from-gray-300 to-gray-400";
  }
};

export const StoriesSection = ({ variant }: StoriesSectionProps) => {
  const isPlayful = variant === "playful";
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      const { data, error } = await supabase
        .from("learning_content")
        .select("id, title, description, content, category, duration_minutes")
        .eq("type", "story")
        .in("age_group", ["kids", "teens"])
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data) setStories(data);
      setIsLoading(false);
    };

    fetchStories();
  }, []);

  const handleReadStory = (story: Story) => {
    setSelectedStory(story);
  };

  const handleCloseStory = () => {
    setSelectedStory(null);
  };

  const handleCompleteStory = () => {
    toast.success(isPlayful ? "Great job reading! 📚⭐" : "Story completed!");
    setSelectedStory(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin text-2xl">📖</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className={`font-bold ${isPlayful ? "text-orange-600" : "text-white"}`}>
          {isPlayful ? "Story Time! 📚" : "Financial Stories"}
        </h3>
        <span className={`text-sm ${isPlayful ? "text-orange-400" : "text-white/60"}`}>
          {stories.length} stories
        </span>
      </div>

      {stories.length > 0 ? (
        <div className="space-y-3">
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer overflow-hidden ${isPlayful ? "bg-white" : "bg-white/5 border-white/10"}`}
                onClick={() => handleReadStory(story)}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    <div className={`w-20 h-20 bg-gradient-to-br ${getCategoryColor(story.category)} flex items-center justify-center flex-shrink-0`}>
                      <motion.span
                        className="text-3xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        {getCategoryEmoji(story.category)}
                      </motion.span>
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`font-bold ${isPlayful ? "text-gray-800" : "text-white"}`}>
                            {story.title}
                          </p>
                          <p className={`text-xs ${isPlayful ? "text-gray-500" : "text-white/60"}`}>
                            {story.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isPlayful ? "bg-orange-100 text-orange-600" : "bg-white/10 text-white/80"}`}>
                          {story.category}
                        </span>
                        <div className="flex items-center gap-1">
                          <Clock className={`h-3 w-3 ${isPlayful ? "text-gray-400" : "text-white/40"}`} />
                          <span className={`text-xs ${isPlayful ? "text-gray-400" : "text-white/40"}`}>
                            {story.duration_minutes || 5} min
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className={`text-center py-8 rounded-xl ${isPlayful ? "bg-orange-50" : "bg-white/5"}`}>
          <span className="text-4xl">📚</span>
          <p className={`mt-2 ${isPlayful ? "text-orange-500" : "text-white/60"}`}>
          {isPlayful ? "No stories yet! Check back soon!" : "No stories available"}
        </p>
      </div>
    )}

    {/* Story Viewer Modal */}
    <AnimatePresence>
      {selectedStory && (
        <StoryViewer
          story={selectedStory}
          variant={variant}
          onClose={handleCloseStory}
          onComplete={handleCompleteStory}
        />
      )}
    </AnimatePresence>
  </div>
);
};