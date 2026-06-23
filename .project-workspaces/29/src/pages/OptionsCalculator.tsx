import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, TrendingUp, TrendingDown, Target, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptionParams {
  stockPrice: number;
  strikePrice: number;
  premium: number;
  contracts: number;
  optionType: 'call' | 'put';
  position: 'buy' | 'sell';
}

interface CalculationResult {
  maxProfit: number | 'unlimited';
  maxLoss: number | 'unlimited';
  breakeven: number;
  profitAtExpiry: (price: number) => number;
}

function calculateOption(params: OptionParams): CalculationResult {
  const { stockPrice, strikePrice, premium, contracts, optionType, position } = params;
  const totalPremium = premium * contracts * 100;

  if (optionType === 'call') {
    if (position === 'buy') {
      return {
        maxProfit: 'unlimited',
        maxLoss: totalPremium,
        breakeven: strikePrice + premium,
        profitAtExpiry: (price: number) => {
          if (price <= strikePrice) return -totalPremium;
          return (price - strikePrice) * contracts * 100 - totalPremium;
        },
      };
    } else {
      return {
        maxProfit: totalPremium,
        maxLoss: 'unlimited',
        breakeven: strikePrice + premium,
        profitAtExpiry: (price: number) => {
          if (price <= strikePrice) return totalPremium;
          return totalPremium - (price - strikePrice) * contracts * 100;
        },
      };
    }
  } else {
    if (position === 'buy') {
      return {
        maxProfit: (strikePrice - premium) * contracts * 100,
        maxLoss: totalPremium,
        breakeven: strikePrice - premium,
        profitAtExpiry: (price: number) => {
          if (price >= strikePrice) return -totalPremium;
          return (strikePrice - price) * contracts * 100 - totalPremium;
        },
      };
    } else {
      return {
        maxProfit: totalPremium,
        maxLoss: (strikePrice - premium) * contracts * 100,
        breakeven: strikePrice - premium,
        profitAtExpiry: (price: number) => {
          if (price >= strikePrice) return totalPremium;
          return totalPremium - (strikePrice - price) * contracts * 100;
        },
      };
    }
  }
}

// Black-Scholes Greeks calculation (simplified)
function calculateGreeks(
  stockPrice: number,
  strikePrice: number,
  timeToExpiry: number, // in years
  volatility: number, // as decimal (e.g., 0.30 for 30%)
  riskFreeRate: number, // as decimal
  optionType: 'call' | 'put'
) {
  const S = stockPrice;
  const K = strikePrice;
  const T = timeToExpiry;
  const r = riskFreeRate;
  const sigma = volatility;

  // Standard normal CDF approximation
  const normCDF = (x: number): number => {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  };

  // Standard normal PDF
  const normPDF = (x: number): number => {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
  };

  if (T <= 0) {
    return { delta: 0, gamma: 0, theta: 0, vega: 0, rho: 0 };
  }

  const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
  const d2 = d1 - sigma * Math.sqrt(T);

  let delta, gamma, theta, vega, rho;

  gamma = normPDF(d1) / (S * sigma * Math.sqrt(T));
  vega = S * normPDF(d1) * Math.sqrt(T) / 100; // Per 1% change

  if (optionType === 'call') {
    delta = normCDF(d1);
    theta = (-(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normCDF(d2)) / 365;
    rho = K * T * Math.exp(-r * T) * normCDF(d2) / 100;
  } else {
    delta = normCDF(d1) - 1;
    theta = (-(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normCDF(-d2)) / 365;
    rho = -K * T * Math.exp(-r * T) * normCDF(-d2) / 100;
  }

  return {
    delta: Number(delta.toFixed(4)),
    gamma: Number(gamma.toFixed(4)),
    theta: Number(theta.toFixed(4)),
    vega: Number(vega.toFixed(4)),
    rho: Number(rho.toFixed(4)),
  };
}

export default function OptionsCalculator() {
  const [params, setParams] = useState<OptionParams>({
    stockPrice: 150,
    strikePrice: 155,
    premium: 3.5,
    contracts: 1,
    optionType: 'call',
    position: 'buy',
  });

  const [greeksParams, setGreeksParams] = useState({
    volatility: 30,
    daysToExpiry: 30,
    riskFreeRate: 5,
  });

  const result = calculateOption(params);
  const greeks = calculateGreeks(
    params.stockPrice,
    params.strikePrice,
    greeksParams.daysToExpiry / 365,
    greeksParams.volatility / 100,
    greeksParams.riskFreeRate / 100,
    params.optionType
  );

  const formatCurrency = (value: number | 'unlimited') => {
    if (value === 'unlimited') return 'Unlimited';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  // Calculate P&L at various prices for the chart
  const pricePoints = [];
  const minPrice = params.stockPrice * 0.7;
  const maxPrice = params.stockPrice * 1.3;
  const step = (maxPrice - minPrice) / 20;

  for (let price = minPrice; price <= maxPrice; price += step) {
    pricePoints.push({
      price: price.toFixed(2),
      pnl: result.profitAtExpiry(price),
    });
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-4 to-chart-5 shadow-lg">
            <Calculator className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Options Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Calculate profit/loss, break-even, and Greeks
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input Parameters */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Option Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={params.optionType}
                    onValueChange={(v: 'call' | 'put') =>
                      setParams((p) => ({ ...p, optionType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="put">Put</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Position</Label>
                  <Select
                    value={params.position}
                    onValueChange={(v: 'buy' | 'sell') =>
                      setParams((p) => ({ ...p, position: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy (Long)</SelectItem>
                      <SelectItem value="sell">Sell (Short)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Stock Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={params.stockPrice}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, stockPrice: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Strike Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={params.strikePrice}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, strikePrice: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Premium (per share)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={params.premium}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, premium: parseFloat(e.target.value) || 0 }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Contracts</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  value={params.contracts}
                  onChange={(e) =>
                    setParams((p) => ({ ...p, contracts: parseInt(e.target.value) || 1 }))
                  }
                />
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Greeks Parameters</h4>
                <div className="space-y-2">
                  <Label>Days to Expiry</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={greeksParams.daysToExpiry}
                    onChange={(e) =>
                      setGreeksParams((p) => ({ ...p, daysToExpiry: parseInt(e.target.value) || 30 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Implied Volatility (%)</Label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    value={greeksParams.volatility}
                    onChange={(e) =>
                      setGreeksParams((p) => ({ ...p, volatility: parseFloat(e.target.value) || 30 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Risk-Free Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={greeksParams.riskFreeRate}
                    onChange={(e) =>
                      setGreeksParams((p) => ({ ...p, riskFreeRate: parseFloat(e.target.value) || 5 }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="pnl">
              <TabsList>
                <TabsTrigger value="pnl">P&L Analysis</TabsTrigger>
                <TabsTrigger value="greeks">The Greeks</TabsTrigger>
              </TabsList>

              <TabsContent value="pnl" className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-gain" />
                        <span className="text-xs text-muted-foreground">Max Profit</span>
                      </div>
                      <p className="text-lg font-bold text-gain">
                        {formatCurrency(result.maxProfit)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-loss" />
                        <span className="text-xs text-muted-foreground">Max Loss</span>
                      </div>
                      <p className="text-lg font-bold text-loss">
                        {formatCurrency(result.maxLoss)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Breakeven</span>
                      </div>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(result.breakeven)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* P&L Chart (Simple Bar Visualization) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Profit/Loss at Expiration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      {pricePoints.map((point, i) => {
                        const maxPnl = Math.max(...pricePoints.map((p) => Math.abs(p.pnl)));
                        const width = Math.min(Math.abs(point.pnl) / maxPnl * 100, 100);
                        const isProfit = point.pnl >= 0;
                        
                        return (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="w-16 text-right font-mono text-muted-foreground">
                              ${point.price}
                            </span>
                            <div className="flex-1 h-4 flex items-center">
                              <div className="w-1/2 flex justify-end">
                                {!isProfit && (
                                  <div
                                    className="h-3 bg-loss/60 rounded-l"
                                    style={{ width: `${width}%` }}
                                  />
                                )}
                              </div>
                              <div className="w-px h-4 bg-border" />
                              <div className="w-1/2">
                                {isProfit && (
                                  <div
                                    className="h-3 bg-gain/60 rounded-r"
                                    style={{ width: `${width}%` }}
                                  />
                                )}
                              </div>
                            </div>
                            <span
                              className={cn(
                                'w-20 text-right font-mono',
                                isProfit ? 'text-gain' : 'text-loss'
                              )}
                            >
                              {formatCurrency(point.pnl)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="greeks" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[
                    { name: 'Delta (Δ)', value: greeks.delta, desc: 'Price sensitivity' },
                    { name: 'Gamma (Γ)', value: greeks.gamma, desc: 'Delta sensitivity' },
                    { name: 'Theta (Θ)', value: greeks.theta, desc: 'Time decay/day' },
                    { name: 'Vega (ν)', value: greeks.vega, desc: 'Vol sensitivity' },
                    { name: 'Rho (ρ)', value: greeks.rho, desc: 'Rate sensitivity' },
                  ].map((greek) => (
                    <Card key={greek.name}>
                      <CardContent className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">{greek.name}</p>
                        <p className="text-2xl font-bold">{greek.value}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{greek.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Greeks Explained
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>
                      <strong>Delta:</strong> How much the option price moves for a $1 change in
                      stock price.
                    </p>
                    <p>
                      <strong>Gamma:</strong> Rate of change of delta as stock price moves.
                    </p>
                    <p>
                      <strong>Theta:</strong> How much value the option loses each day (time
                      decay).
                    </p>
                    <p>
                      <strong>Vega:</strong> Sensitivity to a 1% change in implied volatility.
                    </p>
                    <p>
                      <strong>Rho:</strong> Sensitivity to a 1% change in interest rates.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
