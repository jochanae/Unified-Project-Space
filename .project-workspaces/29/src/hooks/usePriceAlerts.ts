import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PriceAlert {
  id: string;
  user_id: string;
  symbol: string;
  target_price: number;
  direction: 'above' | 'below';
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
        .from('price_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlerts((data as PriceAlert[]) || []);
    } catch (error) {
      console.error('Error fetching price alerts:', error);
      toast.error('Failed to load price alerts');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const createAlert = async (
    symbol: string,
    targetPrice: number,
    direction: 'above' | 'below',
    notes?: string
  ) => {
    if (!user) {
      toast.error('You must be logged in to create alerts');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .insert({
          user_id: user.id,
          symbol: symbol.toUpperCase(),
          target_price: targetPrice,
          direction,
          notes,
        })
        .select()
        .single();

      if (error) throw error;

      setAlerts((prev) => [data as PriceAlert, ...prev]);
      toast.success(`Alert created for ${symbol.toUpperCase()} ${direction} $${targetPrice}`);
      return data as PriceAlert;
    } catch (error) {
      console.error('Error creating price alert:', error);
      toast.error('Failed to create price alert');
      return null;
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAlerts((prev) => prev.filter((a) => a.id !== id));
      toast.success('Alert deleted');
    } catch (error) {
      console.error('Error deleting price alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  const updateAlert = async (id: string, updates: Partial<Pick<PriceAlert, 'target_price' | 'direction' | 'notes'>>) => {
    try {
      const { data, error } = await supabase
        .from('price_alerts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setAlerts((prev) => prev.map((a) => (a.id === id ? (data as PriceAlert) : a)));
      toast.success('Alert updated');
      return data as PriceAlert;
    } catch (error) {
      console.error('Error updating price alert:', error);
      toast.error('Failed to update alert');
      return null;
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
    updateAlert,
    refetch: fetchAlerts,
  };
}
