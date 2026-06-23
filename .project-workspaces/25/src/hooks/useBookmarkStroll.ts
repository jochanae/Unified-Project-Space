/**
 * useBookmarkStroll — Shortcut Mode that walks every bookmark across the
 * entire Bible in canonical (Genesis → Revelation) order.
 *
 * Toggle via setActive(true). When active, the reader's prev/next arrows
 * jump to the prev/next bookmark instead of the prev/next chapter.
 *
 * The bookmark list is fetched once on activation, then cached for the
 * session. We re-fetch when the user toggles off → on again to pick up
 * any new marks added in the meantime.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "sanctumiq:reader:bookmark-stroll-active";

export type StrollBookmark = {
  bookIndex: number;
  book: string;
  chapter: number;
  verse: number;
  version: string;
};

export function useBookmarkStroll(bookOrder: string[] | null) {
  const { user } = useAuth();
  const [active, setActiveState] = useState(false);
  const [bookmarks, setBookmarks] = useState<StrollBookmark[]>([]);
  const [loading, setLoading] = useState(false);

  // Restore preference (off by default — feels safer)
  useEffect(() => {
    try {
      setActiveState(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const persist = (next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  // Build canonical book → index map once
  const orderIndex = useMemo(() => {
    if (!bookOrder) return null;
    const map = new Map<string, number>();
    bookOrder.forEach((name, i) => map.set(name, i));
    return map;
  }, [bookOrder]);

  const loadBookmarks = useCallback(async () => {
    if (!user?.id || !orderIndex) {
      setBookmarks([]);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("book, chapter, verse, version")
        .eq("user_id", user.id);
      if (error) throw error;
      const enriched: StrollBookmark[] = (data ?? [])
        .map((row) => {
          const idx = orderIndex.get(row.book);
          if (idx === undefined) return null;
          return {
            bookIndex: idx,
            book: row.book,
            chapter: row.chapter,
            verse: row.verse,
            version: row.version,
          } as StrollBookmark;
        })
        .filter((row): row is StrollBookmark => row !== null)
        .sort((a, b) => {
          if (a.bookIndex !== b.bookIndex) return a.bookIndex - b.bookIndex;
          if (a.chapter !== b.chapter) return a.chapter - b.chapter;
          return a.verse - b.verse;
        });
      setBookmarks(enriched);
    } catch (err) {
      console.warn("[bookmark-stroll] load failed:", err);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, orderIndex]);

  // Fetch on activation
  useEffect(() => {
    if (!active) return;
    void loadBookmarks();
  }, [active, loadBookmarks]);

  const setActive = useCallback((next: boolean) => {
    setActiveState(next);
    persist(next);
  }, []);

  const findIndexAt = useCallback(
    (bookIndex: number, chapter: number, verse: number | null) => {
      if (!bookmarks.length) return -1;
      // Find first bookmark at or after the current position
      for (let i = 0; i < bookmarks.length; i += 1) {
        const b = bookmarks[i];
        if (b.bookIndex < bookIndex) continue;
        if (b.bookIndex > bookIndex) return i;
        if (b.chapter < chapter) continue;
        if (b.chapter > chapter) return i;
        if (verse === null || b.verse >= verse) return i;
      }
      return bookmarks.length;
    },
    [bookmarks],
  );

  const next = useCallback(
    (current: { bookIndex: number; chapter: number; verse: number | null }) => {
      if (!bookmarks.length) return null;
      const cursor = findIndexAt(current.bookIndex, current.chapter, current.verse);
      // Jump to first bookmark strictly AFTER current position
      const target = bookmarks.find((b, i) => {
        if (i < cursor) return false;
        if (b.bookIndex !== current.bookIndex) return true;
        if (b.chapter !== current.chapter) return true;
        return b.verse > (current.verse ?? 0);
      });
      return target ?? null;
    },
    [bookmarks, findIndexAt],
  );

  const prev = useCallback(
    (current: { bookIndex: number; chapter: number; verse: number | null }) => {
      if (!bookmarks.length) return null;
      // Iterate backwards — find first bookmark strictly BEFORE current position
      for (let i = bookmarks.length - 1; i >= 0; i -= 1) {
        const b = bookmarks[i];
        if (b.bookIndex > current.bookIndex) continue;
        if (b.bookIndex < current.bookIndex) return b;
        if (b.chapter > current.chapter) continue;
        if (b.chapter < current.chapter) return b;
        if (b.verse < (current.verse ?? Number.POSITIVE_INFINITY)) return b;
      }
      return null;
    },
    [bookmarks],
  );

  const positionOf = useCallback(
    (current: { bookIndex: number; chapter: number; verse: number | null }) => {
      if (!bookmarks.length) return { current: 0, total: 0 };
      const exactIdx = bookmarks.findIndex(
        (b) =>
          b.bookIndex === current.bookIndex &&
          b.chapter === current.chapter &&
          b.verse === (current.verse ?? -1),
      );
      if (exactIdx >= 0) return { current: exactIdx + 1, total: bookmarks.length };
      // Not on a bookmark — show "between" via the next-cursor index
      const cursor = findIndexAt(current.bookIndex, current.chapter, current.verse);
      return { current: cursor, total: bookmarks.length };
    },
    [bookmarks, findIndexAt],
  );

  return {
    active,
    setActive,
    bookmarks,
    loading,
    next,
    prev,
    positionOf,
    refresh: loadBookmarks,
  };
}
