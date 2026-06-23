import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook for refreshing dashboard data with pull-to-refresh support
 */
export function useDashboardRefresh() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshAllData = useCallback(async () => {
    if (isRefreshing) {
      
      return;
    }
    
    setIsRefreshing(true);
    

    try {
      // Invalidate all relevant queries to trigger refetch
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['accounts'] }),
        queryClient.invalidateQueries({ queryKey: ['budgets'] }),
        queryClient.invalidateQueries({ queryKey: ['goals'] }),
        queryClient.invalidateQueries({ queryKey: ['bills'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['debts'] }),
        queryClient.invalidateQueries({ queryKey: ['credit-scores'] }),
      ]);

      
    } catch (error) {
      console.error('[DashboardRefresh] Error refreshing data:', error);
    } finally {
      // Always reset refreshing state
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [queryClient, isRefreshing]);

  return {
    refreshAllData,
    isRefreshing,
  };
}
