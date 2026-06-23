import { useState, useRef, useEffect } from 'react';
import { useSymbolSearch, SymbolResult } from '@/hooks/useSymbolSearch';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, TrendingUp, DollarSign, Bitcoin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SymbolSearchInputProps {
  value: string;
  onChange: (symbol: string, result?: SymbolResult) => void;
  assetClassFilter?: string;
  placeholder?: string;
  className?: string;
}

const assetClassIcons: Record<string, typeof TrendingUp> = {
  equity: TrendingUp,
  forex: DollarSign,
  crypto: Bitcoin,
  options: TrendingUp,
};

const assetClassColors: Record<string, string> = {
  equity: 'bg-primary/10 text-primary border-primary/30',
  forex: 'bg-chart-2/10 text-chart-2 border-chart-2/30',
  crypto: 'bg-chart-4/10 text-chart-4 border-chart-4/30',
  options: 'bg-chart-5/10 text-chart-5 border-chart-5/30',
};

export function SymbolSearchInput({
  value,
  onChange,
  assetClassFilter = 'all',
  placeholder = 'Search stocks, forex, crypto...',
  className,
}: SymbolSearchInputProps) {
  const { results, isSearching, search, clearResults } = useSymbolSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (val: string) => {
    const upper = val.toUpperCase();
    setInputValue(upper);
    // Don't call onChange on every keystroke - only trigger search dropdown
    if (upper.length >= 1) {
      search(upper, assetClassFilter);
      setIsOpen(true);
    } else {
      onChange('');
      clearResults();
      setIsOpen(false);
    }
  };

  // When user stops typing and presses Enter or blurs, commit the value
  const handleBlur = () => {
    // Small delay to allow click on dropdown item
    setTimeout(() => {
      if (inputValue && inputValue !== value) {
        onChange(inputValue);
      }
    }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue) {
        onChange(inputValue);
        setIsOpen(false);
        clearResults();
      }
    }
  };

  const handleSelect = (result: SymbolResult) => {
    setInputValue(result.symbol);
    onChange(result.symbol, result);
    setIsOpen(false);
    clearResults();
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="pl-9 pr-8"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg max-h-64 overflow-y-auto">
          {results.map((result, i) => {
            const Icon = assetClassIcons[result.asset_class] || TrendingUp;
            return (
              <button
                key={`${result.symbol}-${i}`}
                type="button"
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent text-left transition-colors"
                onClick={() => handleSelect(result)}
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{result.symbol}</span>
                    <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', assetClassColors[result.asset_class])}>
                      {result.asset_class}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{result.name} • {result.exchange}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
