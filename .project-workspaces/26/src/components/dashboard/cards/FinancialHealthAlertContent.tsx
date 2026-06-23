import { useState, useEffect } from "react";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isPast, isToday, differenceInDays } from "date-fns";

interface HealthAlert {
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
}

export const FinancialHealthAlertContent = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const analyzeHealth = async () => {
      if (!user) return;

      const newAlerts: HealthAlert[] = [];
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const [billsResult, budgetsResult, transactionsResult, debtsResult] = await Promise.all([
        supabase.from('bills').select('*').eq('user_id', user.id).eq('status', 'pending'),
        supabase.from('budgets').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('transactions').select('amount, type').eq('user_id', user.id).gte('transaction_date', startOfMonth),
        supabase.from('debts').select('*').eq('user_id', user.id).eq('status', 'active'),
      ]);

      const bills = billsResult.data || [];
      const budgets = budgetsResult.data || [];
      const transactions = transactionsResult.data || [];
      const debts = debtsResult.data || [];

      // Check for overdue bills
      const overdueBills = bills.filter(b => isPast(new Date(b.due_date)) && !isToday(new Date(b.due_date)));
      if (overdueBills.length > 0) {
        newAlerts.push({
          type: 'critical',
          title: 'Overdue Bills',
          message: `${overdueBills.length} bill${overdueBills.length > 1 ? 's' : ''} past due date`,
        });
      }

      // Check savings rate
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
      
      if (income > 0 && savingsRate < 10) {
        newAlerts.push({
          type: savingsRate < 0 ? 'critical' : 'warning',
          title: 'Low Savings Rate Alert',
          message: `Your savings rate is ${savingsRate.toFixed(1)}%. Financial experts recommend saving at least 20% of income.`,
        });
      }

      // Check overspent budgets
      const overspentBudgets = budgets.filter(b => Number(b.spent) > Number(b.amount));
      if (overspentBudgets.length > 0) {
        newAlerts.push({
          type: 'critical',
          title: 'Budget Overspent',
          message: `${overspentBudgets.length} budget${overspentBudgets.length > 1 ? 's have' : ' has'} been exceeded`,
        });
      }

      // Check high debt
      const totalDebt = debts.reduce((sum, d) => sum + Number(d.current_balance), 0);
      const monthlyDebtPayments = debts.reduce((sum, d) => sum + Number(d.minimum_payment), 0);
      const dti = income > 0 ? (monthlyDebtPayments / income) * 100 : 0;
      
      if (dti > 43) {
        newAlerts.push({
          type: 'critical',
          title: 'High Debt-to-Income',
          message: `DTI ratio is ${dti.toFixed(1)}%. Consider debt reduction strategies.`,
        });
      } else if (dti > 36) {
        newAlerts.push({
          type: 'warning',
          title: 'Elevated DTI Ratio',
          message: `DTI is ${dti.toFixed(1)}%. Aim to keep it below 36%.`,
        });
      }

      // Add positive info if everything looks good
      if (newAlerts.length === 0) {
        newAlerts.push({
          type: 'info',
          title: 'Financial Health Check',
          message: 'Your finances are looking healthy! Keep up the good work.',
        });
      }

      setAlerts(newAlerts);
      setLoading(false);
    };

    analyzeHealth();
  }, [user]);

  const criticalCount = alerts.filter(a => a.type === 'critical').length;
  const warningCount = alerts.filter(a => a.type === 'warning').length;
  const infoCount = alerts.filter(a => a.type === 'info').length;
  const topAlert = alerts[0];

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 bg-muted animate-pulse rounded-lg" />
        <div className="h-20 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">AI-powered financial insights</p>
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-lg bg-destructive/10 text-center">
          <AlertTriangle className="h-4 w-4 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-destructive">{criticalCount}</p>
          <p className="text-xs text-muted-foreground">Critical</p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-yellow-500/10 text-center">
          <AlertCircle className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-yellow-600">{warningCount}</p>
          <p className="text-xs text-muted-foreground">Warning</p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-blue-500/10 text-center">
          <Info className="h-4 w-4 text-blue-500 mx-auto mb-1" />
          <p className="text-lg font-bold text-blue-600">{infoCount}</p>
          <p className="text-xs text-muted-foreground">Info</p>
        </div>
      </div>
      {topAlert && (
        <div className={`p-2 rounded-lg border ${
          topAlert.type === 'critical' ? 'bg-destructive/5 border-destructive/20' :
          topAlert.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
          'bg-blue-500/5 border-blue-500/20'
        }`}>
          <p className={`text-xs font-medium flex items-center gap-1 ${
            topAlert.type === 'critical' ? 'text-destructive' :
            topAlert.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
            'text-blue-600 dark:text-blue-400'
          }`}>
            {topAlert.type === 'critical' && <AlertTriangle className="h-3 w-3" />}
            {topAlert.type === 'warning' && <AlertCircle className="h-3 w-3" />}
            {topAlert.type === 'info' && <Info className="h-3 w-3" />}
            {topAlert.title}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {topAlert.message}
          </p>
        </div>
      )}
    </div>
  );
};
