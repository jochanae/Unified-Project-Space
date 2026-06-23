import { useState, useEffect } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, ExternalLink, RefreshCw, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: "bullish" | "bearish" | "neutral";
  category: string;
  url?: string;
}

// Sample news data - in production, this would come from a news API
const getSampleNews = (): NewsItem[] => {
  const now = new Date();
  return [
    {
      id: "1",
      title: "Fed signals patience on rate cuts as inflation concerns persist",
      source: "Reuters",
      time: "2h ago",
      sentiment: "bearish",
      category: "Macro",
    },
    {
      id: "2",
      title: "Tech stocks rally as AI earnings beat expectations",
      source: "Bloomberg",
      time: "3h ago",
      sentiment: "bullish",
      category: "Tech",
    },
    {
      id: "3",
      title: "Oil prices stabilize amid Middle East tensions",
      source: "CNBC",
      time: "4h ago",
      sentiment: "neutral",
      category: "Commodities",
    },
    {
      id: "4",
      title: "Retail sales data shows consumer spending remains strong",
      source: "WSJ",
      time: "5h ago",
      sentiment: "bullish",
      category: "Economic",
    },
    {
      id: "5",
      title: "Treasury yields climb on hot jobs report",
      source: "MarketWatch",
      time: "6h ago",
      sentiment: "bearish",
      category: "Bonds",
    },
    {
      id: "6",
      title: "S&P 500 hits new all-time high on strong earnings",
      source: "Yahoo Finance",
      time: "7h ago",
      sentiment: "bullish",
      category: "Markets",
    },
  ];
};

const sentimentConfig = {
  bullish: {
    icon: TrendingUp,
    color: "text-gain",
    bg: "bg-gain/10",
    border: "border-gain/20",
  },
  bearish: {
    icon: TrendingDown,
    color: "text-loss",
    bg: "bg-loss/10",
    border: "border-loss/20",
  },
  neutral: {
    icon: Minus,
    color: "text-muted-foreground",
    bg: "bg-muted",
    border: "border-border",
  },
};

export function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setNews(getSampleNews());
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNews(getSampleNews());
      setIsRefreshing(false);
    }, 1000);
  };

  const sentimentSummary = news.reduce(
    (acc, item) => {
      acc[item.sentiment]++;
      return acc;
    },
    { bullish: 0, bearish: 0, neutral: 0 }
  );

  const headerActions = (
    <div onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={isRefreshing || isLoading}
        className="h-8 w-8"
      >
        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      </Button>
    </div>
  );

  return (
    <CollapsibleCard
      defaultOpen={false}
      title={
        <div className="flex items-center justify-between w-full">
          <span>Market News</span>
          {headerActions}
        </div>
      }
      description="Real-time sentiment & headlines"
      icon={<Newspaper className="h-5 w-5 text-primary" />}
      storageKey="dashboard-market-news"
    >
      <div>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Sentiment Summary */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border/50">
              <span className="text-xs text-muted-foreground">Sentiment:</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-gain">
                  <TrendingUp className="h-3 w-3" />
                  {sentimentSummary.bullish}
                </span>
                <span className="flex items-center gap-1 text-xs text-loss">
                  <TrendingDown className="h-3 w-3" />
                  {sentimentSummary.bearish}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Minus className="h-3 w-3" />
                  {sentimentSummary.neutral}
                </span>
              </div>
            </div>

            {/* News List */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {news.map((item) => {
                const config = sentimentConfig[item.sentiment];
                const Icon = config.icon;
                
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/30",
                      config.bg,
                      config.border
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight line-clamp-2">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {item.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.time}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.source}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-3 pt-3 border-t border-border/50 text-center">
              <p className="text-xs text-muted-foreground">
                Updated in real-time • {news.length} stories
              </p>
            </div>
          </>
        )}
      </div>
    </CollapsibleCard>
  );
}
