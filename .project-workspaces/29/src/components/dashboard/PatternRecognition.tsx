import { useMemo } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTrades } from "@/hooks/useTrades";
import { Brain, TrendingUp, TrendingDown, Clock, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Pattern {
  name: string;
  winRate: number;
  totalTrades: number;
  avgProfit: number;
  icon: React.ReactNode;
}

export function PatternRecognition() {
  const { trades } = useTrades();

  const analysis = useMemo(() => {
    const closedTrades = trades.filter((t) => t.status === "closed" && t.profit_loss !== null);
    
    if (closedTrades.length < 3) {
      return null;
    }

    // Analyze by trade type (long vs short)
    const longs = closedTrades.filter((t) => t.trade_type === "long");
    const shorts = closedTrades.filter((t) => t.trade_type === "short");

    // Analyze by day of week
    const dayPerformance: Record<string, { wins: number; total: number; pnl: number }> = {};
    closedTrades.forEach((trade) => {
      const day = new Date(trade.entry_date).toLocaleDateString("en-US", { weekday: "long" });
      if (!dayPerformance[day]) {
        dayPerformance[day] = { wins: 0, total: 0, pnl: 0 };
      }
      dayPerformance[day].total++;
      dayPerformance[day].pnl += trade.profit_loss || 0;
      if ((trade.profit_loss || 0) > 0) {
        dayPerformance[day].wins++;
      }
    });

    // Analyze by symbol
    const symbolPerformance: Record<string, { wins: number; total: number; pnl: number }> = {};
    closedTrades.forEach((trade) => {
      if (!symbolPerformance[trade.symbol]) {
        symbolPerformance[trade.symbol] = { wins: 0, total: 0, pnl: 0 };
      }
      symbolPerformance[trade.symbol].total++;
      symbolPerformance[trade.symbol].pnl += trade.profit_loss || 0;
      if ((trade.profit_loss || 0) > 0) {
        symbolPerformance[trade.symbol].wins++;
      }
    });

    // Find best day
    const bestDay = Object.entries(dayPerformance)
      .filter(([, data]) => data.total >= 2)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0];

    // Find best symbol
    const bestSymbol = Object.entries(symbolPerformance)
      .filter(([, data]) => data.total >= 2)
      .sort((a, b) => b[1].pnl - a[1].pnl)[0];

    // Calculate trade type performance
    const longWinRate = longs.length > 0
      ? (longs.filter((t) => (t.profit_loss || 0) > 0).length / longs.length) * 100
      : 0;
    const shortWinRate = shorts.length > 0
      ? (shorts.filter((t) => (t.profit_loss || 0) > 0).length / shorts.length) * 100
      : 0;

    const patterns: Pattern[] = [];

    if (longs.length >= 2) {
      patterns.push({
        name: "Long Trades",
        winRate: longWinRate,
        totalTrades: longs.length,
        avgProfit: longs.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / longs.length,
        icon: <TrendingUp className="h-4 w-4 text-gain" />,
      });
    }

    if (shorts.length >= 2) {
      patterns.push({
        name: "Short Trades",
        winRate: shortWinRate,
        totalTrades: shorts.length,
        avgProfit: shorts.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / shorts.length,
        icon: <TrendingDown className="h-4 w-4 text-loss" />,
      });
    }

    if (bestDay && bestDay[1].total >= 2) {
      patterns.push({
        name: `${bestDay[0]}s`,
        winRate: (bestDay[1].wins / bestDay[1].total) * 100,
        totalTrades: bestDay[1].total,
        avgProfit: bestDay[1].pnl / bestDay[1].total,
        icon: <Clock className="h-4 w-4 text-primary" />,
      });
    }

    if (bestSymbol && bestSymbol[1].total >= 2) {
      patterns.push({
        name: bestSymbol[0],
        winRate: (bestSymbol[1].wins / bestSymbol[1].total) * 100,
        totalTrades: bestSymbol[1].total,
        avgProfit: bestSymbol[1].pnl / bestSymbol[1].total,
        icon: <Target className="h-4 w-4 text-gold" />,
      });
    }

    // Sort by win rate
    patterns.sort((a, b) => b.winRate - a.winRate);

    // Generate insights
    const insights: string[] = [];
    
    if (longWinRate > shortWinRate + 10 && longs.length >= 2) {
      insights.push("Your long trades significantly outperform shorts");
    } else if (shortWinRate > longWinRate + 10 && shorts.length >= 2) {
      insights.push("You have an edge trading the short side");
    }

    if (bestDay && (bestDay[1].wins / bestDay[1].total) >= 0.6) {
      insights.push(`${bestDay[0]}s are your most profitable trading day`);
    }

    if (bestSymbol && bestSymbol[1].pnl > 0) {
      insights.push(`${bestSymbol[0]} is your best performing ticker`);
    }

    return { patterns, insights };
  }, [trades]);

  if (!analysis) {
    return (
      <CollapsibleCard
        title="Pattern Recognition"
        description="Discover your trading strengths"
        icon={<Brain className="h-5 w-5 text-primary" />}
        defaultOpen={false}
        storageKey="dashboard-pattern-recognition"
      >
        <div className="text-center py-6">
          <Brain className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Complete at least 3 trades to unlock pattern insights
          </p>
        </div>
      </CollapsibleCard>
    );
  }

  return (
    <CollapsibleCard
      title="Pattern Recognition"
      description="Discover your trading strengths"
      icon={<Brain className="h-5 w-5 text-primary" />}
      defaultOpen={false}
      storageKey="dashboard-pattern-recognition"
    >
        {/* Top Patterns */}
        <div className="space-y-3 mb-4">
          {analysis.patterns.slice(0, 3).map((pattern, i) => (
            <div
              key={pattern.name}
              className="p-3 rounded-lg bg-muted/30"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {pattern.icon}
                  <span className="font-medium text-sm">{pattern.name}</span>
                  {i === 0 && (
                    <Badge className="bg-gold/20 text-gold border-gold/30 text-xs">
                      Best
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {pattern.totalTrades} trades
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  value={pattern.winRate}
                  className={cn(
                    "h-2 flex-1",
                    pattern.winRate >= 50 ? "[&>div]:bg-gain" : "[&>div]:bg-loss"
                  )}
                />
                <span
                  className={cn(
                    "text-sm font-medium w-12 text-right",
                    pattern.winRate >= 50 ? "text-gain" : "text-loss"
                  )}
                >
                  {pattern.winRate.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Avg: {pattern.avgProfit >= 0 ? "+" : ""}${pattern.avgProfit.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        {analysis.insights.length > 0 && (
          <div className="border-t border-border/50 pt-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-gold" />
              AI Insights
            </h4>
            <div className="space-y-2">
              {analysis.insights.map((insight, i) => (
                <p key={i} className="text-xs text-foreground/80">
                  • {insight}
                </p>
              ))}
            </div>
          </div>
        )}
    </CollapsibleCard>
  );
}
