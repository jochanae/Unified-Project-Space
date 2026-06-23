import { Card, CardContent } from '@/components/ui/card';
import { PiggyBank, Star, TrendingUp, Trophy, Target, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KidPortfolioStatsProps {
  stats: {
    balance: number;
    initialBalance: number;
    portfolioValue: number;
    totalReturn: number;
    totalProfitLoss: number;
    openPositions: number;
    closedTrades: number;
    winRate: number;
    starsEarned: number;
    tradesCompleted: number;
  };
}

export function KidPortfolioStats({ stats }: KidPortfolioStatsProps) {
  const statCards = [
    {
      label: 'Piggy Bank',
      value: `$${stats.balance.toFixed(2)}`,
      icon: PiggyBank,
      color: 'from-chart-3 to-chart-3/60',
      description: 'Money ready to invest',
    },
    {
      label: 'Total Treasure',
      value: `$${stats.portfolioValue.toFixed(2)}`,
      icon: Coins,
      color: 'from-gold to-gold/60',
      description: 'Everything you own',
    },
    {
      label: 'Stars Earned',
      value: stats.starsEarned.toString(),
      icon: Star,
      color: 'from-primary to-primary/60',
      description: 'From winning trades',
    },
    {
      label: 'Trades Done',
      value: stats.tradesCompleted.toString(),
      icon: Trophy,
      color: 'from-gain to-gain/60',
      description: 'Completed trades',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(0)}%`,
      icon: Target,
      color: stats.winRate >= 50 ? 'from-gain to-gain/60' : 'from-loss to-loss/60',
      description: 'How often you win',
    },
    {
      label: 'Growth',
      value: `${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(1)}%`,
      icon: TrendingUp,
      color: stats.totalReturn >= 0 ? 'from-gain to-gain/60' : 'from-loss to-loss/60',
      description: 'Your money growth',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {statCards.map((stat) => (
        <Card 
          key={stat.label}
          className="overflow-hidden hover:scale-105 transition-transform duration-300"
        >
          <div className={cn('h-1.5 bg-gradient-to-r', stat.color)} />
          <CardContent className="p-4 text-center">
            <div
              className={cn(
                'inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br mb-2',
                stat.color
              )}
            >
              <stat.icon className="h-5 w-5 text-white" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm font-medium text-foreground">{stat.label}</p>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
