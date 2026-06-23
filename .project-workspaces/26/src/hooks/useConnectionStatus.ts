import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ConnectionStatus {
  isOnline: boolean;
  dataStatus: 'live' | 'syncing' | 'offline' | 'stale';
  bankFeedsCount: number;
  creditFeedsCount: number;
  lastSyncTime: Date | null;
  isLoading: boolean;
}

export function useConnectionStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: navigator.onLine,
    dataStatus: navigator.onLine ? 'live' : 'offline',
    bankFeedsCount: 0,
    creditFeedsCount: 0,
    lastSyncTime: null,
    isLoading: true,
  });
  
  // Use ref to track if we've shown the initial offline toast
  const hasShownInitialToast = useRef(false);

  // Fetch account counts and sync history
  const fetchStatus = useCallback(async () => {
    if (!user) {
      setStatus(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Fetch accounts grouped by category
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('category, account_type')
        .eq('user_id', user.id);

      if (accountsError) {
        console.error('[ConnectionStatus] Error fetching accounts:', accountsError);
      }

      // Count bank accounts (asset category with cash/checking/savings types)
      const bankAccounts = accounts?.filter(
        a => a.category === 'asset' && ['cash', 'checking', 'savings', 'money_market'].includes(a.account_type)
      ).length ?? 0;

      // Count credit card accounts only (not mortgages, auto loans, etc.)
      const creditAccounts = accounts?.filter(
        a => a.account_type === 'credit_card'
      ).length ?? 0;

      // Fetch last sync time
      const { data: syncHistory, error: syncError } = await supabase
        .from('sync_history')
        .select('created_at, status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (syncError) {
        console.error('[ConnectionStatus] Error fetching sync history:', syncError);
      }

      const lastSync = syncHistory?.[0];
      const lastSyncTime = lastSync ? new Date(lastSync.created_at) : null;

      // Determine if data is stale (more than 24 hours old)
      const isStale = lastSyncTime 
        ? (Date.now() - lastSyncTime.getTime()) > 24 * 60 * 60 * 1000
        : false;

      setStatus(prev => ({
        ...prev,
        bankFeedsCount: bankAccounts,
        creditFeedsCount: creditAccounts,
        lastSyncTime,
        dataStatus: !prev.isOnline ? 'offline' : isStale ? 'stale' : 'live',
        isLoading: false,
      }));
    } catch (error) {
      console.error('[ConnectionStatus] Error:', error);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: true,
        dataStatus: 'syncing',
      }));
      
      // Show reconnection toast
      toast.success("Back online!", {
        description: "Refreshing your data...",
        duration: 3000,
      });
      
      // Refresh data after coming back online
      fetchStatus().then(() => {
        setStatus(prev => ({
          ...prev,
          dataStatus: 'live',
        }));
      });
    };

    const handleOffline = () => {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        dataStatus: 'offline',
      }));
      
      // Show offline toast
      toast.warning("You're offline", {
        description: "Don't worry - your data is saved locally",
        duration: 4000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchStatus]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const refresh = useCallback(() => {
    setStatus(prev => ({ ...prev, dataStatus: 'syncing' }));
    fetchStatus().then(() => {
      setTimeout(() => {
        setStatus(prev => ({
          ...prev,
          dataStatus: prev.isOnline ? 'live' : 'offline',
        }));
      }, 500);
    });
  }, [fetchStatus]);

  return { ...status, refresh };
}
