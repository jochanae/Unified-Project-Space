import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, FileSpreadsheet, BookOpen, BarChart3, Loader2, Crown } from 'lucide-react';
import { useTrades } from '@/hooks/useTrades';
import { exportTradesToCSV, exportTradesToPDF, exportAnalyticsToCSV, exportAnalyticsToPDF } from '@/lib/exportUtils';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';
import { useMemo } from 'react';

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportModal({ open, onOpenChange }: ExportModalProps) {
  const { trades, stats } = useTrades();
  const { checkAccess } = useFeatureAccess();
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const hasAccess = checkAccess('exportReports');

  const advancedStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.profit_loss !== null);
    if (closedTrades.length === 0) return null;

    const sortedTrades = [...closedTrades].sort((a, b) =>
      new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    const wins = sortedTrades.filter(t => (t.profit_loss || 0) > 0);
    const losses = sortedTrades.filter(t => (t.profit_loss || 0) < 0);

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / losses.length) : 0;

    const grossProfit = wins.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.profit_loss || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    let peak = 0, maxDrawdown = 0, runningTotal = 0;
    sortedTrades.forEach(t => {
      runningTotal += t.profit_loss || 0;
      if (runningTotal > peak) peak = runningTotal;
      const dd = peak - runningTotal;
      if (dd > maxDrawdown) maxDrawdown = dd;
    });
    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    const holdTimes = sortedTrades
      .filter(t => t.exit_date)
      .map(t => differenceInDays(parseISO(t.exit_date!), parseISO(t.entry_date)));
    const avgHoldTime = holdTimes.length > 0 ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0;

    const winRate = sortedTrades.length > 0 ? wins.length / sortedTrades.length : 0;
    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    const returns = sortedTrades.map(t => t.profit_loss || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    let currentWinStreak = 0, currentLoseStreak = 0, maxWinStreak = 0, maxLoseStreak = 0;
    sortedTrades.forEach(t => {
      if ((t.profit_loss || 0) > 0) {
        currentWinStreak++; currentLoseStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if ((t.profit_loss || 0) < 0) {
        currentLoseStreak++; currentWinStreak = 0;
        if (currentLoseStreak > maxLoseStreak) maxLoseStreak = currentLoseStreak;
      }
    });

    return { sharpeRatio, maxDrawdown, maxDrawdownPercent, profitFactor, avgWin, avgLoss, avgHoldTime, expectancy, riskRewardRatio, winStreak: maxWinStreak, loseStreak: maxLoseStreak };
  }, [trades]);

  const handleExport = async (type: string) => {
    if (!hasAccess) {
      setShowUpgrade(true);
      return;
    }

    setIsExporting(type);
    try {
      switch (type) {
        case 'trades-csv':
          exportTradesToCSV(trades);
          break;
        case 'trades-pdf':
          await exportTradesToPDF(trades, stats);
          break;
        case 'analytics-csv':
          if (advancedStats) exportAnalyticsToCSV(trades, advancedStats);
          break;
        case 'analytics-pdf':
          if (advancedStats) await exportAnalyticsToPDF(trades, advancedStats, stats);
          break;
      }
      toast.success('Export completed');
      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed');
    } finally {
      setIsExporting(null);
    }
  };

  const noTrades = trades.length === 0;
  const noClosedTrades = !advancedStats;

  const exportOptions = [
    {
      id: 'trades-pdf',
      icon: <FileText className="h-5 w-5" />,
      title: 'Trade Journal — PDF',
      description: 'Full journal report with stats and trade details',
      color: 'text-chart-3',
      disabled: noTrades,
    },
    {
      id: 'trades-csv',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      title: 'Trade Journal — CSV',
      description: 'Spreadsheet of all your trades',
      color: 'text-gain',
      disabled: noTrades,
    },
    {
      id: 'analytics-pdf',
      icon: <BarChart3 className="h-5 w-5" />,
      title: 'Analytics Report — PDF',
      description: 'Performance metrics, streaks, and key ratios',
      color: 'text-primary',
      disabled: noClosedTrades,
    },
    {
      id: 'analytics-csv',
      icon: <FileSpreadsheet className="h-5 w-5" />,
      title: 'Analytics Report — CSV',
      description: 'Metrics and closed trades in spreadsheet format',
      color: 'text-chart-2',
      disabled: noClosedTrades,
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-chart-3" />
            Export Data
            {!hasAccess && <Crown className="h-4 w-4 text-gold" />}
          </DialogTitle>
          <DialogDescription>
            Choose what you'd like to export
          </DialogDescription>

          <div className="space-y-3 mt-2">
            {exportOptions.map((option) => (
              <Button
                key={option.id}
                variant="outline"
                className="w-full justify-start h-auto py-3 px-4"
                disabled={option.disabled || isExporting !== null}
                onClick={() => handleExport(option.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <span className={option.color}>{option.icon}</span>
                  <div className="text-left flex-1">
                    <div className="font-medium">{option.title}</div>
                    <div className="text-xs text-muted-foreground">{option.description}</div>
                  </div>
                  {isExporting === option.id && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
              </Button>
            ))}

            {noTrades && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                Add trades to your journal to enable exports
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Export Reports"
        requiredTier="pro"
        description="Export your trade journal and analytics as PDF or CSV files with the Pro plan."
      />
    </>
  );
}
