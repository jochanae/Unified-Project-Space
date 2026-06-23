import { useState, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  BookOpen,
  BarChart3,
  Lightbulb,
  X,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StrategyPayoffChart, STRATEGY_CONFIGS } from './StrategyPayoffChart';
import type { Lesson } from '@/hooks/useCMS';

interface LessonSection {
  id: string;
  title: string;
  content: string;
  icon: React.ReactNode;
}

interface LessonPaginatorProps {
  lesson: Lesson;
  onClose: () => void;
}

// Parse HTML content into sections
function parseContentIntoSections(content: string | null, lesson: Lesson): LessonSection[] {
  const sections: LessonSection[] = [];
  
  if (!content) {
    // If no content, create sections from key takeaways
    if (lesson.key_takeaways && lesson.key_takeaways.length > 0) {
      sections.push({
        id: 'overview',
        title: 'Overview',
        content: `<div class="space-y-4"><h2 class="text-xl font-bold">${lesson.title}</h2><p class="text-muted-foreground">${lesson.description || ''}</p></div>`,
        icon: <BookOpen className="h-4 w-4" />,
      });
      
      sections.push({
        id: 'takeaways',
        title: 'Key Points',
        content: lesson.key_takeaways.map((t, i) => 
          `<div class="flex items-start gap-3 p-4 rounded-lg bg-muted/50 mb-3"><span class="text-gain font-bold">${i + 1}.</span><p>${t}</p></div>`
        ).join(''),
        icon: <Lightbulb className="h-4 w-4" />,
      });
    }
    return sections;
  }

  // Parse HTML into sections based on <section> tags or headings
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  
  // Try to find <section> elements first
  const sectionElements = doc.querySelectorAll('section');
  
  if (sectionElements.length > 0) {
    sectionElements.forEach((section, index) => {
      const className = section.className || '';
      let title = 'Section ' + (index + 1);
      let icon: React.ReactNode = <BookOpen className="h-4 w-4" />;
      
      // Determine section type from class name
      if (className.includes('intro')) {
        title = 'Introduction';
        icon = <BookOpen className="h-4 w-4" />;
      } else if (className.includes('strategy') || className.includes('how')) {
        title = 'Strategy';
        icon = <BarChart3 className="h-4 w-4" />;
      } else if (className.includes('example')) {
        title = 'Examples';
        icon = <CheckCircle2 className="h-4 w-4" />;
      } else if (className.includes('takeaway') || className.includes('key')) {
        title = 'Key Takeaways';
        icon = <Lightbulb className="h-4 w-4" />;
      }
      
      // Try to get title from h2/h3 within section
      const heading = section.querySelector('h2, h3');
      if (heading) {
        title = heading.textContent || title;
      }
      
      sections.push({
        id: `section-${index}`,
        title,
        content: section.innerHTML,
        icon,
      });
    });
  } else {
    // Fallback: split by h2 or h3 headings
    const headings = doc.querySelectorAll('h2, h3');
    
    if (headings.length > 0) {
      // Create intro section from content before first heading
      const firstHeading = headings[0];
      let introContent = '';
      let currentNode = doc.body.firstChild;
      
      while (currentNode && currentNode !== firstHeading) {
        if (currentNode instanceof Element) {
          introContent += currentNode.outerHTML;
        }
        currentNode = currentNode.nextSibling;
      }
      
      if (introContent.trim()) {
        sections.push({
          id: 'intro',
          title: 'Introduction',
          content: introContent,
          icon: <BookOpen className="h-4 w-4" />,
        });
      }
      
      // Create sections from each heading
      headings.forEach((heading, index) => {
        const title = heading.textContent || `Section ${index + 1}`;
        let sectionContent = heading.outerHTML;
        
        // Collect content until next heading
        let nextNode = heading.nextSibling;
        while (nextNode && !(nextNode instanceof Element && (nextNode.tagName === 'H2' || nextNode.tagName === 'H3'))) {
          if (nextNode instanceof Element) {
            sectionContent += nextNode.outerHTML;
          }
          nextNode = nextNode.nextSibling;
        }
        
        let icon: React.ReactNode = <BookOpen className="h-4 w-4" />;
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('how') || lowerTitle.includes('strategy') || lowerTitle.includes('work')) {
          icon = <BarChart3 className="h-4 w-4" />;
        } else if (lowerTitle.includes('example') || lowerTitle.includes('trade')) {
          icon = <CheckCircle2 className="h-4 w-4" />;
        } else if (lowerTitle.includes('key') || lowerTitle.includes('takeaway') || lowerTitle.includes('tip')) {
          icon = <Lightbulb className="h-4 w-4" />;
        }
        
        sections.push({
          id: `section-${index}`,
          title,
          content: sectionContent,
          icon,
        });
      });
    } else {
      // No structure found - split into chunks
      const fullContent = doc.body.innerHTML;
      const words = fullContent.split(/\s+/);
      const chunkSize = Math.ceil(words.length / 3);
      
      sections.push({
        id: 'intro',
        title: 'Introduction',
        content: `<h2 class="text-xl font-bold mb-4">${lesson.title}</h2><p class="text-muted-foreground mb-4">${lesson.description || ''}</p>`,
        icon: <BookOpen className="h-4 w-4" />,
      });
      
      sections.push({
        id: 'content',
        title: 'Content',
        content: fullContent,
        icon: <BarChart3 className="h-4 w-4" />,
      });
    }
  }
  
  // Add key takeaways as final section if available and not already included
  if (lesson.key_takeaways && lesson.key_takeaways.length > 0) {
    const hasTakeaways = sections.some(s => s.title.toLowerCase().includes('takeaway') || s.title.toLowerCase().includes('key'));
    if (!hasTakeaways) {
      sections.push({
        id: 'takeaways',
        title: 'Key Takeaways',
        content: lesson.key_takeaways.map((t, i) => 
          `<div class="flex items-start gap-3 p-4 rounded-lg bg-muted/50 mb-3"><span class="text-gain font-bold">${i + 1}.</span><p>${t}</p></div>`
        ).join(''),
        icon: <Lightbulb className="h-4 w-4" />,
      });
    }
  }
  
  return sections;
}

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'bg-gain/10 text-gain border-gain/30' },
  intermediate: { label: 'Intermediate', color: 'bg-chart-4/10 text-chart-4 border-chart-4/30' },
  advanced: { label: 'Advanced', color: 'bg-loss/10 text-loss border-loss/30' },
};

export function LessonPaginator({ lesson, onClose }: LessonPaginatorProps) {
  const [currentPage, setCurrentPage] = useState(0);
  
  const strategyConfig = STRATEGY_CONFIGS[lesson.slug];
  const hasPayoffChart = !!strategyConfig;
  
  // Parse content into sections
  const sections = useMemo(() => {
    const parsed = parseContentIntoSections(lesson.content, lesson);
    
    // Add P/L chart section if available
    if (hasPayoffChart) {
      parsed.splice(1, 0, {
        id: 'payoff',
        title: 'P/L Diagram',
        content: '__PAYOFF_CHART__', // Special marker
        icon: <BarChart3 className="h-4 w-4" />,
      });
    }
    
    return parsed;
  }, [lesson, hasPayoffChart]);
  
  const totalPages = sections.length;
  const currentSection = sections[currentPage];
  const progress = ((currentPage + 1) / totalPages) * 100;
  const difficulty = difficultyConfig[lesson.difficulty];
  
  const goNext = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(p => p + 1);
    }
  }, [currentPage, totalPages]);
  
  const goPrev = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(p => p - 1);
    }
  }, [currentPage]);
  
  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);
  
  const isLastPage = currentPage === totalPages - 1;
  const isFirstPage = currentPage === 0;
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed Header */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Badge variant="outline" className={cn('text-xs shrink-0', difficulty.color)}>
                {difficulty.label}
              </Badge>
              <h1 className="font-semibold truncate">{lesson.title}</h1>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0 ml-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {currentSection?.icon}
                {currentSection?.title}
              </span>
              <span>{currentPage + 1} of {totalPages}</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
          
          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {sections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => goToPage(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentPage 
                    ? "w-6 bg-primary" 
                    : index < currentPage 
                      ? "bg-primary/60" 
                      : "bg-muted-foreground/30"
                )}
                title={section.title}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 pb-24">
          {currentSection?.content === '__PAYOFF_CHART__' && strategyConfig ? (
            <div className="space-y-4">
              <StrategyPayoffChart config={strategyConfig(100)} />
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">How to Read This Chart</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <span className="text-primary font-medium">Blue line</span>: Your profit/loss at different stock prices</li>
                  <li>• <span className="text-gain font-medium">Green area</span>: Profit zone</li>
                  <li>• <span className="text-loss font-medium">Red area</span>: Loss zone</li>
                  <li>• <span className="text-chart-3 font-medium">Dashed lines</span>: Breakeven points</li>
                </ul>
              </div>
            </div>
          ) : (
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(currentSection?.content || '') 
              }}
            />
          )}
        </div>
      </div>
      
      {/* Fixed Footer Navigation */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur-sm p-4 safe-area-inset-bottom">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="outline"
            onClick={goPrev}
            disabled={isFirstPage}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => goToPage(0)}
            className="shrink-0"
            title="Go to start"
          >
            <Home className="h-4 w-4" />
          </Button>
          
          {isLastPage ? (
            <Button
              onClick={onClose}
              className="flex-1 bg-gain hover:bg-gain/90 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Complete
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="flex-1"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
