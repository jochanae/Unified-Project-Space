/**
 * Generic offline write queue — stores any pending Supabase inserts
 * in localStorage when the user is offline, and flushes them on reconnect.
 */

const QUEUE_KEY = 'compani-offline-queue';

export type QueuedWriteType = 'chat_message' | 'journal_entry' | 'mood_checkin' | 'gratitude_entry';

export interface QueuedWrite {
  id: string;
  type: QueuedWriteType;
  table: string;
  payload: Record<string, unknown>;
  queuedAt: string;
}

// Legacy compat
export interface QueuedMessage {
  id: string;
  content: string;
  role: 'user';
  memberId: string;
  userId: string;
  imageUrl?: string;
  queuedAt: string;
}

export function getQueue(): QueuedWrite[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migrate legacy format (QueuedMessage[]) → QueuedWrite[]
    if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].type) {
      return parsed.map((m: QueuedMessage) => ({
        id: m.id,
        type: 'chat_message' as QueuedWriteType,
        table: 'chat_messages',
        payload: {
          user_id: m.userId,
          member_id: m.memberId,
          content: m.content,
          role: m.role,
          source: 'offline-queue',
        },
        queuedAt: m.queuedAt,
      }));
    }
    return parsed;
  } catch {
    return [];
  }
}

export function enqueue(write: QueuedWrite): void {
  const queue = getQueue();
  queue.push(write);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Convenience: queue a chat message (preserves old API) */
export function enqueueMessage(msg: QueuedMessage): void {
  enqueue({
    id: msg.id,
    type: 'chat_message',
    table: 'chat_messages',
    payload: {
      user_id: msg.userId,
      member_id: msg.memberId,
      content: msg.content,
      role: msg.role,
      source: 'offline-queue',
    },
    queuedAt: msg.queuedAt,
  });
}

export function dequeue(id: string): void {
  const queue = getQueue().filter((m) => m.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function queueSize(): number {
  return getQueue().length;
}
