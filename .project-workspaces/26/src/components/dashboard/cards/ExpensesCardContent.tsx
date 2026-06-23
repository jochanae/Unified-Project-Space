import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { TrendingDown, TrendingUp } from "lucide-react";

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: string;
  category: string;
  transaction_date: string;
}

interface BudgetSummary {
  totalBudgeted: number;
  totalSpent: number;
}

export const ExpensesCardContent = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary>({ totalBudgeted: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch recent transactions
      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select("id, title, amount, type, category, transaction_date")
        .order("transaction_date", { ascending: false })
        .limit(3);

      if (transError) throw transError;
      setTransactions(transactionsData || []);

      // Fetch budget summary
      const { data: budgetsData, error: budgetError } = await supabase
        .from("budgets")
        .select("amount, spent")
        .eq("is_active", true);

      if (budgetError) throw budgetError;

      const summary = (budgetsData || []).reduce(
        (acc, budget) => ({
          totalBudgeted: acc.totalBudgeted + Number(budget.amount),
          totalSpent: acc.totalSpent + Number(budget.spent),
        }),
        { totalBudgeted: 0, totalSpent: 0 }
      );
      setBudgetSummary(summary);
    } catch (error) {
      console.error("Error fetching expenses data:", error);
    } finally {
      setLoading(false);
    }
  };

  const utilization = budgetSummary.totalBudgeted > 0 
    ? Math.round((budgetSummary.totalSpent / budgetSummary.totalBudgeted) * 100) 
    : 0;

  const getUtilizationColor = () => {
    if (utilization > 90) return "bg-red-500/10 text-red-600";
    if (utilization > 75) return "bg-yellow-500/10 text-yellow-600";
    return "bg-green-500/10 text-green-600";
  };

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Quick overview of recent spending</p>
      <div className="space-y-1.5">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Budget Utilization</span>
          <span className={`font-medium px-1.5 rounded ${getUtilizationColor()}`}>
            {utilization}%
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Budgeted Spending</span>
          <span className="font-medium">${budgetSummary.totalBudgeted.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Spending</span>
          <span className="font-medium">${budgetSummary.totalSpent.toLocaleString()}</span>
        </div>
      </div>
      <div className="pt-2 border-t">
        <p className="text-xs font-medium mb-1">Recent Transactions</p>
        {transactions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">
            No recent transactions
          </p>
        ) : (
          <div className="space-y-1.5">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  {tx.type === "expense" ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                  <span className="truncate max-w-[100px]">{tx.title}</span>
                </div>
                <span className={tx.type === "expense" ? "text-red-500" : "text-green-500"}>
                  {tx.type === "expense" ? "-" : "+"}${Number(tx.amount).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
