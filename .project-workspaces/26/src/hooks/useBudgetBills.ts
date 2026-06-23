import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BudgetBill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  status: string;
  is_autopay: boolean;
  is_projected?: boolean;
}

// Maps bill categories to budget categories using the same rollup logic
const BILL_TO_BUDGET_CATEGORY: Record<string, string> = {
  utilities: "utilities",
  internet: "utilities",
  phone: "utilities",
  streaming: "entertainment",
  gym: "entertainment",
  subscriptions: "entertainment",
  insurance: "insurance",
  rent: "housing",
  mortgage: "housing",
  property_tax: "housing",
  transportation: "transportation",
  loans: "debt",
  credit_card: "debt",
  student_loan: "debt",
  medical: "healthcare",
  business: "business",
  other: "other",
};

export const mapBillToBudgetCategory = (billCategory: string): string => {
  return BILL_TO_BUDGET_CATEGORY[billCategory] || "other";
};

/**
 * Fetches all bills for the month INCLUDING projected recurring instances.
 * Mirrors the projection logic used on the Bills page so the mapping is complete.
 */
export const useBudgetBills = (month?: number, year?: number) => {
  const { user } = useAuth();
  const [bills, setBills] = useState<BudgetBill[]>([]);
  const [loading, setLoading] = useState(true);

  const targetMonth = month ?? new Date().getMonth() + 1; // 1-indexed
  const targetYear = year ?? new Date().getFullYear();

  useEffect(() => {
    if (user) fetchAndProjectBills();
  }, [user, targetMonth, targetYear]);

  const fetchAndProjectBills = async () => {
    try {
      setLoading(true);

      // Fetch ALL bills for this user (recurring ones may have due_dates in other months)
      const { data: allBills, error } = await supabase
        .from("bills")
        .select("id, name, amount, due_date, category, status, is_autopay, is_recurring, end_date")
        .order("due_date", { ascending: true });

      if (error) throw error;
      if (!allBills) {
        setBills([]);
        return;
      }

      // 0-indexed month for JS Date operations
      const monthIdx = targetMonth - 1;
      const monthStart = new Date(targetYear, monthIdx, 1);
      const lastDay = new Date(targetYear, monthIdx + 1, 0).getDate();
      const monthEnd = new Date(targetYear, monthIdx, lastDay, 23, 59, 59);

      const result: BudgetBill[] = [];
      const seenIds = new Set<string>();
      const namesInMonth = new Set<string>();

      // First pass: bills whose due_date naturally falls in this month
      for (const bill of allBills) {
        const dueDate = new Date(bill.due_date + "T00:00:00");
        if (dueDate >= monthStart && dueDate <= monthEnd) {
          const key = bill.name.toLowerCase();
          namesInMonth.add(key);
          seenIds.add(bill.id);
          result.push({
            id: bill.id,
            name: bill.name,
            amount: bill.amount,
            due_date: bill.due_date,
            category: bill.category,
            status: bill.status,
            is_autopay: bill.is_autopay,
            is_projected: false,
          });
        }
      }

      // Second pass: project recurring bills that don't have an instance this month
      for (const bill of allBills) {
        if (seenIds.has(bill.id)) continue;
        if (!bill.is_recurring) continue;
        if (namesInMonth.has(bill.name.toLowerCase())) continue;

        const dueDate = new Date(bill.due_date + "T00:00:00");

        // Only project bills whose original due date is in a past or current month
        const billMonth = dueDate.getFullYear() * 12 + dueDate.getMonth();
        const viewMonth = targetYear * 12 + monthIdx;
        if (billMonth > viewMonth) continue;

        // If the bill has an end_date, don't project past it
        if (bill.end_date) {
          const endDate = new Date(bill.end_date + "T00:00:00");
          const projectedDate = new Date(targetYear, monthIdx, 1);
          if (projectedDate > endDate) continue;
        }

        const dayOfMonth = dueDate.getDate();
        const projectedDay = Math.min(dayOfMonth, lastDay);
        const projectedDateStr = `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(projectedDay).padStart(2, "0")}`;

        seenIds.add(bill.id);
        namesInMonth.add(bill.name.toLowerCase());

        result.push({
          id: bill.id,
          name: bill.name,
          amount: bill.amount,
          due_date: projectedDateStr,
          category: bill.category,
          status: "pending",
          is_autopay: bill.is_autopay,
          is_projected: true,
        });
      }

      // Sort by due date
      result.sort((a, b) => a.due_date.localeCompare(b.due_date));
      setBills(result);
    } catch (error) {
      console.error("Error fetching budget bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const unpaidBills = bills.filter((bill) => bill.status !== "paid");

  // Get bills mapped to a specific budget category
  const getBillsForBudgetCategory = (budgetCategory: string): BudgetBill[] => {
    return bills.filter((bill) => mapBillToBudgetCategory(bill.category) === budgetCategory);
  };

  // Get total committed amount for a budget category (unpaid only)
  const getCommittedAmount = (budgetCategory: string): number => {
    return unpaidBills
      .filter((bill) => mapBillToBudgetCategory(bill.category) === budgetCategory)
      .reduce((sum, bill) => sum + Number(bill.amount), 0);
  };

  // Get total committed across all categories (unpaid only)
  const totalCommitted = unpaidBills.reduce((sum, bill) => sum + Number(bill.amount), 0);

  return {
    bills,
    unpaidBills,
    loading,
    getBillsForBudgetCategory,
    getCommittedAmount,
    totalCommitted,
    refetch: fetchAndProjectBills,
  };
};
