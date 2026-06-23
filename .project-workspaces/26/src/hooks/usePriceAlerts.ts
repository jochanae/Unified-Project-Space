import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  direction: "above" | "below";
  is_triggered: boolean;
  triggered_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchAlerts = useCallback(async () => {
    if (!user) {
      setAlerts([]);
      setIsLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("bloom_price_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setAlerts((data as PriceAlert[]) || []);
    } catch (err) {
      console.error("Error fetching price alerts:", err);
      toast.error("Failed to load price alerts");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const createAlert = async (
    symbol: string,
    targetPrice: number,
    direction: "above" | "below",
    notes?: string,
  ) => {
    if (!user) {
      toast.error("You must be logged in to create alerts");
      return null;
    }
    try {
      const { data, error } = await supabase
        .from("bloom_price_alerts")
        .insert({
          user_id: user.id,
          symbol: symbol.toUpperCase(),
          target_price: targetPrice,
          direction,
          notes: notes ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      setAlerts((prev) => [data as PriceAlert, ...prev]);
      toast.success(`Alert set: ${symbol.toUpperCase()} ${direction} $${targetPrice}`);
      return data as PriceAlert;
    } catch (err) {
      console.error("Error creating price alert:", err);
      toast.error("Failed to create price alert");
      return null;
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bloom_price_alerts")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success("Alert deleted");
    } catch (err) {
      console.error("Error deleting price alert:", err);
      toast.error("Failed to delete alert");
    }
  };

  const activeAlerts = alerts.filter((a) => !a.is_triggered);
  const triggeredAlerts = alerts.filter((a) => a.is_triggered);

  return {
    alerts,
    activeAlerts,
    triggeredAlerts,
    isLoading,
    createAlert,
    deleteAlert,
    refetch: fetchAlerts,
  };
}
