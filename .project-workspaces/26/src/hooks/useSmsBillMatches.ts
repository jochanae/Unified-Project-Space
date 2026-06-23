import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SmsBillMatch {
  id: string;
  transaction_id: string;
  bill_id: string;
  confidence: string;
  match_reason: string;
  status: string;
  created_at: string;
  transaction?: {
    id: string;
    title: string;
    amount: number;
    category: string;
    transaction_date: string;
    notes: string;
  };
  bill?: {
    id: string;
    name: string;
    amount: number;
    category: string;
    due_date: string;
    status: string;
  };
}

export function useSmsBillMatches() {
  const { user } = useAuth();
  const [pendingMatches, setPendingMatches] = useState<SmsBillMatch[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPendingMatches = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("sms_bill_matches")
        .select(`
          *,
          transaction:transactions(id, title, amount, category, transaction_date, notes),
          bill:bills(id, name, amount, category, due_date, status)
        `)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPendingMatches((data as any) || []);
    } catch (err) {
      console.error("[SmsBillMatches] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const confirmMatch = useCallback(async (matchId: string, billId: string, transactionId: string, amount: number) => {
    if (!user?.id) return;
    try {
      const paidDate = new Date().toISOString().split("T")[0];

      // Mark bill as paid
      await supabase
        .from("bills")
        .update({ status: "paid", last_paid_date: paidDate, scheduled_payment_date: null })
        .eq("id", billId);

      // Create bill_payments record
      await supabase.from("bill_payments").insert({
        bill_id: billId,
        user_id: user.id,
        amount,
        paid_date: paidDate,
        payment_method: "sms",
        linked_transaction_id: transactionId,
        notes: "Confirmed from SMS bill match",
      });

      // Update match status
      await supabase
        .from("sms_bill_matches")
        .update({ status: "confirmed", resolved_at: new Date().toISOString() })
        .eq("id", matchId);

      toast.success("Bill marked as paid!");
      await fetchPendingMatches();
    } catch (err) {
      console.error("[SmsBillMatches] Confirm error:", err);
      toast.error("Failed to confirm match");
    }
  }, [user?.id, fetchPendingMatches]);

  const dismissMatch = useCallback(async (matchId: string) => {
    try {
      await supabase
        .from("sms_bill_matches")
        .update({ status: "dismissed", resolved_at: new Date().toISOString() })
        .eq("id", matchId);

      toast.info("Match dismissed");
      await fetchPendingMatches();
    } catch (err) {
      console.error("[SmsBillMatches] Dismiss error:", err);
    }
  }, [fetchPendingMatches]);

  useEffect(() => {
    fetchPendingMatches();
  }, [fetchPendingMatches]);

  return {
    pendingMatches,
    loading,
    confirmMatch,
    dismissMatch,
    refreshMatches: fetchPendingMatches,
  };
}
