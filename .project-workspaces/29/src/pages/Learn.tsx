import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  GraduationCap,
  Play,
  BookOpen,
  Link2,
  Sparkles,
  Clock,
  PlayCircle,
  ExternalLink,
  Search,
  X,
  Building2,
  LineChart,
  FileText,
  Star,
  TrendingUp,
  Shield,
  Calculator,
  Rocket,
  Trophy,
  BarChart3,
  ArrowRight,
  MousePointerClick,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  tradingGlossary,
  categoryLabels,
  categoryIcons,
  GlossaryTerm,
} from '@/data/tradingGlossary';
import { StrategyViewer } from '@/components/strategies/StrategyViewer';
import type { Lesson, LessonCategory } from '@/hooks/useCMS';

// ==================== VIDEOS DATA ====================
interface Video {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
  category: 'basics' | 'options' | 'technical' | 'strategies' | 'psychology';
  level: 'beginner' | 'intermediate' | 'advanced';
  featured?: boolean;
}

const videos: Video[] = [
  { id: '1', title: 'Stock Market Basics for Beginners', description: 'Learn the fundamentals of how the stock market works, including exchanges, orders, and key terminology.', youtubeId: 'p7HKvqRI_Bo', duration: '12:34', category: 'basics', level: 'beginner', featured: true },
  { id: '2', title: 'How to Read Stock Charts', description: 'Understanding candlestick charts, price action, and basic chart patterns every trader should know.', youtubeId: 'tV3XhM5YPDk', duration: '15:22', category: 'basics', level: 'beginner' },
  { id: '3', title: 'ETFs vs Mutual Funds Explained', description: 'The key differences between ETFs and mutual funds, and which might be right for your portfolio.', youtubeId: 'OwpFBi_jEHI', duration: '8:45', category: 'basics', level: 'beginner' },
  { id: '4', title: 'Options Trading for Beginners', description: 'Introduction to calls and puts, how options work, and basic terminology you need to know.', youtubeId: '7PM4rNDr4oI', duration: '18:30', category: 'options', level: 'beginner', featured: true },
  { id: '5', title: 'Understanding the Greeks', description: 'Deep dive into Delta, Gamma, Theta, Vega, and how they affect your options positions.', youtubeId: 'kCJcEOYuuII', duration: '22:15', category: 'options', level: 'intermediate' },
  { id: '6', title: 'Covered Calls Strategy', description: 'How to generate income from stocks you already own using covered calls.', youtubeId: 'jnTsQBJHMSk', duration: '14:50', category: 'options', level: 'intermediate' },
  { id: '7', title: 'Support and Resistance Trading', description: 'How to identify and trade key support and resistance levels like a professional.', youtubeId: 'ZQL_RO-SELU', duration: '16:40', category: 'technical', level: 'beginner' },
  { id: '8', title: 'Moving Averages Explained', description: 'Using SMA, EMA, and moving average crossovers to identify trends and entry points.', youtubeId: 'YHHO6E6Y5l4', duration: '13:25', category: 'technical', level: 'beginner' },
  { id: '9', title: 'RSI and MACD Indicators', description: 'Mastering momentum indicators to time your entries and exits more effectively.', youtubeId: 'lBnVMxffI9M', duration: '19:10', category: 'technical', level: 'intermediate' },
  { id: '10', title: 'The Wheel Strategy Explained', description: 'A complete guide to generating consistent income with the wheel options strategy.', youtubeId: 'siFsIleNTzk', duration: '25:30', category: 'strategies', level: 'intermediate', featured: true },
  { id: '11', title: 'Iron Condor Strategy', description: 'How to profit in sideways markets using iron condors for consistent income.', youtubeId: '1SVswX5V5XU', duration: '20:45', category: 'strategies', level: 'advanced' },
  { id: '12', title: 'Swing Trading Basics', description: 'Learn to capture gains in stocks over days to weeks with swing trading strategies.', youtubeId: 'yaLmSSsUAeI', duration: '17:20', category: 'strategies', level: 'intermediate' },
  { id: '13', title: 'Trading Psychology 101', description: 'Managing emotions, avoiding common psychological traps, and developing discipline.', youtubeId: 'N3NKqltRPME', duration: '14:15', category: 'psychology', level: 'beginner' },
  { id: '14', title: 'Risk Management Essentials', description: 'Position sizing, stop losses, and protecting your capital like professional traders.', youtubeId: 'sj9FlQ-55EY', duration: '16:30', category: 'psychology', level: 'beginner', featured: true },
  { id: '15', title: 'Building a Trading Plan', description: 'Step-by-step guide to creating a trading plan that matches your goals and lifestyle.', youtubeId: 'bVYzPsxmJXg', duration: '21:00', category: 'psychology', level: 'intermediate' },
];

const videoCategoryConfig = {
  basics: { icon: BookOpen, label: 'Basics', color: 'bg-primary/10 text-primary' },
  options: { icon: TrendingUp, label: 'Options', color: 'bg-chart-4/10 text-chart-4' },
  technical: { icon: Calculator, label: 'Technical Analysis', color: 'bg-chart-3/10 text-chart-3' },
  strategies: { icon: Play, label: 'Strategies', color: 'bg-gain/10 text-gain' },
  psychology: { icon: Shield, label: 'Psychology', color: 'bg-chart-5/10 text-chart-5' },
};

const levelColors = {
  beginner: 'bg-gain/10 text-gain border-gain/30',
  intermediate: 'bg-chart-4/10 text-chart-4 border-chart-4/30',
  advanced: 'bg-loss/10 text-loss border-loss/30',
};

// ==================== RESOURCES DATA ====================
interface Resource {
  name: string;
  description: string;
  url: string;
  tags: string[];
  recommended?: boolean;
}

const brokerResources: Resource[] = [
  { name: 'Charles Schwab / thinkorswim', description: 'Full-service broker with excellent research, $0 stock trades, and the powerful thinkorswim trading platform.', url: 'https://www.schwab.com', tags: ['Paper Trading', 'Options', 'Advanced'], recommended: true },
  { name: 'Fidelity', description: 'Top-rated broker with outstanding research tools, retirement accounts, and Active Trader Pro platform.', url: 'https://www.fidelity.com', tags: ['Research', 'Retirement', 'ETFs'], recommended: true },
  { name: 'Fidelity', description: 'Top-rated broker with outstanding research tools, retirement accounts, and Active Trader Pro platform.', url: 'https://www.fidelity.com', tags: ['Research', 'Retirement', 'ETFs'] },
  { name: 'Interactive Brokers', description: 'Best for active traders with low costs, global market access, and professional-grade tools.', url: 'https://www.interactivebrokers.com', tags: ['Low Cost', 'Global', 'Professional'] },
  { name: 'E*TRADE', description: 'User-friendly platform with Power E*TRADE for options traders and solid educational resources.', url: 'https://www.etrade.com', tags: ['Options', 'Mobile', 'Education'] },
  { name: 'Robinhood', description: 'Commission-free trading with a simple mobile-first interface. Great for beginners.', url: 'https://robinhood.com', tags: ['Free', 'Mobile', 'Beginner'] },
  { name: 'Webull', description: 'Zero-commission trading with extended hours, advanced charting, and paper trading features.', url: 'https://www.webull.com', tags: ['Free', 'Paper Trading', 'Extended Hours'] },
  { name: 'tastytrade', description: 'Options-focused platform with unique trade mechanics, low fees, and excellent options education.', url: 'https://www.tastytrade.com', tags: ['Options', 'Education', 'Low Fees'], recommended: true },
];

const educationalResources: Resource[] = [
  { name: 'Investopedia', description: 'The go-to resource for financial education. Comprehensive articles, tutorials, and a simulator.', url: 'https://www.investopedia.com', tags: ['Free', 'Comprehensive', 'Simulator'], recommended: true },
  { name: 'Options Industry Council (OIC)', description: 'Free options education from industry experts. Courses, webinars, and strategy guides.', url: 'https://www.optionseducation.org', tags: ['Options', 'Free', 'Official'], recommended: true },
  { name: 'CBOE Education', description: 'Learn options and volatility from the Chicago Board Options Exchange.', url: 'https://www.cboe.com/education', tags: ['Options', 'VIX', 'Official'] },
  { name: 'Khan Academy - Finance', description: 'Free, high-quality lessons on stocks, bonds, mutual funds, and personal finance.', url: 'https://www.khanacademy.org/economics-finance-domain', tags: ['Free', 'Video', 'Beginner'] },
  { name: 'Babypips', description: 'The ultimate forex education. Learn currency trading from scratch.', url: 'https://www.babypips.com', tags: ['Forex', 'Free', 'Structured'] },
  { name: 'CME Group Education', description: 'Learn futures and derivatives from the worlds leading derivatives marketplace.', url: 'https://www.cmegroup.com/education.html', tags: ['Futures', 'Commodities', 'Official'] },
];

const toolResources: Resource[] = [
  { name: 'TradingView', description: 'Professional charting platform with social features, screeners, and real-time data.', url: 'https://www.tradingview.com', tags: ['Charts', 'Screener', 'Social'], recommended: true },
  { name: 'Finviz', description: 'Powerful stock screener with visual market maps, news aggregation, and technical analysis.', url: 'https://finviz.com', tags: ['Screener', 'Free', 'Visual'], recommended: true },
  { name: 'Yahoo Finance', description: 'Free financial news, data, portfolio tracking, and basic screeners.', url: 'https://finance.yahoo.com', tags: ['Free', 'News', 'Portfolio'] },
  { name: 'Seeking Alpha', description: 'Crowdsourced investment research with analysis, news, and stock ratings.', url: 'https://seekingalpha.com', tags: ['Research', 'Analysis', 'Community'] },
  { name: 'StockCharts', description: 'Technical analysis tools, charting, and market commentary from ChartWatchers.', url: 'https://stockcharts.com', tags: ['Technical', 'Charts', 'Education'] },
  { name: 'Barchart', description: 'Market data, options flow, unusual activity screeners, and commodity data.', url: 'https://www.barchart.com', tags: ['Options Flow', 'Commodities', 'Data'] },
];

const newsResources: Resource[] = [
  { name: 'Bloomberg', description: 'Global financial news, data, and analysis. The gold standard for market news.', url: 'https://www.bloomberg.com', tags: ['News', 'Global', 'Premium'] },
  { name: 'CNBC', description: 'Real-time market news, analysis, and live TV coverage of financial markets.', url: 'https://www.cnbc.com', tags: ['News', 'Video', 'Free'] },
  { name: 'MarketWatch', description: 'Financial information and business news. Personal finance tools and market data.', url: 'https://www.marketwatch.com', tags: ['News', 'Free', 'Tools'] },
  { name: 'The Wall Street Journal', description: 'Premium financial journalism covering markets, business, and economic news.', url: 'https://www.wsj.com', tags: ['News', 'Premium', 'Quality'] },
  { name: 'Reuters', description: 'International news organization providing business and financial news.', url: 'https://www.reuters.com/business', tags: ['News', 'Global', 'Wire'] },
];

// ==================== COMPONENTS ====================

function LessonCard({ lesson, onClick }: { lesson: Lesson; onClick: () => void }) {
  return (
    <Card 
      className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg text-xl shrink-0',
            lesson.category?.icon ? 'bg-primary/10' : 'bg-muted'
          )}>
            {lesson.category?.icon || <BookOpen className="h-5 w-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">
              {lesson.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{lesson.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="outline" className={cn('text-xs', levelColors[lesson.difficulty])}>
            {lesson.difficulty}
          </Badge>
          {lesson.duration_minutes && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {lesson.duration_minutes} min
            </span>
          )}
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between mt-3 group-hover:bg-primary/10"
        >
          Start Lesson
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}

function VideoCard({ video, onPlay }: { video: Video; onPlay: (video: Video) => void }) {
  const config = videoCategoryConfig[video.category];

  return (
    <Card
      className={cn(
        'group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300 overflow-hidden',
        video.featured && 'ring-2 ring-primary/20'
      )}
      onClick={() => onPlay(video)}
    >
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          <img
            src={`https://img.youtube.com/vi/${video.youtubeId}/maxresdefault.jpg`}
            alt={video.title}
            className="object-cover w-full h-full"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`;
            }}
          />
        </AspectRatio>
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <PlayCircle className="h-16 w-16 text-white drop-shadow-lg" />
        </div>
        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
          <Clock className="h-3 w-3 mr-1" />
          {video.duration}
        </Badge>
        {video.featured && (
          <Badge className="absolute top-2 left-2 bg-chart-3 text-white gap-1">
            <Sparkles className="h-3 w-3" />
            Featured
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className={cn('text-xs', config.color)}>
            {config.label}
          </Badge>
          <Badge variant="outline" className={cn('text-xs capitalize', levelColors[video.level])}>
            {video.level}
          </Badge>
        </div>
        <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {video.description}
        </p>
      </CardContent>
    </Card>
  );
}

function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Card className="group hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base group-hover:text-primary transition-colors">
              {resource.name}
            </CardTitle>
            {resource.recommended && (
              <Badge className="bg-chart-3/20 text-chart-3 border-chart-3/30 gap-1">
                <Star className="h-3 w-3" fill="currentColor" />
                Recommended
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-sm mt-1">
          {resource.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 mt-auto">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {resource.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 group-hover:border-primary group-hover:text-primary"
          onClick={() => window.open(resource.url, '_blank', 'noopener,noreferrer')}
        >
          Visit Site
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function LessonCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex gap-3">
          <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

// ==================== MAIN COMPONENT ====================
type TabValue = 'lessons' | 'videos' | 'glossary' | 'resources' | 'kids';
type GlossaryCategory = GlossaryTerm['category'] | 'all';

export default function Learn() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabValue) || 'lessons';
  const [activeTab, setActiveTab] = useState<TabValue>(initialTab);
  
  // Lesson state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  
  // Video state
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [videoCategory, setVideoCategory] = useState('all');
  
  // Glossary state
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossaryCategory, setGlossaryCategory] = useState<GlossaryCategory>('all');
  
  // Resources state
  const [resourceTab, setResourceTab] = useState('brokers');

  // Fetch categories from DB
  const { data: categories = [] } = useQuery({
    queryKey: ['learn-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_categories')
        .select('*')
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return data as LessonCategory[];
    },
  });

  // Fetch lessons from DB
  const { data: lessons = [], isLoading: lessonsLoading } = useQuery({
    queryKey: ['learn-lessons'],
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

  // Update URL when tab changes
  useEffect(() => {
    if (activeTab !== 'lessons') {
      setSearchParams({ tab: activeTab });
    } else {
      setSearchParams({});
    }
  }, [activeTab, setSearchParams]);

  // Sync tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabValue;
    if (tabParam && ['lessons', 'videos', 'glossary', 'resources', 'kids'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Filter lessons by category (exclude kids lessons from main tab)
  const filteredLessons = useMemo(() => {
    // Always exclude kids lessons from main lessons tab
    const nonKidsLessons = lessons.filter(l => l.category?.slug !== 'kids');
    if (selectedCategory === 'all') return nonKidsLessons;
    return nonKidsLessons.filter(l => l.category_id === selectedCategory);
  }, [lessons, selectedCategory]);

  // Get kids lessons separately for the kids tab
  const kidsLessons = useMemo(() => {
    return lessons.filter(l => l.category?.slug === 'kids');
  }, [lessons]);

  // Group lessons by category for display
  const lessonsByCategory = useMemo(() => {
    const grouped = new Map<string, Lesson[]>();
    
    filteredLessons.forEach(lesson => {
      const catName = lesson.category?.name || 'Other';
      if (!grouped.has(catName)) {
        grouped.set(catName, []);
      }
      grouped.get(catName)!.push(lesson);
    });
    
    return grouped;
  }, [filteredLessons]);

  const filteredVideos = videoCategory === 'all' 
    ? videos 
    : videos.filter(v => v.category === videoCategory);

  const featuredVideos = videos.filter(v => v.featured);

  const filteredGlossaryTerms = useMemo(() => {
    return tradingGlossary.filter((term) => {
      const matchesSearch =
        term.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
        term.definition.toLowerCase().includes(glossarySearch.toLowerCase());
      const matchesCategory = glossaryCategory === 'all' || term.category === glossaryCategory;
      return matchesSearch && matchesCategory;
    });
  }, [glossarySearch, glossaryCategory]);

  const groupedGlossaryTerms = useMemo(() => {
    const groups: Record<string, GlossaryTerm[]> = {};
    filteredGlossaryTerms.forEach((term) => {
      const firstLetter = term.term[0].toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(term);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredGlossaryTerms]);

  const glossaryCategories: GlossaryCategory[] = ['all', 'basics', 'options', 'technical', 'fundamental', 'strategies', 'risk'];

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setViewerOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-chart-4 shadow-lg">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Learning Hub</h1>
            <p className="text-sm text-muted-foreground">
              Master trading with lessons, videos, and curated resources
            </p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="lessons" className="gap-1.5 px-2 sm:px-3">
              <BookOpen className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Lessons</span>
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-1.5 px-2 sm:px-3">
              <Play className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Videos</span>
            </TabsTrigger>
            <TabsTrigger value="glossary" className="gap-1.5 px-2 sm:px-3">
              <BookOpen className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Glossary</span>
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-1.5 px-2 sm:px-3">
              <Link2 className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Resources</span>
            </TabsTrigger>
            <TabsTrigger value="kids" className="gap-1.5 px-2 sm:px-3">
              <Sparkles className="h-4 w-4" />
              <span className="hidden xs:inline sm:inline">Kids</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== LESSONS TAB ==================== */}
          <TabsContent value="lessons" className="space-y-6">
            {/* Category Filter */}
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                >
                  All Categories
                </Button>
                {categories
                  .filter(cat => cat.slug !== 'kids') // Exclude kids from main category filter
                  .map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedCategory(cat.id)}
                      className="gap-1 whitespace-nowrap"
                    >
                      {cat.icon && <span>{cat.icon}</span>}
                      {cat.name}
                    </Button>
                  ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            {/* Interactive Learning Banner */}
            <Card className="bg-gradient-to-r from-chart-3/10 via-primary/10 to-gain/10 border-chart-3/30 overflow-hidden relative">
              <div className="absolute inset-0 bg-grid-white/5 pointer-events-none" />
              <CardContent className="flex flex-col sm:flex-row items-center justify-between p-5 gap-4 relative">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-chart-3/20 shrink-0">
                    <MousePointerClick className="h-6 w-6 text-chart-3" />
                  </div>
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      Interactive Learning Lab
                      <Badge className="bg-chart-3 text-white text-xs">NEW</Badge>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Hands-on modules: option chains, chart reading, trade wizards & more!
                    </p>
                  </div>
                </div>
                <Button className="shrink-0 gap-2" asChild>
                  <a href="/learn/interactive">
                    Start Learning
                    <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Progress Summary */}
            <Card className="bg-gradient-to-r from-primary/5 via-gain/5 to-chart-3/5 border-primary/20">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Your Progress</p>
                    <p className="text-xs text-muted-foreground">0 of {lessons.filter(l => l.category?.slug !== 'kids').length} lessons completed</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  <Rocket className="h-3 w-3 mr-1" />
                  {lessons.filter(l => l.category?.slug !== 'kids').length} lessons available
                </Badge>
              </CardContent>
            </Card>

            {/* Lessons Grid */}
            {lessonsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <LessonCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredLessons.length === 0 ? (
              <Card className="p-12 text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">No lessons found</h3>
                <p className="text-sm text-muted-foreground">
                  Try selecting a different category
                </p>
              </Card>
            ) : selectedCategory === 'all' ? (
              // Grouped by category
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
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          onClick={() => handleLessonClick(lesson)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Flat grid for single category
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLessons.map(lesson => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onClick={() => handleLessonClick(lesson)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ==================== VIDEOS TAB ==================== */}
          <TabsContent value="videos" className="space-y-6">
            {/* Video Player Modal */}
            {selectedVideo && (
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <AspectRatio ratio={16 / 9}>
                    <iframe
                      src={`https://www.youtube.com/embed/${selectedVideo.youtubeId}?autoplay=1`}
                      title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </AspectRatio>
                </CardContent>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>{selectedVideo.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {selectedVideo.description}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setSelectedVideo(null)}
                    >
                      Close
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Featured Videos */}
            {!selectedVideo && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-chart-3" />
                  Featured Videos
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {featuredVideos.map((video) => (
                    <VideoCard key={video.id} video={video} onPlay={setSelectedVideo} />
                  ))}
                </div>
              </div>
            )}

            {/* Category Filter */}
            <Tabs value={videoCategory} onValueChange={setVideoCategory} className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 lg:w-auto lg:inline-grid">
                <TabsTrigger value="all">All</TabsTrigger>
                {Object.entries(videoCategoryConfig).map(([key, config]) => (
                  <TabsTrigger key={key} value={key} className="gap-1.5">
                    <config.icon className="h-4 w-4 hidden sm:block" />
                    {config.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={videoCategory} className="mt-0">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVideos.map((video) => (
                    <VideoCard key={video.id} video={video} onPlay={setSelectedVideo} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ==================== GLOSSARY TAB ==================== */}
          <TabsContent value="glossary" className="space-y-6">
            {/* Glossary Search & Filters */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search terms..."
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {glossarySearch && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setGlossarySearch('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {glossaryCategories.map((category) => (
                  <Button
                    key={category}
                    variant={glossaryCategory === category ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setGlossaryCategory(category)}
                  >
                    {category === 'all' ? (
                      'All'
                    ) : (
                      <>
                        {categoryIcons[category]}
                        <span className="ml-1.5">{categoryLabels[category]}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Glossary Terms */}
            {filteredGlossaryTerms.length === 0 ? (
              <Card className="p-8 text-center">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="font-medium">No terms found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your search or filters
                </p>
              </Card>
            ) : (
              <ScrollArea className="h-[600px] pr-4">
                <Accordion type="multiple" className="space-y-2">
                  {groupedGlossaryTerms.map(([letter, terms]) => (
                    <div key={letter} className="space-y-2">
                      <h3 className="text-lg font-bold text-primary sticky top-0 bg-background py-2">
                        {letter}
                      </h3>
                      {terms.map((term) => (
                        <AccordionItem
                          key={term.term}
                          value={term.term}
                          className="border rounded-lg px-4"
                        >
                          <AccordionTrigger className="hover:no-underline py-3">
                            <div className="flex items-center gap-3 text-left">
                              <span className="text-xl">{categoryIcons[term.category]}</span>
                              <div>
                                <span className="font-semibold">{term.term}</span>
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs capitalize"
                                >
                                  {categoryLabels[term.category]}
                                </Badge>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="pt-0 pb-4">
                            <p className="text-muted-foreground mb-3">
                              {term.definition}
                            </p>
                            {term.relatedTerms && term.relatedTerms.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                <span className="text-sm text-muted-foreground">
                                  Related:
                                </span>
                                {term.relatedTerms.map((related) => (
                                  <Badge
                                    key={related}
                                    variant="outline"
                                    className="text-xs cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                                    onClick={() => setGlossarySearch(related)}
                                  >
                                    {related}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </div>
                  ))}
                </Accordion>
              </ScrollArea>
            )}
          </TabsContent>

          {/* ==================== RESOURCES TAB ==================== */}
          <TabsContent value="resources" className="space-y-6">
            {/* Quinn Tip */}
            <Card className="bg-gradient-to-r from-primary/5 via-chart-3/5 to-primary/5 border-primary/20">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chart-3/20">
                  <Sparkles className="h-5 w-5 text-chart-3" />
                </div>
                <div>
                  <p className="font-medium text-sm">Quinn's Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    I recommend using your broker's paper trading platform (like thinkorswim) for realistic simulation. 
                    These are the same tools you'll use for real trades!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Resource Tabs */}
            <Tabs value={resourceTab} onValueChange={setResourceTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
                <TabsTrigger value="brokers" className="gap-2">
                  <Building2 className="h-4 w-4 hidden sm:block" />
                  Brokers
                </TabsTrigger>
                <TabsTrigger value="education" className="gap-2">
                  <GraduationCap className="h-4 w-4 hidden sm:block" />
                  Education
                </TabsTrigger>
                <TabsTrigger value="tools" className="gap-2">
                  <LineChart className="h-4 w-4 hidden sm:block" />
                  Tools
                </TabsTrigger>
                <TabsTrigger value="news" className="gap-2">
                  <FileText className="h-4 w-4 hidden sm:block" />
                  News
                </TabsTrigger>
              </TabsList>

              <TabsContent value="brokers" className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <p className="text-sm">All brokers listed are regulated and SIPC insured</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {brokerResources.map((resource) => (
                    <ResourceCard key={resource.name} resource={resource} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="education" className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <p className="text-sm">Free and premium resources to level up your trading knowledge</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {educationalResources.map((resource) => (
                    <ResourceCard key={resource.name} resource={resource} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="tools" className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <LineChart className="h-4 w-4" />
                  <p className="text-sm">Charts, screeners, and analysis tools used by professional traders</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {toolResources.map((resource) => (
                    <ResourceCard key={resource.name} resource={resource} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="news" className="space-y-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <p className="text-sm">Stay informed with trusted financial news sources</p>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newsResources.map((resource) => (
                    <ResourceCard key={resource.name} resource={resource} />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ==================== KIDS TAB ==================== */}
          <TabsContent value="kids" className="space-y-6">
            {/* Header */}
            <Card className="bg-gradient-to-r from-chart-3/10 via-primary/10 to-gain/10 border-chart-3/30">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-chart-3/20 mb-3">
                  <Sparkles className="h-7 w-7 text-chart-3" />
                </div>
                <h2 className="text-xl font-bold mb-1">Kid Learning Zone 🚀</h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  Fun, interactive lessons designed for young investors! Learn about money, saving, 
                  and investing through games and stories.
                </p>
              </CardContent>
            </Card>

            {/* Kids Lessons Grid */}
            {lessonsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <LessonCardSkeleton key={i} />
                ))}
              </div>
            ) : kidsLessons.length === 0 ? (
              <Card className="p-12 text-center">
                <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-semibold mb-2">No kid lessons yet</h3>
                <p className="text-sm text-muted-foreground">
                  Kid-friendly lessons are coming soon!
                </p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {kidsLessons.map(lesson => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onClick={() => handleLessonClick(lesson)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Lesson Viewer Modal */}
      <StrategyViewer
        lesson={selectedLesson}
        open={viewerOpen}
        onOpenChange={setViewerOpen}
      />
    </DashboardLayout>
  );
}
