import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TradeStatsProps {
  stats: {
    totalTrades: number;
    openTrades: number;
    closedTrades: number;
    winningTrades: number;
    losingTrades: number;
    totalProfitLoss: number;
    winRate: number;
  };
}

export function TradeStats({ stats }: TradeStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statCards = [
    {
      label: 'Total P&L',
      value: formatCurrency(stats.totalProfitLoss),
      icon: stats.totalProfitLoss >= 0 ? TrendingUp : TrendingDown,
      color: stats.totalProfitLoss >= 0 ? 'text-gain' : 'text-loss',
      bgColor: stats.totalProfitLoss >= 0 ? 'bg-gain/10' : 'bg-loss/10',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Target,
      color: stats.winRate >= 50 ? 'text-gain' : 'text-loss',
      bgColor: stats.winRate >= 50 ? 'bg-gain/10' : 'bg-loss/10',
    },
    {
      label: 'Total Trades',
      value: stats.totalTrades.toString(),
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Win / Loss',
      value: `${stats.winningTrades} / ${stats.losingTrades}`,
      icon: TrendingUp,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn('rounded-lg p-2', stat.bgColor)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={cn('text-lg font-bold', stat.color)}>{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
