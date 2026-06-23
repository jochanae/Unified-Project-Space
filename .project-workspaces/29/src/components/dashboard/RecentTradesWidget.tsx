import { Link } from "react-router-dom";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Target, ArrowRight, TrendingUp, BarChart3 } from "lucide-react";

interface Trade {
  id: string;
  symbol: string;
  trade_type: string;
  status: string;
  profit_loss: number | null;
}

interface RecentTradesWidgetProps {
  trades: Trade[];
  isLoading: boolean;
  winRate?: number;
  openPositions?: number;
}

export function RecentTradesWidget({ trades, isLoading, winRate = 0, openPositions = 0 }: RecentTradesWidgetProps) {
  const recentTrades = trades.slice(0, 3);

  const headerActions = (
    <div onClick={(e) => e.stopPropagation()}>
      <Link to="/journal">
        <Button variant="ghost" size="sm" className="text-primary">
          View all <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );

  return (
    <CollapsibleCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>Recent Trades</span>
          {headerActions}
        </div>
      }
      description="Your latest journal entries"
      icon={<Target className="h-5 w-5 text-primary" />}
      defaultOpen={false}
      storageKey="dashboard-recent-trades"
    >
      {/* Trading Mini-Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/30">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground leading-tight">Win Rate</p>
            <p className={`text-sm font-semibold leading-tight ${winRate >= 50 ? 'text-gain' : winRate > 0 ? 'text-loss' : 'text-foreground'}`}>
              {winRate.toFixed(0)}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/30">
          <div className="h-7 w-7 rounded-md bg-chart-3/10 flex items-center justify-center shrink-0">
            <BarChart3 className="h-3.5 w-3.5 text-chart-3" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground leading-tight">Open Positions</p>
            <p className="text-sm font-semibold leading-tight">{openPositions}</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="sm" />
        </div>
      ) : recentTrades.length === 0 ? (
        <div className="text-center py-8">
          <Target className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No trades yet</p>
          <Link to="/journal">
            <Button variant="link" size="sm" className="mt-2">
              Add your first trade
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recentTrades.map((trade) => (
            <div
              key={trade.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{trade.symbol}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {trade.trade_type} · {trade.status}
                  </p>
                </div>
              </div>
              {trade.status === 'closed' && trade.profit_loss !== null ? (
                <span
                  className={`font-semibold ${
                    trade.profit_loss >= 0 ? "text-gain" : "text-loss"
                  }`}
                >
                  {trade.profit_loss >= 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                </span>
              ) : (
                <Badge variant="outline" className="text-xs">Open</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </CollapsibleCard>
  );
}
