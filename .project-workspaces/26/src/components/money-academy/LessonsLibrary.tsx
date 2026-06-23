import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Star, 
  CheckCircle, 
  Clock,
  BookOpen,
  Loader2
} from "lucide-react";
import { LessonViewer } from "./LessonViewer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Lesson {
  id: string;
  title: string;
  description: string;
  content: string | null;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  duration: number;
  progress: number;
  isFavorite: boolean;
  isCompleted: boolean;
}

const categoryLabels: Record<string, string> = {
  all: "All",
  basics: "Basics",
  budgeting: "Budgeting",
  saving: "Saving",
  investing: "Investing",
  credit: "Credit",
  debt: "Debt",
  taxes: "Taxes",
  retirement: "Retirement",
  insurance: "Insurance",
  real_estate: "Real Estate",
};

const categoryEmojis: Record<string, string> = {
  basics: "📖",
  budgeting: "📊",
  saving: "💰",
  investing: "📈",
  credit: "💳",
  debt: "🏦",
  taxes: "📋",
  retirement: "🏖️",
  insurance: "🛡️",
  real_estate: "🏠",
};

const levelColors: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  intermediate: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  advanced: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
};

const categoryGradients: Record<string, string> = {
  basics: "from-slate-500 to-gray-600",
  budgeting: "from-blue-500 to-indigo-600",
  saving: "from-amber-500 to-orange-600",
  investing: "from-emerald-500 to-teal-600",
  credit: "from-purple-500 to-violet-600",
  debt: "from-red-500 to-rose-600",
  taxes: "from-gray-500 to-slate-600",
  retirement: "from-cyan-500 to-blue-600",
  insurance: "from-pink-500 to-rose-600",
  real_estate: "from-green-500 to-emerald-600",
};

interface LessonsLibraryProps {
  searchQuery?: string;
}

export const LessonsLibrary = ({ searchQuery = "" }: LessonsLibraryProps) => {
  const [activeCategory, setActiveCategory] = useState("all");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [pendingFavorites, setPendingFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLessons();
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("lesson_favorites")
        .select("lesson_id")
        .eq("user_id", user.id);

      if (error) throw error;

      const ids = new Set((data || []).map(f => f.lesson_id));
      setFavoriteIds(ids);
    } catch (error) {
      console.error("Error fetching favorites:", error);
    }
  };

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from("learning_content")
        .select("*")
        .eq("type", "lesson")
        .eq("is_published", true)
        .in("age_group", ["adults", "all"])
        .order("category")
        .order("sort_order");

      if (error) throw error;

      const mappedLessons: Lesson[] = (data || []).map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description || "",
        content: item.content,
        category: item.category || "basics",
        level: (item.difficulty_level as "beginner" | "intermediate" | "advanced") || "beginner",
        duration: item.duration_minutes || 10,
        progress: 0,
        isFavorite: false,
        isCompleted: false,
      }));

      setLessons(mappedLessons);
    } catch (error) {
      console.error("Error fetching lessons:", error);
      toast.error("Failed to load lessons");
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (lessonId: string) => {
    // Prevent double-clicks
    if (pendingFavorites.has(lessonId)) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to save favorites");
        return;
      }

      // Mark as pending
      setPendingFavorites(prev => new Set(prev).add(lessonId));

      const isFavorite = favoriteIds.has(lessonId);

      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("lesson_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("lesson_id", lessonId);

        if (error) throw error;

        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(lessonId);
          return next;
        });
        toast.success("Removed from favorites");
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("lesson_favorites")
          .insert({ user_id: user.id, lesson_id: lessonId });

        if (error) throw error;

        setFavoriteIds(prev => new Set(prev).add(lessonId));
        toast.success("Added to favorites");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Failed to update favorites");
    } finally {
      // Remove from pending
      setPendingFavorites(prev => {
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
    }
  };

  const toggleCompleted = (lessonId: string) => {
    setLessons(prev => prev.map(l => 
      l.id === lessonId ? { ...l, isCompleted: !l.isCompleted, progress: l.isCompleted ? 0 : 100 } : l
    ));
  };

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
  };

  const handleCloseLesson = () => {
    setSelectedLesson(null);
  };

  const handleCompleteLesson = () => {
    if (selectedLesson) {
      toggleCompleted(selectedLesson.id);
      toast.success("Lesson completed! Great work!");
    }
    setSelectedLesson(null);
  };

  // Get unique categories from lessons
  const availableCategories = ["all", ...Array.from(new Set(lessons.map(l => l.category.toLowerCase())))];

  // Filter lessons by category and search query
  const filteredLessons = lessons.filter(l => {
    const matchesCategory = activeCategory === "all" || l.category.toLowerCase() === activeCategory;
    const matchesSearch = !searchQuery || 
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text="Loading lessons..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
        <TabsList className="w-full flex overflow-x-auto gap-1 bg-muted/50 p-1 rounded-lg">
          {availableCategories.map((cat) => (
            <TabsTrigger
              key={cat}
              value={cat}
              className="flex-shrink-0 px-2 py-1.5 text-xs capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {cat === "all" ? "All" : (
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span>{categoryEmojis[cat] || "📚"}</span>
                  <span>{categoryLabels[cat] || cat}</span>
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {filteredLessons.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredLessons.map((lesson) => (
                <Card 
                  key={lesson.id}
                  className="overflow-hidden cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-border/50"
                  onClick={() => handleLessonClick(lesson)}
                >
                  {/* Category Header Bar */}
                  <div className={`h-2 bg-gradient-to-r ${categoryGradients[lesson.category.toLowerCase()] || "from-primary/60 to-primary"}`} />
                  
                  <CardContent className="p-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{categoryEmojis[lesson.category.toLowerCase()] || "📚"}</span>
                        <Badge className={`text-xs ${levelColors[lesson.level]}`}>
                          {lesson.level}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {lesson.isCompleted && (
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(lesson.id);
                          }}
                        >
                          <Star 
                            className={`h-4 w-4 ${favoriteIds.has(lesson.id) ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`} 
                          />
                        </button>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h4 className="font-semibold text-sm line-clamp-2 mb-1">{lesson.title}</h4>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {lesson.description}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {lesson.duration} min
                      </div>
                      <span className="capitalize text-xs px-2 py-0.5 rounded bg-muted">
                        {lesson.category}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-none bg-muted/50">
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Lessons in This Category</h3>
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
        {filteredLessons.length} lesson{filteredLessons.length !== 1 ? 's' : ''} 
        {activeCategory !== "all" && ` in ${categoryLabels[activeCategory] || activeCategory}`}
      </div>

      {/* Lesson Viewer Modal */}
      <AnimatePresence>
        {selectedLesson && (
          <LessonViewer
            lesson={{
              id: selectedLesson.id,
              title: selectedLesson.title,
              description: selectedLesson.description,
              content: selectedLesson.content || undefined,
              category: selectedLesson.category,
              level: selectedLesson.level,
              duration: selectedLesson.duration,
            }}
            isFavorite={favoriteIds.has(selectedLesson.id)}
            onClose={handleCloseLesson}
            onComplete={handleCompleteLesson}
            onToggleFavorite={() => toggleFavorite(selectedLesson.id)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
