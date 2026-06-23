import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface StrategyConfig {
  name: string;
  description: string;
  legs: OptionLeg[];
  stockPrice: number;
  maxProfit?: number;
  maxLoss?: number;
  breakeven?: number[];
}

export interface OptionLeg {
  type: 'call' | 'put' | 'stock';
  position: 'long' | 'short';
  strike?: number;
  premium?: number;
  quantity?: number;
}

function calculatePayoff(config: StrategyConfig, price: number): number {
  let payoff = 0;
  
  for (const leg of config.legs) {
    const qty = leg.quantity || 1;
    const multiplier = leg.position === 'long' ? 1 : -1;
    
    if (leg.type === 'stock') {
      payoff += multiplier * (price - config.stockPrice) * qty * 100;
    } else if (leg.type === 'call' && leg.strike !== undefined) {
      const intrinsic = Math.max(0, price - leg.strike);
      const premium = leg.premium || 0;
      payoff += multiplier * (intrinsic - premium) * qty * 100;
    } else if (leg.type === 'put' && leg.strike !== undefined) {
      const intrinsic = Math.max(0, leg.strike - price);
      const premium = leg.premium || 0;
      payoff += multiplier * (intrinsic - premium) * qty * 100;
    }
  }
  
  return payoff;
}

interface StrategyPayoffChartProps {
  config: StrategyConfig;
  className?: string;
}

export function StrategyPayoffChart({ config, className }: StrategyPayoffChartProps) {
  const data = useMemo(() => {
    const strikes = config.legs
      .filter(l => l.strike !== undefined)
      .map(l => l.strike as number);
    
    const minStrike = Math.min(...strikes, config.stockPrice);
    const maxStrike = Math.max(...strikes, config.stockPrice);
    const range = maxStrike - minStrike || config.stockPrice * 0.2;
    
    const start = Math.max(0, minStrike - range * 0.5);
    const end = maxStrike + range * 0.5;
    const step = (end - start) / 50;
    
    const points = [];
    for (let price = start; price <= end; price += step) {
      const payoff = calculatePayoff(config, price);
      points.push({
        price: Math.round(price * 100) / 100,
        payoff: Math.round(payoff * 100) / 100,
        profit: payoff >= 0 ? payoff : 0,
        loss: payoff < 0 ? payoff : 0,
      });
    }
    
    return points;
  }, [config]);

  const maxPayoff = Math.max(...data.map(d => d.payoff));
  const minPayoff = Math.min(...data.map(d => d.payoff));
  
  // Find breakeven points
  const breakevenPoints = useMemo(() => {
    const points: number[] = [];
    for (let i = 1; i < data.length; i++) {
      if ((data[i-1].payoff < 0 && data[i].payoff >= 0) || 
          (data[i-1].payoff >= 0 && data[i].payoff < 0)) {
        points.push(data[i].price);
      }
    }
    return points;
  }, [data]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{config.name} P/L Diagram</CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--gain))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--gain))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor="hsl(var(--loss))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--loss))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="price" 
                tickFormatter={(v) => `$${v}`}
                className="text-xs"
              />
              <YAxis 
                tickFormatter={(v) => `$${v >= 0 ? '+' : ''}${v}`}
                className="text-xs"
                domain={[minPayoff * 1.1, maxPayoff * 1.1]}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2 shadow-lg">
                        <p className="text-sm font-medium">Stock Price: ${data.price}</p>
                        <p className={`text-sm font-semibold ${data.payoff >= 0 ? 'text-gain' : 'text-loss'}`}>
                          P/L: ${data.payoff >= 0 ? '+' : ''}{data.payoff.toFixed(0)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={2} />
              <ReferenceLine 
                x={config.stockPrice} 
                stroke="hsl(var(--primary))" 
                strokeDasharray="5 5"
                label={{ value: 'Current', position: 'top', fill: 'hsl(var(--primary))' }}
              />
              {breakevenPoints.map((be, i) => (
                <ReferenceLine 
                  key={i}
                  x={be} 
                  stroke="hsl(var(--chart-3))" 
                  strokeDasharray="3 3"
                />
              ))}
              <Area
                type="monotone"
                dataKey="profit"
                stroke="none"
                fill="url(#profitGradient)"
              />
              <Area
                type="monotone"
                dataKey="loss"
                stroke="none"
                fill="url(#lossGradient)"
              />
              <Line 
                type="monotone" 
                dataKey="payoff" 
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Max Profit</p>
            <p className="text-sm font-semibold text-gain">
              {config.maxProfit !== undefined 
                ? config.maxProfit === Infinity ? 'Unlimited' : `$${config.maxProfit}`
                : `$${maxPayoff.toFixed(0)}`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Max Loss</p>
            <p className="text-sm font-semibold text-loss">
              {config.maxLoss !== undefined 
                ? `$${Math.abs(config.maxLoss)}`
                : `$${Math.abs(minPayoff).toFixed(0)}`}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Breakeven</p>
            <p className="text-sm font-semibold">
              {breakevenPoints.length > 0 
                ? breakevenPoints.map(b => `$${b.toFixed(0)}`).join(', ')
                : 'N/A'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Pre-configured strategy examples
export const STRATEGY_CONFIGS: Record<string, (stockPrice: number) => StrategyConfig> = {
  'covered-call': (stockPrice) => ({
    name: 'Covered Call',
    description: 'Long 100 shares + Short 1 Call',
    stockPrice,
    legs: [
      { type: 'stock', position: 'long', quantity: 1 },
      { type: 'call', position: 'short', strike: stockPrice * 1.05, premium: stockPrice * 0.02 },
    ],
  }),
  'protective-put': (stockPrice) => ({
    name: 'Protective Put',
    description: 'Long 100 shares + Long 1 Put',
    stockPrice,
    legs: [
      { type: 'stock', position: 'long', quantity: 1 },
      { type: 'put', position: 'long', strike: stockPrice * 0.95, premium: stockPrice * 0.02 },
    ],
  }),
  'bull-call-spread': (stockPrice) => ({
    name: 'Bull Call Spread',
    description: 'Long Call + Short higher strike Call',
    stockPrice,
    legs: [
      { type: 'call', position: 'long', strike: stockPrice, premium: stockPrice * 0.03 },
      { type: 'call', position: 'short', strike: stockPrice * 1.1, premium: stockPrice * 0.01 },
    ],
  }),
  'bear-put-spread': (stockPrice) => ({
    name: 'Bear Put Spread',
    description: 'Long Put + Short lower strike Put',
    stockPrice,
    legs: [
      { type: 'put', position: 'long', strike: stockPrice, premium: stockPrice * 0.03 },
      { type: 'put', position: 'short', strike: stockPrice * 0.9, premium: stockPrice * 0.01 },
    ],
  }),
  'iron-condor': (stockPrice) => ({
    name: 'Iron Condor',
    description: 'Bull Put Spread + Bear Call Spread',
    stockPrice,
    legs: [
      { type: 'put', position: 'short', strike: stockPrice * 0.95, premium: stockPrice * 0.015 },
      { type: 'put', position: 'long', strike: stockPrice * 0.9, premium: stockPrice * 0.008 },
      { type: 'call', position: 'short', strike: stockPrice * 1.05, premium: stockPrice * 0.015 },
      { type: 'call', position: 'long', strike: stockPrice * 1.1, premium: stockPrice * 0.008 },
    ],
  }),
  'straddle': (stockPrice) => ({
    name: 'Long Straddle',
    description: 'Long Call + Long Put at same strike',
    stockPrice,
    legs: [
      { type: 'call', position: 'long', strike: stockPrice, premium: stockPrice * 0.03 },
      { type: 'put', position: 'long', strike: stockPrice, premium: stockPrice * 0.03 },
    ],
  }),
  'strangle': (stockPrice) => ({
    name: 'Long Strangle',
    description: 'Long OTM Call + Long OTM Put',
    stockPrice,
    legs: [
      { type: 'call', position: 'long', strike: stockPrice * 1.05, premium: stockPrice * 0.02 },
      { type: 'put', position: 'long', strike: stockPrice * 0.95, premium: stockPrice * 0.02 },
    ],
  }),
  'iron-butterfly': (stockPrice) => ({
    name: 'Iron Butterfly',
    description: 'Short Straddle with wing protection',
    stockPrice,
    legs: [
      { type: 'put', position: 'long', strike: stockPrice * 0.9, premium: stockPrice * 0.01 },
      { type: 'put', position: 'short', strike: stockPrice, premium: stockPrice * 0.03 },
      { type: 'call', position: 'short', strike: stockPrice, premium: stockPrice * 0.03 },
      { type: 'call', position: 'long', strike: stockPrice * 1.1, premium: stockPrice * 0.01 },
    ],
  }),
  // 0DTE Strategies - tighter strikes and lower premiums due to same-day expiration
  '0dte-bull-put-spread': (stockPrice) => ({
    name: '0DTE Bull Put Spread',
    description: 'Sell put + buy lower put (same-day expiration)',
    stockPrice,
    legs: [
      { type: 'put', position: 'short', strike: stockPrice * 0.99, premium: stockPrice * 0.004 },
      { type: 'put', position: 'long', strike: stockPrice * 0.98, premium: stockPrice * 0.002 },
    ],
  }),
  '0dte-bear-call-spread': (stockPrice) => ({
    name: '0DTE Bear Call Spread',
    description: 'Sell call + buy higher call (same-day expiration)',
    stockPrice,
    legs: [
      { type: 'call', position: 'short', strike: stockPrice * 1.01, premium: stockPrice * 0.004 },
      { type: 'call', position: 'long', strike: stockPrice * 1.02, premium: stockPrice * 0.002 },
    ],
  }),
  '0dte-iron-condor': (stockPrice) => ({
    name: '0DTE Iron Condor',
    description: 'Bull put + bear call spread (same-day expiration)',
    stockPrice,
    legs: [
      { type: 'put', position: 'short', strike: stockPrice * 0.99, premium: stockPrice * 0.003 },
      { type: 'put', position: 'long', strike: stockPrice * 0.98, premium: stockPrice * 0.001 },
      { type: 'call', position: 'short', strike: stockPrice * 1.01, premium: stockPrice * 0.003 },
      { type: 'call', position: 'long', strike: stockPrice * 1.02, premium: stockPrice * 0.001 },
    ],
  }),
  '0dte-iron-butterfly': (stockPrice) => ({
    name: '0DTE Iron Butterfly',
    description: 'ATM short straddle with wings (same-day expiration)',
    stockPrice,
    legs: [
      { type: 'put', position: 'long', strike: stockPrice * 0.98, premium: stockPrice * 0.001 },
      { type: 'put', position: 'short', strike: stockPrice, premium: stockPrice * 0.005 },
      { type: 'call', position: 'short', strike: stockPrice, premium: stockPrice * 0.005 },
      { type: 'call', position: 'long', strike: stockPrice * 1.02, premium: stockPrice * 0.001 },
    ],
  }),
};
