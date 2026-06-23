import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, TrendingDown, PieChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
}

interface BudgetAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budgets: Budget[];
}

import { BUDGET_CATEGORY_COLORS } from "@/lib/budgetColors";

// Use shared constants
const categoryColors = BUDGET_CATEGORY_COLORS;

export function BudgetAnalyticsModal({ open, onOpenChange, budgets }: BudgetAnalyticsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    if (open && user) {
      fetchHistoricalData();
    }
  }, [open, user]);

  const fetchHistoricalData = async () => {
    if (!user) return;

    // Get budget transactions for the last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data, error } = await supabase
      .from("budget_transactions")
      .select("amount, transaction_date, budget_id")
      .eq("user_id", user.id)
      .gte("transaction_date", sixMonthsAgo.toISOString())
      .order("transaction_date", { ascending: true });

    if (!error && data) {
      // Group by month
      const monthlyData: Record<string, number> = {};
      data.forEach(t => {
        const month = new Date(t.transaction_date).toLocaleDateString("en-US", { month: "short" });
        monthlyData[month] = (monthlyData[month] || 0) + t.amount;
      });

      setHistoricalData(
        Object.entries(monthlyData).map(([month, spent]) => ({
          month,
          spent,
        }))
      );
    }
  };

  // Budget vs Spent comparison data
  const comparisonData = budgets.map(b => ({
    name: b.name.length > 10 ? b.name.substring(0, 10) + "..." : b.name,
    budget: b.amount,
    spent: b.spent,
    remaining: Math.max(0, b.amount - b.spent),
  }));

  // Category breakdown for pie chart
  const categoryData = budgets.map(b => ({
    name: b.name,
    value: b.spent,
    color: categoryColors[b.category] || categoryColors.other,
  }));

  // Calculate stats
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const avgSpendingRate = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0;
  const overBudgetCount = budgets.filter(b => b.spent > b.amount).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Budget Analytics
          </DialogTitle>
        </DialogHeader>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-primary">{avgSpendingRate}%</p>
              <p className="text-xs text-muted-foreground">Avg. Spent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-500">{budgets.length}</p>
              <p className="text-xs text-muted-foreground">Active Budgets</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">{overBudgetCount}</p>
              <p className="text-xs text-muted-foreground">Over Budget</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="comparison">Comparison</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="h-4 w-4" />
                  Spending by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 && totalSpent > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPie>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Legend />
                        <Tooltip 
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No spending data to display
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Budget vs Actual Spending
                </CardTitle>
              </CardHeader>
              <CardContent>
                {comparisonData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonData} layout="vertical">
                        <XAxis type="number" tickFormatter={(v) => `$${v}`} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                        <Bar dataKey="budget" fill="hsl(var(--primary))" name="Budget" radius={[0, 4, 4, 0]} />
                        <Bar dataKey="spent" fill="#EF4444" name="Spent" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No budget data to compare
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Spending Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historicalData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={historicalData}>
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `$${v}`} />
                        <Tooltip 
                          formatter={(value: number) => `$${value.toLocaleString()}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="spent" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No historical data yet</p>
                      <p className="text-sm mt-1">Spending trends will appear as you use budgets</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
