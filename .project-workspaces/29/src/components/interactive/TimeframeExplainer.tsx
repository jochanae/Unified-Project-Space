import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { 
  Clock, 
  Lightbulb,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Generate price data that looks consistent across timeframes
function generateConsistentPriceData(
  basePrice: number,
  volatility: number,
  points: number,
  trend: number
): { x: number; price: number; ma20: number }[] {
  const data: { x: number; price: number; ma20: number }[] = [];
  let price = basePrice;
  const priceHistory: number[] = [];
  
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.5) * volatility;
    const trendComponent = trend * (1 + Math.sin(i / 10) * 0.3);
    price += trendComponent + noise;
    price = Math.max(price, basePrice * 0.8);
    
    priceHistory.push(price);
    
    // 20-period moving average
    const ma20 = priceHistory.length >= 20
      ? priceHistory.slice(-20).reduce((a, b) => a + b, 0) / 20
      : priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
    
    data.push({
      x: i,
      price: Math.round(price * 100) / 100,
      ma20: Math.round(ma20 * 100) / 100,
    });
  }
  
  return data;
}

interface TimeframeInfo {
  id: string;
  label: string;
  description: string;
  useCase: string;
  traderType: string;
  holdingPeriod: string;
  pros: string[];
  cons: string[];
  dataPoints: number;
  volatility: number;
}

const TIMEFRAMES: TimeframeInfo[] = [
  {
    id: '1m',
    label: '1 Minute',
    description: 'Each candle represents 1 minute of trading',
    useCase: 'Scalping - very quick trades',
    traderType: 'Day Trader / Scalper',
    holdingPeriod: 'Seconds to minutes',
    pros: ['Precise entries', 'Quick profits', 'Many opportunities'],
    cons: ['Very noisy', 'High stress', 'Transaction costs add up'],
    dataPoints: 60,
    volatility: 0.3,
  },
  {
    id: '5m',
    label: '5 Minutes',
    description: 'Each candle represents 5 minutes of trading',
    useCase: 'Day trading - intraday positions',
    traderType: 'Day Trader',
    holdingPeriod: 'Minutes to hours',
    pros: ['Less noise than 1m', 'Good for momentum trades', 'Clear patterns'],
    cons: ['Still requires constant attention', 'Intraday only'],
    dataPoints: 48,
    volatility: 0.5,
  },
  {
    id: '1h',
    label: '1 Hour',
    description: 'Each candle represents 1 hour of trading',
    useCase: 'Swing trading setup',
    traderType: 'Swing Trader',
    holdingPeriod: 'Hours to days',
    pros: ['Clearer trends', 'Less screen time', 'Better signals'],
    cons: ['Fewer opportunities', 'Overnight risk'],
    dataPoints: 40,
    volatility: 1,
  },
  {
    id: '1d',
    label: 'Daily',
    description: 'Each candle represents a full trading day',
    useCase: 'Position trading & investing',
    traderType: 'Position Trader / Investor',
    holdingPeriod: 'Days to weeks',
    pros: ['Major trends visible', 'Minimal screen time', 'Less stressful'],
    cons: ['Larger stops needed', 'Slower returns'],
    dataPoints: 50,
    volatility: 2,
  },
  {
    id: '1w',
    label: 'Weekly',
    description: 'Each candle represents a full trading week',
    useCase: 'Long-term investing',
    traderType: 'Long-term Investor',
    holdingPeriod: 'Weeks to months',
    pros: ['Big picture view', 'Strong signals', 'Low maintenance'],
    cons: ['Very large stops', 'Capital intensive'],
    dataPoints: 52,
    volatility: 3,
  },
];

interface TimeframeExplainerProps {
  className?: string;
  onComplete?: () => void;
}

export function TimeframeExplainer({ className, onComplete }: TimeframeExplainerProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d');
  const [visitedTimeframes, setVisitedTimeframes] = useState<Set<string>>(new Set(['1d']));
  const [showMA, setShowMA] = useState(true);
  
  const timeframe = TIMEFRAMES.find(t => t.id === selectedTimeframe)!;
  
  const chartData = useMemo(() => 
    generateConsistentPriceData(175, timeframe.volatility, timeframe.dataPoints, 0.15),
    [timeframe.id]
  );
  
  const handleTimeframeChange = (tf: string) => {
    setSelectedTimeframe(tf);
    setVisitedTimeframes(prev => new Set([...prev, tf]));
  };
  
  const allVisited = TIMEFRAMES.every(tf => visitedTimeframes.has(tf.id));
  
  const minPrice = Math.min(...chartData.map(d => Math.min(d.price, d.ma20))) * 0.99;
  const maxPrice = Math.max(...chartData.map(d => Math.max(d.price, d.ma20))) * 1.01;
  
  const lastPrice = chartData[chartData.length - 1].price;
  const firstPrice = chartData[0].price;
  const priceChange = ((lastPrice - firstPrice) / firstPrice * 100);
  const isUp = priceChange >= 0;
  
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              ⏱️ Timeframe Explorer
              <Badge variant="outline" className="bg-chart-4/10 text-chart-4 border-chart-4/30">
                Interactive
              </Badge>
            </CardTitle>
            <CardDescription>
              See how the same stock looks different on various timeframes
            </CardDescription>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMA(!showMA)}
          >
            {showMA ? 'Hide' : 'Show'} Moving Avg
          </Button>
        </div>
        
        {/* Progress */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-xs text-muted-foreground">Explored:</span>
          <div className="flex gap-1">
            {TIMEFRAMES.map(tf => (
              <div
                key={tf.id}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  visitedTimeframes.has(tf.id) ? 'bg-gain' : 'bg-muted-foreground/30'
                )}
                title={tf.label}
              />
            ))}
          </div>
          {allVisited && (
            <Badge className="bg-gain text-white ml-auto">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              All explored!
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Timeframe Tabs */}
        <Tabs value={selectedTimeframe} onValueChange={handleTimeframeChange}>
          <TabsList className="grid grid-cols-5 w-full">
            {TIMEFRAMES.map(tf => (
              <TabsTrigger key={tf.id} value={tf.id} className="text-xs">
                {tf.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        {/* Price Info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{timeframe.description}</p>
          </div>
          <Badge variant="outline" className={cn(
            isUp ? 'border-gain/50 text-gain bg-gain/10' : 'border-loss/50 text-loss bg-loss/10'
          )}>
            {isUp ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
            {isUp ? '+' : ''}{priceChange.toFixed(2)}%
          </Badge>
        </div>
        
        {/* Chart */}
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.5} />
              <XAxis 
                dataKey="x" 
                tick={false}
                axisLine={false}
              />
              <YAxis 
                domain={[minPrice, maxPrice]}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke={isUp ? 'hsl(var(--gain))' : 'hsl(var(--loss))'}
                strokeWidth={2}
                dot={false}
              />
              {showMA && (
                <Line 
                  type="monotone" 
                  dataKey="ma20" 
                  stroke="hsl(var(--chart-3))"
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        {showMA && (
          <div className="flex gap-4 text-xs justify-center">
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-primary rounded" />
              <span>Price</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-0.5 bg-chart-3 rounded" style={{ borderStyle: 'dashed' }} />
              <span>20-Period MA</span>
            </div>
          </div>
        )}
        
        {/* Timeframe Info Card */}
        <div className="p-4 rounded-lg bg-muted/50 space-y-3">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold">{timeframe.label} Chart</h4>
              <p className="text-sm text-muted-foreground">{timeframe.useCase}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Trader Type</p>
              <p className="font-medium">{timeframe.traderType}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Holding Period</p>
              <p className="font-medium">{timeframe.holdingPeriod}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gain text-xs font-medium">✓ Pros</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {timeframe.pros.map((pro, i) => (
                  <li key={i}>• {pro}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-loss text-xs font-medium">✗ Cons</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {timeframe.cons.map((con, i) => (
                  <li key={i}>• {con}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Key Insight */}
        <div className="p-3 rounded-lg bg-chart-3/10 border border-chart-3/30 text-sm">
          <div className="flex gap-2">
            <Lightbulb className="h-4 w-4 text-chart-3 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-chart-3">Key Insight</p>
              <p className="text-muted-foreground">
                {selectedTimeframe === '1m' && "1-minute charts are extremely noisy. What looks like a trend might just be random fluctuation. Only for experienced traders!"}
                {selectedTimeframe === '5m' && "5-minute charts balance detail with clarity. Popular for day traders who want to catch intraday moves without excessive noise."}
                {selectedTimeframe === '1h' && "Hourly charts smooth out the noise and reveal cleaner trends. Great for swing traders who don't need to watch charts all day."}
                {selectedTimeframe === '1d' && "Daily charts show the true trend. Most successful traders use daily charts as their primary timeframe. Less stress, clearer signals."}
                {selectedTimeframe === '1w' && "Weekly charts show major market cycles. If you can only look at charts once a week, this is for you. Patience pays off!"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Completion CTA */}
        {allVisited && onComplete && (
          <div className="flex justify-center pt-4">
            <Button onClick={onComplete} className="gap-2">
              Continue to Next Module
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
