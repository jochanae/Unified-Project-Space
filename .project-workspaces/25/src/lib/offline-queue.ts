/**
 * Offline write queue (IndexedDB-backed).
 *
 * When the network is unavailable, write operations (highlights, bookmarks)
 * are appended here as durable items keyed by an auto-incrementing id. On
 * reconnect, `flushQueue()` drains them in FIFO order.
 *
 * Each item is a self-describing operation. Adding a new op = add a case
 * to `applyItem`; nothing else in the app needs to change.
 *
 * SSR-safe: every function no-ops when `window`/`indexedDB` is missing.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const DB_NAME = "sanctumiq-queue";
const STORE = "writes";
const DB_VERSION = 1;

export type QueueItem =
  | {
      kind: "highlight.insert";
      payload: {
        user_id: string;
        book: string;
        chapter: number;
        verse_start: number;
        verse_end: number;
        version: string;
        tone: string;
      };
    }
  | {
      kind: "highlight.delete";
      payload: { id: string };
    }
  | {
      kind: "bookmark.insert";
      payload: {
        user_id: string;
        book: string;
        chapter: number;
        verse: number;
        version: string;
      };
    }
  | {
      kind: "bookmark.delete";
      payload: { id: string };
    };

interface QueueRow {
  id?: number;
  enqueued_at: number;
  item: QueueItem;
}

function isAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Append an item. Resolves to the queue size after enqueue. */
export async function enqueue(item: QueueItem): Promise<number> {
  if (!isAvailable()) return 0;
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.add({ enqueued_at: Date.now(), item });
    tx.oncomplete = () => {
      const countTx = db.transaction(STORE, "readonly");
      const countReq = countTx.objectStore(STORE).count();
      countReq.onsuccess = () => {
        resolve(countReq.result);
        db.close();
      };
      countReq.onerror = () => {
        resolve(0);
        db.close();
      };
    };
    tx.onerror = () => {
      reject(tx.error);
      db.close();
    };
  });
}

export async function queueSize(): Promise<number> {
  if (!isAvailable()) return 0;
  const db = await openDb();
  return new Promise<number>((resolve) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).count();
    req.onsuccess = () => {
      resolve(req.result);
      db.close();
    };
    req.onerror = () => {
      resolve(0);
      db.close();
    };
  });
}

async function listAll(): Promise<QueueRow[]> {
  if (!isAvailable()) return [];
  const db = await openDb();
  return new Promise<QueueRow[]>((resolve) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => {
      resolve((req.result as QueueRow[]).sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
      db.close();
    };
    req.onerror = () => {
      resolve([]);
      db.close();
    };
  });
}

async function deleteRow(id: number): Promise<void> {
  if (!isAvailable()) return;
  const db = await openDb();
  return new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => {
      resolve();
      db.close();
    };
    tx.onerror = () => {
      resolve();
      db.close();
    };
  });
}

async function applyItem(supabase: SupabaseClient, item: QueueItem): Promise<void> {
  switch (item.kind) {
    case "highlight.insert": {
      const { error } = await supabase.from("verse_highlights").insert(item.payload);
      if (error) throw error;
      return;
    }
    case "highlight.delete": {
      const { error } = await supabase.from("verse_highlights").delete().eq("id", item.payload.id);
      if (error) throw error;
      return;
    }
    case "bookmark.insert": {
      const { error } = await supabase.from("bookmarks").insert(item.payload);
      if (error) throw error;
      return;
    }
    case "bookmark.delete": {
      const { error } = await supabase.from("bookmarks").delete().eq("id", item.payload.id);
      if (error) throw error;
      return;
    }
  }
}

/**
 * Drain the queue. Stops on the first failure (so a retryable error
 * doesn't drop subsequent writes). Returns counts.
 */
export async function flushQueue(supabase: SupabaseClient): Promise<{
  flushed: number;
  remaining: number;
  failed?: string;
}> {
  if (!isAvailable()) return { flushed: 0, remaining: 0 };
  const rows = await listAll();
  let flushed = 0;
  for (const row of rows) {
    if (row.id === undefined) continue;
    try {
      await applyItem(supabase, row.item);
      await deleteRow(row.id);
      flushed++;
    } catch (err) {
      console.warn("[offline-queue] item failed, will retry later:", err);
      const remaining = (await queueSize()) ?? 0;
      return { flushed, remaining, failed: (err as Error).message };
    }
  }
  return { flushed, remaining: 0 };
}
