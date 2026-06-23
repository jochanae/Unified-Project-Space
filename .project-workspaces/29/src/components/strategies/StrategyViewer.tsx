import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle2, 
  BarChart3, 
  BookOpen,
  Lightbulb,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StrategyPayoffChart, STRATEGY_CONFIGS } from './StrategyPayoffChart';
import { LessonPaginator } from './LessonPaginator';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Lesson } from '@/hooks/useCMS';

interface StrategyViewerProps {
  lesson: Lesson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'bg-gain/10 text-gain border-gain/30' },
  intermediate: { label: 'Intermediate', color: 'bg-chart-4/10 text-chart-4 border-chart-4/30' },
  advanced: { label: 'Advanced', color: 'bg-loss/10 text-loss border-loss/30' },
};

// Desktop version with tabs
function DesktopViewer({ lesson, open, onOpenChange }: StrategyViewerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!lesson) return null;

  const difficulty = difficultyConfig[lesson.difficulty];
  const strategyConfig = STRATEGY_CONFIGS[lesson.slug];
  const hasPayoffChart = !!strategyConfig;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">{lesson.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className={cn('text-xs', difficulty.color)}>
                  {difficulty.label}
                </Badge>
                {lesson.duration_minutes && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.duration_minutes} min
                  </Badge>
                )}
                {lesson.category?.name && (
                  <Badge variant="outline" className="text-xs">
                    {lesson.category.name}
                  </Badge>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 pt-4 border-b">
            <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
              <TabsTrigger value="overview" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Overview
              </TabsTrigger>
              {hasPayoffChart && (
                <TabsTrigger value="payoff" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  P/L Diagram
                </TabsTrigger>
              )}
              <TabsTrigger value="takeaways" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Key Points
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="p-6">
              <TabsContent value="overview" className="mt-0 space-y-4">
                {lesson.content ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content) }}
                  />
                ) : (
                  <div className="space-y-6">
                    {lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-lg flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-chart-3" />
                          Quick Overview
                        </h4>
                        {lesson.key_takeaways.map((takeaway, i) => (
                          <div 
                            key={i} 
                            className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                          >
                            <CheckCircle2 className="h-5 w-5 text-gain shrink-0 mt-0.5" />
                            <p className="text-sm">{takeaway}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-center py-6 text-muted-foreground border-t">
                      <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">Full lesson content coming soon</p>
                      <p className="text-sm mt-1">Admins can add detailed content via Admin → Lessons</p>
                    </div>
                  </div>
                )}
              </TabsContent>

              {hasPayoffChart && (
                <TabsContent value="payoff" className="mt-0">
                  <StrategyPayoffChart config={strategyConfig(100)} />
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">How to Read This Chart</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <span className="text-primary font-medium">Blue line</span>: Your profit/loss at different stock prices</li>
                      <li>• <span className="text-gain font-medium">Green area</span>: Profit zone</li>
                      <li>• <span className="text-loss font-medium">Red area</span>: Loss zone</li>
                      <li>• <span className="text-chart-3 font-medium">Dashed lines</span>: Breakeven points</li>
                      <li>• Values assume 1 contract (100 shares) and $100 stock price</li>
                    </ul>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="takeaways" className="mt-0">
                {lesson.key_takeaways && lesson.key_takeaways.length > 0 ? (
                  <div className="space-y-3">
                    {lesson.key_takeaways.map((takeaway, i) => (
                      <div 
                        key={i} 
                        className="flex items-start gap-3 p-4 rounded-lg bg-muted/50"
                      >
                        <CheckCircle2 className="h-5 w-5 text-gain shrink-0 mt-0.5" />
                        <p className="text-sm">{takeaway}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Key takeaways not available yet.</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Mobile version with paginated tutorial experience
function MobileViewer({ lesson, open, onOpenChange }: StrategyViewerProps) {
  if (!lesson) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[100dvh] max-h-[100dvh] [&>div:first-child]:hidden">
        <LessonPaginator lesson={lesson} onClose={() => onOpenChange(false)} />
      </DrawerContent>
    </Drawer>
  );
}

export function StrategyViewer({ lesson, open, onOpenChange }: StrategyViewerProps) {
  const isMobile = useIsMobile();
  
  if (!lesson) return null;
  
  // Use paginated mobile experience on small screens
  if (isMobile) {
    return <MobileViewer lesson={lesson} open={open} onOpenChange={onOpenChange} />;
  }
  
  // Use desktop tabbed dialog on larger screens
  return <DesktopViewer lesson={lesson} open={open} onOpenChange={onOpenChange} />;
}
