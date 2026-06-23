import React, { useState, useMemo, useEffect } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Snowflake, TrendingUp, DollarSign, Calendar, ArrowDown, Target, Zap, Check, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Debt {
  id: string;
  name: string;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  remaining_term_months?: number | null;
}

interface PayoffResult {
  debtName: string;
  payoffOrder: number;
  totalPaid: number;
  interestPaid: number;
  monthsToPayoff: number;
}

interface StrategyResult {
  totalMonths: number;
  totalPaid: number;
  totalInterest: number;
  debts: PayoffResult[];
}

interface PayoffStrategyCalculatorProps {
  debts: Debt[];
  initialStrategy?: 'snowball' | 'avalanche' | null;
}

const calculatePayoff = (
  debts: Debt[],
  strategy: 'snowball' | 'avalanche',
  extraPayment: number
): StrategyResult => {
  if (debts.length === 0) {
    return { totalMonths: 0, totalPaid: 0, totalInterest: 0, debts: [] };
  }

  // Sort debts based on strategy
  const sortedDebts = [...debts].sort((a, b) => {
    if (strategy === 'snowball') {
      return a.current_balance - b.current_balance; // Smallest balance first
    }
    return b.interest_rate - a.interest_rate; // Highest interest first
  });

  // Deep clone for simulation
  const debtBalances = sortedDebts.map(d => ({
    ...d,
    balance: d.current_balance,
    totalPaid: 0,
    interestPaid: 0,
    paidOff: false,
    monthsPaid: 0,
    remainingTerm: d.remaining_term_months || null
  }));

  const results: PayoffResult[] = [];
  let months = 0;
  let payoffOrder = 1;
  const maxMonths = 360; // 30 years max

  while (debtBalances.some(d => !d.paidOff) && months < maxMonths) {
    months++;
    let availableExtra = extraPayment;

    // Apply interest and minimum payments to all debts
    for (const debt of debtBalances) {
      if (debt.paidOff) continue;

      // Monthly interest
      const monthlyInterest = (debt.balance * (debt.interest_rate / 100)) / 12;
      debt.balance += monthlyInterest;
      debt.interestPaid += monthlyInterest;

      // Apply minimum payment
      const payment = Math.min(debt.minimum_payment, debt.balance);
      debt.balance -= payment;
      debt.totalPaid += payment;
      debt.monthsPaid = months;

      // Check if debt is paid off by balance OR by reaching contract term
      const reachedTerm = debt.remainingTerm && months >= debt.remainingTerm;
      if (debt.balance <= 0.01 || reachedTerm) {
        debt.paidOff = true;
        debt.balance = 0;
        results.push({
          debtName: debt.name,
          payoffOrder: payoffOrder++,
          totalPaid: debt.totalPaid,
          interestPaid: debt.interestPaid,
          monthsToPayoff: reachedTerm ? debt.remainingTerm! : debt.monthsPaid
        });
        // Add freed minimum payment to extra
        availableExtra += debt.minimum_payment;
      }
    }

    // Apply extra payment to target debt
    for (const debt of debtBalances) {
      if (debt.paidOff || availableExtra <= 0) continue;

      const extraApplied = Math.min(availableExtra, debt.balance);
      debt.balance -= extraApplied;
      debt.totalPaid += extraApplied;
      availableExtra -= extraApplied;

      if (debt.balance <= 0.01) {
        debt.paidOff = true;
        debt.balance = 0;
        if (!results.find(r => r.debtName === debt.name)) {
          results.push({
            debtName: debt.name,
            payoffOrder: payoffOrder++,
            totalPaid: debt.totalPaid,
            interestPaid: debt.interestPaid,
            monthsToPayoff: months
          });
          availableExtra += debt.minimum_payment;
        }
      }
      break; // Only apply extra to first non-paid debt
    }
  }

  // Add any remaining debts that weren't paid off
  for (const debt of debtBalances) {
    if (!results.find(r => r.debtName === debt.name)) {
      results.push({
        debtName: debt.name,
        payoffOrder: payoffOrder++,
        totalPaid: debt.totalPaid,
        interestPaid: debt.interestPaid,
        monthsToPayoff: months
      });
    }
  }

  return {
    totalMonths: months,
    totalPaid: results.reduce((sum, d) => sum + d.totalPaid, 0),
    totalInterest: results.reduce((sum, d) => sum + d.interestPaid, 0),
    debts: results
  };
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatMonths = (months: number) => {
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} months`;
  if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
  return `${years}y ${remainingMonths}m`;
};

export function PayoffStrategyCalculator({ debts, initialStrategy }: PayoffStrategyCalculatorProps) {
  const [extraPaymentInput, setExtraPaymentInput] = useState("100");
  const [appliedExtraPayment, setAppliedExtraPayment] = useState(100);
  const [activeTab, setActiveTab] = useState<string>(initialStrategy || "comparison");
  const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set(debts.filter(d => d.current_balance > 0).map(d => d.id)));
  const [isOpen, setIsOpen] = useState(!!initialStrategy);

  // Update selected debts when debts list changes
  useEffect(() => {
    setSelectedDebtIds(prev => {
      const validIds = new Set(debts.filter(d => d.current_balance > 0).map(d => d.id));
      const newSet = new Set([...prev].filter(id => validIds.has(id)));
      // If nothing selected or new debts appeared, select all
      if (newSet.size === 0) return validIds;
      return newSet;
    });
  }, [debts]);
  
  // Update tab when initialStrategy changes from parent
  useEffect(() => {
    if (initialStrategy) {
      setActiveTab(initialStrategy);
      setIsOpen(true);
    }
  }, [initialStrategy]);

  const handleApplyExtraPayment = () => {
    const value = Math.max(0, Number(extraPaymentInput) || 0);
    setAppliedExtraPayment(value);
    toast.success(`Extra payment of $${value}/month applied`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApplyExtraPayment();
    }
  };

  const activeDebts = debts.filter(d => d.current_balance > 0 && selectedDebtIds.has(d.id));
  const allActiveDebts = debts.filter(d => d.current_balance > 0);
  const snowballResult = useMemo(
    () => calculatePayoff(activeDebts, 'snowball', appliedExtraPayment),
    [activeDebts, appliedExtraPayment]
  );

  const avalancheResult = useMemo(
    () => calculatePayoff(activeDebts, 'avalanche', appliedExtraPayment),
    [activeDebts, appliedExtraPayment]
  );

  const interestSavings = snowballResult.totalInterest - avalancheResult.totalInterest;
  const timeSavings = snowballResult.totalMonths - avalancheResult.totalMonths;

  if (activeDebts.length === 0) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Payoff Strategy Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Add debts to see payoff strategy comparisons
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CollapsibleTrigger className="w-full text-left">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Payoff Strategy Calculator
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" />
          </CardTitle>
          <CardDescription>
            Compare snowball vs avalanche methods to find your optimal strategy
          </CardDescription>
        </CardHeader>
      </CollapsibleTrigger>
      <CollapsibleContent>
      <CardContent className="space-y-6">
        {/* Extra Payment Input */}
        <div className="space-y-2">
          <Label htmlFor="extra-payment" className="text-sm font-medium">
            Extra Monthly Payment
          </Label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-shrink-0">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="extra-payment"
                type="number"
                min={0}
                step={50}
                placeholder="0"
                value={extraPaymentInput}
                onChange={(e) => setExtraPaymentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-[120px] pl-8"
              />
            </div>
            <Button 
              type="button" 
              size="sm" 
              onClick={handleApplyExtraPayment}
              className="flex-shrink-0"
            >
              <Check className="h-4 w-4 mr-1" />
              Apply
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">/ month beyond minimums</p>
          {appliedExtraPayment > 0 && appliedExtraPayment !== Number(extraPaymentInput) && (
            <p className="text-xs text-muted-foreground">
              Currently calculating with ${appliedExtraPayment}/month
            </p>
          )}
        </div>

        {/* Debt Selection */}
        {allActiveDebts.length > 1 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Include in Strategy</Label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              <div className="flex items-center gap-2 pb-1">
                <Checkbox
                  id="select-all-debts"
                  checked={selectedDebtIds.size === allActiveDebts.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedDebtIds(new Set(allActiveDebts.map(d => d.id)));
                    } else {
                      setSelectedDebtIds(new Set());
                    }
                  }}
                />
                <label htmlFor="select-all-debts" className="text-xs font-medium cursor-pointer">
                  Select All ({allActiveDebts.length})
                </label>
              </div>
              {allActiveDebts.map(debt => (
                <div key={debt.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`debt-${debt.id}`}
                    checked={selectedDebtIds.has(debt.id)}
                    onCheckedChange={(checked) => {
                      setSelectedDebtIds(prev => {
                        const next = new Set(prev);
                        if (checked) next.add(debt.id);
                        else next.delete(debt.id);
                        return next;
                      });
                    }}
                  />
                  <label htmlFor={`debt-${debt.id}`} className="text-xs cursor-pointer flex-1 flex justify-between">
                    <span className="truncate">{debt.name}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">{formatCurrency(debt.current_balance)}</span>
                  </label>
                </div>
              ))}
            </div>
            {selectedDebtIds.size === 0 && (
              <p className="text-xs text-destructive">Select at least one debt</p>
            )}
          </div>
        )}

        {/* Comparison Summary */}
        {interestSavings !== 0 && (
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">Strategy Comparison</span>
            </div>
            <p className="text-sm text-muted-foreground">
              The <strong className="text-foreground">Avalanche method</strong> saves you{' '}
              <strong className="text-emerald-500">{formatCurrency(Math.abs(interestSavings))}</strong> in interest
              {timeSavings !== 0 && (
                <> and pays off debt <strong className="text-emerald-500">{Math.abs(timeSavings)} months</strong> faster</>
              )}.
            </p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50">
            <TabsTrigger 
              value="comparison" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Compare
            </TabsTrigger>
            <TabsTrigger 
              value="snowball"
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              Snowball
            </TabsTrigger>
            <TabsTrigger 
              value="avalanche"
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
            >
              Avalanche
            </TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Snowball Summary */}
              <div className="p-4 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center gap-2 mb-3">
                  <Snowflake className="h-5 w-5 text-blue-500" />
                  <h4 className="font-semibold">Snowball Method</h4>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Pay smallest balances first for quick wins
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time to debt-free:</span>
                    <span className="font-medium">{formatMonths(snowballResult.totalMonths)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total interest:</span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(snowballResult.totalInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total paid:</span>
                    <span className="font-medium">{formatCurrency(snowballResult.totalPaid)}</span>
                  </div>
                </div>
              </div>

              {/* Avalanche Summary */}
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Avalanche Method</h4>
                  {interestSavings > 0 && (
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Pay highest interest rates first for maximum savings
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time to debt-free:</span>
                    <span className="font-medium">{formatMonths(avalancheResult.totalMonths)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total interest:</span>
                    <span className="font-medium text-emerald-500">
                      {formatCurrency(avalancheResult.totalInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total paid:</span>
                    <span className="font-medium">{formatCurrency(avalancheResult.totalPaid)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="snowball" className="mt-4">
            <StrategyDetailView result={snowballResult} strategy="snowball" />
          </TabsContent>

          <TabsContent value="avalanche" className="mt-4">
            <StrategyDetailView result={avalancheResult} strategy="avalanche" />
          </TabsContent>
        </Tabs>
      </CardContent>
      </CollapsibleContent>
    </Card>
    </Collapsible>
  );
}

function StrategyDetailView({ 
  result, 
  strategy 
}: { 
  result: StrategyResult; 
  strategy: 'snowball' | 'avalanche';
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {strategy === 'snowball' ? (
          <>
            <Snowflake className="h-4 w-4 text-blue-500" />
            <span>Payoff order: smallest balance → largest balance</span>
          </>
        ) : (
          <>
            <TrendingUp className="h-4 w-4 text-primary" />
            <span>Payoff order: highest interest → lowest interest</span>
          </>
        )}
      </div>

      <div className="space-y-2">
        {result.debts.map((debt, index) => (
          <div 
            key={debt.debtName}
            className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/30"
          >
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{debt.debtName}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Interest paid: {formatCurrency(debt.interestPaid)}
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-primary">{formatCurrency(debt.totalPaid)}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1 justify-end">
                <Calendar className="h-3 w-3" />
                {formatMonths(debt.monthsToPayoff)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-border/50">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatMonths(result.totalMonths)}</p>
            <p className="text-xs text-muted-foreground">Total Time</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(result.totalInterest)}</p>
            <p className="text-xs text-muted-foreground">Total Interest</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(result.totalPaid)}</p>
            <p className="text-xs text-muted-foreground">Total Paid</p>
          </div>
        </div>
      </div>
    </div>
  );
}
