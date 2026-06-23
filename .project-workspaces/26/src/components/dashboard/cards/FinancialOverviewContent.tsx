import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { XAxis, YAxis, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts";

interface FinancialData {
  netWorth: number;
  netWorthChange: number;
  netCashFlow: number;
  debtToIncome: number | null;
  monthlyIncome: number;
  monthlyData: { month: string; income: number; netWorth: number }[];
}

export const FinancialOverviewContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<FinancialData>({
    netWorth: 0,
    netWorthChange: 0,
    netCashFlow: 0,
    debtToIncome: null,
    monthlyIncome: 0,
    monthlyData: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfMonth = currentMonth.toISOString().split('T')[0];

      // Get last 6 months for trend
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

      const [accountsResult, transactionsResult, debtsResult, balanceHistoryResult] = await Promise.all([
        supabase.from('accounts').select('balance, category').eq('user_id', user.id),
        supabase.from('transactions').select('amount, type, transaction_date').eq('user_id', user.id).gte('transaction_date', sixMonthsAgo.toISOString().split('T')[0]),
        supabase.from('debts').select('minimum_payment, current_balance').eq('user_id', user.id).eq('status', 'active'),
        supabase.from('account_balance_history').select('balance, snapshot_date').eq('user_id', user.id).gte('snapshot_date', sixMonthsAgo.toISOString().split('T')[0]).order('snapshot_date', { ascending: true }),
      ]);

      // Calculate net worth from accounts
      const accounts = accountsResult.data || [];
      const assets = accounts.filter(a => a.category === 'asset').reduce((sum, a) => sum + Number(a.balance), 0);
      const liabilities = accounts.filter(a => a.category === 'liability').reduce((sum, a) => sum + Number(a.balance), 0);
      const netWorth = assets - liabilities;

      // Calculate current month income and expenses
      const transactions = transactionsResult.data || [];
      const currentMonthTransactions = transactions.filter(t => t.transaction_date >= startOfMonth);
      const monthlyIncome = currentMonthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const monthlyExpenses = currentMonthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      const netCashFlow = monthlyIncome - monthlyExpenses;

      // Calculate debt-to-income ratio
      // DTI = (Total Monthly Debt Payments / Gross Monthly Income) × 100
      const debts = debtsResult.data || [];
      const totalMinPayments = debts.reduce((sum, d) => sum + Number(d.minimum_payment), 0);
      
      // Use monthly income, or calculate from average if current month is low
      let incomeForDTI = monthlyIncome;
      
      // If current month income is 0 or very low, try to get average from past months
      if (incomeForDTI <= 0) {
        const allIncomeTransactions = transactions.filter(t => t.type === 'income');
        const totalIncome = allIncomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const monthsWithData = new Set(allIncomeTransactions.map(t => t.transaction_date.slice(0, 7))).size;
        incomeForDTI = monthsWithData > 0 ? totalIncome / monthsWithData : 0;
      }
      
      const debtToIncome = incomeForDTI > 0 ? (totalMinPayments / incomeForDTI) * 100 : null;

      // Build monthly data for chart
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStr = monthDate.toLocaleDateString('en-US', { month: 'short' });
        const monthStart = monthDate.toISOString().split('T')[0];
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().split('T')[0];

        const monthIncome = transactions
          .filter(t => t.type === 'income' && t.transaction_date >= monthStart && t.transaction_date <= monthEnd)
          .reduce((sum, t) => sum + Number(t.amount), 0);

        // Get net worth snapshot for month - only use actual data, not fake baseline
        const balanceHistory = balanceHistoryResult.data || [];
        const monthSnapshots = balanceHistory.filter(b => b.snapshot_date >= monthStart && b.snapshot_date <= monthEnd);
        // Only show real data - use 0 or actual snapshot, don't fabricate consistent values
        const monthNetWorth = monthSnapshots.length > 0 
          ? monthSnapshots[monthSnapshots.length - 1].balance 
          : (i === 0 ? netWorth : 0); // Only current month gets current net worth, past months with no data show 0

        months.push({
          month: monthStr,
          income: monthIncome,
          netWorth: Number(monthNetWorth),
        });
      }

      // Calculate net worth change percentage
      const lastMonthNetWorth = months.length > 1 ? months[months.length - 2].netWorth : 0;
      const netWorthChange = lastMonthNetWorth > 0 ? ((netWorth - lastMonthNetWorth) / lastMonthNetWorth) * 100 : 0;

      setData({
        netWorth,
        netWorthChange,
        netCashFlow,
        debtToIncome,
        monthlyIncome: incomeForDTI,
        monthlyData: months,
      });
    };

    fetchData();
  }, [user]);

  const formatCurrency = (amount: number) => {
    if (Math.abs(amount) >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(amount) >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  const getDTIColor = (dti: number | null) => {
    if (dti === null) return 'text-muted-foreground';
    if (dti <= 20) return 'text-green-500';
    if (dti <= 35) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getDTILabel = (dti: number | null) => {
    if (dti === null) return 'N/A';
    if (dti <= 20) return 'Excellent';
    if (dti <= 35) return 'Good';
    if (dti <= 43) return 'Fair';
    return 'High';
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] text-muted-foreground">Your financial snapshot at a glance</p>
      
      {/* Top Stats - More compact */}
      <div className="flex gap-1.5">
        <div className="flex-1 p-2 rounded-lg bg-gradient-to-br from-[hsl(250,70%,55%)] to-[hsl(280,70%,55%)] text-white">
          <p className="text-[10px] opacity-80">Net Worth</p>
          <p className="text-base font-bold">{formatCurrency(data.netWorth)}</p>
          <p className="text-[9px] flex items-center gap-0.5 opacity-90">
            {data.netWorthChange >= 0 ? '↑' : '↓'}{Math.abs(data.netWorthChange).toFixed(1)}% this month
          </p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-muted/70">
          <p className="text-[10px] text-muted-foreground">Net Cash Flow</p>
          <p className={`text-base font-bold ${data.netCashFlow >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {data.netCashFlow >= 0 ? '+' : ''}{formatCurrency(data.netCashFlow)}
          </p>
        </div>
      </div>

      {/* DTI Ratio - Compact */}
      <div className="p-2 rounded-lg bg-muted/70">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Debt-to-Income</p>
          <span className={`text-[9px] ${getDTIColor(data.debtToIncome)}`}>
            {getDTILabel(data.debtToIncome)}
          </span>
        </div>
        <p className={`text-sm font-semibold ${getDTIColor(data.debtToIncome)}`}>
          {data.debtToIncome !== null ? `${data.debtToIncome.toFixed(1)}%` : 'N/A'}
        </p>
      </div>

      {/* 6-Month Trend Chart - Compact */}
      <div className="pt-1">
        <p className="text-[10px] font-medium mb-1">6-Month Trend</p>
        <div className="h-20">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(145, 70%, 45%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(145, 70%, 45%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(210, 80%, 55%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 8 }} 
                axisLine={false} 
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 8 }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}K` : value}
                width={35}
              />
              <Tooltip 
                contentStyle={{ 
                  fontSize: 10, 
                  padding: '6px 10px', 
                  borderRadius: 8,
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'income' ? 'Income' : 'Net Worth'
                ]}
                labelStyle={{ fontWeight: 600, marginBottom: 4 }}
              />
              <Area 
                type="monotone" 
                dataKey="netWorth" 
                stroke="hsl(145, 70%, 45%)" 
                strokeWidth={2}
                fill="url(#netWorthGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(145, 70%, 45%)', strokeWidth: 0 }}
                name="netWorth"
              />
              <Area 
                type="monotone" 
                dataKey="income" 
                stroke="hsl(210, 80%, 55%)" 
                strokeWidth={2}
                fill="url(#incomeGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(210, 80%, 55%)', strokeWidth: 0 }}
                name="income"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-1.5 text-[9px]">
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded-full bg-[hsl(145,70%,45%)]" />
            <span className="text-muted-foreground">Net Worth</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded-full bg-[hsl(210,80%,55%)]" />
            <span className="text-muted-foreground">Income</span>
          </div>
        </div>
      </div>

      {/* View Detailed Reports Button */}
      <Button 
        variant="outline" 
        size="sm"
        className="w-full mt-1 gap-1 h-7 text-xs"
        onClick={() => navigate('/reports')}
      >
        <TrendingUp className="h-3 w-3" />
        View Reports
        <ArrowRight className="h-3 w-3 ml-auto" />
      </Button>
    </div>
  );
};
