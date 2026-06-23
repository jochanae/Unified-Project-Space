import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp, TrendingDown, Target, ArrowRight, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RiskRewardCalculator() {
  const [entryPrice, setEntryPrice] = useState(100);
  const [stopLoss, setStopLoss] = useState(95);
  const [takeProfit, setTakeProfit] = useState(115);
  const [shares, setShares] = useState(100);

  const isLong = takeProfit > entryPrice;
  const risk = Math.abs(entryPrice - stopLoss);
  const reward = Math.abs(takeProfit - entryPrice);
  const riskRewardRatio = risk > 0 ? reward / risk : 0;
  
  const riskDollars = risk * shares;
  const rewardDollars = reward * shares;
  
  const riskPercent = entryPrice > 0 ? (risk / entryPrice) * 100 : 0;
  const rewardPercent = entryPrice > 0 ? (reward / entryPrice) * 100 : 0;

  // Calculate required win rate to be profitable
  const requiredWinRate = riskRewardRatio > 0 ? (1 / (1 + riskRewardRatio)) * 100 : 100;

  // Visual ratio bar
  const totalRange = risk + reward;
  const riskWidth = totalRange > 0 ? (risk / totalRange) * 100 : 50;
  const rewardWidth = totalRange > 0 ? (reward / totalRange) * 100 : 50;

  const getRatioQuality = () => {
    if (riskRewardRatio >= 3) return { label: 'Excellent', color: 'text-gain', bg: 'bg-gain/10' };
    if (riskRewardRatio >= 2) return { label: 'Good', color: 'text-chart-3', bg: 'bg-chart-3/10' };
    if (riskRewardRatio >= 1) return { label: 'Fair', color: 'text-gold', bg: 'bg-gold/10' };
    return { label: 'Poor', color: 'text-loss', bg: 'bg-loss/10' };
  };

  const quality = getRatioQuality();

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 pb-20 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gain to-chart-3 shadow-lg">
            <TrendingUp className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Risk/Reward Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Visualize and plan your trade R:R ratios
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trade Setup</CardTitle>
              <CardDescription>Enter your planned entry, stop, and target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Entry Price
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-loss" />
                  Stop Loss
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-gain" />
                  Take Profit
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label>Number of Shares</Label>
                <Input
                  type="number"
                  value={shares}
                  onChange={(e) => setShares(parseInt(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            {/* Main Ratio Display */}
            <Card className={cn("border-2", quality.bg, quality.color.replace('text-', 'border-'))}>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Risk : Reward Ratio</p>
                  <p className="text-5xl font-bold">1 : {riskRewardRatio.toFixed(2)}</p>
                  <span className={cn("inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium", quality.bg, quality.color)}>
                    {quality.label}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Visual Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-loss font-medium">Risk</span>
                    <span className="text-gain font-medium">Reward</span>
                  </div>
                  <div className="flex h-8 rounded-lg overflow-hidden">
                    <div 
                      className="bg-loss/70 flex items-center justify-center text-xs font-medium text-white"
                      style={{ width: `${riskWidth}%` }}
                    >
                      {riskPercent.toFixed(1)}%
                    </div>
                    <div 
                      className="bg-gain/70 flex items-center justify-center text-xs font-medium text-white"
                      style={{ width: `${rewardWidth}%` }}
                    >
                      {rewardPercent.toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>${riskDollars.toFixed(2)}</span>
                    <span>${rewardDollars.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <XCircle className="h-5 w-5 text-loss mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Max Loss</p>
                  <p className="text-xl font-bold text-loss">${riskDollars.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-5 w-5 text-gain mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">Max Profit</p>
                  <p className="text-xl font-bold text-gain">${rewardDollars.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  With this R:R, you need a <strong className="text-foreground">{requiredWinRate.toFixed(1)}% win rate</strong> to break even. 
                  Higher R:R ratios allow profitability with lower win rates.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
