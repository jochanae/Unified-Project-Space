import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, CheckCircle, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import { markdownToHtml } from "@/lib/markdownToHtml";
import confetti from "canvas-confetti";

interface LessonSection {
  id: string;
  section_number: number;
  title: string;
  content: string;
  section_type: string;
  estimated_minutes: number;
  key_points: string[] | null;
}

interface LessonViewerProps {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    category: string;
    duration_minutes: number | null;
  };
  variant: "playful" | "modern";
  onClose: () => void;
  onComplete?: () => void;
}

export const LessonViewer = ({ lesson, variant, onClose, onComplete }: LessonViewerProps) => {
  const isPlayful = variant === "playful";
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isReading, setIsReading] = useState(false);
  const [hasSeenContent, setHasSeenContent] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Check if content requires scrolling and if user has scrolled to bottom
  const checkContentVisibility = useCallback(() => {
    if (!contentRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    // Consider content "seen" if scrolled near bottom (within 20px) or if content fits without scrolling
    const isAtBottom = scrollHeight <= clientHeight || scrollTop + clientHeight >= scrollHeight - 20;
    
    if (isAtBottom) {
      setHasSeenContent(true);
    }
  }, []);

  // Reset "seen" state when page changes
  useEffect(() => {
    setHasSeenContent(false);
    // Check immediately in case content doesn't need scrolling
    setTimeout(checkContentVisibility, 100);
  }, [currentPage, checkContentVisibility]);

  useEffect(() => {
    fetchSections();
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lesson.id]);

  const fetchSections = async () => {
    try {
      // First try to fetch from lesson_sections table
      const { data, error } = await supabase
        .from("lesson_sections")
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("section_number");

      if (!error && data && data.length > 0) {
        setSections(data);
      } else {
        // Fallback: create sections from lesson content/description
        const fallbackSections = createFallbackSections();
        setSections(fallbackSections);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      const fallbackSections = createFallbackSections();
      setSections(fallbackSections);
    } finally {
      setLoading(false);
    }
  };

  const createFallbackSections = (): LessonSection[] => {
    // Create introduction section
    const introSection: LessonSection = {
      id: `${lesson.id}-intro`,
      section_number: 1,
      title: isPlayful ? "Let's Start! 🎉" : "Introduction",
      content: lesson.description || `Welcome to "${lesson.title}"! Let's learn something awesome together.`,
      section_type: "introduction",
      estimated_minutes: 1,
      key_points: null
    };

    // If we have content, split it into bite-sized sections
    if (lesson.content) {
      const paragraphs = lesson.content.split(/\n\n+/).filter(p => p.trim());
      
      // For kids, keep sections shorter - group into 2-3 paragraphs max per section
      const sectionsContent: string[] = [];
      let currentSection = "";
      let paragraphCount = 0;
      
      for (const paragraph of paragraphs) {
        currentSection += (currentSection ? "\n\n" : "") + paragraph;
        paragraphCount++;
        
        // Create a new section every 2 paragraphs for kids
        if (paragraphCount >= 2) {
          sectionsContent.push(currentSection);
          currentSection = "";
          paragraphCount = 0;
        }
      }
      
      // Don't forget the last section
      if (currentSection) {
        sectionsContent.push(currentSection);
      }

      const contentSections: LessonSection[] = sectionsContent.map((content, index) => ({
        id: `${lesson.id}-section-${index + 2}`,
        section_number: index + 2,
        title: isPlayful 
          ? `Step ${index + 1} ${getStepEmoji(index)}` 
          : `Part ${index + 1}`,
        content: content.trim(),
        section_type: "content",
        estimated_minutes: Math.max(1, Math.ceil(content.split(' ').length / 100)), // Kids read slower
        key_points: null
      }));

      // Add summary section
      const summarySection: LessonSection = {
        id: `${lesson.id}-summary`,
        section_number: sectionsContent.length + 2,
        title: isPlayful ? "You Did It! 🌟" : "Great Job!",
        content: isPlayful 
          ? `Woohoo! You finished "${lesson.title}"! You're getting smarter every day! 🎓`
          : `You've completed "${lesson.title}". Keep up the great work!`,
        section_type: "summary",
        estimated_minutes: 1,
        key_points: null
      };

      return [introSection, ...contentSections, summarySection];
    }

    // Minimal fallback if no content
    return [
      introSection,
      {
        id: `${lesson.id}-placeholder`,
        section_number: 2,
        title: isPlayful ? "Coming Soon! 🔜" : "Coming Soon",
        content: "This lesson is being prepared just for you! Check back soon!",
        section_type: "content",
        estimated_minutes: 1,
        key_points: null
      }
    ];
  };

  const getStepEmoji = (index: number): string => {
    const emojis = ["📖", "💡", "🎯", "⭐", "🚀", "🏆", "💪", "🌈"];
    return emojis[index % emojis.length];
  };

  const totalPages = sections.length;
  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
  const isLastPage = currentPage === totalPages - 1;
  const currentSection = sections[currentPage];

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    const colors = isPlayful 
      ? ['#f97316', '#fbbf24', '#f59e0b', '#fb923c'] 
      : ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  };

  const nextPage = () => {
    stopReading();
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    } else {
      triggerConfetti();
      if (onComplete) {
        setTimeout(onComplete, 1500);
      }
    }
  };

  const prevPage = () => {
    stopReading();
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const goToPage = (pageIndex: number) => {
    stopReading();
    setCurrentPage(pageIndex);
  };

  const toggleReadAloud = () => {
    if (!('speechSynthesis' in window)) return;
    
    if (isReading) {
      stopReading();
    } else {
      const utterance = new SpeechSynthesisUtterance(currentSection?.content || '');
      utterance.rate = isPlayful ? 0.85 : 0.9; // Slightly slower for younger kids
      utterance.onend = () => setIsReading(false);
      utterance.onerror = () => setIsReading(false);
      window.speechSynthesis.speak(utterance);
      setIsReading(true);
    }
  };

  const stopReading = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsReading(false);
  };

  const getCategoryEmoji = (category: string) => {
    switch (category) {
      case "saving": return "🐷";
      case "basics": return "💵";
      case "earning": return "🍋";
      case "spending": return "🛒";
      case "giving": return "💝";
      case "budgeting": return "📊";
      default: return "📚";
    }
  };

  const getSectionIcon = (sectionType: string) => {
    if (isPlayful) {
      switch (sectionType) {
        case "introduction": return "🎈";
        case "summary": return "🎉";
        default: return "✨";
      }
    }
    switch (sectionType) {
      case "introduction": return "👋";
      case "summary": return "🎯";
      default: return "📄";
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className={`relative rounded-2xl p-8 ${isPlayful ? "bg-orange-100" : "bg-slate-800"}`}>
          <Loader2 className={`h-8 w-8 animate-spin ${isPlayful ? "text-orange-500" : "text-emerald-400"}`} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`relative w-full max-w-lg h-[95dvh] sm:h-[90dvh] md:h-[85dvh] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col ${
          isPlayful 
            ? "bg-gradient-to-b from-orange-50 to-yellow-50" 
            : "bg-gradient-to-b from-slate-900 to-slate-800"
        }`}
      >
        {/* Header - Compact */}
        <div className={`p-3 shrink-0 ${isPlayful ? "bg-orange-400" : "bg-emerald-600"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-2xl flex-shrink-0">{getCategoryEmoji(lesson.category)}</span>
              <div className="min-w-0">
                <h2 className="font-bold text-white text-sm sm:text-base leading-tight truncate">
                  {lesson.title}
                </h2>
                <p className="text-white/80 text-xs">
                  {totalPages} {totalPages === 1 ? "step" : "steps"} • {lesson.duration_minutes || 5} min
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Progress */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-white/80 mb-1">
              <span>Step {currentPage + 1} of {totalPages}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-1.5 bg-white/30" />
          </div>
        </div>

        {/* Section Content - Scrollable */}
        <div 
          ref={contentRef}
          onScroll={checkContentVisibility}
          className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0"
        >
          <AnimatePresence mode="wait">
            {currentSection && (
              <motion.div
                key={currentPage}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Section Title */}
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl">{getSectionIcon(currentSection.section_type)}</span>
                  <h3 className={`font-bold text-base sm:text-lg ${isPlayful ? "text-orange-600" : "text-emerald-400"}`}>
                    {currentSection.title}
                  </h3>
                </div>

                {/* Section Content */}
                <div 
                  className={`text-sm sm:text-base leading-relaxed prose prose-sm sm:prose-base max-w-none ${
                    isPlayful 
                      ? "text-gray-700 prose-headings:text-orange-600 prose-strong:text-orange-700" 
                      : "text-white/90 prose-invert prose-headings:text-emerald-400"
                  }`}
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(markdownToHtml(currentSection.content || ""), {
                      ALLOWED_TAGS: ['strong', 'em', 'br', 'p', 'h1', 'h2', 'h3', 'ul', 'li'],
                      ALLOWED_ATTR: []
                    })
                  }}
                />

                {/* Key Points (if available) */}
                {currentSection.key_points && currentSection.key_points.length > 0 && (
                  <div className={`mt-4 p-3 sm:p-4 rounded-xl ${
                    isPlayful ? "bg-yellow-100 border-2 border-yellow-300" : "bg-emerald-900/30 border border-emerald-500/30"
                  }`}>
                    <h4 className={`font-bold text-sm mb-2 flex items-center gap-2 ${
                      isPlayful ? "text-yellow-700" : "text-emerald-400"
                    }`}>
                      <span>💡</span> {isPlayful ? "Remember This!" : "Key Points"}
                    </h4>
                    <ul className="space-y-2">
                      {currentSection.key_points.map((point, idx) => (
                        <li key={idx} className={`text-sm flex items-start gap-2 ${
                          isPlayful ? "text-yellow-800" : "text-white/80"
                        }`}>
                          <span className={isPlayful ? "text-yellow-600" : "text-emerald-400"}>•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Page Indicators */}
        <div className="px-3 sm:px-4 pb-2 shrink-0">
          <div className="flex justify-center gap-1 sm:gap-1.5 flex-wrap">
            {sections.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={`h-2 sm:h-2.5 rounded-full transition-all ${
                  idx === currentPage 
                    ? `w-5 sm:w-6 ${isPlayful ? "bg-orange-500" : "bg-emerald-500"}` 
                    : idx < currentPage
                    ? `w-2 sm:w-2.5 ${isPlayful ? "bg-orange-300" : "bg-emerald-700"}`
                    : `w-2 sm:w-2.5 ${isPlayful ? "bg-orange-200 hover:bg-orange-300" : "bg-slate-600 hover:bg-slate-500"}`
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className={`p-3 sm:p-4 border-t shrink-0 ${
          isPlayful ? "bg-white border-orange-200" : "bg-slate-800/50 border-white/10"
        }`}>
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
              className={`text-xs sm:text-sm ${isPlayful ? "" : "border-white/20 text-white hover:bg-white/10"}`}
            >
              <ChevronLeft className="h-4 w-4 mr-0.5 sm:mr-1" />
              <span className="hidden xs:inline">Back</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleReadAloud}
              className={`h-8 w-8 ${isPlayful ? "text-orange-500" : "text-white"}`}
            >
              {isReading ? <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" /> : <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>

            <Button
              size="sm"
              onClick={nextPage}
              disabled={!hasSeenContent}
              className={`text-xs sm:text-sm ${isPlayful 
                ? "bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-300" 
                : "bg-emerald-500 hover:bg-emerald-600 text-white disabled:bg-emerald-800"
              }`}
            >
              {isLastPage ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-0.5 sm:mr-1" />
                  {isPlayful ? "Yay!" : "Done!"}
                </>
              ) : hasSeenContent ? (
                <>
                  <span className="hidden xs:inline">Next</span>
                  <ChevronRight className="h-4 w-4 ml-0.5 sm:ml-1" />
                </>
              ) : (
                <span className="text-xs">
                  {isPlayful ? "Keep reading! 📖" : "Scroll..."}
                </span>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};