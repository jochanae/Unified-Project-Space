import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KnowledgeSkillLevel } from '@/features/knowledge/types';

interface FilterBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  activeLevel: KnowledgeSkillLevel | 'all';
  onLevelChange: (l: KnowledgeSkillLevel | 'all') => void;
  topics: string[];
  activeTopic: string | null;
  onTopicChange: (t: string | null) => void;
}

const LEVELS = [
  { key: 'all', label: 'All levels' },
  { key: 'beginner', label: 'Foundation' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Mastery' },
] as const;

export function FilterBar({
  query,
  onQueryChange,
  activeLevel,
  onLevelChange,
  topics,
  activeTopic,
  onTopicChange,
}: FilterBarProps) {
  return (
    <>
      <div className="mt-5 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search strategies, topics, keywords…"
          className="pl-9 pr-10"
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {LEVELS.map((item) => (
          <button
            key={item.key}
            onClick={() => onLevelChange(item.key as KnowledgeSkillLevel | 'all')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs transition-colors',
              activeLevel === item.key
                ? 'border-gold/40 bg-gold/10 text-gold'
                : 'border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {topics.length > 0 && (
        <div className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            <button
              onClick={() => onTopicChange(null)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition-colors whitespace-nowrap',
                !activeTopic
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground'
              )}
            >
              All topics
            </button>
            {topics.map((topic) => (
              <button
                key={topic}
                onClick={() => onTopicChange(topic)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs transition-colors whitespace-nowrap',
                  activeTopic === topic
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border/30 bg-muted/20 text-muted-foreground hover:text-foreground'
                )}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
