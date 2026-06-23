import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Search, Clock, Zap, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DIFFICULTY_FILTERS = [
  { value: 'all', label: 'All Levels' },
  { value: 'beginner', label: 'Beginner', color: 'text-gain' },
  { value: 'intermediate', label: 'Intermediate', color: 'text-chart-4' },
  { value: 'advanced', label: 'Advanced', color: 'text-loss' },
];

export const EXPIRATION_FILTERS = [
  { value: 'all', label: 'All Timeframes', icon: Calendar },
  { value: '0dte', label: '0DTE', icon: Zap, description: 'Same-day expiration' },
  { value: 'weekly', label: 'Weekly', icon: Clock, description: '1-7 days to expiration' },
  { value: 'monthly', label: 'Monthly', icon: TrendingUp, description: '30+ days to expiration' },
];

interface StrategyFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedDifficulty: string;
  onDifficultyChange: (value: string) => void;
  selectedExpiration: string;
  onExpirationChange: (value: string) => void;
}

export function StrategyFilters({
  searchQuery,
  onSearchChange,
  selectedDifficulty,
  onDifficultyChange,
  selectedExpiration,
  onExpirationChange,
}: StrategyFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Search and Difficulty */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search strategies..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {DIFFICULTY_FILTERS.map(filter => (
            <Button
              key={filter.value}
              variant={selectedDifficulty === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => onDifficultyChange(filter.value)}
              className={cn(
                'shrink-0',
                selectedDifficulty !== filter.value && filter.color
              )}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Expiration Style Filter */}
      <ScrollArea className="w-full">
        <div className="flex gap-2 pb-2">
          {EXPIRATION_FILTERS.map(filter => {
            const Icon = filter.icon;
            const isActive = selectedExpiration === filter.value;
            return (
              <Button
                key={filter.value}
                variant={isActive ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onExpirationChange(filter.value)}
                className={cn(
                  'shrink-0 gap-2',
                  isActive && 'bg-primary/10 border-primary/30 text-primary'
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
                {filter.value === '0dte' && (
                  <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-chart-4/10 text-chart-4 border-chart-4/30">
                    High Risk
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
