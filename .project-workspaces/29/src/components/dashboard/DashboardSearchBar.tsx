import { Search, Sparkles } from 'lucide-react';

interface DashboardSearchBarProps {
  onOpenSearch: () => void;
}

export function DashboardSearchBar({ onOpenSearch }: DashboardSearchBarProps) {
  return (
    <div 
      className="relative cursor-pointer group"
      onClick={onOpenSearch}
    >
      <div className="relative flex items-center justify-center">
        <Search className="absolute left-4 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors z-10" />
        <div 
          className="w-full h-12 pl-11 pr-20 rounded-full border-2 border-primary/30 bg-card/60 backdrop-blur-sm shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)] flex items-center text-muted-foreground text-sm group-hover:border-primary/50 group-hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.4)] transition-all cursor-pointer"
        >
          Search pages, lessons, glossary...
        </div>
        <div className="absolute right-4 flex items-center gap-1.5 z-10">
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded-md border border-border/50 bg-muted/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
          <div className="flex items-center gap-1 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
