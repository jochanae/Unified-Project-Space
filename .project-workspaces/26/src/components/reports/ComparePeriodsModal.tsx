import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { GitCompare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, subMonths, subYears, startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ComparePeriodsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDate: Date;
}

interface PeriodData {
  income: number;
  expenses: number;
  netCashFlow: number;
  savingsRate: number;
}

const ComparePeriodsModal = ({ open, onOpenChange, currentDate }: ComparePeriodsModalProps) => {
  const { user } = useAuth();
  const [compareType, setCompareType] = useState<"month" | "year">("month");
  const [period1Data, setPeriod1Data] = useState<PeriodData | null>(null);
  const [period2Data, setPeriod2Data] = useState<PeriodData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPeriodData = async (startDate: Date, endDate: Date): Promise<PeriodData> => {
    if (!user) return { income: 0, expenses: 0, netCashFlow: 0, savingsRate: 0 };

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
      .lte("transaction_date", format(endDate, "yyyy-MM-dd"));

    if (!transactions) return { income: 0, expenses: 0, netCashFlow: 0, savingsRate: 0 };

    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const netCashFlow = income - expenses;
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;

    return { income, expenses, netCashFlow, savingsRate };
  };

  useEffect(() => {
    if (open && user) {
      loadComparisonData();
    }
  }, [open, compareType, currentDate, user]);

  const loadComparisonData = async () => {
    setIsLoading(true);
    
    const currentStart = startOfMonth(currentDate);
    const currentEnd = endOfMonth(currentDate);
    
    let previousStart: Date;
    let previousEnd: Date;
    
    if (compareType === "month") {
      previousStart = startOfMonth(subMonths(currentDate, 1));
      previousEnd = endOfMonth(subMonths(currentDate, 1));
    } else {
      previousStart = startOfMonth(subYears(currentDate, 1));
      previousEnd = endOfMonth(subYears(currentDate, 1));
    }

    const [current, previous] = await Promise.all([
      fetchPeriodData(currentStart, currentEnd),
      fetchPeriodData(previousStart, previousEnd),
    ]);

    setPeriod1Data(current);
    setPeriod2Data(previous);
    setIsLoading(false);
  };

  const getChangePercent = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / Math.abs(previous)) * 100);
  };

  const renderChange = (current: number, previous: number, positiveIsGood: boolean = true) => {
    const change = getChangePercent(current, previous);
    const isPositive = change > 0;
    const isGood = positiveIsGood ? isPositive : !isPositive;
    
    if (change === 0) {
      return (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Minus className="w-4 h-4" />
          <span>No change</span>
        </div>
      );
    }

    return (
      <div className={`flex items-center gap-1 ${isGood ? "text-emerald-500" : "text-red-500"}`}>
        {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
        <span>{isPositive ? "+" : ""}{change}%</span>
      </div>
    );
  };

  const getPeriodLabel = (isPrevious: boolean) => {
    if (isPrevious) {
      if (compareType === "month") {
        return format(subMonths(currentDate, 1), "MMMM yyyy");
      }
      return format(subYears(currentDate, 1), "MMMM yyyy");
    }
    return format(currentDate, "MMMM yyyy");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-primary" />
            Compare Periods
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Label>Compare Type:</Label>
            <Select value={compareType} onValueChange={(v) => setCompareType(v as "month" | "year")}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month over Month</SelectItem>
                <SelectItem value="year">Year over Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          ) : period1Data && period2Data ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
                <div>Metric</div>
                <div className="text-right">{getPeriodLabel(true)}</div>
                <div className="text-right">{getPeriodLabel(false)}</div>
                <div className="text-right">Change</div>
              </div>

              {/* Income */}
              <div className="grid grid-cols-4 gap-4 items-center p-4 rounded-lg bg-muted/50">
                <div className="font-medium">Income</div>
                <div className="text-right">${period2Data.income.toLocaleString()}</div>
                <div className="text-right font-semibold">${period1Data.income.toLocaleString()}</div>
                <div className="text-right">{renderChange(period1Data.income, period2Data.income, true)}</div>
              </div>

              {/* Expenses */}
              <div className="grid grid-cols-4 gap-4 items-center p-4 rounded-lg bg-muted/50">
                <div className="font-medium">Expenses</div>
                <div className="text-right">${period2Data.expenses.toLocaleString()}</div>
                <div className="text-right font-semibold">${period1Data.expenses.toLocaleString()}</div>
                <div className="text-right">{renderChange(period1Data.expenses, period2Data.expenses, false)}</div>
              </div>

              {/* Net Cash Flow */}
              <div className="grid grid-cols-4 gap-4 items-center p-4 rounded-lg bg-muted/50">
                <div className="font-medium">Net Cash Flow</div>
                <div className="text-right">${period2Data.netCashFlow.toLocaleString()}</div>
                <div className={`text-right font-semibold ${period1Data.netCashFlow >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                  ${period1Data.netCashFlow.toLocaleString()}
                </div>
                <div className="text-right">{renderChange(period1Data.netCashFlow, period2Data.netCashFlow, true)}</div>
              </div>

              {/* Savings Rate */}
              <div className="grid grid-cols-4 gap-4 items-center p-4 rounded-lg bg-muted/50">
                <div className="font-medium">Savings Rate</div>
                <div className="text-right">{period2Data.savingsRate}%</div>
                <div className="text-right font-semibold">{period1Data.savingsRate}%</div>
                <div className="text-right">{renderChange(period1Data.savingsRate, period2Data.savingsRate, true)}</div>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ComparePeriodsModal;
