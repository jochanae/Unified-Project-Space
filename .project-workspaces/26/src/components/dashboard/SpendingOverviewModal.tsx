import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, format } from "date-fns";
import type { ChartData } from "@/hooks/useDashboardFinancials";

const CHART_COLORS = [
  "hsl(150, 55%, 42%)", "hsl(270, 50%, 50%)", "hsl(180, 55%, 42%)",
  "hsl(200, 65%, 50%)", "hsl(45, 75%, 50%)", "hsl(320, 50%, 50%)",
  "hsl(220, 55%, 52%)", "hsl(25, 70%, 50%)",
];

interface SpendingOverviewModalProps {
  open: boolean;
  onClose: () => void;
  chartData: ChartData;
  income: number;
  expenses: number;
  formatCurrency: (n: number) => string;
}

export function SpendingOverviewModal({ open, onClose, chartData, income, expenses, formatCurrency }: SpendingOverviewModalProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const ratio = income > 0 ? Math.min(100, (expenses / income) * 100) : 0;
  const [topTransactions, setTopTransactions] = useState<{ title: string; amount: number; category: string }[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    const fetchTop = async () => {
      const now = new Date();
      const { data } = await supabase
        .from("transactions")
        .select("title, amount, category")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("transaction_date", format(startOfMonth(now), "yyyy-MM-dd"))
        .lte("transaction_date", format(endOfMonth(now), "yyyy-MM-dd"))
        .order("amount", { ascending: false })
        .limit(5);
      setTopTransactions(data || []);
    };
    fetchTop();
  }, [open, user]);

  const totalExpenses = chartData.spendingByCategory.reduce((s, c) => s + c.value, 0);

  const content = (
    <div className="space-y-5">
      {/* Large pie chart with ALL categories */}
      <div className="h-[250px] w-full">
        {chartData.spendingByCategory.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.spendingByCategory}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.spendingByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), '']}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
            No spending data yet
          </div>
        )}
      </div>

      {/* Full category breakdown */}
      {chartData.spendingByCategory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Category Breakdown</h4>
          <div className="space-y-1.5">
            {chartData.spendingByCategory.map((cat, i) => {
              const pct = totalExpenses > 0 ? ((cat.value / totalExpenses) * 100).toFixed(1) : '0';
              return (
                <div key={cat.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color || CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-foreground capitalize">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                    <span className="text-sm font-medium text-foreground">{formatCurrency(cat.value)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trend chart */}
      {chartData.monthlyTrend.length > 0 && chartData.monthlyTrend.some(m => m.income > 0 || m.expenses > 0) && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Monthly Trend</h4>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendIncGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="spendExpGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0, 65%, 55%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(0, 65%, 55%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), '']}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' }}
                />
                <Area type="monotone" dataKey="income" stroke="hsl(160, 60%, 45%)" strokeWidth={2} fill="url(#spendIncGrad)" dot={false} name="Income" />
                <Area type="monotone" dataKey="expenses" stroke="hsl(0, 65%, 55%)" strokeWidth={2} fill="url(#spendExpGrad)" dot={false} name="Expenses" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: 'hsl(160, 60%, 45%)' }} />
              <span className="text-xs text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: 'hsl(0, 65%, 55%)' }} />
              <span className="text-xs text-muted-foreground">Expenses</span>
            </div>
          </div>
        </div>
      )}

      {/* Top transactions */}
      {topTransactions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-foreground">Biggest Expenses This Month</h4>
          <div className="space-y-1.5">
            {topTransactions.map((tx, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground truncate">{tx.title}</span>
                </div>
                <span className="text-sm font-medium text-foreground ml-2 flex-shrink-0">{formatCurrency(Number(tx.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Income vs Expenses summary */}
      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Income</span>
          <span className="font-semibold text-foreground">{formatCurrency(income)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Expenses</span>
          <span className="font-semibold text-foreground">{formatCurrency(expenses)}</span>
        </div>
        <div className="flex justify-between text-sm font-semibold">
          <span className="text-muted-foreground">Net</span>
          <span className={income - expenses >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
            {income - expenses >= 0 ? '+' : ''}{formatCurrency(income - expenses)}
          </span>
        </div>
        <div className="h-3 rounded-full bg-muted overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
            style={{ width: `${ratio}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${100 - ratio}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Spent: {ratio.toFixed(0)}%</span>
          <span>Remaining: {(100 - ratio).toFixed(0)}%</span>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={() => onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[90vh] overflow-y-auto px-4 pb-6">
          <SheetHeader className="pb-2">
            <SheetTitle>Spending Overview</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Spending Overview</DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
