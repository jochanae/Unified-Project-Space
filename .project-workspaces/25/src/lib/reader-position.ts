/**
 * Reader position — local-first with debounced background sync.
 *
 * Strategy:
 *   1. localStorage is the instant source of truth (fast UX, works offline).
 *   2. On mount, we also fetch the server row. If the server's `updated_at`
 *      is newer than the local snapshot's, the server wins (e.g. user read
 *      on another device). Otherwise local wins and we push it up.
 *   3. Saves write localStorage immediately. Server upserts are coalesced
 *      with a 1.5s trailing debounce so rapid scrolling / chapter flipping
 *      collapses into a single write per quiet period.
 *   4. `flushPosition()` forces an immediate server write — call on unmount
 *      and on visibilitychange=hidden so we never lose the latest position.
 *
 * Failures are silent — offline / unauthenticated users still get full
 * local persistence.
 */

import { supabase } from "@/integrations/supabase/client";

const LOCAL_KEY = "sanctumiq:reader:position-v2";
const SERVER_DEBOUNCE_MS = 1500;

export type ReaderPosition = {
  book: string;
  bookIndex: number;
  chapter: number;
  verse: number | null;
  version: string;
  updatedAt: string; // ISO
};

function safeGet(): ReaderPosition | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReaderPosition>;
    if (
      typeof parsed.book === "string" &&
      typeof parsed.bookIndex === "number" &&
      typeof parsed.chapter === "number" &&
      typeof parsed.version === "string" &&
      typeof parsed.updatedAt === "string"
    ) {
      return {
        book: parsed.book,
        bookIndex: parsed.bookIndex,
        chapter: parsed.chapter,
        verse: typeof parsed.verse === "number" ? parsed.verse : null,
        version: parsed.version,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function safeSet(pos: ReaderPosition): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(pos));
  } catch {
    /* ignore */
  }
}

export function getLocalPosition(): ReaderPosition | null {
  return safeGet();
}

// Debounced server write state. We hold the latest position + userId and only
// fire the upsert after SERVER_DEBOUNCE_MS of quiet.
let pendingServerWrite: { pos: ReaderPosition; userId: string } | null = null;
let serverWriteTimer: ReturnType<typeof setTimeout> | null = null;

function performServerWrite(pos: ReaderPosition, userId: string): void {
  void supabase
    .from("reader_positions")
    .upsert(
      {
        user_id: userId,
        book: pos.book,
        book_index: pos.bookIndex,
        chapter: pos.chapter,
        verse: pos.verse,
        version: pos.version,
        updated_at: pos.updatedAt,
      },
      { onConflict: "user_id" },
    )
    .then(({ error }) => {
      if (error) console.warn("[reader-position] sync failed:", error.message);
    });
}

function scheduleServerWrite(pos: ReaderPosition, userId: string): void {
  pendingServerWrite = { pos, userId };
  if (serverWriteTimer) clearTimeout(serverWriteTimer);
  serverWriteTimer = setTimeout(() => {
    if (!pendingServerWrite) return;
    const { pos: latest, userId: uid } = pendingServerWrite;
    pendingServerWrite = null;
    serverWriteTimer = null;
    performServerWrite(latest, uid);
  }, SERVER_DEBOUNCE_MS);
}

/**
 * Force any pending server write to fire immediately. Call on unmount,
 * visibilitychange=hidden, and pagehide so the latest position is never lost.
 */
export function flushPosition(): void {
  if (serverWriteTimer) {
    clearTimeout(serverWriteTimer);
    serverWriteTimer = null;
  }
  if (pendingServerWrite) {
    const { pos, userId } = pendingServerWrite;
    pendingServerWrite = null;
    performServerWrite(pos, userId);
  }
}

/** Write locally now; debounced fire-and-forget upsert to server. */
export function savePosition(pos: Omit<ReaderPosition, "updatedAt">, userId: string | null): void {
  const stamped: ReaderPosition = { ...pos, updatedAt: new Date().toISOString() };
  safeSet(stamped);
  if (!userId) return;
  scheduleServerWrite(stamped, userId);
}

/**
 * Pull server position, reconcile with local. Returns whichever is newer
 * (or null if neither exists). Updates localStorage if server wins.
 */
export async function hydrateFromServer(userId: string): Promise<ReaderPosition | null> {
  const local = safeGet();
  try {
    const { data, error } = await supabase
      .from("reader_positions")
      .select("book, book_index, chapter, verse, version, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return local;
    const server: ReaderPosition = {
      book: data.book,
      bookIndex: data.book_index,
      chapter: data.chapter,
      verse: data.verse,
      version: data.version,
      updatedAt: data.updated_at,
    };
    if (!local || new Date(server.updatedAt) > new Date(local.updatedAt)) {
      safeSet(server);
      return server;
    }
    return local;
  } catch (err) {
    console.warn("[reader-position] hydrate failed:", err);
    return local;
  }
}
