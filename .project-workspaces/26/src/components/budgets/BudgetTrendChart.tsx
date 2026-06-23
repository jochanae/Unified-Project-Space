import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const hasValues = payload.some((p: any) => p.value > 0);
  if (!hasValues) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="font-semibold text-sm text-foreground">{label}</p>
      {payload.map((entry: any) => (
        entry.value > 0 && (
          <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        )
      ))}
    </div>
  );
};

const BudgetTrendChart = () => {
  const { user } = useAuth();

  const { data: budgetHistory = [] } = useQuery({
    queryKey: ["budget-trend-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sixMonthsAgo = format(subMonths(new Date(), 5), 'yyyy-MM-01');
      
      // Get budgets that were active in the last 6 months
      const { data: budgets, error } = await supabase
        .from("budgets")
        .select("amount, spent, start_date, category")
        .eq("user_id", user.id)
        .gte("start_date", sixMonthsAgo)
        .order("start_date", { ascending: true });
      
      if (error) throw error;
      return budgets || [];
    },
    enabled: !!user,
  });

  const chartData = useMemo(() => {
    const months = 6;
    const today = new Date();

    return Array.from({ length: months }, (_, i) => {
      const monthDate = subMonths(startOfMonth(today), months - 1 - i);
      const monthStr = format(monthDate, 'yyyy-MM');

      // Find budgets that started in this month
      const monthBudgets = budgetHistory.filter((b: any) =>
        b.start_date.startsWith(monthStr)
      );

      const allocated = monthBudgets.reduce((sum: number, b: any) => sum + Number(b.amount), 0);
      const spent = monthBudgets.reduce((sum: number, b: any) => sum + Number(b.spent), 0);

      return {
        date: format(monthDate, 'MMM'),
        allocated: Math.round(allocated * 100) / 100,
        spent: Math.round(spent * 100) / 100,
      };
    });
  }, [budgetHistory]);

  const hasData = chartData.some(d => d.allocated > 0 || d.spent > 0);
  if (!hasData) return null;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 overflow-hidden">
      <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
        <div className="px-4 pt-4 pb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Budget vs Actual — Last 6 Months</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary))' }} /> Allocated
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Spent
            </span>
          </div>
        </div>
        <div className="h-[130px] px-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="budgetAllocGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="budgetSpentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                dy={4}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Area
                type="monotone"
                dataKey="allocated"
                name="Allocated"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#budgetAllocGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
              <Area
                type="monotone"
                dataKey="spent"
                name="Spent"
                stroke="hsl(0, 84%, 60%)"
                strokeWidth={2}
                fill="url(#budgetSpentGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(0, 84%, 60%)' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default BudgetTrendChart;
