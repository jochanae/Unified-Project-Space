import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrades } from '@/hooks/useTrades';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Clock,
  Calendar,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface AdvancedStats {
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  avgHoldTime: number;
  bestDay: { date: string; pnl: number } | null;
  worstDay: { date: string; pnl: number } | null;
  winStreak: number;
  loseStreak: number;
  currentStreak: { type: 'win' | 'loss' | 'none'; count: number };
  expectancy: number;
  riskRewardRatio: number;
}

export function AdvancedStatsPanel() {
  const { trades, stats, isLoading } = useTrades();

  const { equityCurve, advancedStats, dailyPnL, monthlyPerformance } = useMemo(() => {
    if (!trades.length) {
      return {
        equityCurve: [],
        advancedStats: null,
        dailyPnL: [],
        monthlyPerformance: [],
      };
    }

    // Sort trades by entry date
    const sortedTrades = [...trades]
      .filter((t) => t.status === 'closed' && t.profit_loss !== null)
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());

    if (sortedTrades.length === 0) {
      return {
        equityCurve: [],
        advancedStats: null,
        dailyPnL: [],
        monthlyPerformance: [],
      };
    }

    // Build equity curve
    let cumulative = 0;
    const equityCurve = sortedTrades.map((trade) => {
      cumulative += trade.profit_loss || 0;
      return {
        date: format(parseISO(trade.entry_date), 'MMM dd'),
        fullDate: trade.entry_date,
        value: cumulative,
        pnl: trade.profit_loss || 0,
      };
    });

    // Calculate daily P&L aggregation
    const dailyMap = new Map<string, number>();
    sortedTrades.forEach((trade) => {
      const date = format(parseISO(trade.entry_date), 'yyyy-MM-dd');
      dailyMap.set(date, (dailyMap.get(date) || 0) + (trade.profit_loss || 0));
    });
    const dailyPnL = Array.from(dailyMap.entries())
      .map(([date, pnl]) => ({
        date: format(parseISO(date), 'MMM dd'),
        fullDate: date,
        pnl,
      }))
      .slice(-14); // Last 14 days

    // Calculate monthly performance
    const monthlyMap = new Map<string, number>();
    sortedTrades.forEach((trade) => {
      const month = format(parseISO(trade.entry_date), 'MMM yyyy');
      monthlyMap.set(month, (monthlyMap.get(month) || 0) + (trade.profit_loss || 0));
    });
    const monthlyPerformance = Array.from(monthlyMap.entries())
      .map(([month, pnl]) => ({ month, pnl }))
      .slice(-6); // Last 6 months

    // Calculate advanced stats
    const wins = sortedTrades.filter((t) => (t.profit_loss || 0) > 0);
    const losses = sortedTrades.filter((t) => (t.profit_loss || 0) < 0);

    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.profit_loss || 0), 0) / losses.length) : 0;

    // Profit Factor
    const grossProfit = wins.reduce((sum, t) => sum + (t.profit_loss || 0), 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + (t.profit_loss || 0), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

    // Max Drawdown
    let peak = 0;
    let maxDrawdown = 0;
    let runningTotal = 0;
    sortedTrades.forEach((trade) => {
      runningTotal += trade.profit_loss || 0;
      if (runningTotal > peak) peak = runningTotal;
      const drawdown = peak - runningTotal;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });
    const maxDrawdownPercent = peak > 0 ? (maxDrawdown / peak) * 100 : 0;

    // Average hold time (in days)
    const holdTimes = sortedTrades
      .filter((t) => t.exit_date)
      .map((t) => differenceInDays(parseISO(t.exit_date!), parseISO(t.entry_date)));
    const avgHoldTime = holdTimes.length > 0 ? holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length : 0;

    // Best/Worst day
    const dailyPnLArray = Array.from(dailyMap.entries()).map(([date, pnl]) => ({ date, pnl }));
    const bestDay = dailyPnLArray.length > 0 ? dailyPnLArray.reduce((best, curr) => (curr.pnl > best.pnl ? curr : best)) : null;
    const worstDay = dailyPnLArray.length > 0 ? dailyPnLArray.reduce((worst, curr) => (curr.pnl < worst.pnl ? curr : worst)) : null;

    // Win/Loss streaks
    let currentWinStreak = 0;
    let currentLoseStreak = 0;
    let maxWinStreak = 0;
    let maxLoseStreak = 0;

    sortedTrades.forEach((trade) => {
      if ((trade.profit_loss || 0) > 0) {
        currentWinStreak++;
        currentLoseStreak = 0;
        if (currentWinStreak > maxWinStreak) maxWinStreak = currentWinStreak;
      } else if ((trade.profit_loss || 0) < 0) {
        currentLoseStreak++;
        currentWinStreak = 0;
        if (currentLoseStreak > maxLoseStreak) maxLoseStreak = currentLoseStreak;
      }
    });

    const lastTrade = sortedTrades[sortedTrades.length - 1];
    const currentStreak: { type: 'win' | 'loss' | 'none'; count: number } =
      currentWinStreak > 0
        ? { type: 'win', count: currentWinStreak }
        : currentLoseStreak > 0
        ? { type: 'loss', count: currentLoseStreak }
        : { type: 'none', count: 0 };

    // Expectancy
    const winRate = sortedTrades.length > 0 ? wins.length / sortedTrades.length : 0;
    const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

    // Risk/Reward Ratio
    const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? Infinity : 0;

    // Sharpe Ratio (simplified - using daily returns std dev)
    const returns = sortedTrades.map((t) => t.profit_loss || 0);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    const advancedStats: AdvancedStats = {
      sharpeRatio,
      maxDrawdown,
      maxDrawdownPercent,
      profitFactor,
      avgWin,
      avgLoss,
      avgHoldTime,
      bestDay,
      worstDay,
      winStreak: maxWinStreak,
      loseStreak: maxLoseStreak,
      currentStreak,
      expectancy,
      riskRewardRatio,
    };

    return { equityCurve, advancedStats, dailyPnL, monthlyPerformance };
  }, [trades]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[300px] w-full" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!advancedStats || trades.filter((t) => t.status === 'closed').length === 0) {
    return (
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Trading Data Yet</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Close some trades in your journal to see advanced performance analytics, equity curves, and insights.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Equity Curve */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Equity Curve
          </CardTitle>
          <CardDescription>Cumulative profit/loss over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurve}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Equity']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs">Sharpe Ratio</span>
            </div>
            <p className={cn('text-2xl font-bold', advancedStats.sharpeRatio >= 1 ? 'text-gain' : advancedStats.sharpeRatio >= 0 ? 'text-foreground' : 'text-loss')}>
              {advancedStats.sharpeRatio.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {advancedStats.sharpeRatio >= 2 ? 'Excellent' : advancedStats.sharpeRatio >= 1 ? 'Good' : advancedStats.sharpeRatio >= 0 ? 'Fair' : 'Poor'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs">Max Drawdown</span>
            </div>
            <p className="text-2xl font-bold text-loss">{formatCurrency(advancedStats.maxDrawdown)}</p>
            <p className="text-xs text-muted-foreground mt-1">{advancedStats.maxDrawdownPercent.toFixed(1)}% from peak</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">Profit Factor</span>
            </div>
            <p className={cn('text-2xl font-bold', advancedStats.profitFactor >= 1.5 ? 'text-gain' : advancedStats.profitFactor >= 1 ? 'text-foreground' : 'text-loss')}>
              {advancedStats.profitFactor === Infinity ? '∞' : advancedStats.profitFactor.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {advancedStats.profitFactor >= 2 ? 'Excellent' : advancedStats.profitFactor >= 1.5 ? 'Good' : advancedStats.profitFactor >= 1 ? 'Break-even' : 'Losing'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Avg Hold Time</span>
            </div>
            <p className="text-2xl font-bold">{advancedStats.avgHoldTime.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">days per trade</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4 text-gain" />
              <span className="text-xs">Avg Win</span>
            </div>
            <p className="text-2xl font-bold text-gain">{formatCurrency(advancedStats.avgWin)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingDown className="h-4 w-4 text-loss" />
              <span className="text-xs">Avg Loss</span>
            </div>
            <p className="text-2xl font-bold text-loss">-{formatCurrency(advancedStats.avgLoss)}</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">R/R Ratio</span>
            </div>
            <p className={cn('text-2xl font-bold', advancedStats.riskRewardRatio >= 1.5 ? 'text-gain' : 'text-foreground')}>
              {advancedStats.riskRewardRatio === Infinity ? '∞' : `1:${advancedStats.riskRewardRatio.toFixed(1)}`}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Award className="h-4 w-4" />
              <span className="text-xs">Expectancy</span>
            </div>
            <p className={cn('text-2xl font-bold', advancedStats.expectancy >= 0 ? 'text-gain' : 'text-loss')}>
              {formatCurrency(advancedStats.expectancy)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">per trade</p>
          </CardContent>
        </Card>
      </div>

      {/* Daily P&L Chart */}
      {dailyPnL.length > 0 && (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-chart-3" />
              Daily P&L
            </CardTitle>
            <CardDescription>Last 14 trading days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'P&L']}
                  />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dailyPnL.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Streaks & Highlights */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Win/Loss Streaks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Best Win Streak</span>
              <Badge variant="outline" className="text-gain border-gain/30">
                {advancedStats.winStreak} trades
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Worst Loss Streak</span>
              <Badge variant="outline" className="text-loss border-loss/30">
                {advancedStats.loseStreak} trades
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Streak</span>
              <Badge
                variant="outline"
                className={cn(
                  advancedStats.currentStreak.type === 'win'
                    ? 'text-gain border-gain/30'
                    : advancedStats.currentStreak.type === 'loss'
                    ? 'text-loss border-loss/30'
                    : ''
                )}
              >
                {advancedStats.currentStreak.count > 0
                  ? `${advancedStats.currentStreak.count} ${advancedStats.currentStreak.type}${advancedStats.currentStreak.count > 1 ? 's' : ''}`
                  : 'None'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Best & Worst Days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {advancedStats.bestDay && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-muted-foreground">Best Day</span>
                  <p className="text-xs text-muted-foreground">{format(parseISO(advancedStats.bestDay.date), 'MMM dd, yyyy')}</p>
                </div>
                <span className="text-lg font-semibold text-gain">{formatCurrency(advancedStats.bestDay.pnl)}</span>
              </div>
            )}
            {advancedStats.worstDay && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-muted-foreground">Worst Day</span>
                  <p className="text-xs text-muted-foreground">{format(parseISO(advancedStats.worstDay.date), 'MMM dd, yyyy')}</p>
                </div>
                <span className="text-lg font-semibold text-loss">{formatCurrency(advancedStats.worstDay.pnl)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
