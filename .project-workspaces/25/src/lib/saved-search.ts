/**
 * Search + saved-view helpers for /saved (bookmarks, highlights, notes).
 *
 * Operators:
 *   book:John          → book name contains (case-insensitive)
 *   testament:old|new  → OT books vs NT books
 *   "exact phrase"     → must appear in scripture_ref or note body
 *   plain words        → ANDed substring matches
 */

const NEW_TESTAMENT = new Set([
  "matthew",
  "mark",
  "luke",
  "john",
  "acts",
  "romans",
  "1 corinthians",
  "2 corinthians",
  "galatians",
  "ephesians",
  "philippians",
  "colossians",
  "1 thessalonians",
  "2 thessalonians",
  "1 timothy",
  "2 timothy",
  "titus",
  "philemon",
  "hebrews",
  "james",
  "1 peter",
  "2 peter",
  "1 john",
  "2 john",
  "3 john",
  "jude",
  "revelation",
]);

export type SavedTab = "bookmarks" | "highlights" | "notes";
export type SavedSortKey = "newest" | "oldest" | "alpha_book";

export type SavedItem = {
  book: string | null;
  ref: string; // human-readable reference / preview source
  body: string; // searchable body (note text or empty)
  created_at: string;
};

export type ParsedSavedQuery = {
  books: string[];
  testaments: string[]; // 'old' | 'new'
  phrases: string[];
  terms: string[];
};

export function parseSavedQuery(input: string): ParsedSavedQuery {
  const out: ParsedSavedQuery = { books: [], testaments: [], phrases: [], terms: [] };
  if (!input.trim()) return out;
  const phraseRe = /"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(input)) !== null) out.phrases.push(m[1].trim().toLowerCase());
  const rest = input.replace(phraseRe, " ");
  for (const tokenRaw of rest.split(/\s+/)) {
    const token = tokenRaw.trim();
    if (!token) continue;
    const colon = token.indexOf(":");
    if (colon > 0) {
      const key = token.slice(0, colon).toLowerCase();
      const val = token.slice(colon + 1).toLowerCase();
      if (!val) continue;
      if (key === "book") {
        out.books.push(val);
        continue;
      }
      if (key === "testament" && (val === "old" || val === "new")) {
        out.testaments.push(val);
        continue;
      }
    }
    out.terms.push(token.toLowerCase());
  }
  return out;
}

export function matchesSavedQuery(item: SavedItem, q: ParsedSavedQuery): boolean {
  const book = (item.book ?? "").toLowerCase();
  const ref = item.ref.toLowerCase();
  const body = item.body.toLowerCase();

  if (q.books.length && !q.books.some((b) => book.includes(b))) return false;
  if (q.testaments.length) {
    const isNT = NEW_TESTAMENT.has(book);
    const wantOld = q.testaments.includes("old");
    const wantNew = q.testaments.includes("new");
    if (wantOld && !wantNew && isNT) return false;
    if (wantNew && !wantOld && !isNT) return false;
  }
  for (const p of q.phrases) {
    if (!ref.includes(p) && !body.includes(p)) return false;
  }
  for (const t of q.terms) {
    if (!ref.includes(t) && !body.includes(t) && !book.includes(t)) return false;
  }
  return true;
}

export function sortSavedItems<T extends SavedItem>(items: T[], key: SavedSortKey): T[] {
  const out = [...items];
  out.sort((a, b) => {
    switch (key) {
      case "oldest":
        return a.created_at.localeCompare(b.created_at);
      case "alpha_book":
        return (a.book ?? "").localeCompare(b.book ?? "") || a.ref.localeCompare(b.ref);
      case "newest":
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });
  return out;
}

/* Saved views */

export type SavedPageView = {
  id: string;
  name: string;
  tab: SavedTab;
  query: string;
  bookFilter: string | null;
  sort: SavedSortKey;
};

const VIEWS_KEY = "sanctumiq:saved:saved-views";

export function loadSavedPageViews(): SavedPageView[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => v && typeof v.id === "string") : [];
  } catch {
    return [];
  }
}

export function saveSavedPageViews(views: SavedPageView[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    /* ignore */
  }
}
