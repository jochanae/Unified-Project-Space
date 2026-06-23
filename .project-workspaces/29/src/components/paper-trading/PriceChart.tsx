import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, CandlestickChart, LineChart, HelpCircle, X } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface PriceDataPoint {
  date: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PriceChartProps {
  symbol: string;
  onSymbolChange?: (symbol: string) => void;
  className?: string;
}

type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';
type ChartType = 'candle' | 'line';

const TIME_RANGES: { label: TimeRange; interval: string; range: string }[] = [
  { label: '1D', interval: '5m', range: '1d' },
  { label: '1W', interval: '15m', range: '5d' },
  { label: '1M', interval: '1h', range: '1mo' },
  { label: '3M', interval: '1d', range: '3mo' },
  { label: '1Y', interval: '1d', range: '1y' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatVolume = (value: number) => {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toString();
};

export function PriceChart({ symbol, onSymbolChange, className }: PriceChartProps) {
  const [data, setData] = useState<PriceDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [chartType, setChartType] = useState<ChartType>('line'); // Default to simpler line chart
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!symbol) return;

    const fetchChartData = async () => {
      setLoading(true);
      setError(null);

      try {
        const rangeConfig = TIME_RANGES.find((r) => r.label === timeRange)!;
        
        // Use backend proxy to avoid CORS issues
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const url = `${supabaseUrl}/functions/v1/market-data?symbol=${encodeURIComponent(
          symbol.toUpperCase()
        )}&interval=${rangeConfig.interval}&range=${rangeConfig.range}&type=chart`;

        const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();
        const authToken = session?.access_token || publicKey;
        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            apikey: publicKey,
            Authorization: `Bearer ${authToken}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to fetch chart data');
        }

        const json = await response.json();

        if (json.error) throw new Error(json.error);
        if (!json.data || json.data.length === 0) throw new Error('No data available');

        const chartData: PriceDataPoint[] = json.data.map((d: any) => ({
          date: new Date(d.timestamp * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: timeRange === '1D' || timeRange === '1W' ? '2-digit' : undefined,
            minute: timeRange === '1D' || timeRange === '1W' ? '2-digit' : undefined,
          }),
          timestamp: d.timestamp,
          open: d.open,
          high: d.high,
          low: d.low,
          close: d.close,
          volume: d.volume,
        }));

        setData(chartData);
      } catch (err) {
        console.error('Chart fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [symbol, timeRange]);

  const latestPrice = data.length > 0 ? data[data.length - 1].close : 0;
  const firstPrice = data.length > 0 ? data[0].open : 0;
  const priceChange = latestPrice - firstPrice;
  const priceChangePercent = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const minPrice = data.length > 0 ? Math.min(...data.map((d) => d.low)) * 0.995 : 0;
  const maxPrice = data.length > 0 ? Math.max(...data.map((d) => d.high)) * 1.005 : 0;

  // Custom candlestick rendering
  const CandlestickBar = (props: any) => {
    const { x, y, width, height, payload } = props;
    if (!payload) return null;

    const { open, close, high, low } = payload;
    const isUp = close >= open;
    const color = isUp ? 'hsl(var(--gain))' : 'hsl(var(--loss))';

    const barWidth = Math.max(width * 0.6, 2);
    const barX = x + (width - barWidth) / 2;

    const priceRange = maxPrice - minPrice;
    const chartHeight = 300; // Approximate chart height

    const highY = ((maxPrice - high) / priceRange) * chartHeight;
    const lowY = ((maxPrice - low) / priceRange) * chartHeight;
    const openY = ((maxPrice - open) / priceRange) * chartHeight;
    const closeY = ((maxPrice - close) / priceRange) * chartHeight;

    const bodyTop = Math.min(openY, closeY);
    const bodyHeight = Math.abs(closeY - openY) || 1;

    return (
      <g>
        {/* Wick */}
        <line
          x1={x + width / 2}
          x2={x + width / 2}
          y1={highY}
          y2={lowY}
          stroke={color}
          strokeWidth={1}
        />
        {/* Body */}
        <rect
          x={barX}
          y={bodyTop}
          width={barWidth}
          height={bodyHeight}
          fill={isUp ? color : color}
          stroke={color}
        />
      </g>
    );
  };

  return (
    <Card className={cn('border-border/50', className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-3">
          {/* Top row: Symbol & Price */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <CardTitle className="text-lg">{symbol.toUpperCase()}</CardTitle>
              {data.length > 0 && (
                <>
                  <span className="text-xl sm:text-2xl font-bold">{formatCurrency(latestPrice)}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'font-mono text-xs',
                      isPositive
                        ? 'border-gain/50 text-gain bg-gain/10'
                        : 'border-loss/50 text-loss bg-loss/10'
                    )}
                  >
                    {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {isPositive ? '+' : ''}
                    {priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
                  </Badge>
                </>
              )}
            </div>
            
            {/* Help Button */}
            <Popover open={showHelp} onOpenChange={setShowHelp}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground">
                  <HelpCircle className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline text-xs">How to read</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">📈 Reading This Chart</h4>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowHelp(false)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <p><strong className="text-foreground">Price Line:</strong> Shows how the stock price moved over time. Higher = more expensive, lower = cheaper.</p>
                    
                    <p><strong className="text-foreground text-gain">Green ↑:</strong> Price went UP from the starting point (good if you own it!)</p>
                    
                    <p><strong className="text-foreground text-loss">Red ↓:</strong> Price went DOWN from the starting point</p>
                    
                    <p><strong className="text-foreground">Volume bars (bottom):</strong> Shows how many shares were traded. Taller bars = more activity.</p>
                    
                    <p><strong className="text-foreground">Time buttons (1D, 1W, etc.):</strong> Change how much history you see - 1 Day, 1 Week, 1 Month, etc.</p>
                  </div>
                  
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    💡 <strong>Tip:</strong> Use the line chart (📈) if you're new - it's simpler than candlesticks!
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Bottom row: Controls */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Chart Type Toggle */}
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={chartType === 'line' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 rounded-none gap-1"
                onClick={() => setChartType('line')}
                title="Line chart - simpler view"
              >
                <LineChart className="h-4 w-4" />
                <span className="text-xs hidden xs:inline">Line</span>
              </Button>
              <Button
                variant={chartType === 'candle' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2 rounded-none gap-1"
                onClick={() => setChartType('candle')}
                title="Candlestick chart - shows open/high/low/close"
              >
                <CandlestickChart className="h-4 w-4" />
                <span className="text-xs hidden xs:inline">Candle</span>
              </Button>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex border rounded-lg overflow-hidden">
              {TIME_RANGES.map((range) => (
                <Button
                  key={range.label}
                  variant={timeRange === range.label ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 rounded-none text-xs"
                  onClick={() => setTimeRange(range.label)}
                  title={`${range.label === '1D' ? '1 Day' : range.label === '1W' ? '1 Week' : range.label === '1M' ? '1 Month' : range.label === '3M' ? '3 Months' : '1 Year'}`}
                >
                  {range.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[350px]">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            Enter a symbol to view chart
          </div>
        ) : (
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[minPrice, maxPrice]}
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value.toFixed(0)}`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name]}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <ReferenceLine y={firstPrice} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />

                {chartType === 'line' ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={isPositive ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                      fill="url(#priceGradient)"
                      strokeWidth={2}
                    />
                  </>
                ) : (
                  <>
                    {/* Candlestick visualization using bars */}
                    <Bar
                      dataKey="close"
                      shape={(props: any) => {
                        const { x, width, payload } = props;
                        if (!payload) return null;
                        const { open, close, high, low } = payload;
                        const isUp = close >= open;
                        const color = isUp ? 'hsl(var(--gain))' : 'hsl(var(--loss))';

                        const priceRange = maxPrice - minPrice;
                        const chartHeight = 300;

                        const highY = ((maxPrice - high) / priceRange) * chartHeight + 10;
                        const lowY = ((maxPrice - low) / priceRange) * chartHeight + 10;
                        const openY = ((maxPrice - open) / priceRange) * chartHeight + 10;
                        const closeY = ((maxPrice - close) / priceRange) * chartHeight + 10;

                        const bodyTop = Math.min(openY, closeY);
                        const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
                        const barWidth = Math.max(width * 0.6, 2);
                        const barX = x + (width - barWidth) / 2;

                        return (
                          <g>
                            <line
                              x1={x + width / 2}
                              x2={x + width / 2}
                              y1={highY}
                              y2={lowY}
                              stroke={color}
                              strokeWidth={1}
                            />
                            <rect
                              x={barX}
                              y={bodyTop}
                              width={barWidth}
                              height={bodyHeight}
                              fill={color}
                              stroke={color}
                            />
                          </g>
                        );
                      }}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>

            {/* Volume Chart */}
            <div className="h-[60px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [formatVolume(value), 'Volume']}
                  />
                  <Bar
                    dataKey="volume"
                    fill="hsl(var(--muted-foreground))"
                    opacity={0.5}
                    radius={[2, 2, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
