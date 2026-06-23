import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineQueue, PendingTransaction } from '@/utils/offlineQueue';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MAX_RETRIES = 3;
const SYNC_DEBOUNCE_MS = 2000;

export function useOfflineSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOnlineRef = useRef(navigator.onLine);

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await offlineQueue.count();
      setPendingCount(count);
    } catch (error) {
      console.error('[useOfflineSync] Failed to get pending count:', error);
    }
  }, []);

  // Process a single pending transaction
  const processPendingTransaction = useCallback(async (item: PendingTransaction): Promise<boolean> => {
    try {
      if (item.type === 'transaction') {
        const { error } = await supabase.from('transactions').insert(item.data as any);
        if (error) throw error;
        
        // Handle linked bloom burst update if present
        if (item.data.bloom_burst_id && item.data.type === 'expense') {
          const { data: burst } = await supabase
            .from('bloom_bursts')
            .select('spent_amount')
            .eq('id', item.data.bloom_burst_id)
            .single();
          
          if (burst) {
            await supabase
              .from('bloom_bursts')
              .update({ spent_amount: burst.spent_amount + item.data.amount })
              .eq('id', item.data.bloom_burst_id);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('[useOfflineSync] Failed to process transaction:', error);
      return false;
    }
  }, []);

  // Sync all pending transactions
  const syncPendingTransactions = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;

    setIsSyncing(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const pendingItems = await offlineQueue.getAll();
      
      if (pendingItems.length === 0) {
        setIsSyncing(false);
        return;
      }

      

      for (const item of pendingItems) {
        if (item.retryCount >= MAX_RETRIES) {
          console.warn(`[useOfflineSync] Max retries reached for ${item.id}, removing...`);
          await offlineQueue.remove(item.id);
          failCount++;
          continue;
        }

        const success = await processPendingTransaction(item);
        
        if (success) {
          await offlineQueue.remove(item.id);
          successCount++;
        } else {
          await offlineQueue.updateRetryCount(item.id);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Synced ${successCount} offline transaction${successCount > 1 ? 's' : ''}`);
      }
      
      if (failCount > 0) {
        toast.error(`${failCount} transaction${failCount > 1 ? 's' : ''} failed to sync`);
      }

    } catch (error) {
      console.error('[useOfflineSync] Sync error:', error);
    } finally {
      setIsSyncing(false);
      await refreshPendingCount();
    }
  }, [isSyncing, processPendingTransaction, refreshPendingCount]);

  // Debounced sync trigger
  const triggerSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncPendingTransactions();
    }, SYNC_DEBOUNCE_MS);
  }, [syncPendingTransactions]);

  // Queue a transaction for later sync
  const queueTransaction = useCallback(async (data: Record<string, any>): Promise<string> => {
    const id = await offlineQueue.add({
      type: 'transaction',
      data,
    });
    await refreshPendingCount();
    toast.info('Saved offline - will sync when connected');
    return id;
  }, [refreshPendingCount]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      
      isOnlineRef.current = true;
      triggerSync();
    };

    const handleOffline = () => {
      
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial count
    refreshPendingCount();

    // If online and there are pending items, sync them
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [triggerSync, refreshPendingCount]);

  return {
    pendingCount,
    isSyncing,
    queueTransaction,
    syncNow: syncPendingTransactions,
    refreshPendingCount,
  };
}
