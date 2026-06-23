import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Scale, AlertTriangle, DollarSign, Target, TrendingDown } from 'lucide-react';

export default function PositionSizeCalculator() {
  const [accountSize, setAccountSize] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(2);
  const [entryPrice, setEntryPrice] = useState(150);
  const [stopLoss, setStopLoss] = useState(145);

  const riskAmount = accountSize * (riskPercent / 100);
  const stopLossPercent = entryPrice > 0 ? ((entryPrice - stopLoss) / entryPrice) * 100 : 0;
  const riskPerShare = Math.abs(entryPrice - stopLoss);
  const positionSize = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const totalPosition = positionSize * entryPrice;
  const positionPercent = accountSize > 0 ? (totalPosition / accountSize) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 pb-20 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-1 to-chart-2 shadow-lg">
            <Scale className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Position Size Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Calculate optimal position size based on risk tolerance
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parameters</CardTitle>
              <CardDescription>Enter your trade details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Account Size
                </Label>
                <Input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(parseFloat(e.target.value) || 0)}
                  placeholder="10000"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    Risk Per Trade
                  </Label>
                  <span className="text-sm font-medium text-primary">{riskPercent}%</span>
                </div>
                <Slider
                  value={[riskPercent]}
                  onValueChange={([v]) => setRiskPercent(v)}
                  min={0.5}
                  max={10}
                  step={0.5}
                />
                <p className="text-xs text-muted-foreground">
                  Risking ${riskAmount.toFixed(2)} per trade
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Entry Price
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  placeholder="150.00"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-loss" />
                  Stop Loss Price
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                  placeholder="145.00"
                />
                <p className="text-xs text-muted-foreground">
                  Stop loss is {stopLossPercent.toFixed(2)}% below entry
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Optimal Position Size</p>
                  <p className="text-4xl font-bold text-primary">{positionSize} shares</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Total value: ${totalPosition.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Risk Amount</p>
                  <p className="text-2xl font-bold text-loss">${riskAmount.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Risk Per Share</p>
                  <p className="text-2xl font-bold">${riskPerShare.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Position %</p>
                  <p className="text-2xl font-bold">{positionPercent.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Stop Loss %</p>
                  <p className="text-2xl font-bold text-loss">{stopLossPercent.toFixed(2)}%</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Tip:</strong> Most professional traders risk 1-2% per trade to preserve capital 
                  during losing streaks. With this position size, you can afford {Math.floor(100 / riskPercent)} consecutive 
                  losses before losing your account.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
