import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface NetWorthSummaryCardsProps {
  summary: {
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
    autoSyncedSavings: number;
  };
}

export function NetWorthSummaryCards({ summary }: NetWorthSummaryCardsProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="h-7 w-7 rounded-lg bg-emerald-500/20 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">${fmt(summary.totalAssets)}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Total Assets</p>
          </CardContent>
        </Card>
        <Card className="border-rose-500/20 bg-rose-500/5 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="h-7 w-7 rounded-lg bg-rose-500/20 flex items-center justify-center mx-auto mb-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="text-lg font-black text-rose-600 dark:text-rose-400">${fmt(summary.totalLiabilities)}</p>
            <p className="text-[10px] font-medium text-muted-foreground">Liabilities</p>
          </CardContent>
        </Card>
        <Card className={`shadow-sm ${summary.netWorth >= 0 ? 'border-primary/20 bg-primary/5' : 'border-rose-500/20 bg-rose-500/5'}`}>
          <CardContent className="p-3 text-center">
            <span className="text-base block mb-1">🏆</span>
            <p className={`text-lg font-black ${summary.netWorth >= 0 ? 'text-primary' : 'text-rose-600 dark:text-rose-400'}`}>
              {summary.netWorth < 0 ? '-' : ''}${fmt(Math.abs(summary.netWorth))}
            </p>
            <p className="text-[10px] font-medium text-muted-foreground">Net Worth</p>
          </CardContent>
        </Card>
      </div>
      {summary.autoSyncedSavings > 0 && (
        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium px-1">
          ✨ ${fmt(summary.autoSyncedSavings)} auto-synced from your savings goals
        </p>
      )}
    </div>
  );
}
