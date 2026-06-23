import { Badge } from '@/components/ui/badge';
import { BookOpen, Target, Zap, ChevronRight, Clock, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KnowledgeItem, KnowledgeSkillLevel } from '@/features/knowledge/types';

const LEVEL_STYLES: Record<KnowledgeSkillLevel, string> = {
  beginner: 'text-green-400 bg-green-500/10 border-green-500/20',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advanced: 'text-primary bg-primary/10 border-primary/20',
};

const CATEGORY_ICONS = {
  topic: BookOpen,
  goal: Target,
  feature: Zap,
} as const;

interface BentoCardProps {
  article: KnowledgeItem;
  isLarge: boolean;
  onClick: () => void;
}

export function BentoCard({ article, isLarge, onClick }: BentoCardProps) {
  const Icon = CATEGORY_ICONS[article.category];
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative text-left rounded-2xl p-4 sm:p-5 transition-all',
        'bg-background/60 backdrop-blur-md',
        'border border-gold/15 hover:border-gold/40',
        'hover:shadow-[0_0_40px_-15px_hsl(var(--primary)/0.5)]',
        isLarge && 'sm:col-span-2 lg:row-span-2'
      )}
    >
      {article.is_featured && (
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] text-gold">
          <Star className="h-2.5 w-2.5 fill-current" />
          Featured
        </span>
      )}
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-lg border p-1.5',
          article.category === 'goal'
            ? 'border-primary/30 bg-primary/10 text-primary'
            : article.category === 'feature'
              ? 'border-gold/30 bg-gold/10 text-gold'
              : 'border-border/40 bg-muted/30 text-muted-foreground'
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      <h3
        className={cn(
          'mt-3 font-medium text-foreground tracking-tight',
          isLarge ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'
        )}
      >
        {article.title}
      </h3>
      {article.subtitle && (
        <p
          className={cn(
            'mt-1.5 text-xs sm:text-sm text-muted-foreground',
            isLarge ? 'line-clamp-4' : 'line-clamp-2'
          )}
        >
          {article.subtitle}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-[10px] border border-border/30 bg-muted/30">
          {article.topic}
        </Badge>
        <Badge className={cn('border text-[10px] capitalize', LEVEL_STYLES[article.skill_level])}>
          {article.skill_level}
        </Badge>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          {article.read_minutes}m
        </span>
        <span className="ml-auto inline-flex items-center justify-center h-6 w-6 rounded-full border border-primary/30 bg-primary/10 text-primary animate-pulse drop-shadow-[0_0_8px_hsl(var(--primary)/0.6)] group-hover:border-primary/60 group-hover:bg-primary/20 transition-all">
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}
