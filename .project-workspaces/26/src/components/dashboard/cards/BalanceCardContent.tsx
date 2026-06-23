import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const BalanceCardContent = () => {
  const { user } = useAuth();
  const [totalBalance, setTotalBalance] = useState(0);
  const [checking, setChecking] = useState(0);
  const [savings, setSavings] = useState(0);
  const [prevTotal, setPrevTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchBalances();
  }, [user]);

  const fetchBalances = async () => {
    try {
      const { data, error } = await supabase
        .from("accounts")
        .select("balance, account_type, category");

      if (error) throw error;

      const accounts = data || [];
      const total = accounts.reduce((sum, a) => sum + Number(a.balance), 0);
      const checkingTotal = accounts
        .filter((a) => a.account_type === "checking")
        .reduce((sum, a) => sum + Number(a.balance), 0);
      const savingsTotal = accounts
        .filter((a) => a.account_type === "savings")
        .reduce((sum, a) => sum + Number(a.balance), 0);

      // Get last month's snapshot for trend
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const { data: history } = await supabase
        .from("account_balance_history")
        .select("balance")
        .lte("snapshot_date", lastMonth.toISOString().split("T")[0])
        .order("snapshot_date", { ascending: false })
        .limit(50);

      const prevBalance = (history || []).reduce((sum, h) => sum + Number(h.balance), 0);

      setTotalBalance(total);
      setChecking(checkingTotal);
      setSavings(savingsTotal);
      setPrevTotal(prevBalance);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoading(false);
    }
  };

  const changePercent =
    prevTotal > 0 ? (((totalBalance - prevTotal) / prevTotal) * 100).toFixed(1) : null;

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-6 bg-muted rounded w-3/4"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="p-3 rounded-lg bg-primary/10">
        <p className="text-xs text-muted-foreground">Total Balance</p>
        <p className="text-xl font-bold text-foreground">
          ${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        {changePercent !== null && (
          <p className={`text-xs ${Number(changePercent) >= 0 ? "text-green-500" : "text-red-500"}`}>
            {Number(changePercent) >= 0 ? "+" : ""}
            {changePercent}% from last month
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 p-2 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground">Checking</p>
          <p className="text-sm font-semibold">
            ${checking.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground">Savings</p>
          <p className="text-sm font-semibold">
            ${savings.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>
    </div>
  );
};
