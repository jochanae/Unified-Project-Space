import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, PieChart, TrendingUp, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBudgetBills } from "@/hooks/useBudgetBills";
import { Receipt } from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer } from "recharts";

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
}

import { BUDGET_CATEGORY_COLORS } from "@/lib/budgetColors";

// Use shared constants
const categoryColors = BUDGET_CATEGORY_COLORS;

export const BudgetsCardContent = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const { totalCommitted } = useBudgetBills();

  useEffect(() => {
    if (user) {
      fetchBudgets();
    }
  }, [user]);

  const fetchBudgets = async () => {
    try {
      const { data } = await supabase
        .from("budgets")
        .select("id, name, category, amount, spent")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      setBudgets(data || []);
    } catch (error) {
      console.error("Error fetching budgets:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-8 bg-muted/50 rounded animate-pulse" />
        <div className="h-8 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (budgets.length === 0) {
    return (
      <div className="space-y-3 text-center">
        <div className="p-4 rounded-lg bg-muted/50">
          <PieChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No budgets set up</p>
        </div>
        <Button size="sm" className="w-full" onClick={() => navigate("/budgets")}>
          <Plus className="h-4 w-4 mr-1" />
          Get Started
        </Button>
      </div>
    );
  }

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const healthScore = Math.max(0, Math.min(100, 100 - overallProgress));
  const budgetCount = budgets.length;

  // Determine budget health status
  const getHealthStatus = () => {
    if (overallProgress <= 75) return { label: 'Excellent', color: 'text-green-500' };
    if (overallProgress <= 90) return { label: 'Good', color: 'text-yellow-500' };
    if (overallProgress <= 100) return { label: 'Warning', color: 'text-orange-500' };
    return { label: 'Over Budget', color: 'text-red-500' };
  };
  const healthStatus = getHealthStatus();

  // Pie chart data
  const chartData = budgets.slice(0, 6).map((b) => ({
    name: b.name,
    value: Number(b.amount),
    color: categoryColors[b.category] || categoryColors.other,
  }));

  // Get current month/year
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-2">
      {/* Header with count and month */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Copy className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-medium text-muted-foreground">Budget vs Actual</span>
        </div>
        <span className="text-[9px] text-muted-foreground">{currentMonth}</span>
      </div>

      {/* Main Stats - Compact */}
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-base font-bold ${overallProgress > 100 ? 'text-red-500' : 'text-foreground'}`}>
            ${totalSpent.toLocaleString()} / ${totalBudget.toLocaleString()}
          </p>
          <p className="text-[9px] text-muted-foreground">{budgetCount} active budgets</p>
        </div>
        <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          overallProgress > 100 ? 'bg-red-500 text-white' : 'bg-primary text-white'
        }`}>
          {overallProgress.toFixed(0)}%
        </div>
      </div>

      {/* Progress Bar */}
      <Progress 
        value={Math.min(overallProgress, 100)} 
        className={`h-2 ${overallProgress > 90 ? "[&>div]:bg-red-500" : overallProgress > 75 ? "[&>div]:bg-yellow-500" : ""}`}
      />

      {/* Remaining */}
      <div className="flex justify-between items-center text-[10px]">
        <span className="text-muted-foreground">{overallProgress.toFixed(0)}% Used</span>
        <span className={`font-medium ${totalRemaining >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          ${Math.abs(totalRemaining).toLocaleString()} {totalRemaining >= 0 ? 'Left' : 'Over'}
        </span>
      </div>

      {/* Upcoming Bills */}
      {totalCommitted > 0 && (
        <div className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border-t">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Receipt className="h-3 w-3" />
            Upcoming Bills
          </span>
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
            ${totalCommitted.toLocaleString()}
          </span>
        </div>
      )}

      {/* Budget Health */}
      <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/50 border-t">
        <span className="text-[10px] text-muted-foreground">Budget Health</span>
        <div className="flex items-center gap-1">
          <TrendingUp className={`h-3 w-3 ${healthStatus.color}`} />
          <span className={`text-[10px] font-medium ${healthStatus.color}`}>{healthStatus.label}</span>
        </div>
      </div>

      {/* Mini Pie Chart - Only show if multiple budgets */}
      {budgetCount > 1 && (
        <div className="border-t pt-1">
          <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground mb-1">
            <PieChart className="h-3 w-3" />
            Allocation
          </div>
          <div className="h-14 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={15}
                  outerRadius={25}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </RechartsPie>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[8px] font-medium text-muted-foreground">
                {budgetCount}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
