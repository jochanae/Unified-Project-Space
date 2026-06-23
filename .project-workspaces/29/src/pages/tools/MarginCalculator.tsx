import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Scale, DollarSign, AlertTriangle, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

type MarginType = '2x' | '3x' | '4x' | '5x' | '10x' | '20x' | 'custom';

export default function MarginCalculator() {
  const [accountBalance, setAccountBalance] = useState(10000);
  const [positionSize, setPositionSize] = useState(50000);
  const [leverageType, setLeverageType] = useState<MarginType>('5x');
  const [customLeverage, setCustomLeverage] = useState(5);
  const [entryPrice, setEntryPrice] = useState(100);
  const [maintenanceMargin, setMaintenanceMargin] = useState(25); // percentage

  const getLeverage = () => {
    if (leverageType === 'custom') return customLeverage;
    return parseInt(leverageType.replace('x', ''));
  };

  const leverage = getLeverage();
  const marginRequired = positionSize / leverage;
  const marginPercent = (marginRequired / accountBalance) * 100;
  const freeMargin = accountBalance - marginRequired;
  
  const shares = entryPrice > 0 ? positionSize / entryPrice : 0;
  
  // Calculate liquidation price (simplified)
  const maintenanceAmount = positionSize * (maintenanceMargin / 100);
  const bufferBeforeLiquidation = accountBalance - maintenanceAmount;
  const priceDropForLiquidation = shares > 0 ? bufferBeforeLiquidation / shares : 0;
  const liquidationPrice = entryPrice - priceDropForLiquidation;
  const liquidationPercent = entryPrice > 0 ? ((entryPrice - liquidationPrice) / entryPrice) * 100 : 0;

  // P&L examples
  const priceChange5Percent = entryPrice * 0.05;
  const pnl5Percent = shares * priceChange5Percent;
  const returnOn5Percent = (pnl5Percent / marginRequired) * 100;

  const isOverLeveraged = marginPercent > 100;
  const isHighRisk = marginPercent > 80;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 pb-20 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-5 to-chart-3 shadow-lg">
            <Scale className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Margin Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Calculate margin requirements for leveraged positions
            </p>
          </div>
        </div>

        {isOverLeveraged && (
          <Card className="border-loss bg-loss/10">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-loss shrink-0" />
              <p className="text-sm text-loss">
                Position size exceeds available margin! Reduce position or add funds.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Position Parameters</CardTitle>
              <CardDescription>Configure your leveraged trade</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Account Balance
                </Label>
                <Input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Total Position Size
                </Label>
                <Input
                  type="number"
                  value={positionSize}
                  onChange={(e) => setPositionSize(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Leverage</Label>
                  <Select value={leverageType} onValueChange={(v) => setLeverageType(v as MarginType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2x">2x</SelectItem>
                      <SelectItem value="3x">3x</SelectItem>
                      <SelectItem value="4x">4x</SelectItem>
                      <SelectItem value="5x">5x</SelectItem>
                      <SelectItem value="10x">10x</SelectItem>
                      <SelectItem value="20x">20x</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {leverageType === 'custom' && (
                  <div className="space-y-2">
                    <Label>Custom Leverage</Label>
                    <Input
                      type="number"
                      min="1"
                      value={customLeverage}
                      onChange={(e) => setCustomLeverage(parseFloat(e.target.value) || 1)}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Entry Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  Maintenance Margin %
                </Label>
                <Input
                  type="number"
                  step="1"
                  value={maintenanceMargin}
                  onChange={(e) => setMaintenanceMargin(parseFloat(e.target.value) || 0)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <Card className={cn(
              "border-2",
              isOverLeveraged ? "border-loss bg-loss/5" : 
              isHighRisk ? "border-gold bg-gold/5" : 
              "border-gain/20 bg-gain/5"
            )}>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Required Margin</p>
                  <p className={cn(
                    "text-4xl font-bold",
                    isOverLeveraged ? "text-loss" : isHighRisk ? "text-gold" : "text-foreground"
                  )}>
                    ${marginRequired.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {marginPercent.toFixed(1)}% of account
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Free Margin</p>
                  <p className={cn("text-2xl font-bold", freeMargin < 0 ? "text-loss" : "text-foreground")}>
                    ${freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Shares/Units</p>
                  <p className="text-2xl font-bold">{shares.toFixed(2)}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-loss/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-loss" />
                  <span className="font-medium">Liquidation Warning</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Estimated liquidation at <strong className="text-loss">${liquidationPrice.toFixed(2)}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  A {liquidationPercent.toFixed(1)}% drop from entry would trigger liquidation
                </p>
              </CardContent>
            </Card>

            <Card className="bg-muted/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">5% Price Movement P&L</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">If price rises 5%:</span>
                  <span className="text-gain font-medium">+${pnl5Percent.toFixed(2)} ({returnOn5Percent.toFixed(0)}% return)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">If price falls 5%:</span>
                  <span className="text-loss font-medium">-${pnl5Percent.toFixed(2)} ({returnOn5Percent.toFixed(0)}% loss)</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
