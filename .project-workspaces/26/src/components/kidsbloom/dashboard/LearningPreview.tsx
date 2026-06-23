import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Gamepad2, BookOpen, Video, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface LearningPreviewProps {
  variant: "playful" | "modern";
}

interface ContentItem {
  id: string;
  title: string;
  type: string;
  category: string;
}

const getContentEmoji = (type: string, index: number) => {
  const emojis = {
    game: ["🎮", "🕹️", "🎯"],
    lesson: ["📚", "💡", "🎓"],
    story: ["📖", "🌟", "✨"],
    video: ["🎬", "📺", "🎥"],
  };
  const typeEmojis = emojis[type as keyof typeof emojis] || ["⭐"];
  return typeEmojis[index % typeEmojis.length];
};

const getContentColor = (type: string) => {
  const colors = {
    game: "from-orange-400 to-pink-400",
    lesson: "from-blue-400 to-indigo-400",
    story: "from-purple-400 to-violet-400",
    video: "from-green-400 to-teal-400",
  };
  return colors[type as keyof typeof colors] || "from-gray-400 to-gray-500";
};

export function LearningPreview({ variant }: LearningPreviewProps) {
  const navigate = useNavigate();
  const isPlayful = variant === "playful";
  const [featuredContent, setFeaturedContent] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedContent = async () => {
      // Fetch 1 game, 1 lesson, 1 video for preview
      const { data } = await supabase
        .from("learning_content")
        .select("id, title, type, category")
        .eq("age_group", "kids")
        .eq("is_published", true)
        .eq("is_premium", false)
        .limit(4);

      if (data) {
        // Get diverse content types
        const game = data.find(d => d.type === "game");
        const lesson = data.find(d => d.type === "lesson");
        const video = data.find(d => d.type === "video");
        const story = data.find(d => d.type === "story");
        setFeaturedContent([game, lesson, video, story].filter(Boolean) as ContentItem[]);
      }
      setIsLoading(false);
    };

    fetchFeaturedContent();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="text-2xl"
        >
          ✨
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className={`h-5 w-5 ${isPlayful ? "text-orange-500" : "text-violet-400"}`} />
          <h3 className={`font-bold text-lg ${isPlayful ? "text-purple-600" : "text-white"}`}>
            {isPlayful ? "Learn & Play! 🎓" : "Learn & Earn"}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/kidsbloom/learn")}
          className={`gap-1 ${isPlayful ? "text-purple-500 hover:text-purple-700" : "text-violet-400 hover:text-violet-300"}`}
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Featured Content Grid */}
      <div className="grid grid-cols-2 gap-3">
        {featuredContent.slice(0, 4).map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/kidsbloom/learn")}
          >
            <Card className={`overflow-hidden cursor-pointer ${isPlayful ? "bg-white shadow-md" : "bg-white/5 border-white/10"}`}>
              <div className={`h-16 bg-gradient-to-br ${getContentColor(item.type)} flex items-center justify-center`}>
                <motion.span
                  className="text-3xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {getContentEmoji(item.type, index)}
                </motion.span>
              </div>
              <CardContent className="p-2">
                <p className={`font-medium text-xs line-clamp-1 ${isPlayful ? "text-gray-800" : "text-white"}`}>
                  {item.title}
                </p>
                <p className={`text-[10px] capitalize ${isPlayful ? "text-gray-500" : "text-white/50"}`}>
                  {item.type}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Access Buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/kidsbloom/learn")}
          className={`flex-1 gap-1.5 ${isPlayful ? "border-orange-300 text-orange-600 hover:bg-orange-50" : "border-white/20 text-white hover:bg-white/10"}`}
        >
          <Gamepad2 className="h-4 w-4" />
          {isPlayful ? "Games" : "Play"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/kidsbloom/learn")}
          className={`flex-1 gap-1.5 ${isPlayful ? "border-blue-300 text-blue-600 hover:bg-blue-50" : "border-white/20 text-white hover:bg-white/10"}`}
        >
          <BookOpen className="h-4 w-4" />
          {isPlayful ? "Stories" : "Lessons"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/kidsbloom/learn")}
          className={`flex-1 gap-1.5 ${isPlayful ? "border-green-300 text-green-600 hover:bg-green-50" : "border-white/20 text-white hover:bg-white/10"}`}
        >
          <Video className="h-4 w-4" />
          Videos
        </Button>
      </div>
    </div>
  );
}
