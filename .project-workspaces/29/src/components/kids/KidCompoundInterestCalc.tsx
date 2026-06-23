import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Snowflake, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KidCompoundInterestCalcProps {
  className?: string;
}

export function KidCompoundInterestCalc({ className }: KidCompoundInterestCalcProps) {
  const [weeklyAmount, setWeeklyAmount] = useState(5);
  const [years, setYears] = useState(10);

  const rate = 0.07; // 7% annual return
  const weeksPerYear = 52;
  const totalWeeks = years * weeksPerYear;
  const weeklyRate = rate / weeksPerYear;

  // Future value of annuity formula
  const investedTotal = weeklyAmount * totalWeeks;
  const compoundTotal =
    weeklyAmount * ((Math.pow(1 + weeklyRate, totalWeeks) - 1) / weeklyRate);
  const interestEarned = compoundTotal - investedTotal;

  const bars = [
    { label: 'Saved', value: investedTotal, color: 'bg-primary' },
    { label: 'Interest earned', value: interestEarned, color: 'bg-gain' },
  ];

  const maxVal = compoundTotal || 1;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="h-2 bg-gradient-to-r from-primary via-gain to-gold" />
      <CardContent className="p-6 space-y-6">
        <div className="text-center">
          <span className="text-4xl block mb-2">⛄</span>
          <h3 className="text-xl font-bold">Money Snowball Calculator</h3>
          <p className="text-sm text-muted-foreground">
            See how your savings grow with compound interest!
          </p>
        </div>

        {/* Weekly amount slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">I save per week:</span>
            <span className="font-bold text-primary text-lg">${weeklyAmount}</span>
          </div>
          <Slider
            value={[weeklyAmount]}
            onValueChange={([v]) => setWeeklyAmount(v)}
            min={1}
            max={50}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$1</span>
            <span>$50</span>
          </div>
        </div>

        {/* Years slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">For how many years:</span>
            <span className="font-bold text-primary text-lg">{years} years</span>
          </div>
          <Slider
            value={[years]}
            onValueChange={([v]) => setYears(v)}
            min={1}
            max={30}
            step={1}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1 yr</span>
            <span>30 yrs</span>
          </div>
        </div>

        {/* Visual bar chart */}
        <div className="space-y-3">
          {bars.map((bar) => (
            <div key={bar.label} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{bar.label}</span>
                <span className="font-bold">${Math.round(bar.value).toLocaleString()}</span>
              </div>
              <div className="h-6 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', bar.color)}
                  style={{ width: `${Math.max(2, (bar.value / maxVal) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="bg-gradient-to-r from-gold/10 to-gain/10 border border-gold/30 rounded-xl p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Total after {years} years</p>
          <p className="text-3xl font-bold text-gain">
            ${Math.round(compoundTotal).toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            That's ${Math.round(interestEarned).toLocaleString()} of FREE money from compound interest! 🤑
          </p>
        </div>

        {/* Fun fact */}
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-sm">
            <strong>⛄ The Snowball Effect:</strong> Your money earns money, and <em>that</em> money earns money too!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
