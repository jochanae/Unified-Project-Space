import React, { createContext, useContext, ReactNode } from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

interface OfflineSyncContextType {
  pendingCount: number;
  isSyncing: boolean;
  queueTransaction: (data: Record<string, any>) => Promise<string>;
  syncNow: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
}

const OfflineSyncContext = createContext<OfflineSyncContextType | undefined>(undefined);

export function OfflineSyncProvider({ children }: { children: ReactNode }) {
  const offlineSync = useOfflineSync();

  return (
    <OfflineSyncContext.Provider value={offlineSync}>
      {children}
    </OfflineSyncContext.Provider>
  );
}

export function useOfflineSyncContext() {
  const context = useContext(OfflineSyncContext);
  if (context === undefined) {
    throw new Error('useOfflineSyncContext must be used within an OfflineSyncProvider');
  }
  return context;
}
