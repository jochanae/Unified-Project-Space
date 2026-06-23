/**
 * IndexedDB image cache — stores recently viewed images as Blobs so they
 * reappear instantly and survive expired Supabase signed URLs.
 *
 * Keyed by the *base* URL (query string stripped) so signed URL refreshes
 * still hit the same cache entry. Falls back silently if IndexedDB is
 * unavailable (private browsing, quota exceeded, etc.).
 */

const DB_NAME = 'compani-image-cache';
const STORE = 'images';
const DB_VERSION = 1;
const MAX_ENTRIES = 200; // ~200 images, capped by browser quota anyway
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  key: string;
  blob: Blob;
  ts: number;
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'key' });
          store.createIndex('ts', 'ts');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

/** Strip query string so signed URL refreshes share the same cache key. */
function normalizeKey(url: string): string {
  try {
    const u = new URL(url, window.location.origin);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url.split('?')[0];
  }
}

export async function getCachedImage(url: string): Promise<string | null> {
  const db = await openDB();
  if (!db) return null;
  const key = normalizeKey(url);

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined;
        if (!entry) return resolve(null);
        if (Date.now() - entry.ts > TTL_MS) return resolve(null);
        try {
          resolve(URL.createObjectURL(entry.blob));
        } catch {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function cacheImage(url: string): Promise<void> {
  const db = await openDB();
  if (!db) return;
  const key = normalizeKey(url);

  try {
    // Skip if already cached & fresh
    const existing = await new Promise<CacheEntry | undefined>((resolve) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result as CacheEntry | undefined);
      req.onerror = () => resolve(undefined);
    });
    if (existing && Date.now() - existing.ts < TTL_MS) return;

    const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
    if (!res.ok) return;
    const blob = await res.blob();
    if (blob.size > 5 * 1024 * 1024) return; // skip >5MB

    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, blob, ts: Date.now() } satisfies CacheEntry);

    // Opportunistic LRU prune
    pruneIfNeeded(db).catch(() => {});
  } catch {
    // Silently ignore — cache is best-effort
  }
}

async function pruneIfNeeded(db: IDBDatabase): Promise<void> {
  const count = await new Promise<number>((resolve) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(0);
  });
  if (count <= MAX_ENTRIES) return;

  // Delete oldest by ts index until under cap
  const toDelete = count - MAX_ENTRIES;
  const tx = db.transaction(STORE, 'readwrite');
  const idx = tx.objectStore(STORE).index('ts');
  let deleted = 0;
  idx.openCursor().onsuccess = (e) => {
    const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
    if (!cursor || deleted >= toDelete) return;
    cursor.delete();
    deleted += 1;
    cursor.continue();
  };
}

export async function clearImageCache(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
  } catch {
    /* noop */
  }
}
