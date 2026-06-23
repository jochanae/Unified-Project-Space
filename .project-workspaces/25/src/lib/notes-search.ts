/**
 * Advanced search parser for /notes.
 *
 * Supports:
 *   book:John          → filter by book (case-insensitive contains)
 *   status:draft       → status token: draft | sketch | anchored | mixed
 *   "exact phrase"     → must appear in body or scripture_ref
 *   plain words        → ANDed substring matches across body / ref / book
 *
 * Unknown qualifiers are treated as plain words.
 */

export type ParsedQuery = {
  books: string[]; // lowercased
  statuses: string[]; // lowercased subset of status keywords
  phrases: string[]; // lowercased exact phrases
  terms: string[]; // lowercased plain words
};

const STATUS_KEYWORDS = new Set(["draft", "sketch", "anchored", "mixed"]);

export function parseNotesQuery(input: string): ParsedQuery {
  const out: ParsedQuery = { books: [], statuses: [], phrases: [], terms: [] };
  if (!input.trim()) return out;

  // Pull out quoted phrases first.
  const phraseRe = /"([^"]+)"/g;
  let rest = input;
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(input)) !== null) {
    out.phrases.push(m[1].trim().toLowerCase());
  }
  rest = rest.replace(phraseRe, " ");

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
      if (key === "status" && STATUS_KEYWORDS.has(val)) {
        out.statuses.push(val);
        continue;
      }
    }
    out.terms.push(token.toLowerCase());
  }
  return out;
}

export type SearchableNote = {
  body_text: string | null;
  scripture_ref: string | null;
  book: string | null;
  status: string;
};

export function matchesParsedQuery(note: SearchableNote, q: ParsedQuery): boolean {
  const body = (note.body_text ?? "").toLowerCase();
  const ref = (note.scripture_ref ?? "").toLowerCase();
  const book = (note.book ?? "").toLowerCase();

  if (q.books.length && !q.books.some((b) => book.includes(b))) return false;
  if (q.statuses.length && !q.statuses.includes(note.status)) return false;
  for (const p of q.phrases) {
    if (!body.includes(p) && !ref.includes(p)) return false;
  }
  for (const t of q.terms) {
    if (!body.includes(t) && !ref.includes(t) && !book.includes(t)) return false;
  }
  return true;
}

/* ─────────────────────────────────────────────────────────────
   Saved views — named filter+sort presets in localStorage
   ───────────────────────────────────────────────────────────── */

export type SortKey = "updated_desc" | "updated_asc" | "created_desc" | "alpha";

export type SavedView = {
  id: string;
  name: string;
  query: string;
  status: "all" | "draft" | "sketch" | "anchored" | "mixed";
  book: string | null;
  sort: SortKey;
};

const VIEWS_KEY = "sanctumiq:notes:saved-views";

export function loadSavedViews(): SavedView[] {
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

export function saveSavedViews(views: SavedView[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
  } catch {
    /* ignore quota */
  }
}
