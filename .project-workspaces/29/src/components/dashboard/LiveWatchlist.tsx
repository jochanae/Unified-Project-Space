import { useState, useEffect } from 'react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useMarketData, StockQuote, popularSymbols } from '@/hooks/useMarketData';
import { TrendingUp, TrendingDown, Plus, X, RefreshCw, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_WATCHLIST = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA'];

export function LiveWatchlist() {
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    const saved = localStorage.getItem('user-watchlist');
    return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
  });
  const [quotes, setQuotes] = useState<Map<string, StockQuote>>(new Map());
  const [newSymbol, setNewSymbol] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { fetchMultipleQuotes, loading } = useMarketData();

  // Save watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('user-watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Fetch quotes on mount and every 60 seconds
  useEffect(() => {
    const fetchQuotes = async () => {
      if (watchlist.length === 0) return;
      const results = await fetchMultipleQuotes(watchlist);
      setQuotes(results);
    };

    fetchQuotes();
    const interval = setInterval(fetchQuotes, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [watchlist, fetchMultipleQuotes]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const results = await fetchMultipleQuotes(watchlist);
    setQuotes(results);
    setIsRefreshing(false);
  };

  const addSymbol = (symbol: string) => {
    const upper = symbol.toUpperCase().trim();
    if (upper && !watchlist.includes(upper)) {
      setWatchlist([...watchlist, upper]);
    }
    setNewSymbol('');
    setIsDialogOpen(false);
  };

  const removeSymbol = (symbol: string) => {
    setWatchlist(watchlist.filter((s) => s !== symbol));
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    });
  };

  const formatChange = (change: number, percent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)} (${sign}${percent.toFixed(2)}%)`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`;
    }
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`;
    }
    return volume.toString();
  };

  const headerActions = (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={isRefreshing || loading}
        className="h-8 w-8"
      >
        <RefreshCw
          className={cn('h-4 w-4', (isRefreshing || loading) && 'animate-spin')}
        />
      </Button>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Symbol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter symbol (e.g., AAPL)"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && addSymbol(newSymbol)}
                className="flex-1"
              />
              <Button onClick={() => addSymbol(newSymbol)} disabled={!newSymbol}>
                Add
              </Button>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Popular symbols:</p>
              <div className="flex flex-wrap gap-2">
                {popularSymbols
                  .filter((s) => !watchlist.includes(s.symbol))
                  .slice(0, 6)
                  .map((s) => (
                    <Badge
                      key={s.symbol}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/10 transition-colors"
                      onClick={() => addSymbol(s.symbol)}
                    >
                      {s.symbol}
                    </Badge>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <CollapsibleCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>Watchlist</span>
          {headerActions}
        </div>
      }
      description="Track your favorite symbols"
      icon={<Activity className="h-5 w-5 text-primary" />}
      storageKey="dashboard-watchlist"
    >
      <div className="space-y-2">
        {watchlist.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No symbols in watchlist</p>
            <Button
              variant="link"
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="mt-1"
            >
              Add your first symbol
            </Button>
          </div>
        ) : (
          watchlist.map((symbol) => {
            const quote = quotes.get(symbol);
            const isLoading = loading && !quote;

            return (
              <div
                key={symbol}
                className="group flex items-center justify-between p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
                      quote?.change && quote.change >= 0
                        ? 'bg-gain/10'
                        : quote?.change && quote.change < 0
                        ? 'bg-loss/10'
                        : 'bg-muted'
                    )}
                  >
                    {quote?.change !== undefined ? (
                      quote.change >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-gain" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-loss" />
                      )
                    ) : (
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{symbol}</p>
                    {isLoading ? (
                      <Skeleton className="h-3 w-16 mt-1" />
                    ) : quote ? (
                      <p className="text-xs text-muted-foreground">
                        Vol: {formatVolume(quote.volume)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Loading...</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    {isLoading ? (
                      <>
                        <Skeleton className="h-4 w-16 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </>
                    ) : quote ? (
                      <>
                        <p className="font-semibold text-sm">{formatPrice(quote.price)}</p>
                        <p
                          className={cn(
                            'text-xs font-medium',
                            quote.change >= 0 ? 'text-gain' : 'text-loss'
                          )}
                        >
                          {formatChange(quote.change, quote.changePercent)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSymbol(symbol)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })
        )}

        {quotes.size > 0 && (
          <p className="text-[10px] text-muted-foreground text-center pt-2">
            Data refreshes every minute • Delayed quotes
          </p>
        )}
      </div>
    </CollapsibleCard>
  );
}
