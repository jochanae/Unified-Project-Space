import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Play,
  Clock,
  BookOpen,
  TrendingUp,
  Calculator,
  Shield,
  Sparkles,
  ExternalLink,
  PlayCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  // Basics
  {
    id: '1',
    title: 'Stock Market Basics for Beginners',
    description: 'Learn the fundamentals of how the stock market works, including exchanges, orders, and key terminology.',
    youtubeId: 'p7HKvqRI_Bo',
    duration: '12:34',
    category: 'basics',
    level: 'beginner',
    featured: true,
  },
  {
    id: '2',
    title: 'How to Read Stock Charts',
    description: 'Understanding candlestick charts, price action, and basic chart patterns every trader should know.',
    youtubeId: 'tV3XhM5YPDk',
    duration: '15:22',
    category: 'basics',
    level: 'beginner',
  },
  {
    id: '3',
    title: 'ETFs vs Mutual Funds Explained',
    description: 'The key differences between ETFs and mutual funds, and which might be right for your portfolio.',
    youtubeId: 'OwpFBi_jEHI',
    duration: '8:45',
    category: 'basics',
    level: 'beginner',
  },

  // Options
  {
    id: '4',
    title: 'Options Trading for Beginners',
    description: 'Introduction to calls and puts, how options work, and basic terminology you need to know.',
    youtubeId: '7PM4rNDr4oI',
    duration: '18:30',
    category: 'options',
    level: 'beginner',
    featured: true,
  },
  {
    id: '5',
    title: 'Understanding the Greeks',
    description: 'Deep dive into Delta, Gamma, Theta, Vega, and how they affect your options positions.',
    youtubeId: 'kCJcEOYuuII',
    duration: '22:15',
    category: 'options',
    level: 'intermediate',
  },
  {
    id: '6',
    title: 'Covered Calls Strategy',
    description: 'How to generate income from stocks you already own using covered calls.',
    youtubeId: 'jnTsQBJHMSk',
    duration: '14:50',
    category: 'options',
    level: 'intermediate',
  },

  // Technical Analysis
  {
    id: '7',
    title: 'Support and Resistance Trading',
    description: 'How to identify and trade key support and resistance levels like a professional.',
    youtubeId: 'ZQL_RO-SELU',
    duration: '16:40',
    category: 'technical',
    level: 'beginner',
  },
  {
    id: '8',
    title: 'Moving Averages Explained',
    description: 'Using SMA, EMA, and moving average crossovers to identify trends and entry points.',
    youtubeId: 'YHHO6E6Y5l4',
    duration: '13:25',
    category: 'technical',
    level: 'beginner',
  },
  {
    id: '9',
    title: 'RSI and MACD Indicators',
    description: 'Mastering momentum indicators to time your entries and exits more effectively.',
    youtubeId: 'lBnVMxffI9M',
    duration: '19:10',
    category: 'technical',
    level: 'intermediate',
  },

  // Strategies
  {
    id: '10',
    title: 'The Wheel Strategy Explained',
    description: 'A complete guide to generating consistent income with the wheel options strategy.',
    youtubeId: 'siFsIleNTzk',
    duration: '25:30',
    category: 'strategies',
    level: 'intermediate',
    featured: true,
  },
  {
    id: '11',
    title: 'Iron Condor Strategy',
    description: 'How to profit in sideways markets using iron condors for consistent income.',
    youtubeId: '1SVswX5V5XU',
    duration: '20:45',
    category: 'strategies',
    level: 'advanced',
  },
  {
    id: '12',
    title: 'Swing Trading Basics',
    description: 'Learn to capture gains in stocks over days to weeks with swing trading strategies.',
    youtubeId: 'yaLmSSsUAeI',
    duration: '17:20',
    category: 'strategies',
    level: 'intermediate',
  },

  // Psychology
  {
    id: '13',
    title: 'Trading Psychology 101',
    description: 'Managing emotions, avoiding common psychological traps, and developing discipline.',
    youtubeId: 'N3NKqltRPME',
    duration: '14:15',
    category: 'psychology',
    level: 'beginner',
  },
  {
    id: '14',
    title: 'Risk Management Essentials',
    description: 'Position sizing, stop losses, and protecting your capital like professional traders.',
    youtubeId: 'sj9FlQ-55EY',
    duration: '16:30',
    category: 'psychology',
    level: 'beginner',
    featured: true,
  },
  {
    id: '15',
    title: 'Building a Trading Plan',
    description: 'Step-by-step guide to creating a trading plan that matches your goals and lifestyle.',
    youtubeId: 'bVYzPsxmJXg',
    duration: '21:00',
    category: 'psychology',
    level: 'intermediate',
  },
];

const categoryConfig = {
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

function VideoCard({ video, onPlay }: { video: Video; onPlay: (video: Video) => void }) {
  const config = categoryConfig[video.category];

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

export default function Videos() {
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  const filteredVideos = activeTab === 'all' 
    ? videos 
    : videos.filter(v => v.category === activeTab);

  const featuredVideos = videos.filter(v => v.featured);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-loss to-chart-5 shadow-lg">
            <Play className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Video Library</h1>
            <p className="text-sm text-muted-foreground">
              Curated financial education videos to accelerate your learning
            </p>
          </div>
        </div>

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
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className={categoryConfig[selectedVideo.category].color}>
                  {categoryConfig[selectedVideo.category].label}
                </Badge>
                <Badge variant="outline" className={levelColors[selectedVideo.level]}>
                  {selectedVideo.level}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto gap-1"
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${selectedVideo.youtubeId}`, '_blank')}
                >
                  Open on YouTube
                  <ExternalLink className="h-3.5 w-3.5" />
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

        {/* All Videos */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 lg:w-auto lg:inline-grid">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="basics">Basics</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="psychology">Psychology</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} onPlay={setSelectedVideo} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Note about videos */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Videos are curated from top educational creators on YouTube. 
              We'll be adding original IntoIQ content soon!
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
