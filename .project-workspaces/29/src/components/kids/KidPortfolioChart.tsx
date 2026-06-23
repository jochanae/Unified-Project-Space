import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

interface KidPortfolioChartProps {
  trades: Array<{
    id: string;
    symbol: string;
    entry_price: number;
    exit_price: number | null;
    quantity: number;
    profit_loss: number | null;
    status: 'open' | 'closed';
    emoji?: string | null;
    company_name?: string | null;
  }>;
  portfolioValue: number;
  initialBalance: number;
}

// Fun stock emojis for visual appeal
const stockEmojis: Record<string, string> = {
  AAPL: '🍎',
  DIS: '🏰',
  NFLX: '🎬',
  TSLA: '🚗',
  GOOG: '🔍',
  MSFT: '💻',
  AMZN: '📦',
  META: '👍',
  NKE: '👟',
  SBUX: '☕',
  MCD: '🍔',
  KO: '🥤',
  PEP: '🥤',
  COST: '🛒',
  WMT: '🏪',
  TGT: '🎯',
};

export function KidPortfolioChart({ trades, portfolioValue, initialBalance }: KidPortfolioChartProps) {
  const openTrades = trades.filter(t => t.status === 'open');
  const totalReturn = ((portfolioValue - initialBalance) / initialBalance) * 100;

  // Generate portfolio composition data
  const composition = useMemo(() => {
    const totalValue = openTrades.reduce((sum, t) => sum + (t.entry_price * t.quantity), 0);
    return openTrades.map(trade => ({
      ...trade,
      value: trade.entry_price * trade.quantity,
      percentage: totalValue > 0 ? (trade.entry_price * trade.quantity / totalValue) * 100 : 0,
      emoji: trade.emoji || stockEmojis[trade.symbol] || '📈',
    }));
  }, [openTrades]);

  // Generate mock growth chart points
  const growthPoints = useMemo(() => {
    const points: number[] = [];
    let value = initialBalance;
    const step = (portfolioValue - initialBalance) / 10;
    
    for (let i = 0; i <= 10; i++) {
      const noise = (Math.random() - 0.5) * Math.abs(step) * 0.5;
      value = initialBalance + step * i + noise;
      points.push(value);
    }
    points[points.length - 1] = portfolioValue;
    return points;
  }, [initialBalance, portfolioValue]);

  const min = Math.min(...growthPoints);
  const max = Math.max(...growthPoints);
  const range = max - min || 1;

  const width = 280;
  const height = 80;
  const padding = 8;

  const pathPoints = growthPoints.map((value, i) => {
    const x = padding + (i / (growthPoints.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const isProfit = totalReturn >= 0;

  return (
    <Card className="overflow-hidden">
      <div className={cn(
        'h-2 bg-gradient-to-r',
        isProfit ? 'from-gain to-chart-3' : 'from-loss to-destructive'
      )} />
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <h3 className="font-bold">Your Money Journey</h3>
          </div>
          <div className={cn(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-bold',
            isProfit ? 'bg-gain/20 text-gain' : 'bg-loss/20 text-loss'
          )}>
            {isProfit ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
          </div>
        </div>

        {/* Growth Chart */}
        <div className="relative bg-muted/30 rounded-xl p-2">
          <svg width={width} height={height} className="overflow-visible">
            <defs>
              <linearGradient id="kidChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={isProfit ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} stopOpacity="0.3" />
                <stop offset="100%" stopColor={isProfit ? 'hsl(var(--gain))' : 'hsl(var(--loss))'} stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Fill */}
            <polygon
              points={`${padding},${height - padding} ${pathPoints} ${width - padding},${height - padding}`}
              fill="url(#kidChartGradient)"
            />
            
            {/* Line */}
            <polyline
              points={pathPoints}
              fill="none"
              stroke={isProfit ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* End dot */}
            <circle
              cx={width - padding}
              cy={height - padding - ((growthPoints[growthPoints.length - 1] - min) / range) * (height - padding * 2)}
              r="6"
              fill={isProfit ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
              className="animate-pulse"
            />
            
            {/* Start label */}
            <text x={padding} y={height - 2} fontSize="10" fill="hsl(var(--muted-foreground))">
              Start
            </text>
            
            {/* End label */}
            <text x={width - padding - 20} y={height - 2} fontSize="10" fill="hsl(var(--muted-foreground))">
              Now
            </text>
          </svg>
        </div>

        {/* Portfolio Composition */}
        {composition.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              What You Own
            </p>
            <div className="flex flex-wrap gap-2">
              {composition.map((stock) => (
                <div
                  key={stock.id}
                  className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-full text-sm"
                >
                  <span className="text-base">{stock.emoji}</span>
                  <span className="font-medium">{stock.symbol}</span>
                  <span className="text-xs text-muted-foreground">
                    {stock.percentage.toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {composition.length === 0 && (
          <div className="text-center py-4 bg-muted/30 rounded-xl">
            <span className="text-3xl block mb-2">🎯</span>
            <p className="text-sm text-muted-foreground">
              No investments yet! Buy your first stock to start your journey.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
