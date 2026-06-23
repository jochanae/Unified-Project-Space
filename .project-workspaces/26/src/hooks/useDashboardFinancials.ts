import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FinancialData {
  balance: { amount: number; change: number; accountCount: number };
  cashflow: { income: number; expenses: number; net: number };
  budget: { remaining: number; healthPercent: number; total: number; spent: number };
  networth: { amount: number; change: number; assets: number; liabilities: number };
  creditScore: number | null;
  savingsRate: number;
  unpaidBills: number;
  isFutureMonth: boolean;
}

export interface ChartData {
  spendingByCategory: { name: string; value: number; color: string }[];
  monthlyTrend: { month: string; income: number; expenses: number }[];
  budgetVsActual: { category: string; budgeted: number; spent: number }[];
}

const CHART_COLORS = [
  "hsl(220, 70%, 55%)", "hsl(270, 60%, 55%)", "hsl(180, 60%, 45%)",
  "hsl(45, 80%, 50%)", "hsl(320, 60%, 55%)", "hsl(200, 70%, 50%)",
  "hsl(140, 50%, 45%)", "hsl(25, 80%, 55%)",
];

export function useDashboardFinancials(selectedMonth?: Date) {
  const { user } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialData>({
    balance: { amount: 0, change: 0, accountCount: 0 },
    cashflow: { income: 0, expenses: 0, net: 0 },
    budget: { remaining: 0, healthPercent: 0, total: 0, spent: 0 },
    networth: { amount: 0, change: 0, assets: 0, liabilities: 0 },
    creditScore: null,
    savingsRate: 0,
    unpaidBills: 0,
    isFutureMonth: false,
  });
  const [chartData, setChartData] = useState<ChartData>({
    spendingByCategory: [],
    monthlyTrend: [],
    budgetVsActual: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // Use selectedMonth or default to current month
  const targetMonth = selectedMonth || new Date();
  const monthKey = `${targetMonth.getFullYear()}-${targetMonth.getMonth()}`;

  useEffect(() => {
    const fetchAll = async () => {
      if (!user) return;
      setIsLoading(true);

      const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonthDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).toISOString().split('T')[0];
      const lastMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1);
      const startOfLastMonth = lastMonth.toISOString().split('T')[0];
      const endOfLastMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 0).toISOString().split('T')[0];

      // Determine if this is a future month
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const selectedMonthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
      const isFutureMonth = selectedMonthStart > currentMonthStart;

      const [accountsRes, incomeRes, expensesRes, lastMonthRes, budgetsRes, budgetSpendingRes, creditRes, billsRes] = await Promise.all([
        supabase.from('accounts').select('balance, category').eq('user_id', user.id),
        supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('transaction_date', startOfMonth).lte('transaction_date', endOfMonthDate),
        supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', startOfMonth).lte('transaction_date', endOfMonthDate),
        supabase.from('account_balance_history').select('balance').eq('user_id', user.id).gte('snapshot_date', startOfLastMonth).lte('snapshot_date', endOfLastMonth),
        supabase.from('budgets').select('amount, spent, category').eq('user_id', user.id).eq('is_active', true),
        // Fetch actual expense transactions for the selected month to calculate budget spent
        supabase.from('transactions').select('amount, category').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', startOfMonth).lte('transaction_date', endOfMonthDate),
        supabase.from('credit_scores').select('score').eq('user_id', user.id).order('score_date', { ascending: false }).limit(1),
        supabase.from('bills').select('amount, status').eq('user_id', user.id).neq('status', 'paid').gte('due_date', startOfMonth).lte('due_date', endOfMonthDate),
      ]);

      const accounts = accountsRes.data || [];
      const assets = accounts.filter(a => a.category === 'asset').reduce((s, a) => s + Number(a.balance), 0);
      const liabilities = accounts.filter(a => a.category === 'liability').reduce((s, a) => s + Number(a.balance), 0);
      const totalBalance = assets - liabilities;
      const lastMonthTotal = (lastMonthRes.data || []).reduce((s, b) => s + Number(b.balance), 0);
      const balanceChange = totalBalance - lastMonthTotal;

      const totalIncome = (incomeRes.data || []).reduce((s, t) => s + Number(t.amount), 0);
      const totalExpenses = (expensesRes.data || []).reduce((s, t) => s + Number(t.amount), 0);

      const budgets = budgetsRes.data || [];
      const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
      
      // Calculate budget spent from actual transactions for the selected month
      const monthExpenses = budgetSpendingRes.data || [];
      const totalSpentForMonth = monthExpenses.reduce((s, t) => s + Number(t.amount), 0);
      
      const budgetHealthPercent = totalBudget > 0 ? Math.round(((totalBudget - totalSpentForMonth) / totalBudget) * 100) : 0;
      const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;
      const unpaidBillsTotal = (billsRes.data || []).reduce((s, b) => s + Number(b.amount), 0);

      setFinancialData({
        balance: { amount: totalBalance, change: balanceChange, accountCount: accounts.length },
        cashflow: { income: totalIncome, expenses: totalExpenses, net: totalIncome - totalExpenses },
        budget: { remaining: totalBudget - totalSpentForMonth, healthPercent: budgetHealthPercent, total: totalBudget, spent: totalSpentForMonth },
        networth: { amount: assets - liabilities, change: balanceChange, assets, liabilities },
        creditScore: creditRes.data?.[0]?.score || null,
        savingsRate: Math.max(0, savingsRate),
        unpaidBills: unpaidBillsTotal,
        isFutureMonth,
      });

      // Chart data
      const spendingByCategory = budgets
        .map((b, i) => {
          // Calculate category spending from month's transactions
          const categorySpent = monthExpenses
            .filter(t => t.category === b.category)
            .reduce((s, t) => s + Number(t.amount), 0);
          return {
            name: String(b.category).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            value: categorySpent,
            color: CHART_COLORS[i % CHART_COLORS.length],
          };
        })
        .filter(b => b.value > 0);

      const budgetVsActual = budgets.slice(0, 5).map(b => {
        const categorySpent = monthExpenses
          .filter(t => t.category === b.category)
          .reduce((s, t) => s + Number(t.amount), 0);
        return {
          category: String(b.category).replace(/_/g, ' '),
          budgeted: Number(b.amount),
          spent: categorySpent,
        };
      });

      // Monthly trend - 6 months ending at selectedMonth
      const months: { month: string; start: string; end: string }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - i, 1);
        months.push({
          month: d.toLocaleString('default', { month: 'short' }),
          start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
          end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
        });
      }

      const trendData = await Promise.all(months.map(async m => {
        const [inc, exp] = await Promise.all([
          supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'income').gte('transaction_date', m.start).lte('transaction_date', m.end),
          supabase.from('transactions').select('amount').eq('user_id', user.id).eq('type', 'expense').gte('transaction_date', m.start).lte('transaction_date', m.end),
        ]);
        return {
          month: m.month,
          income: (inc.data || []).reduce((s, t) => s + Number(t.amount), 0),
          expenses: (exp.data || []).reduce((s, t) => s + Number(t.amount), 0),
        };
      }));

      setChartData({ spendingByCategory, monthlyTrend: trendData, budgetVsActual });
      setIsLoading(false);
    };

    fetchAll();
  }, [user, monthKey]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  return { financialData, chartData, isLoading, formatCurrency };
}
