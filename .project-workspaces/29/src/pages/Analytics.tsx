import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { AdvancedStatsPanel } from "@/components/analytics/AdvancedStatsPanel";
import { ExportMenu } from "@/components/export/ExportMenu";
import { useTrades } from "@/hooks/useTrades";
import { exportAnalyticsToCSV, exportAnalyticsToPDF } from "@/lib/exportUtils";
import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { differenceInDays, parseISO } from "date-fns";

export default function Analytics() {
  const { trades, stats } = useTrades();

  // Calculate advanced stats for export
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
        currentWinStreak++;
        currentLoseStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if ((t.profit_loss || 0) < 0) {
        currentLoseStreak++;
        currentWinStreak = 0;
        if (currentLoseStreak > maxLoseStreak) maxLoseStreak = currentLoseStreak;
      }
    });

    return {
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      profitFactor,
      avgWin,
      avgLoss,
      avgHoldTime,
      expectancy,
      riskRewardRatio,
      winStreak: maxWinStreak,
      loseStreak: maxLoseStreak,
    };
  }, [trades]);

  const handleExportCSV = () => {
    if (advancedStats) {
      exportAnalyticsToCSV(trades, advancedStats);
    }
  };

  const handleExportPDF = () => {
    if (advancedStats) {
      exportAnalyticsToPDF(trades, advancedStats, stats);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Performance Analytics
            </h1>
            <p className="text-muted-foreground mt-1">
              Deep dive into your trading performance with advanced metrics and visualizations.
            </p>
          </div>
          <ExportMenu
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            disabled={!advancedStats}
          />
        </div>

        <AdvancedStatsPanel />
      </div>
    </DashboardLayout>
  );
}
