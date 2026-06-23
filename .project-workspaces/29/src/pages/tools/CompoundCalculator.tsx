import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Percent, DollarSign, Calendar, TrendingUp, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type CompoundFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

const frequencyMap: Record<CompoundFrequency, number> = {
  daily: 365,
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  annually: 1,
};

export default function CompoundCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [annualRate, setAnnualRate] = useState(10);
  const [years, setYears] = useState(10);
  const [frequency, setFrequency] = useState<CompoundFrequency>('monthly');

  const results = useMemo(() => {
    const n = frequencyMap[frequency];
    const r = annualRate / 100;
    const t = years;
    const pmt = monthlyContribution;

    // Future value with compound interest: FV = P(1 + r/n)^(nt) + PMT × [((1 + r/n)^(nt) - 1) / (r/n)]
    const compoundFactor = Math.pow(1 + r / n, n * t);
    const principalFV = principal * compoundFactor;
    
    // For monthly contributions (converted to match frequency)
    const monthlyRate = r / 12;
    const totalMonths = t * 12;
    const contributionFV = pmt * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
    
    const totalValue = principalFV + contributionFV;
    const totalContributions = principal + (pmt * 12 * t);
    const totalInterest = totalValue - totalContributions;

    // Year by year breakdown
    const yearlyData = [];
    for (let y = 1; y <= t; y++) {
      const factor = Math.pow(1 + r / n, n * y);
      const pFV = principal * factor;
      const months = y * 12;
      const cFV = pmt * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
      yearlyData.push({
        year: y,
        value: pFV + cFV,
        contributions: principal + (pmt * 12 * y),
      });
    }

    return {
      totalValue,
      totalContributions,
      totalInterest,
      yearlyData,
    };
  }, [principal, monthlyContribution, annualRate, years, frequency]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 pb-20 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-4 to-gold shadow-lg">
            <Percent className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Compound Interest Calculator</h1>
            <p className="text-sm text-muted-foreground">
              Project long-term portfolio growth with reinvestment
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Inputs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Investment Parameters</CardTitle>
              <CardDescription>Configure your investment scenario</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  Initial Investment
                </Label>
                <Input
                  type="number"
                  value={principal}
                  onChange={(e) => setPrincipal(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Monthly Contribution
                </Label>
                <Input
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    Annual Return Rate
                  </Label>
                  <span className="text-sm font-medium text-primary">{annualRate}%</span>
                </div>
                <Slider
                  value={[annualRate]}
                  onValueChange={([v]) => setAnnualRate(v)}
                  min={1}
                  max={30}
                  step={0.5}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Investment Period
                  </Label>
                  <span className="text-sm font-medium text-primary">{years} years</span>
                </div>
                <Slider
                  value={[years]}
                  onValueChange={([v]) => setYears(v)}
                  min={1}
                  max={40}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label>Compound Frequency</Label>
                <Select value={frequency} onValueChange={(v) => setFrequency(v as CompoundFrequency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-gain/10 to-gain/5 border-gain/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <Sparkles className="h-6 w-6 text-gain mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-1">Future Value</p>
                  <p className="text-4xl font-bold text-gain">
                    {formatCurrency(results.totalValue)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    After {years} years
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Contributions</p>
                  <p className="text-2xl font-bold">{formatCurrency(results.totalContributions)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Interest Earned</p>
                  <p className="text-2xl font-bold text-gain">{formatCurrency(results.totalInterest)}</p>
                </CardContent>
              </Card>
            </div>

            {/* Growth Chart (Simple) */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Growth Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {results.yearlyData.filter((_, i) => i % Math.ceil(years / 8) === 0 || i === years - 1).map((data) => {
                    const maxValue = results.totalValue;
                    const barWidth = (data.value / maxValue) * 100;
                    const contributionWidth = (data.contributions / maxValue) * 100;
                    
                    return (
                      <div key={data.year} className="flex items-center gap-2 text-xs">
                        <span className="w-12 text-right text-muted-foreground">
                          Yr {data.year}
                        </span>
                        <div className="flex-1 h-5 bg-muted/30 rounded relative overflow-hidden">
                          <div
                            className="absolute h-full bg-muted-foreground/20 rounded"
                            style={{ width: `${contributionWidth}%` }}
                          />
                          <div
                            className="absolute h-full bg-gain/60 rounded"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="w-20 text-right font-mono">
                          {formatCurrency(data.value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
