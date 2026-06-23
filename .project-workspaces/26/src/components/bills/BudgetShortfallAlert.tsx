import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { InfoTip } from "@/components/ui/info-tip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, isSameMonth } from "date-fns";

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  status: string;
}

interface BudgetShortfallAlertProps {
  bills: Bill[];
  selectedMonth?: Date;
}

const BudgetShortfallAlert = ({ bills, selectedMonth = new Date() }: BudgetShortfallAlertProps) => {
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [income, setIncome] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);

  // Fetch income and expenses data for selected month
  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!user) return;

      // Get start and end of selected month
      const monthStart = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).toISOString().split('T')[0];
      const isCurrentMonth = isSameMonth(selectedMonth, new Date());
      const isFutureMonth = selectedMonth > new Date() && !isCurrentMonth;

      // Get income from transactions for selected month
      const { data: incomeData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'income')
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd);

      let totalIncome = incomeData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // For future months (or current month with no income yet), project recurring income
      if (isFutureMonth || (isCurrentMonth && totalIncome === 0)) {
        const { data: recurringIncome } = await supabase
          .from('transactions')
          .select('amount, recurrence_pattern')
          .eq('user_id', user.id)
          .eq('type', 'income')
          .eq('is_recurring', true);

        if (recurringIncome && recurringIncome.length > 0 && (isFutureMonth || totalIncome === 0)) {
          const projectedIncome = recurringIncome.reduce((sum, t) => {
            const pattern = (t.recurrence_pattern || 'monthly').toLowerCase();
            if (pattern === 'monthly' || pattern === 'weekly' || pattern === 'biweekly') {
              return sum + Number(t.amount);
            }
            return sum;
          }, 0);
          // For future months, use projected; for current month only if no actual income
          if (isFutureMonth) {
            totalIncome = projectedIncome;
          } else if (totalIncome === 0) {
            totalIncome = projectedIncome;
          }
        }
      }

      setIncome(totalIncome);

      // Get expenses from transactions for selected month
      const { data: expenseData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd);

      const totalExpenses = expenseData?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      setMonthlyExpenses(totalExpenses);
    };

    fetchFinancialData();
  }, [user, selectedMonth]);

  // Calculate unpaid bills - bills prop should already be scoped to the selected month
  const unpaidBills = bills.filter(b => b.status !== 'paid');
  const unpaidTotal = unpaidBills.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalObligations = monthlyExpenses + unpaidTotal;
  const shortfall = income - totalObligations;
  const obligationPercent = income > 0 ? Math.round((totalObligations / income) * 100) : 0;

  // Categorize bills by priority
  const categorizeBillsByPriority = () => {
    const mustPay: Bill[] = [];
    const important: Bill[] = [];
    const canDelay: Bill[] = [];

    unpaidBills.forEach(bill => {
      const category = bill.category.toLowerCase();
      const name = bill.name.toLowerCase();
      // Must pay: housing (rent, mortgage), utilities, phone, insurance, childcare, medical
      const isMortgageOrHousing = name.includes('mortgage') || name.includes('rent') || name.includes('hoa') || category === 'housing';
      if (isMortgageOrHousing || ['utilities', 'rent', 'phone', 'insurance', 'childcare', 'medical', 'healthcare'].includes(category)) {
        mustPay.push(bill);
      }
      // Important: internet, transportation, loans, credit_card
      else if (['internet', 'transportation', 'loans', 'credit_card'].includes(category)) {
        important.push(bill);
      }
      // Can delay: subscriptions, streaming, gym, other
      else {
        canDelay.push(bill);
      }
    });

    return { mustPay, important, canDelay };
  };

  const { mustPay, important, canDelay } = categorizeBillsByPriority();
  const mustPayTotal = mustPay.reduce((sum, b) => sum + Number(b.amount), 0);
  const importantTotal = important.reduce((sum, b) => sum + Number(b.amount), 0);
  const canDelayTotal = canDelay.reduce((sum, b) => sum + Number(b.amount), 0);

  // Don't show if no shortfall
  const hasShortfall = shortfall < 0;
  const alertLevel = hasShortfall ? 'critical' : obligationPercent > 80 ? 'warning' : 'good';
  const isViewingPastMonth = !isSameMonth(selectedMonth, new Date()) && selectedMonth < new Date();
  const isFutureMonth = selectedMonth > new Date() && !isSameMonth(selectedMonth, new Date());

  // If no data for this month, show a helpful empty state
  if (income === 0 && unpaidBills.length === 0 && monthlyExpenses === 0) {
    // Only show empty state for past months, hide completely for current/future with no data
    if (!isViewingPastMonth) return null;
    
    return (
      <Card className="border-2 border-muted bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-muted-foreground">No Data for {format(selectedMonth, 'MMMM yyyy')}</h3>
              <p className="text-sm text-muted-foreground">
                No transactions or bills were recorded during this period
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden border-2 ${hasShortfall ? 'border-destructive/40 dark:border-destructive/30' : 'border-border/60'}`}>
      {/* Top accent bar */}
      <div className={`h-1.5 ${hasShortfall ? 'bg-gradient-to-r from-destructive via-orange-500 to-destructive' : 'bg-gradient-to-r from-emerald-500 via-primary to-emerald-500'}`} />
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${hasShortfall ? 'bg-destructive/10' : 'bg-primary/10'}`}>
              <AlertTriangle className={`h-5 w-5 ${hasShortfall ? 'text-destructive' : 'text-primary'}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-foreground">
                  {hasShortfall ? 'Cash Flow Shortfall' : 'Cash Flow Status'}
                </h3>
                {hasShortfall && (
                  <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded">
                    CRITICAL
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {hasShortfall 
                  ? "Actual income doesn't cover obligations" 
                  : `Based on transactions for ${isSameMonth(selectedMonth, new Date()) ? 'this month' : format(selectedMonth, 'MMMM yyyy')}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1"
          >
            {isExpanded ? 'Less' : 'Details'}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <InfoTip content={isFutureMonth ? 'Estimated income based on your recurring income transactions' : 'Total income from all transactions recorded this month'}>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">{isFutureMonth ? 'Projected Income' : 'Income This Month'} ⓘ</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${income.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{isFutureMonth ? 'from recurring' : 'from transactions'}</p>
            </div>
          </InfoTip>
          <InfoTip content={hasShortfall ? 'Your income minus spent + remaining bills — you need more to cover everything' : 'Money left over after all spending and remaining bills'}>
            <div className={`rounded-xl p-3 text-center min-w-0 ${hasShortfall ? 'bg-destructive/10' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
              <p className="text-xs font-medium text-muted-foreground">{hasShortfall ? 'Shortfall' : 'Surplus'} ⓘ</p>
              <p className={`text-base sm:text-xl font-bold ${hasShortfall ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {hasShortfall ? '-' : '+'}${Math.abs(shortfall).toLocaleString()}
              </p>
              {hasShortfall && <p className="text-[10px] text-muted-foreground">need to cover</p>}
            </div>
          </InfoTip>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-2">
          <InfoTip content="Total expense transactions already recorded this month — money that's left your accounts">
            <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3 text-center border border-orange-200/50 dark:border-orange-800/30">
              <p className="text-xs font-medium text-muted-foreground">Spent So Far ⓘ</p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">${monthlyExpenses.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">from transactions</p>
            </div>
          </InfoTip>
          <InfoTip content="Bills that are still pending or overdue this month — obligations you haven't paid yet">
            <div className="bg-muted/50 rounded-xl p-3 text-center border border-border/50">
              <p className="text-xs font-medium text-muted-foreground">Bills Remaining ⓘ</p>
              <p className="text-lg font-bold text-foreground">${unpaidTotal.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">{unpaidBills.length} unpaid bill{unpaidBills.length !== 1 ? 's' : ''}</p>
            </div>
          </InfoTip>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4 pt-4 border-t">
            {/* Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Monthly Expenses:</span>
                <span className="font-semibold">${monthlyExpenses.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Unpaid Bills:</span>
                <span className="font-semibold">${unpaidTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-bold">Total Obligations:</span>
                <span className="font-bold">${totalObligations.toLocaleString()}</span>
              </div>
            </div>

            {/* Smart Bill Prioritization */}
            {unpaidBills.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  <h4 className="font-bold">Smart Bill Prioritization</h4>
                </div>

                {/* Must Pay */}
                {mustPay.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-red-500 rounded-full" />
                        <span className="text-red-600 font-semibold">MUST PAY</span>
                      </div>
                      <span className="font-semibold">${mustPayTotal.toLocaleString()}</span>
                    </div>
                    {mustPay.map(bill => (
                      <div key={bill.id} className="flex justify-between text-sm pl-5">
                        <span>• {bill.name}</span>
                        <span>${Number(bill.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Important */}
                {important.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-orange-500 rounded-full" />
                        <span className="text-orange-600 font-semibold">IMPORTANT</span>
                      </div>
                      <span className="font-semibold">${importantTotal.toLocaleString()}</span>
                    </div>
                    {important.map(bill => (
                      <div key={bill.id} className="flex justify-between text-sm pl-5">
                        <span>• {bill.name}</span>
                        <span>${Number(bill.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Can Delay */}
                {canDelay.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-gray-400 rounded-full" />
                        <span className="text-muted-foreground font-semibold">CAN DELAY</span>
                      </div>
                      <span className="font-semibold">${canDelayTotal.toLocaleString()}</span>
                    </div>
                    {canDelay.map(bill => (
                      <div key={bill.id} className="flex justify-between text-sm pl-5">
                        <span>• {bill.name}</span>
                        <span>${Number(bill.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AI Financial Coach Tips */}
            {hasShortfall && (
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <h4 className="font-bold">AI Financial Coach:</h4>
                </div>
                <ul className="space-y-1 text-sm">
                  <li>• Contact landlord/mortgage company if housing payment will be late</li>
                  <li>• Call utility companies to arrange payment plans</li>
                  {canDelayTotal > 0 && (
                    <li>• Cancel non-essential subscriptions to save ~${canDelayTotal}</li>
                  )}
                  <li>• Look for local assistance programs for utilities and food</li>
                  <li>• Find ways to earn extra ${Math.abs(shortfall).toLocaleString()} this month</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetShortfallAlert;
