import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, CheckCircle, BookOpen, Clock, Star, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";

// Simple markdown to HTML parser with XSS sanitization
const parseMarkdown = (text: string): string => {
  if (!text) return "";
  
  const html = text
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="font-semibold text-base mt-4 mb-2">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="font-bold text-lg mt-4 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="font-bold text-xl mt-4 mb-3">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // List items
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // Numbered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // Line breaks (double newline = paragraph break)
    .replace(/\n\n/g, '</p><p class="mt-3">')
    // Single line breaks
    .replace(/\n/g, '<br/>');
  
  // Sanitize to prevent XSS attacks
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h2', 'h3', 'h4', 'strong', 'em', 'li', 'p', 'br'],
    ALLOWED_ATTR: ['class']
  });
};

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
    description: string;
    content?: string;
    category: string;
    level: "beginner" | "intermediate" | "advanced";
    duration: number;
  };
  isFavorite?: boolean;
  onClose: () => void;
  onComplete?: () => void;
  onToggleFavorite?: () => void;
}

export const LessonViewer = ({ 
  lesson, 
  isFavorite = false,
  onClose, 
  onComplete,
  onToggleFavorite 
}: LessonViewerProps) => {
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
      // Stop any ongoing speech when unmounting
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [lesson.id]);

  const fetchSections = async () => {
    try {
      const { data, error } = await supabase
        .from("lesson_sections")
        .select("*")
        .eq("lesson_id", lesson.id)
        .order("section_number");

      if (error) throw error;

      if (data && data.length > 0) {
        setSections(data);
      } else {
        // Fallback: create sections from lesson content/description
        const fallbackSections = createFallbackSections();
        setSections(fallbackSections);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      // Use fallback sections
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
      title: "Introduction",
      content: lesson.description || `Welcome to "${lesson.title}". This lesson will help you understand key concepts and build your financial knowledge.`,
      section_type: "introduction",
      estimated_minutes: 2,
      key_points: null
    };

    // If we have content, split it into bite-sized sections
    if (lesson.content) {
      const paragraphs = lesson.content.split(/\n\n+/).filter(p => p.trim());
      const contentSections: LessonSection[] = paragraphs.map((paragraph, index) => ({
        id: `${lesson.id}-section-${index + 2}`,
        section_number: index + 2,
        title: `Part ${index + 1}`,
        content: paragraph.trim(),
        section_type: "content",
        estimated_minutes: Math.ceil(paragraph.split(' ').length / 150), // ~150 words per minute
        key_points: null
      }));

      // Add summary section
      const summarySection: LessonSection = {
        id: `${lesson.id}-summary`,
        section_number: paragraphs.length + 2,
        title: "Summary",
        content: `You've completed "${lesson.title}"! Review this lesson anytime to reinforce your learning.`,
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
        title: "Coming Soon",
        content: "Detailed content for this lesson is being prepared. Check back soon for the full learning experience!",
        section_type: "content",
        estimated_minutes: 1,
        key_points: null
      }
    ];
  };

  const totalPages = sections.length;
  const progress = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;
  const isLastPage = currentPage === totalPages - 1;
  const currentSection = sections[currentPage];

  const nextPage = () => {
    stopReading();
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    } else if (onComplete) {
      onComplete();
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

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner": return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case "intermediate": return "bg-blue-100 text-blue-700 border-blue-300";
      case "advanced": return "bg-purple-100 text-purple-700 border-purple-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "money management": return "💰";
      case "basics": return "📚";
      case "budgeting": return "📊";
      case "investing": return "📈";
      case "credit": return "💳";
      case "debt": return "🏦";
      case "taxes": return "📋";
      case "retirement": return "🏖️";
      case "saving": return "🐷";
      default: return "📖";
    }
  };

  const getSectionIcon = (sectionType: string) => {
    switch (sectionType) {
      case "introduction": return "👋";
      case "summary": return "🎯";
      case "quiz": return "❓";
      case "tip": return "💡";
      default: return "📄";
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-card rounded-2xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl h-[90dvh] sm:h-[85dvh] rounded-2xl overflow-hidden shadow-2xl bg-card flex flex-col"
      >
        {/* Header - Compact */}
        <div className="p-3 sm:p-4 bg-gradient-to-r from-primary/10 to-primary/5 border-b shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className="text-xl">{getCategoryIcon(lesson.category)}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {lesson.category}
                </Badge>
                <Badge className={`text-[10px] px-1.5 py-0 ${getLevelColor(lesson.level)}`}>
                  {lesson.level}
                </Badge>
              </div>
              <h2 className="font-bold text-base sm:text-lg text-foreground leading-tight">
                {lesson.title}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lesson.duration} min
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {totalPages} {totalPages === 1 ? "page" : "pages"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onToggleFavorite && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggleFavorite}
                >
                  <Star className={`h-4 w-4 ${isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Progress - Compact */}
          <div className="mt-2">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Page {currentPage + 1} of {totalPages}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        </div>

        {/* Section Content - Scrollable area */}
        <div 
          ref={contentRef}
          onScroll={checkContentVisibility}
          className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0"
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
                  <span className="text-xl">{getSectionIcon(currentSection.section_type)}</span>
                  <h3 className="font-semibold text-lg text-foreground">
                    {currentSection.title}
                  </h3>
                </div>

                {/* Section Content - Parsed Markdown */}
                <div 
                  className="text-base leading-relaxed text-foreground prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(currentSection.content || "") }}
                />

                {/* Key Points */}
                {currentSection.key_points && currentSection.key_points.length > 0 && (
                  <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <span>💡</span> Key Points
                    </h4>
                    <ul className="space-y-2">
                      {currentSection.key_points.map((point, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Estimated Time */}
                {currentSection.estimated_minutes > 0 && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    ~{currentSection.estimated_minutes} min read
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Page Indicators */}
        <div className="px-4 sm:px-6 pb-2 shrink-0">
          <div className="flex justify-center gap-1.5 flex-wrap">
            {sections.map((_, idx) => (
              <button
                key={idx}
                onClick={() => goToPage(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentPage 
                    ? "w-6 bg-primary" 
                    : idx < currentPage
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
                aria-label={`Go to page ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="p-4 border-t bg-muted/30 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="flex-1 sm:flex-none"
            >
              <ChevronLeft className="h-5 w-5 mr-1" />
              <span className="hidden sm:inline">Previous</span>
              <span className="sm:hidden">Back</span>
            </Button>

            {/* Read Aloud Button */}
            {'speechSynthesis' in window && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleReadAloud}
                className="shrink-0"
              >
                {isReading ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
            )}

            <Button 
              onClick={nextPage} 
              disabled={!hasSeenContent}
              className="flex-1 sm:flex-none"
            >
              {isLastPage ? (
                <>
                  <CheckCircle className="h-5 w-5 mr-1" />
                  Complete
                </>
              ) : (
                <>
                  {hasSeenContent ? "Next" : "Scroll to continue"}
                  <ChevronRight className="h-5 w-5 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
