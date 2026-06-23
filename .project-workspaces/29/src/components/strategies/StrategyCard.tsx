import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Target, 
  Shield, 
  Zap,
  Clock,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Lesson } from '@/hooks/useCMS';

interface StrategyCardProps {
  lesson: Lesson;
  onClick?: () => void;
  showPayoff?: boolean;
}

const difficultyConfig = {
  beginner: { label: 'Beginner', color: 'bg-gain/10 text-gain border-gain/30', icon: Target },
  intermediate: { label: 'Intermediate', color: 'bg-chart-4/10 text-chart-4 border-chart-4/30', icon: BarChart3 },
  advanced: { label: 'Advanced', color: 'bg-loss/10 text-loss border-loss/30', icon: Zap },
};

const strategyTypeIcons: Record<string, typeof TrendingUp> = {
  'bullish': TrendingUp,
  'bearish': TrendingDown,
  'neutral': BarChart3,
  'income': Shield,
  'volatility': Zap,
};

function getStrategyType(slug: string): string {
  if (['covered-calls', 'cash-secured-puts', 'wheel-strategy', 'credit-spreads', 'iron-condors', 'iron-butterflies', 'calendar-spreads'].includes(slug)) {
    return 'income';
  }
  if (['bull-call-spread', 'protective-puts', 'gap-and-go', 'breakout-trading', 'pullback-strategy'].includes(slug)) {
    return 'bullish';
  }
  if (['bear-put-spread', 'fade-the-gap'].includes(slug)) {
    return 'bearish';
  }
  if (['straddles-strangles', 'momentum-trading'].includes(slug)) {
    return 'volatility';
  }
  return 'neutral';
}

export function StrategyCard({ lesson, onClick, showPayoff = true }: StrategyCardProps) {
  const difficulty = difficultyConfig[lesson.difficulty];
  const strategyType = getStrategyType(lesson.slug);
  const TypeIcon = strategyTypeIcons[strategyType] || Target;

  return (
    <Card 
      className={cn(
        "group cursor-pointer hover:shadow-lg hover:border-primary/30 transition-all duration-300 h-full flex flex-col",
        "relative overflow-hidden"
      )}
      onClick={onClick}
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full" />
      
      <CardHeader className="pb-3 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              difficulty.color
            )}>
              <TypeIcon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base group-hover:text-primary transition-colors line-clamp-1">
                {lesson.title}
              </CardTitle>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm mt-2 line-clamp-2">
          {lesson.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 mt-auto space-y-4">
        {/* Key takeaways preview */}
        {lesson.key_takeaways && lesson.key_takeaways.length > 0 && (
          <div className="space-y-1">
            {lesson.key_takeaways.slice(0, 2).map((takeaway, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="text-primary mt-0.5">•</span>
                <span className="line-clamp-1">{takeaway}</span>
              </div>
            ))}
            {lesson.key_takeaways.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{lesson.key_takeaways.length - 2} more
              </span>
            )}
          </div>
        )}
        
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn('text-xs', difficulty.color)}>
            {difficulty.label}
          </Badge>
          {lesson.duration_minutes && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Clock className="h-3 w-3" />
              {lesson.duration_minutes} min
            </Badge>
          )}
        </div>
        
        {/* CTA */}
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-between group-hover:bg-primary/10"
        >
          Learn Strategy
          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}
