import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AutopayMethod {
  id: string;
  user_id: string;
  method_type: 'stripe_card' | 'plaid_ach';
  stripe_payment_method_id: string | null;
  stripe_customer_id: string | null;
  plaid_item_id: string | null;
  plaid_processor_token: string | null;
  plaid_account_id: string | null;
  display_name: string;
  last_four: string | null;
  brand: string | null;
  bank_name: string | null;
  is_default: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeeQuote {
  isPremium: boolean;
  billAmount: number;
  card: {
    fee: number;
    total: number;
    feeDescription: string;
  };
  ach: {
    fee: number;
    total: number;
    feeDescription: string;
    premiumBenefit: boolean;
  };
  selectedMethod: {
    type: string;
    fee: number;
    total: number;
  };
}

export interface ScheduledAutopay {
  id: string;
  user_id: string;
  bill_id: string;
  payment_method_id: string;
  amount: number;
  scheduled_date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  stripe_payment_intent_id: string | null;
  error_message: string | null;
  retry_count: number;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useAutopayMethods() {
  const { user } = useAuth();
  const [methods, setMethods] = useState<AutopayMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMethods = useCallback(async () => {
    if (!user) {
      setMethods([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('user_autopay_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (fetchError) throw fetchError;
      setMethods((data as AutopayMethod[]) || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payment methods');
      console.error('Error fetching autopay methods:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMethods();
  }, [fetchMethods]);

  const deleteMethod = async (methodId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-autopay-method', {
        body: { action: 'delete_method', method_id: methodId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Payment method removed');
      await fetchMethods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove payment method');
    }
  };

  const setDefault = async (methodId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('setup-autopay-method', {
        body: { action: 'set_default', method_id: methodId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Default payment method updated');
      await fetchMethods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update default');
    }
  };

  return {
    methods,
    loading,
    error,
    refetch: fetchMethods,
    deleteMethod,
    setDefault,
    defaultMethod: methods.find(m => m.is_default) || methods[0],
  };
}

export function useScheduledAutopays(billId?: string) {
  const { user } = useAuth();
  const [scheduled, setScheduled] = useState<ScheduledAutopay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchScheduled = useCallback(async () => {
    if (!user) {
      setScheduled([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase
        .from('scheduled_autopay')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (billId) {
        query = query.eq('bill_id', billId);
      }

      const { data, error } = await query.order('scheduled_date', { ascending: true });

      if (error) throw error;
      setScheduled((data as ScheduledAutopay[]) || []);
    } catch (err) {
      console.error('Error fetching scheduled autopays:', err);
    } finally {
      setLoading(false);
    }
  }, [user, billId]);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const scheduleAutopay = async (billId: string, paymentMethodId: string, amount: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-autopay', {
        body: { 
          action: 'schedule_autopay', 
          bill_id: billId,
          payment_method_id: paymentMethodId,
          amount,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Autopay scheduled successfully');
      await fetchScheduled();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to schedule autopay');
      return false;
    }
  };

  const cancelAutopay = async (billId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('process-autopay', {
        body: { action: 'cancel_autopay', bill_id: billId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Autopay cancelled');
      await fetchScheduled();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel autopay');
      return false;
    }
  };

  return {
    scheduled,
    loading,
    refetch: fetchScheduled,
    scheduleAutopay,
    cancelAutopay,
    getScheduledForBill: (billId: string) => scheduled.find(s => s.bill_id === billId),
  };
}

export function useAutopayFeeQuote(amount: number, paymentMethodId?: string) {
  const { user } = useAuth();
  const [quote, setQuote] = useState<FeeQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!user || amount <= 0) {
      setQuote(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase.functions.invoke('process-autopay', {
        body: { 
          action: 'get_fee_quote', 
          amount,
          payment_method_id: paymentMethodId,
        },
      });

      if (fetchError) throw fetchError;
      if (data.error) throw new Error(data.error);

      setQuote(data as FeeQuote);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get fee quote');
      console.error('Error fetching fee quote:', err);
    } finally {
      setLoading(false);
    }
  }, [user, amount, paymentMethodId]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  return {
    quote,
    loading,
    error,
    refetch: fetchQuote,
  };
}
