import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Receipt, Calendar, DollarSign, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
  budget_id: string;
  budget_name?: string;
  budget_category?: string;
}

interface BudgetTransactionHistoryProps {
  budgetId?: string; // If provided, filter to specific budget
  budgetName?: string;
}

const categoryEmojis: Record<string, string> = {
  housing: "🏠",
  transportation: "🚗",
  food: "🍔",
  utilities: "💡",
  healthcare: "🏥",
  insurance: "🛡️",
  savings: "💰",
  entertainment: "🎬",
  shopping: "🛍️",
  personal: "💅",
  education: "📚",
  debt: "💳",
  gifts: "🎁",
  travel: "✈️",
  other: "📦",
};

const BudgetTransactionHistory = ({ budgetId, budgetName }: BudgetTransactionHistoryProps) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("this-month");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, budgetId, dateFilter]);

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case "this-month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last-month":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case "last-3-months":
        return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) };
      case "all":
        return { start: null, end: null };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchTransactions = async () => {
    try {
      const { start, end } = getDateRange();
      
      let query = supabase
        .from("budget_transactions")
        .select(`
          id,
          amount,
          description,
          transaction_date,
          created_at,
          budget_id
        `)
        .order("transaction_date", { ascending: false });

      if (budgetId) {
        query = query.eq("budget_id", budgetId);
      }

      if (start && end) {
        query = query
          .gte("transaction_date", format(start, "yyyy-MM-dd"))
          .lte("transaction_date", format(end, "yyyy-MM-dd"));
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;

      // Fetch budget details for each transaction
      if (data && data.length > 0) {
        const budgetIds = [...new Set(data.map((t) => t.budget_id))];
        const { data: budgets } = await supabase
          .from("budgets")
          .select("id, name, category")
          .in("id", budgetIds);

        const enrichedTransactions = data.map((t) => {
          const budget = budgets?.find((b) => b.id === t.budget_id);
          return {
            ...t,
            budget_name: budget?.name,
            budget_category: budget?.category,
          };
        });

        setTransactions(enrichedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: string, amount: number, budgetIdToUpdate: string) => {
    try {
      // Delete transaction
      const { error: deleteError } = await supabase
        .from("budget_transactions")
        .delete()
        .eq("id", transactionId);

      if (deleteError) throw deleteError;

      // Update budget spent amount
      const { data: budget } = await supabase
        .from("budgets")
        .select("spent")
        .eq("id", budgetIdToUpdate)
        .maybeSingle();

      if (budget) {
        await supabase
          .from("budgets")
          .update({ spent: Math.max(0, Number(budget.spent) - amount) })
          .eq("id", budgetIdToUpdate);
      }

      toast.success("Transaction deleted");
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const totalAmount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const displayedTransactions = expanded ? transactions : transactions.slice(0, 5);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            {budgetName ? `${budgetName} History` : "Transaction History"}
          </CardTitle>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-3-months">Last 3 Months</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {transactions.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{transactions.length} transactions</span>
            <span>•</span>
            <span className="font-semibold text-foreground">
              ${totalAmount.toLocaleString()} total
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No transactions found for this period
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {displayedTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
                >
                  <div className="text-xl">
                    {categoryEmojis[transaction.budget_category || "other"]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {transaction.description || transaction.budget_name || "Expense"}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(transaction.transaction_date), "MMM d, yyyy")}
                      {!budgetId && transaction.budget_name && (
                        <>
                          <span>•</span>
                          <span>{transaction.budget_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-500">
                      -${Number(transaction.amount).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeleteTransaction(transaction.id, Number(transaction.amount), transaction.budget_id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {transactions.length > 5 && (
              <Button
                variant="ghost"
                className="w-full mt-3"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show {transactions.length - 5} More
                  </>
                )}
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetTransactionHistory;
