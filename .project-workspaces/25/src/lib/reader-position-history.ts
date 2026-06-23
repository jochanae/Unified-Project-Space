/**
 * Reader Position History — last N reading locations per user.
 *
 * Powers the gold-dot Quick-Peek. Distinct from `reader-position.ts`:
 *   • `reader_positions`         → single "where am I right now" row.
 *   • `reader_position_history`  → recent breadcrumb trail (this file).
 *
 * Writes are coalesced — only push a new history entry when the
 * book/chapter changes (verse changes alone are too noisy). Server insert is
 * fire-and-forget; failures are silent.
 *
 * The trim trigger on the table keeps only the most recent 10 rows per user,
 * so we never need to prune from the client.
 */

import { supabase } from "@/integrations/supabase/client";

export type PositionHistoryEntry = {
  book: string;
  bookIndex: number;
  chapter: number;
  verse: number | null;
  version: string;
  visitedAt: string;
};

const PEEK_LIMIT = 3;
const FETCH_LIMIT = 10;

let lastRecordedKey: string | null = null;

function keyOf(entry: { book: string; chapter: number }): string {
  return `${entry.book}::${entry.chapter}`;
}

/**
 * Record a visit. Skips duplicates of the most recently recorded
 * book+chapter so simple verse scrolling doesn't spam the table.
 */
export function recordPositionVisit(
  entry: Omit<PositionHistoryEntry, "visitedAt">,
  userId: string | null,
): void {
  if (!userId) return;
  const key = keyOf(entry);
  if (key === lastRecordedKey) return;
  lastRecordedKey = key;

  void supabase
    .from("reader_position_history")
    .insert({
      user_id: userId,
      book: entry.book,
      book_index: entry.bookIndex,
      chapter: entry.chapter,
      verse: entry.verse,
      version: entry.version,
    })
    .then(({ error }) => {
      if (error) console.warn("[position-history] record failed:", error.message);
    });
}

/**
 * Fetch the most recent N positions for the Quick-Peek. Returns up to 3
 * by default. Pulls 10 from the DB so we can deduplicate client-side and
 * still have enough rows after collapsing repeats.
 */
export async function fetchRecentPositions(
  userId: string,
  limit: number = PEEK_LIMIT,
): Promise<PositionHistoryEntry[]> {
  const { data, error } = await supabase
    .from("reader_position_history")
    .select("book, book_index, chapter, verse, version, visited_at")
    .eq("user_id", userId)
    .order("visited_at", { ascending: false })
    .limit(FETCH_LIMIT);

  if (error || !data) {
    if (error) console.warn("[position-history] fetch failed:", error.message);
    return [];
  }

  // Collapse consecutive entries that share book+chapter so the peek doesn't
  // show three copies of the same chapter just because verses changed.
  const seen = new Set<string>();
  const out: PositionHistoryEntry[] = [];
  for (const row of data) {
    const k = `${row.book}::${row.chapter}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({
      book: row.book,
      bookIndex: row.book_index,
      chapter: row.chapter,
      verse: row.verse,
      version: row.version,
      visitedAt: row.visited_at,
    });
    if (out.length >= limit) break;
  }
  return out;
}
