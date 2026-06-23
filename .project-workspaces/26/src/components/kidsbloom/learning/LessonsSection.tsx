import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, CheckCircle, PlayCircle, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { LessonViewer } from "./LessonViewer";
import { toast } from "sonner";

interface LessonsSectionProps {
  variant: "playful" | "modern";
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  category: string;
  difficulty_level: string | null;
  duration_minutes: number | null;
}

const getCategoryEmoji = (category: string) => {
  switch (category) {
    case "budgeting": return "📊";
    case "saving": return "🐷";
    case "spending": return "🛒";
    case "earning": return "⭐";
    case "basics": return "🪙";
    default: return "💡";
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case "budgeting": return "from-blue-400 to-indigo-400";
    case "saving": return "from-pink-400 to-rose-400";
    case "spending": return "from-green-400 to-emerald-400";
    case "earning": return "from-yellow-400 to-amber-400";
    case "basics": return "from-purple-400 to-violet-400";
    default: return "from-gray-400 to-slate-400";
  }
};

export const LessonsSection = ({ variant }: LessonsSectionProps) => {
  const isPlayful = variant === "playful";
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from("learning_content")
        .select("id, title, description, content, category, difficulty_level, duration_minutes")
        .eq("type", "lesson")
        .in("age_group", ["kids", "teens"])
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (data) setLessons(data);
      setIsLoading(false);
    };

    fetchLessons();
  }, []);

  const handleStartLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleCloseLesson = () => {
    setSelectedLesson(null);
  };

  const handleCompleteLesson = () => {
    toast.success(isPlayful ? "You did it! Great job! 🎓⭐" : "Lesson completed!");
    setSelectedLesson(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin text-2xl">📚</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <Card className={isPlayful ? "bg-gradient-to-r from-orange-100 to-pink-100" : "bg-white/5 border-white/10"}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${isPlayful ? "text-orange-600" : "text-white"}`}>
              {isPlayful ? "Your Progress! 🌟" : "Available Lessons"}
            </span>
            <span className={`text-sm font-bold ${isPlayful ? "text-orange-600" : "text-white"}`}>
              {lessons.length} lessons
            </span>
          </div>
          <Progress value={33} className="h-3" />
        </CardContent>
      </Card>

      {/* Lessons List */}
      {lessons.length > 0 ? (
        <div className="space-y-3">
          {lessons.map((lesson, index) => (
            <motion.div
              key={lesson.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={`cursor-pointer overflow-hidden ${isPlayful ? "bg-white" : "bg-white/5 border-white/10"}`}
                onClick={() => handleStartLesson(lesson)}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    <div className={`w-16 bg-gradient-to-br ${getCategoryColor(lesson.category)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-2xl">{getCategoryEmoji(lesson.category)}</span>
                    </div>
                    <div className="flex-1 p-3">
                      <div className="flex items-center justify-between">
                        <p className={`font-bold ${isPlayful ? "text-gray-800" : "text-white"}`}>
                          {lesson.title}
                        </p>
                        <PlayCircle className={`h-5 w-5 ${isPlayful ? "text-orange-500" : "text-indigo-400"}`} />
                      </div>
                      <p className={`text-xs mb-2 ${isPlayful ? "text-gray-500" : "text-white/60"}`}>
                        {lesson.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${isPlayful ? "bg-orange-100 text-orange-600" : "bg-white/10 text-white/70"}`}>
                          {lesson.category}
                        </span>
                        {lesson.duration_minutes && (
                          <span className={`text-xs ${isPlayful ? "text-gray-400" : "text-white/40"}`}>
                            ~{lesson.duration_minutes} min
                          </span>
                        )}
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
            {isPlayful ? "No lessons yet! Check back soon!" : "No lessons available"}
          </p>
        </div>
      )}

      {/* Lesson Viewer Modal */}
      <AnimatePresence>
        {selectedLesson && (
          <LessonViewer
            lesson={selectedLesson}
            variant={variant}
            onClose={handleCloseLesson}
            onComplete={handleCompleteLesson}
          />
        )}
      </AnimatePresence>
    </div>
  );
};