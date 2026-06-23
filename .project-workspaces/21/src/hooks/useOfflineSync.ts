import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getQueue, dequeue, queueSize, type QueuedWrite } from '@/lib/offlineQueue';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/**
 * Handles automatic sync when the app comes back online:
 * 1. Flushes any queued offline writes (messages, journal, moods, etc.) to the database
 * 2. Invalidates React Query caches to refetch fresh data
 */
export function useOfflineSync() {
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(() => queueSize());

  const flushQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0) return;

    logger.log(`[OfflineSync] Flushing ${queue.length} queued writes`);
    let successCount = 0;

    for (const write of queue) {
      try {
        const { error } = await supabase.from(write.table as any).insert(write.payload as any);

        if (!error) {
          dequeue(write.id);
          successCount++;
        } else {
          logger.warn('[OfflineSync] Failed to flush write:', error.message);
        }
      } catch (e) {
        logger.warn('[OfflineSync] Network error flushing write:', e);
        break; // Stop trying if network is still flaky
      }
    }

    setPendingCount(queueSize());

    if (successCount > 0) {
      const types = new Set(queue.slice(0, successCount).map(w => w.type));
      const label = types.size === 1 && types.has('chat_message')
        ? `${successCount} queued message${successCount > 1 ? 's' : ''} sent`
        : `${successCount} queued item${successCount > 1 ? 's' : ''} synced`;
      toast.success(label, { icon: '📤' });
    }
  }, []);

  const refreshData = useCallback(() => {
    logger.log('[OfflineSync] Refreshing all data');
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['connections'] });
    queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    queryClient.invalidateQueries({ queryKey: ['subscription'] });
    queryClient.invalidateQueries({ queryKey: ['wellness'] });
  }, [queryClient]);

  const handleOnline = useCallback(async () => {
    logger.log('[OfflineSync] Back online — syncing');
    await flushQueue();
    refreshData();
  }, [flushQueue, refreshData]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        const remaining = queueSize();
        if (remaining > 0) {
          flushQueue();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [handleOnline, flushQueue]);

  useEffect(() => {
    const interval = setInterval(() => setPendingCount(queueSize()), 2000);
    return () => clearInterval(interval);
  }, []);

  return { pendingCount, flushQueue, refreshData };
}
