import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, differenceInMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface Goal {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  created_at: string;
  is_archived: boolean;
}

interface GoalsTrendChartProps {
  goals: Goal[];
}

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

const GoalsTrendChart = ({ goals }: GoalsTrendChartProps) => {
  const { user } = useAuth();

  const { data: contributions = [] } = useQuery({
    queryKey: ["goal-contributions-trend", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const sixMonthsAgo = format(subMonths(new Date(), 5), 'yyyy-MM-01');
      const { data, error } = await supabase
        .from("account_contributions")
        .select("amount, contribution_date")
        .gte("contribution_date", sixMonthsAgo)
        .order("contribution_date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const chartData = useMemo(() => {
    const months = 6;
    const today = new Date();
    const activeGoals = goals.filter(g => !g.is_archived);
    const totalRemaining = activeGoals.reduce((sum, g) => sum + Math.max(g.target_amount - g.current_amount, 0), 0);

    // Calculate required monthly pace from goals with deadlines
    const goalsWithDeadlines = activeGoals.filter(g => g.deadline);
    let targetMonthlyPace = 0;
    if (goalsWithDeadlines.length > 0) {
      targetMonthlyPace = goalsWithDeadlines.reduce((sum, g) => {
        const remaining = Math.max(g.target_amount - g.current_amount, 0);
        const monthsLeft = Math.max(differenceInMonths(new Date(g.deadline!), today), 1);
        return sum + remaining / monthsLeft;
      }, 0);
    } else if (totalRemaining > 0) {
      targetMonthlyPace = totalRemaining / 12; // Default: 12 month pace
    }

    return Array.from({ length: months }, (_, i) => {
      const monthDate = subMonths(startOfMonth(today), months - 1 - i);
      const monthStr = format(monthDate, 'yyyy-MM');

      const monthContributions = contributions.filter((c: any) =>
        c.contribution_date.startsWith(monthStr)
      );
      const actual = monthContributions.reduce((sum: number, c: any) => sum + Number(c.amount), 0);

      return {
        date: format(monthDate, 'MMM'),
        actual: Math.round(actual * 100) / 100,
        target: Math.round(targetMonthlyPace * 100) / 100,
      };
    });
  }, [goals, contributions]);

  const hasData = chartData.some(d => d.actual > 0 || d.target > 0);
  if (!hasData) return null;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 overflow-hidden">
      <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Contributions vs Target Pace</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary))' }} /> Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400/70" /> Target
          </span>
        </div>
      </div>
      <div className="h-[130px] px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="goalActualGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="goalTargetGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.12} />
                <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.01} />
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
              dataKey="target"
              name="Target Pace"
              stroke="hsl(45, 93%, 47%)"
              strokeWidth={2}
              strokeDasharray="6 3"
              fill="url(#goalTargetGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(45, 93%, 47%)' }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#goalActualGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
};

export default GoalsTrendChart;
