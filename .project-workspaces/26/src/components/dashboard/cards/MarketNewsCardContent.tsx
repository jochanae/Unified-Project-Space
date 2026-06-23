import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, RefreshCw, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

// Placeholder feed — wired for future news API. Indexes/ETFs scope only.
const getSampleNews = (): NewsItem[] => [
  { id: "1", title: "Fed signals patience on rate cuts as inflation concerns persist", source: "Reuters", time: "2h ago", sentiment: "bearish", category: "Macro" },
  { id: "2", title: "QQQ rallies as megacap AI earnings beat expectations", source: "Bloomberg", time: "3h ago", sentiment: "bullish", category: "Tech" },
  { id: "3", title: "Oil prices stabilize amid Middle East tensions", source: "CNBC", time: "4h ago", sentiment: "neutral", category: "Commodities" },
  { id: "4", title: "Retail sales data shows consumer spending remains resilient", source: "WSJ", time: "5h ago", sentiment: "bullish", category: "Economic" },
  { id: "5", title: "Treasury yields climb on hot jobs report", source: "MarketWatch", time: "6h ago", sentiment: "bearish", category: "Bonds" },
  { id: "6", title: "SPY hits fresh all-time high on broad earnings strength", source: "Yahoo Finance", time: "7h ago", sentiment: "bullish", category: "Markets" },
];

const sentimentConfig = {
  bullish: { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  bearish: { icon: TrendingDown, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-rose-500/20" },
  neutral: { icon: Minus, color: "text-muted-foreground", bg: "bg-muted/40", border: "border-border" },
};

export const MarketNewsCardContent = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setNews(getSampleNews());
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setNews(getSampleNews());
      setIsRefreshing(false);
    }, 700);
  };

  const summary = news.reduce(
    (acc, n) => { acc[n.sentiment]++; return acc; },
    { bullish: 0, bearish: 0, neutral: 0 },
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Headlines Bloom factors in</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
          className="h-7 w-7"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Sentiment:</span>
            <span className="flex items-center gap-1 text-emerald-500">
              <TrendingUp className="h-3 w-3" />{summary.bullish}
            </span>
            <span className="flex items-center gap-1 text-rose-500">
              <TrendingDown className="h-3 w-3" />{summary.bearish}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Minus className="h-3 w-3" />{summary.neutral}
            </span>
          </div>

          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {news.map((item) => {
              const cfg = sentimentConfig[item.sentiment];
              const Icon = cfg.icon;
              return (
                <div
                  key={item.id}
                  className={cn("p-2 rounded-md border", cfg.bg, cfg.border)}
                >
                  <div className="flex items-start gap-2">
                    <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", cfg.color)} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-snug line-clamp-2">{item.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {item.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />{item.time}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{item.source}</span>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] text-primary flex items-center gap-0.5">
                            Open <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-muted-foreground text-center pt-1">
            Placeholder feed • {news.length} stories
          </p>
        </>
      )}
    </div>
  );
};
