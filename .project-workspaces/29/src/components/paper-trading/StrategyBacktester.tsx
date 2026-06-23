import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  BarChart3,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  totalReturnPercent: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  trades: BacktestTrade[];
}

interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  type: 'long' | 'short';
  profitLoss: number;
  profitLossPercent: number;
  reason: string;
}

interface StrategyRule {
  type: 'entry' | 'exit';
  indicator: string;
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below';
  value: number;
}

type AssetClass = 'equity' | 'options' | 'forex' | 'crypto';

const INDICATORS_BY_ASSET: Record<AssetClass, { value: string; label: string; description: string }[]> = {
  equity: [
    { value: 'rsi', label: 'RSI (14)', description: 'Relative Strength Index' },
    { value: 'sma20', label: 'SMA (20)', description: '20-day Simple Moving Average' },
    { value: 'sma50', label: 'SMA (50)', description: '50-day Simple Moving Average' },
    { value: 'sma200', label: 'SMA (200)', description: '200-day Simple Moving Average' },
    { value: 'price', label: 'Price', description: 'Current price' },
    { value: 'volume', label: 'Volume', description: 'Trading volume' },
  ],
  options: [
    { value: 'iv_rank', label: 'IV Rank', description: 'Implied Volatility Rank (0-100)' },
    { value: 'delta', label: 'Delta', description: 'Option delta (-1 to 1)' },
    { value: 'theta', label: 'Theta', description: 'Time decay per day' },
    { value: 'dte', label: 'DTE', description: 'Days to expiration' },
    { value: 'rsi', label: 'RSI (14)', description: 'Underlying RSI' },
    { value: 'price', label: 'Underlying Price', description: 'Underlying stock price' },
  ],
  forex: [
    { value: 'rsi', label: 'RSI (14)', description: 'Relative Strength Index' },
    { value: 'ema20', label: 'EMA (20)', description: '20-period Exponential MA' },
    { value: 'ema50', label: 'EMA (50)', description: '50-period Exponential MA' },
    { value: 'atr', label: 'ATR (14)', description: 'Average True Range in pips' },
    { value: 'price', label: 'Price', description: 'Current exchange rate' },
    { value: 'adx', label: 'ADX (14)', description: 'Average Directional Index' },
  ],
  crypto: [
    { value: 'rsi', label: 'RSI (14)', description: 'Relative Strength Index' },
    { value: 'ema21', label: 'EMA (21)', description: '21-period Exponential MA' },
    { value: 'sma200', label: 'SMA (200)', description: '200-day Simple Moving Average' },
    { value: 'volume', label: 'Volume', description: '24h trading volume' },
    { value: 'price', label: 'Price', description: 'Current price (USD)' },
    { value: 'atr', label: 'ATR (14)', description: 'Average True Range' },
  ],
};

const CONDITIONS = [
  { value: 'above', label: 'is above' },
  { value: 'below', label: 'is below' },
  { value: 'crosses_above', label: 'crosses above' },
  { value: 'crosses_below', label: 'crosses below' },
];

const ASSET_CLASS_OPTIONS: { value: AssetClass; label: string }[] = [
  { value: 'equity', label: 'Stocks' },
  { value: 'options', label: 'Options' },
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
];

const POSITION_SIZE_LABEL: Record<AssetClass, string> = {
  equity: 'Position Size (%)',
  options: 'Contracts (%)',
  forex: 'Lot Size (%)',
  crypto: 'Position Size (%)',
};

export function StrategyBacktester({ symbol = 'AAPL' }: { symbol?: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [startingCapital, setStartingCapital] = useState(10000);
  const [positionSize, setPositionSize] = useState(100);
  const [timeRange, setTimeRange] = useState('1y');
  const [assetClass, setAssetClass] = useState<AssetClass>('equity');

  const indicators = INDICATORS_BY_ASSET[assetClass];

  const [entryRules, setEntryRules] = useState<StrategyRule[]>([
    { type: 'entry', indicator: 'rsi', condition: 'below', value: 30 },
  ]);

  const [exitRules, setExitRules] = useState<StrategyRule[]>([
    { type: 'exit', indicator: 'rsi', condition: 'above', value: 70 },
  ]);

  const handleAssetClassChange = (value: string) => {
    const newAsset = value as AssetClass;
    setAssetClass(newAsset);
    // Reset rules to sensible defaults for the new asset class
    const newIndicators = INDICATORS_BY_ASSET[newAsset];
    const firstInd = newIndicators[0]?.value || 'rsi';
    setEntryRules([{ type: 'entry', indicator: firstInd, condition: 'below', value: 30 }]);
    setExitRules([{ type: 'exit', indicator: firstInd, condition: 'above', value: 70 }]);
  };

  const runBacktest = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockTrades: BacktestTrade[] = [
      { entryDate: '2025-01-15', exitDate: '2025-01-22', entryPrice: 180.5, exitPrice: 188.2, type: 'long', profitLoss: 770, profitLossPercent: 4.27, reason: `${indicators[0]?.label} signal` },
      { entryDate: '2025-02-01', exitDate: '2025-02-10', entryPrice: 192.3, exitPrice: 185.1, type: 'long', profitLoss: -360, profitLossPercent: -3.74, reason: `${indicators[0]?.label} signal` },
      { entryDate: '2025-03-05', exitDate: '2025-03-18', entryPrice: 175.8, exitPrice: 195.4, type: 'long', profitLoss: 1960, profitLossPercent: 11.15, reason: `${indicators[0]?.label} signal` },
      { entryDate: '2025-04-20', exitDate: '2025-05-02', entryPrice: 201.2, exitPrice: 208.7, type: 'long', profitLoss: 750, profitLossPercent: 3.73, reason: `${indicators[0]?.label} signal` },
      { entryDate: '2025-06-10', exitDate: '2025-06-25', entryPrice: 195.5, exitPrice: 188.3, type: 'long', profitLoss: -360, profitLossPercent: -3.68, reason: `${indicators[0]?.label} signal` },
    ];

    const winningTrades = mockTrades.filter((t) => t.profitLoss > 0);
    const losingTrades = mockTrades.filter((t) => t.profitLoss < 0);

    setResult({
      totalTrades: mockTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / mockTrades.length) * 100,
      totalReturn: mockTrades.reduce((sum, t) => sum + t.profitLoss, 0),
      totalReturnPercent: 27.6,
      maxDrawdown: -8.2,
      sharpeRatio: 1.45,
      profitFactor: 2.12,
      avgWin: winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) / winningTrades.length,
      avgLoss: Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLoss, 0) / losingTrades.length),
      trades: mockTrades,
    });

    setLoading(false);
  };

  const addRule = (type: 'entry' | 'exit') => {
    const firstInd = indicators[0]?.value || 'rsi';
    const newRule: StrategyRule = { type, indicator: firstInd, condition: 'below', value: 30 };
    if (type === 'entry') {
      setEntryRules([...entryRules, newRule]);
    } else {
      setExitRules([...exitRules, newRule]);
    }
  };

  const updateRule = (type: 'entry' | 'exit', index: number, field: keyof StrategyRule, value: string | number) => {
    const rules = type === 'entry' ? entryRules : exitRules;
    const updated = rules.map((r, i) => (i === index ? { ...r, [field]: value } : r));
    if (type === 'entry') setEntryRules(updated);
    else setExitRules(updated);
  };

  const removeRule = (type: 'entry' | 'exit', index: number) => {
    if (type === 'entry') setEntryRules(entryRules.filter((_, i) => i !== index));
    else setExitRules(exitRules.filter((_, i) => i !== index));
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const renderRuleRow = (rule: StrategyRule, index: number, type: 'entry' | 'exit') => {
    const indicator = indicators.find((i) => i.value === rule.indicator);
    return (
      <div key={index} className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-muted/50">
        <Badge variant="outline" className="text-xs font-medium shrink-0">
          {indicator?.label || rule.indicator}
        </Badge>
        <span className="text-xs text-muted-foreground shrink-0">When</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Select value={rule.indicator} onValueChange={(v) => updateRule(type, index, 'indicator', v)}>
              <SelectTrigger className="h-8 w-auto min-w-[100px]">
                <SelectValue>{indicator?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {indicators.map((ind) => (
                  <SelectItem key={ind.value} value={ind.value}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{ind.label}</span>
                      <span className="text-xs text-muted-foreground">- {ind.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-[200px]">
            <p className="font-medium">{indicator?.label}</p>
            <p className="text-xs text-muted-foreground">{indicator?.description}</p>
          </TooltipContent>
        </Tooltip>
        <Select value={rule.condition} onValueChange={(v) => updateRule(type, index, 'condition', v)}>
          <SelectTrigger className="h-8 w-auto min-w-[90px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONDITIONS.map((cond) => (
              <SelectItem key={cond.value} value={cond.value}>{cond.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          value={rule.value}
          onChange={(e) => updateRule(type, index, 'value', Number(e.target.value))}
          className="h-8 w-20"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => removeRule(type, index)}
        >
          ×
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="strategy" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="strategy">Strategy Builder</TabsTrigger>
          <TabsTrigger value="results" disabled={!result}>
            Results {result && <Badge className="ml-2" variant="secondary">{result.totalTrades}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="strategy" className="space-y-4">
          {/* Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Backtest Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Asset Class</Label>
                  <Select value={assetClass} onValueChange={handleAssetClassChange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CLASS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Symbol</Label>
                  <Input value={symbol} disabled className="h-9" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Time Period</Label>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3m">3 Months</SelectItem>
                      <SelectItem value="6m">6 Months</SelectItem>
                      <SelectItem value="1y">1 Year</SelectItem>
                      <SelectItem value="2y">2 Years</SelectItem>
                      <SelectItem value="5y">5 Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Starting Capital</Label>
                  <Input
                    type="number"
                    value={startingCapital}
                    onChange={(e) => setStartingCapital(Number(e.target.value))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">{POSITION_SIZE_LABEL[assetClass]}</Label>
                  <Input
                    type="number"
                    value={positionSize}
                    onChange={(e) => setPositionSize(Number(e.target.value))}
                    className="h-9"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entry Rules */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gain" />
                    Entry Rules
                  </CardTitle>
                  <CardDescription className="text-xs">When to open a position</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => addRule('entry')}>Add Rule</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {entryRules.map((rule, index) => renderRuleRow(rule, index, 'entry'))}
            </CardContent>
          </Card>

          {/* Exit Rules */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-loss" />
                    Exit Rules
                  </CardTitle>
                  <CardDescription className="text-xs">When to close a position</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => addRule('exit')}>Add Rule</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {exitRules.map((rule, index) => renderRuleRow(rule, index, 'exit'))}
            </CardContent>
          </Card>

          {/* Run Button */}
          <Button onClick={runBacktest} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {result && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className={cn('h-4 w-4', result.totalReturn >= 0 ? 'text-gain' : 'text-loss')} />
                      <span className="text-xs text-muted-foreground">Total Return</span>
                    </div>
                    <p className={cn('text-lg font-bold', result.totalReturn >= 0 ? 'text-gain' : 'text-loss')}>
                      {result.totalReturn >= 0 ? '+' : ''}{formatCurrency(result.totalReturn)}
                    </p>
                    <p className={cn('text-xs', result.totalReturn >= 0 ? 'text-gain' : 'text-loss')}>
                      {result.totalReturnPercent >= 0 ? '+' : ''}{result.totalReturnPercent.toFixed(1)}%
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Win Rate</span>
                    </div>
                    <p className="text-lg font-bold">{result.winRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      {result.winningTrades}W / {result.losingTrades}L
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-loss" />
                      <span className="text-xs text-muted-foreground">Max Drawdown</span>
                    </div>
                    <p className="text-lg font-bold text-loss">{result.maxDrawdown.toFixed(1)}%</p>
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-chart-1" />
                      <span className="text-xs text-muted-foreground">Profit Factor</span>
                    </div>
                    <p className="text-lg font-bold">{result.profitFactor.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Trade List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Trade History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.trades.map((trade, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                      >
                        <div className="flex items-center gap-3">
                          <Badge
                            variant="outline"
                            className={trade.type === 'long' ? 'border-gain text-gain' : 'border-loss text-loss'}
                          >
                            {trade.type}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">
                              {trade.entryDate} → {trade.exitDate}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(trade.entryPrice)} → {formatCurrency(trade.exitPrice)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={cn('font-semibold', trade.profitLoss >= 0 ? 'text-gain' : 'text-loss')}>
                            {trade.profitLoss >= 0 ? '+' : ''}{formatCurrency(trade.profitLoss)}
                          </p>
                          <p className={cn('text-xs', trade.profitLoss >= 0 ? 'text-gain' : 'text-loss')}>
                            {trade.profitLossPercent >= 0 ? '+' : ''}{trade.profitLossPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
