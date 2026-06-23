import { useState, useEffect } from "react";
import { Sparkles, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isPast, isToday, differenceInDays } from "date-fns";

interface Insight {
  type: 'critical' | 'warning' | 'info';
  message: string;
}

export const InsightsCardContent = () => {
  const { user } = useAuth();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateInsights = async () => {
      if (!user) return;

      const newInsights: Insight[] = [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      // Fetch data in parallel
      const [billsResult, budgetsResult, transactionsResult, goalsResult] = await Promise.all([
        supabase.from('bills').select('*').eq('user_id', user.id).eq('status', 'pending'),
        supabase.from('budgets').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('transactions').select('amount, type').eq('user_id', user.id).gte('transaction_date', startOfMonth),
        supabase.from('goals').select('*').eq('user_id', user.id).eq('is_archived', false),
      ]);

      const bills = billsResult.data || [];
      const budgets = budgetsResult.data || [];
      const transactions = transactionsResult.data || [];
      const goals = goalsResult.data || [];

      // Check for overdue bills (CRITICAL)
      const overdueBills = bills.filter(b => isPast(new Date(b.due_date)) && !isToday(new Date(b.due_date)));
      if (overdueBills.length > 0) {
        newInsights.push({
          type: 'critical',
          message: `${overdueBills.length} overdue bill${overdueBills.length > 1 ? 's' : ''} need attention`,
        });
      }

      // Check for bills due within 3 days (WARNING)
      const urgentBills = bills.filter(b => {
        const daysUntil = differenceInDays(new Date(b.due_date), now);
        return daysUntil >= 0 && daysUntil <= 3;
      });
      if (urgentBills.length > 0) {
        newInsights.push({
          type: 'warning',
          message: `${urgentBills.length} bill${urgentBills.length > 1 ? 's' : ''} due within 3 days`,
        });
      }

      // Check for overspent budgets (CRITICAL)
      const overspentBudgets = budgets.filter(b => Number(b.spent) > Number(b.amount));
      if (overspentBudgets.length > 0) {
        newInsights.push({
          type: 'critical',
          message: `${overspentBudgets.length} budget${overspentBudgets.length > 1 ? 's' : ''} exceeded`,
        });
      }

      // Check for budgets at risk (>80% spent) (WARNING)
      const atRiskBudgets = budgets.filter(b => {
        const percent = Number(b.amount) > 0 ? (Number(b.spent) / Number(b.amount)) * 100 : 0;
        return percent >= 80 && percent < 100;
      });
      if (atRiskBudgets.length > 0) {
        newInsights.push({
          type: 'warning',
          message: `${atRiskBudgets.length} budget${atRiskBudgets.length > 1 ? 's' : ''} at risk (>80% spent)`,
        });
      }

      // Check savings rate (WARNING if < 20%)
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
      if (income > 0 && savingsRate < 20) {
        newInsights.push({
          type: savingsRate < 0 ? 'critical' : 'warning',
          message: `Savings rate is ${savingsRate.toFixed(1)}% (target: 20%)`,
        });
      }

      // Check goals progress (INFO)
      const goalsWithDeadlines = goals.filter(g => g.deadline);
      const behindGoals = goalsWithDeadlines.filter(g => {
        const progress = Number(g.target_amount) > 0 ? (Number(g.current_amount) / Number(g.target_amount)) * 100 : 0;
        const daysToDeadline = differenceInDays(new Date(g.deadline!), now);
        const expectedProgress = daysToDeadline > 0 ? 100 - (daysToDeadline / 365) * 100 : 100;
        return progress < expectedProgress * 0.5;
      });
      if (behindGoals.length > 0) {
        newInsights.push({
          type: 'info',
          message: `${behindGoals.length} goal${behindGoals.length > 1 ? 's' : ''} behind schedule`,
        });
      }

      // Add positive insight if everything is good
      if (newInsights.length === 0) {
        newInsights.push({
          type: 'info',
          message: 'Great job! Your finances are on track',
        });
      }

      setInsights(newInsights);
      setLoading(false);
    };

    generateInsights();
  }, [user]);

  const criticalCount = insights.filter(i => i.type === 'critical').length;
  const warningCount = insights.filter(i => i.type === 'warning').length;
  const infoCount = insights.filter(i => i.type === 'info').length;

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-8 bg-muted animate-pulse rounded-lg" />
        <div className="h-16 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">AI-powered financial insights</p>
      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-xs">
        <Sparkles className="h-3 w-3 text-primary" />
        AI-Powered Insights
      </div>
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-lg bg-destructive/10 text-center">
          <AlertTriangle className="h-3 w-3 text-destructive mx-auto mb-0.5" />
          <p className="text-sm font-bold text-destructive">{criticalCount}</p>
          <p className="text-[10px] text-muted-foreground">Critical</p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-yellow-500/10 text-center">
          <AlertCircle className="h-3 w-3 text-yellow-500 mx-auto mb-0.5" />
          <p className="text-sm font-bold text-yellow-600">{warningCount}</p>
          <p className="text-[10px] text-muted-foreground">Warning</p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-blue-500/10 text-center">
          <Info className="h-3 w-3 text-blue-500 mx-auto mb-0.5" />
          <p className="text-sm font-bold text-blue-600">{infoCount}</p>
          <p className="text-[10px] text-muted-foreground">Info</p>
        </div>
      </div>
      {insights.slice(0, 2).map((insight, index) => (
        <div 
          key={index}
          className={`p-2 rounded-lg text-xs ${
            insight.type === 'critical' ? 'bg-destructive/10 text-destructive' :
            insight.type === 'warning' ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400' :
            'bg-blue-500/10 text-blue-700 dark:text-blue-400'
          }`}
        >
          {insight.message}
        </div>
      ))}
    </div>
  );
};
