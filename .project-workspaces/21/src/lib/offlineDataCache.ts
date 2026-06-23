/**
 * Lightweight offline data cache using localStorage.
 * Caches profile, connections, and recent chat messages so users
 * can browse content while offline.
 */

const PREFIX = 'compani-cache-';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export function cacheSet<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full — silently fail
  }
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > TTL_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheClear(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

// Specific cache helpers
export function cacheProfile(userId: string, profile: any): void {
  cacheSet(`profile-${userId}`, profile);
}

export function getCachedProfile(userId: string): any | null {
  return cacheGet(`profile-${userId}`);
}

export function cacheConnections(userId: string, connections: any[]): void {
  cacheSet(`connections-${userId}`, connections);
}

export function getCachedConnections(userId: string): any[] | null {
  return cacheGet<any[]>(`connections-${userId}`);
}

export function cacheChatMessages(userId: string, memberId: string, messages: any[]): void {
  // Only keep last 50 messages to save space
  const recent = messages.slice(-50);
  cacheSet(`chat-${userId}-${memberId}`, recent);
}

export function getCachedChatMessages(userId: string, memberId: string): any[] | null {
  return cacheGet<any[]>(`chat-${userId}-${memberId}`);
}
