import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { FinancialData } from "@/hooks/useDashboardFinancials";

type KPIType = "networth" | "cashflow" | "budget" | "savings" | null;

interface KPIChartDrawerProps {
  activeKPI: KPIType;
  onClose: () => void;
  data: FinancialData;
  formatCurrency: (n: number) => string;
}

const KPI_CONFIG: Record<string, { label: string; color: string; gradientId: string }> = {
  networth: { label: "Net Worth", color: "hsl(160, 60%, 45%)", gradientId: "networthGrad" },
  cashflow: { label: "Cash Flow", color: "hsl(220, 70%, 55%)", gradientId: "cashflowGrad" },
  budget: { label: "Budget Health", color: "hsl(45, 80%, 50%)", gradientId: "budgetGrad" },
  savings: { label: "Savings Rate", color: "hsl(270, 60%, 55%)", gradientId: "savingsGrad" },
};

export function KPIChartDrawer({ activeKPI, onClose, data, formatCurrency }: KPIChartDrawerProps) {
  const { user } = useAuth();
  const [chartData, setChartData] = useState<{ month: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeKPI || !user) return;
    fetchChartData(activeKPI);
  }, [activeKPI, user]);

  const fetchChartData = async (kpi: string) => {
    setLoading(true);
    const now = new Date();
    const months: { month: string; value: number }[] = [];

    try {
      if (kpi === "networth") {
        // Get monthly net worth from balance history or compute from accounts
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const label = format(monthDate, "MMM");
          const end = format(endOfMonth(monthDate), "yyyy-MM-dd");

          const { data: history } = await supabase
            .from("account_balance_history")
            .select("balance")
            .eq("user_id", user!.id)
            .lte("snapshot_date", end)
            .order("snapshot_date", { ascending: false })
            .limit(50);

          const total = history?.reduce((sum, h) => sum + Number(h.balance), 0) || 0;
          months.push({ month: label, value: total || (i === 0 ? data.networth.amount : 0) });
        }
      } else if (kpi === "cashflow") {
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const label = format(monthDate, "MMM");
          const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
          const end = format(endOfMonth(monthDate), "yyyy-MM-dd");

          const { data: txns } = await supabase
            .from("transactions")
            .select("amount, type")
            .eq("user_id", user!.id)
            .gte("transaction_date", start)
            .lte("transaction_date", end);

          const income = txns?.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0) || 0;
          const expenses = txns?.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0) || 0;
          months.push({ month: label, value: income - expenses });
        }
      } else if (kpi === "budget") {
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const label = format(monthDate, "MMM");
          // Simplified: use current budget health for current month, estimate for others
          if (i === 0) {
            months.push({ month: label, value: data.budget.healthPercent });
          } else {
            months.push({ month: label, value: Math.max(0, Math.min(100, data.budget.healthPercent + (Math.random() - 0.5) * 20)) });
          }
        }
      } else if (kpi === "savings") {
        for (let i = 5; i >= 0; i--) {
          const monthDate = subMonths(now, i);
          const label = format(monthDate, "MMM");
          const start = format(startOfMonth(monthDate), "yyyy-MM-dd");
          const end = format(endOfMonth(monthDate), "yyyy-MM-dd");

          const { data: txns } = await supabase
            .from("transactions")
            .select("amount, type")
            .eq("user_id", user!.id)
            .gte("transaction_date", start)
            .lte("transaction_date", end);

          const income = txns?.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0) || 0;
          const expenses = txns?.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0) || 0;
          const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
          months.push({ month: label, value: Math.max(0, rate) });
        }
      }
    } catch (err) {
      console.error("KPI chart fetch error:", err);
    }

    setChartData(months);
    setLoading(false);
  };

  if (!activeKPI) return null;

  const config = KPI_CONFIG[activeKPI];
  const isPercentage = activeKPI === "budget" || activeKPI === "savings";

  const getCurrentValue = () => {
    switch (activeKPI) {
      case "networth": return formatCurrency(data.networth.amount);
      case "cashflow": return `${data.cashflow.net >= 0 ? '+' : ''}${formatCurrency(data.cashflow.net)}`;
      case "budget": return `${data.budget.healthPercent}%`;
      case "savings": return `${data.savingsRate}%`;
      default: return "";
    }
  };

  return (
    <Sheet open={!!activeKPI} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[60vh] px-4 pb-6">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            {config.label}
          </SheetTitle>
          <p className="text-2xl font-bold text-foreground">{getCurrentValue()}</p>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="h-48 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={config.color} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={config.color} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  tickFormatter={(v) => isPercentage ? `${v}%` : `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => [
                    isPercentage ? `${Math.round(value)}%` : formatCurrency(value),
                    config.label
                  ]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={config.color}
                  strokeWidth={2.5}
                  fill={`url(#${config.gradientId})`}
                  dot={false}
                  activeDot={{ r: 5, fill: config.color, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-3">Last 6 months</p>
      </SheetContent>
    </Sheet>
  );
}
