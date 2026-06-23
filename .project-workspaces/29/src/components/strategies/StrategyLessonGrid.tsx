import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, BookOpen, Lightbulb } from 'lucide-react';
import { StrategyCard } from './StrategyCard';
import type { Lesson } from '@/hooks/useCMS';

interface StrategyLessonGridProps {
  lessons: Lesson[];
  isLoading: boolean;
  selectedCategory: string;
  onLessonClick: (lesson: Lesson) => void;
}

export function StrategyLessonGrid({
  lessons,
  isLoading,
  selectedCategory,
  onLessonClick,
}: StrategyLessonGridProps) {
  // Group lessons by category for display
  const lessonsByCategory = useMemo(() => {
    const grouped = new Map<string, Lesson[]>();
    
    lessons.forEach(lesson => {
      const catName = lesson.category?.name || 'Other';
      if (!grouped.has(catName)) {
        grouped.set(catName, []);
      }
      grouped.get(catName)!.push(lesson);
    });
    
    return grouped;
  }, [lessons]);

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <Card className="p-12 text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
        <h3 className="font-semibold mb-2">No strategies found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or search query
        </p>
      </Card>
    );
  }

  // Show grouped by category when viewing all
  if (selectedCategory === 'all') {
    return (
      <div className="space-y-8">
        {Array.from(lessonsByCategory.entries()).map(([categoryName, categoryLessons]) => (
          <div key={categoryName}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              {categoryLessons[0]?.category?.icon && (
                <span>{categoryLessons[0].category.icon}</span>
              )}
              {categoryName}
              <Badge variant="secondary" className="ml-2">
                {categoryLessons.length}
              </Badge>
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryLessons.map(lesson => (
                <StrategyCard
                  key={lesson.id}
                  lesson={lesson}
                  onClick={() => onLessonClick(lesson)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show flat grid for single category
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {lessons.map(lesson => (
        <StrategyCard
          key={lesson.id}
          lesson={lesson}
          onClick={() => onLessonClick(lesson)}
        />
      ))}
    </div>
  );
}
