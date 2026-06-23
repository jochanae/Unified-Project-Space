import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { mapTransactionToBudgetCategory } from "@/lib/categoryMapping";
import { toast } from "sonner";

interface TransactionData {
  amount: number;
  category: string;
  type: "income" | "expense";
  title?: string;
}

/**
 * Hook for budget notifications when transactions are added.
 * Note: Budget spent values are now automatically synced via database triggers.
 * This hook only handles UI notifications.
 */
export function useBudgetAutoUpdate() {
  const { user } = useAuth();

  /**
   * Shows budget notification if a transaction affects a budget.
   * The actual spent update is handled by database trigger.
   */
  const updateBudgetFromTransaction = useCallback(
    async (transaction: TransactionData): Promise<boolean> => {
      if (!user?.id) return false;
      if (transaction.type === "income") return false;

      const budgetCategory = mapTransactionToBudgetCategory(
        transaction.category,
        transaction.type
      );

      if (!budgetCategory) {
        return false;
      }

      try {
        // Fetch budget to show notification (DB trigger handles the actual update)
        const { data: budgets, error: fetchError } = await supabase
          .from("budgets")
          .select("id, name, category, spent, amount")
          .eq("user_id", user.id)
          .eq("category", budgetCategory)
          .eq("is_active", true)
          .limit(1);

        if (fetchError || !budgets || budgets.length === 0) {
          return false;
        }

        const budget = budgets[0];
        // Estimate new spent (actual value updated by trigger)
        const estimatedSpent = Number(budget.spent) + transaction.amount;
        const percentUsed = Math.round((estimatedSpent / Number(budget.amount)) * 100);

        // Show toast notifications for budget thresholds
        if (percentUsed >= 100) {
          toast.warning(`${budget.name} budget exceeded!`, {
            description: `Now over $${Number(budget.amount).toLocaleString()} limit`,
          });
        } else if (percentUsed >= 90) {
          toast.warning(`${budget.name} budget at ${percentUsed}%`, {
            description: `$${(Number(budget.amount) - estimatedSpent).toLocaleString()} remaining`,
          });
        }


        return true;
      } catch (error) {
        console.error("[BudgetAutoUpdate] Error:", error);
        return false;
      }
    },
    [user?.id]
  );

  /**
   * Called when a transaction is deleted.
   * The actual spent update is handled by database trigger.
   */
  const reverseBudgetFromTransaction = useCallback(
    async (transaction: TransactionData): Promise<boolean> => {
      if (!user?.id) return false;
      if (transaction.type === "income") return false;

      // Database trigger handles the actual update

      return true;
    },
    [user?.id]
  );

  return {
    updateBudgetFromTransaction,
    reverseBudgetFromTransaction,
  };
}
