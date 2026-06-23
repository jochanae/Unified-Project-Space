import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from 'lucide-react';

interface MonthlyOverviewProps {
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalBills: number;
    paidBills: number;
    unpaidBills: number;
    netCashFlow: number;
    availableToInvest: number;
    totalSavingsTarget: number;
    totalSaved: number;
  };
}

export function MonthlyOverview({ summary }: MonthlyOverviewProps) {
  const cards = [
    {
      label: 'Income',
      value: summary.totalIncome,
      icon: TrendingUp,
      gradient: 'from-gain/90 to-gain/60',
      prefix: '+',
    },
    {
      label: 'Expenses',
      value: summary.totalExpenses + summary.totalBills,
      icon: TrendingDown,
      gradient: 'from-loss/90 to-loss/60',
      prefix: '-',
    },
    {
      label: 'Net Cash Flow',
      value: summary.netCashFlow,
      icon: Wallet,
      gradient: summary.netCashFlow >= 0 ? 'from-primary/90 to-primary/60' : 'from-loss/90 to-loss/60',
      prefix: summary.netCashFlow >= 0 ? '+' : '',
    },
    {
      label: 'Available to Invest',
      value: summary.availableToInvest,
      icon: PiggyBank,
      gradient: 'from-gold/90 to-gold/60',
      prefix: '$',
      noSign: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Card
          key={card.label}
          className={`relative overflow-hidden border-0 bg-gradient-to-br ${card.gradient}`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <card.icon className="h-4 w-4 text-white/80" />
              <span className="text-xs font-medium text-white/80">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-white">
              {card.noSign
                ? `$${card.value.toFixed(2)}`
                : `${card.prefix}$${Math.abs(card.value).toFixed(2)}`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
