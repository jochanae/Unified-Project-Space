import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Target } from 'lucide-react';
import { StrategyFilters } from '@/components/strategies/StrategyFilters';
import { OptionsStrategiesSection } from '@/components/strategies/OptionsStrategiesSection';
import { StrategyLessonGrid } from '@/components/strategies/StrategyLessonGrid';
import { StrategyViewer } from '@/components/strategies/StrategyViewer';
import { STRATEGY_CONFIGS } from '@/components/strategies/StrategyPayoffChart';
import type { Lesson, LessonCategory } from '@/hooks/useCMS';

export default function Strategies() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedExpiration, setSelectedExpiration] = useState<string>('all');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['strategy-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as LessonCategory[];
    },
  });

  // Fetch lessons with categories
  const { data: lessons = [], isLoading } = useQuery({
    queryKey: ['strategy-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, category:lesson_categories(*)')
        .eq('status', 'published')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as Lesson[];
    },
  });

  // Filter lessons
  const filteredLessons = useMemo(() => {
    return lessons.filter(lesson => {
      const matchesSearch = !searchQuery || 
        lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lesson.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || 
        lesson.category_id === selectedCategory;
      
      const matchesDifficulty = selectedDifficulty === 'all' || 
        lesson.difficulty === selectedDifficulty;
      
      // Expiration filter - check if lesson slug contains 0dte
      const is0DTE = lesson.slug?.includes('0dte') || lesson.slug?.includes('0-dte');
      const matchesExpiration = selectedExpiration === 'all' || 
        (selectedExpiration === '0dte' && is0DTE) ||
        (selectedExpiration !== '0dte' && !is0DTE);
      
      return matchesSearch && matchesCategory && matchesDifficulty && matchesExpiration;
    });
  }, [lessons, searchQuery, selectedCategory, selectedDifficulty, selectedExpiration]);

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setViewerOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-4 shadow-lg">
            <Target className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Trading Strategies</h1>
            <p className="text-sm text-muted-foreground">
              Master proven strategies with interactive P/L diagrams
            </p>
          </div>
        </div>

        {/* Options Strategies Section - Interactive P/L Charts */}
        <OptionsStrategiesSection expirationFilter={selectedExpiration} />

        {/* Filters */}
        <StrategyFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedDifficulty={selectedDifficulty}
          onDifficultyChange={setSelectedDifficulty}
          selectedExpiration={selectedExpiration}
          onExpirationChange={setSelectedExpiration}
        />

        {/* Category Tabs + Lessons */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="all">All Categories</TabsTrigger>
              {categories.map(cat => (
                <TabsTrigger key={cat.id} value={cat.id} className="gap-1">
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value={selectedCategory} className="mt-6">
            <StrategyLessonGrid
              lessons={filteredLessons}
              isLoading={isLoading}
              selectedCategory={selectedCategory}
              onLessonClick={handleLessonClick}
            />
          </TabsContent>
        </Tabs>

        {/* Stats */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{lessons.length}</p>
                <p className="text-xs text-muted-foreground">Total Strategies</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gain">{categories.length}</p>
                <p className="text-xs text-muted-foreground">Categories</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-chart-4">
                  {Object.keys(STRATEGY_CONFIGS).length}
                </p>
                <p className="text-xs text-muted-foreground">With P/L Charts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Viewer Modal */}
      <StrategyViewer
        lesson={selectedLesson}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </DashboardLayout>
  );
}
