import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Zap, PiggyBank, Wallet, TrendingUp, Sparkles } from "lucide-react";

interface WhatIfSimulatorProps {
  baseIncome: number;
  baseSavings: number;
  baseMonthlyNet: number;
}

const WhatIfSimulator = ({ baseIncome, baseSavings, baseMonthlyNet }: WhatIfSimulatorProps) => {
  const [incomeIncrease, setIncomeIncrease] = useState(0);
  const [projectionMonths, setProjectionMonths] = useState(12);

  const projectedIncome = baseIncome + incomeIncrease;
  const projectedMonthlyNet = baseMonthlyNet + incomeIncrease;
  const projectedTotalSavings = baseSavings + (projectedMonthlyNet * projectionMonths);
  const savingsGrowth = projectedTotalSavings - baseSavings;
  const monthlyChange = incomeIncrease;

  return (
    <div className="p-4 space-y-4">
      {/* Adjust Values Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Adjust Values</CardTitle>
          <p className="text-sm text-muted-foreground">Move the sliders to see impact</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Monthly Income Increase */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Monthly Income Increase</span>
              <span className="text-primary font-semibold px-3 py-1 bg-primary/10 rounded-full">
                +${incomeIncrease.toLocaleString()}
              </span>
            </div>
            <Slider
              value={[incomeIncrease]}
              onValueChange={(v) => setIncomeIncrease(v[0])}
              min={0}
              max={5000}
              step={100}
              className="w-full"
            />
            <div className="text-sm text-muted-foreground">
              From ${baseIncome.toLocaleString()} → ${projectedIncome.toLocaleString()}
            </div>
          </div>

          {/* Projection Period */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Projection Period</span>
              <span className="px-3 py-1 border rounded-full text-sm font-medium">
                {projectionMonths} months
              </span>
            </div>
            <Slider
              value={[projectionMonths]}
              onValueChange={(v) => setProjectionMonths(v[0])}
              min={3}
              max={36}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>3 months</span>
              <span>3 years</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current vs Projected */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-t-4 border-t-muted">
          <CardContent className="p-4">
            <p className="font-semibold text-lg mb-3">Current</p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Monthly Net</p>
              <p className="text-2xl font-bold">${baseMonthlyNet.toLocaleString()}</p>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-muted-foreground">Savings</p>
              <p className="text-xl font-bold">${baseSavings.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-gradient-to-r from-rose-500 to-amber-500" style={{ borderTopColor: '#ef4444' }}>
          <CardContent className="p-4">
            <p className="font-semibold text-lg mb-3 flex items-center gap-1">
              Projected <Sparkles className="w-4 h-4 text-primary" />
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Monthly Net</p>
              <p className="text-2xl font-bold text-emerald-600">
                ${projectedMonthlyNet.toLocaleString()}
              </p>
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm text-muted-foreground">In {projectionMonths} months</p>
              <p className="text-xl font-bold text-emerald-600">
                ${projectedTotalSavings.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Impact Analysis */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Impact in {projectionMonths} Months
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-full">
                <PiggyBank className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Savings Growth</p>
                <p className="text-sm text-muted-foreground">Total added to savings</p>
              </div>
            </div>
            <p className="text-xl font-bold text-emerald-600">
              +${savingsGrowth.toLocaleString()}
            </p>
          </div>

          <div className="flex items-center justify-between p-3 bg-background rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-100 rounded-full">
                <Wallet className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="font-medium">Monthly Change</p>
                <p className="text-sm text-muted-foreground">Net income difference</p>
              </div>
            </div>
            <p className={`text-xl font-bold ${monthlyChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ${monthlyChange.toLocaleString()}
            </p>
          </div>

          <div className="p-4 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">Future Net Worth</p>
                <p className="text-sm text-muted-foreground">Projected total value</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">
                  ${projectedTotalSavings.toLocaleString()}
                </p>
                <p className="text-sm text-emerald-600">
                  +${savingsGrowth.toLocaleString()} vs today
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Insights */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500 mt-0.5" />
            <p className="text-sm">
              You could save over <span className="font-bold">${savingsGrowth.toLocaleString()}</span> in {projectionMonths} months!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatIfSimulator;
