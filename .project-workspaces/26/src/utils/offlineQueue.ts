// IndexedDB-based offline queue for transactions
const DB_NAME = 'coinsbloom-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-transactions';

export interface PendingTransaction {
  id: string;
  type: 'transaction' | 'bill' | 'goal-contribution';
  data: Record<string, any>;
  createdAt: string;
  retryCount: number;
}

class OfflineQueue {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          
        }
      };
    });

    return this.initPromise;
  }

  async add(item: Omit<PendingTransaction, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    await this.init();
    
    const transaction: PendingTransaction = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.add(transaction);

      request.onsuccess = () => {
        
        resolve(transaction.id);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to add transaction:', request.error);
        reject(request.error);
      };
    });
  }

  async getAll(): Promise<PendingTransaction[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to get transactions:', request.error);
        reject(request.error);
      };
    });
  }

  async remove(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        
        resolve();
      };

      request.onerror = () => {
        console.error('[OfflineQueue] Failed to remove transaction:', request.error);
        reject(request.error);
      };
    });
  }

  async updateRetryCount(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const item = getRequest.result as PendingTransaction;
        if (item) {
          item.retryCount += 1;
          const updateRequest = store.put(item);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async count(): Promise<number> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => {
        
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineQueue = new OfflineQueue();
