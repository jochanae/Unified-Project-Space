/**
 * Shared scripture-reference parser & book aliases.
 * Used by both /search route and the global QuickSearchPalette.
 */
export const BOOK_ALIASES: Record<string, number> = {
  // OT
  genesis: 0,
  gen: 0,
  gn: 0,
  exodus: 1,
  ex: 1,
  exo: 1,
  leviticus: 2,
  lev: 2,
  numbers: 3,
  num: 3,
  deuteronomy: 4,
  deut: 4,
  dt: 4,
  joshua: 5,
  josh: 5,
  judges: 6,
  judg: 6,
  ruth: 7,
  "1 samuel": 8,
  "1samuel": 8,
  "1sam": 8,
  "2 samuel": 9,
  "2samuel": 9,
  "2sam": 9,
  "1 kings": 10,
  "1kings": 10,
  "1ki": 10,
  "2 kings": 11,
  "2kings": 11,
  "2ki": 11,
  "1 chronicles": 12,
  "1chr": 12,
  "2 chronicles": 13,
  "2chr": 13,
  ezra: 14,
  nehemiah: 15,
  neh: 15,
  esther: 16,
  esth: 16,
  job: 17,
  psalms: 18,
  psalm: 18,
  ps: 18,
  psa: 18,
  psm: 18,
  proverbs: 19,
  prov: 19,
  pro: 19,
  ecclesiastes: 20,
  eccl: 20,
  ecc: 20,
  "song of solomon": 21,
  song: 21,
  sos: 21,
  isaiah: 22,
  isa: 22,
  jeremiah: 23,
  jer: 23,
  lamentations: 24,
  lam: 24,
  ezekiel: 25,
  ezek: 25,
  daniel: 26,
  dan: 26,
  hosea: 27,
  hos: 27,
  joel: 28,
  amos: 29,
  obadiah: 30,
  obad: 30,
  jonah: 31,
  jon: 31,
  micah: 32,
  mic: 32,
  nahum: 33,
  nah: 33,
  habakkuk: 34,
  hab: 34,
  zephaniah: 35,
  zeph: 35,
  haggai: 36,
  hag: 36,
  zechariah: 37,
  zech: 37,
  malachi: 38,
  mal: 38,
  // NT
  matthew: 39,
  matt: 39,
  mt: 39,
  mark: 40,
  mk: 40,
  luke: 41,
  lk: 41,
  john: 42,
  jn: 42,
  acts: 43,
  romans: 44,
  rom: 44,
  "1 corinthians": 45,
  "1cor": 45,
  "1co": 45,
  "2 corinthians": 46,
  "2cor": 46,
  "2co": 46,
  galatians: 47,
  gal: 47,
  ephesians: 48,
  eph: 48,
  philippians: 49,
  phil: 49,
  php: 49,
  colossians: 50,
  col: 50,
  "1 thessalonians": 51,
  "1thess": 51,
  "1th": 51,
  "2 thessalonians": 52,
  "2thess": 52,
  "2th": 52,
  "1 timothy": 53,
  "1tim": 53,
  "1ti": 53,
  "2 timothy": 54,
  "2tim": 54,
  "2ti": 54,
  titus: 55,
  tit: 55,
  philemon: 56,
  phlm: 56,
  hebrews: 57,
  hebrew: 57,
  heb: 57,
  james: 58,
  jas: 58,
  "1 peter": 59,
  "1pet": 59,
  "1pe": 59,
  "2 peter": 60,
  "2pet": 60,
  "2pe": 60,
  "1 john": 61,
  "1jn": 61,
  "2 john": 62,
  "2jn": 62,
  "3 john": 63,
  "3jn": 63,
  jude: 64,
  revelation: 65,
  rev: 65,
};

export type ParsedReference = {
  bookIndex: number;
  chapter: number;
  verse?: number;
  verseEnd?: number;
};

export function parseReference(query: string): ParsedReference | null {
  const q = query.trim().toLowerCase().replace(/\s+/g, " ");
  // Accept: "john 3:16", "john3:16", "1 cor 13:4-7", "1cor13:4-7", "gen 1", "psalm 23:1"
  const refPattern = /^(\d?\s*[a-z][a-z ]*?)\s*(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/;
  const match = q.match(refPattern);
  if (!match) return null;
  const bookPart = match[1].trim().replace(/\s+/g, " ");
  const chapter = parseInt(match[2], 10);
  const verse = match[3] ? parseInt(match[3], 10) : undefined;
  const verseEnd = match[4] ? parseInt(match[4], 10) : undefined;
  let bookIndex = BOOK_ALIASES[bookPart];
  if (bookIndex === undefined) {
    // Try collapsing "1cor" → "1 cor"
    const expanded = bookPart.replace(/^(\d)\s*([a-z])/, "$1 $2");
    bookIndex = BOOK_ALIASES[expanded];
  }
  if (bookIndex === undefined) return null;
  return { bookIndex, chapter, verse, verseEnd };
}

/** Suggests up to N book matches for partial input ("gen", "1 cor"). */
export function suggestBooks(
  query: string,
  books: { name: string }[],
  limit = 6,
): Array<{ bookIndex: number; name: string }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<number>();
  const out: Array<{ bookIndex: number; name: string }> = [];
  // Exact alias prefix matches first
  for (const [alias, idx] of Object.entries(BOOK_ALIASES)) {
    if (alias.startsWith(q) && !seen.has(idx)) {
      seen.add(idx);
      out.push({ bookIndex: idx, name: books[idx]?.name ?? alias });
      if (out.length >= limit) return out;
    }
  }
  // Then any book name containing the query
  for (let i = 0; i < books.length; i++) {
    if (seen.has(i)) continue;
    if (books[i].name.toLowerCase().includes(q)) {
      seen.add(i);
      out.push({ bookIndex: i, name: books[i].name });
      if (out.length >= limit) return out;
    }
  }
  return out;
}
