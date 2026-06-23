// Auto-detect Bible references in free-form text (e.g. Selah output).
// Returns matched ranges so callers can render inline links / verse cards.

const BOOKS: Array<{ name: string; aliases: string[] }> = [
  { name: "Genesis", aliases: ["Gen", "Ge", "Gn"] },
  { name: "Exodus", aliases: ["Exo", "Ex", "Exod"] },
  { name: "Leviticus", aliases: ["Lev", "Lv"] },
  { name: "Numbers", aliases: ["Num", "Nm", "Nu"] },
  { name: "Deuteronomy", aliases: ["Deut", "Dt"] },
  { name: "Joshua", aliases: ["Josh", "Jos"] },
  { name: "Judges", aliases: ["Judg", "Jdg"] },
  { name: "Ruth", aliases: ["Ru"] },
  { name: "1 Samuel", aliases: ["1 Sam", "1Sam", "1 Sa", "1Sa", "I Samuel"] },
  { name: "2 Samuel", aliases: ["2 Sam", "2Sam", "2 Sa", "2Sa", "II Samuel"] },
  { name: "1 Kings", aliases: ["1 Kgs", "1Kgs", "1 Ki", "1Ki", "I Kings"] },
  { name: "2 Kings", aliases: ["2 Kgs", "2Kgs", "2 Ki", "2Ki", "II Kings"] },
  { name: "1 Chronicles", aliases: ["1 Chr", "1Chr", "1 Ch", "1Ch", "I Chronicles"] },
  { name: "2 Chronicles", aliases: ["2 Chr", "2Chr", "2 Ch", "2Ch", "II Chronicles"] },
  { name: "Ezra", aliases: ["Ezr"] },
  { name: "Nehemiah", aliases: ["Neh", "Ne"] },
  { name: "Esther", aliases: ["Est", "Esth"] },
  { name: "Job", aliases: ["Jb"] },
  { name: "Psalms", aliases: ["Psalm", "Ps", "Psa", "Pss"] },
  { name: "Proverbs", aliases: ["Prov", "Pr", "Prv"] },
  { name: "Ecclesiastes", aliases: ["Eccl", "Ec", "Qoh"] },
  { name: "Song of Solomon", aliases: ["Song", "Song of Songs", "SoS", "Cant"] },
  { name: "Isaiah", aliases: ["Isa", "Is"] },
  { name: "Jeremiah", aliases: ["Jer", "Je"] },
  { name: "Lamentations", aliases: ["Lam", "La"] },
  { name: "Ezekiel", aliases: ["Ezek", "Ez", "Eze"] },
  { name: "Daniel", aliases: ["Dan", "Dn"] },
  { name: "Hosea", aliases: ["Hos", "Ho"] },
  { name: "Joel", aliases: ["Jl"] },
  { name: "Amos", aliases: ["Am"] },
  { name: "Obadiah", aliases: ["Obad", "Ob"] },
  { name: "Jonah", aliases: ["Jon", "Jnh"] },
  { name: "Micah", aliases: ["Mic", "Mi"] },
  { name: "Nahum", aliases: ["Nah", "Na"] },
  { name: "Habakkuk", aliases: ["Hab", "Hb"] },
  { name: "Zephaniah", aliases: ["Zeph", "Zep"] },
  { name: "Haggai", aliases: ["Hag", "Hg"] },
  { name: "Zechariah", aliases: ["Zech", "Zec"] },
  { name: "Malachi", aliases: ["Mal", "Ml"] },
  { name: "Matthew", aliases: ["Matt", "Mt"] },
  { name: "Mark", aliases: ["Mk", "Mrk"] },
  { name: "Luke", aliases: ["Lk", "Luk"] },
  { name: "John", aliases: ["Jn", "Jhn"] },
  { name: "Acts", aliases: ["Ac"] },
  { name: "Romans", aliases: ["Rom", "Ro"] },
  { name: "1 Corinthians", aliases: ["1 Cor", "1Cor", "1 Co", "1Co", "I Corinthians"] },
  { name: "2 Corinthians", aliases: ["2 Cor", "2Cor", "2 Co", "2Co", "II Corinthians"] },
  { name: "Galatians", aliases: ["Gal", "Ga"] },
  { name: "Ephesians", aliases: ["Eph", "Ep"] },
  { name: "Philippians", aliases: ["Phil", "Php"] },
  { name: "Colossians", aliases: ["Col"] },
  { name: "1 Thessalonians", aliases: ["1 Thess", "1Thess", "1 Th", "1Th", "I Thessalonians"] },
  { name: "2 Thessalonians", aliases: ["2 Thess", "2Thess", "2 Th", "2Th", "II Thessalonians"] },
  { name: "1 Timothy", aliases: ["1 Tim", "1Tim", "1 Ti", "1Ti", "I Timothy"] },
  { name: "2 Timothy", aliases: ["2 Tim", "2Tim", "2 Ti", "2Ti", "II Timothy"] },
  { name: "Titus", aliases: ["Tit"] },
  { name: "Philemon", aliases: ["Phlm", "Phm"] },
  { name: "Hebrews", aliases: ["Heb"] },
  { name: "James", aliases: ["Jas", "Jm"] },
  { name: "1 Peter", aliases: ["1 Pet", "1Pet", "1 Pe", "1Pe", "I Peter"] },
  { name: "2 Peter", aliases: ["2 Pet", "2Pet", "2 Pe", "2Pe", "II Peter"] },
  { name: "1 John", aliases: ["1 Jn", "1Jn", "1 Jo", "I John"] },
  { name: "2 John", aliases: ["2 Jn", "2Jn", "2 Jo", "II John"] },
  { name: "3 John", aliases: ["3 Jn", "3Jn", "3 Jo", "III John"] },
  { name: "Jude", aliases: ["Jud"] },
  { name: "Revelation", aliases: ["Rev", "Re", "Apoc"] },
];

const ALIAS_TO_BOOK = new Map<string, string>();
for (const b of BOOKS) {
  ALIAS_TO_BOOK.set(b.name.toLowerCase(), b.name);
  for (const a of b.aliases) ALIAS_TO_BOOK.set(a.toLowerCase().replace(/\./g, ""), b.name);
}

// Pattern: optional leading number (1/2/3/I/II/III), book word(s), space, chapter, optional :verse[-verse]
const BOOK_PATTERN = "(?:(?:[1-3]|I{1,3})\\s*)?(?:Song\\s+of\\s+(?:Solomon|Songs)|[A-Z][a-z]+)\\.?";
const REF_REGEX = new RegExp(
  `\\b(${BOOK_PATTERN})\\s+(\\d{1,3})(?::(\\d{1,3})(?:[\\u2013\\u2014-](\\d{1,3}))?)?\\b`,
  "g",
);

export interface ScriptureMatch {
  start: number;
  end: number;
  raw: string;
  book: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

function normalizeBook(raw: string): string | null {
  const cleaned = raw.replace(/\./g, "").replace(/\s+/g, " ").trim().toLowerCase();
  return ALIAS_TO_BOOK.get(cleaned) ?? null;
}

export function findScriptureRefs(text: string): ScriptureMatch[] {
  if (!text) return [];
  const out: ScriptureMatch[] = [];
  for (const m of text.matchAll(REF_REGEX)) {
    const [raw, bookRaw, chap, vs, ve] = m;
    const book = normalizeBook(bookRaw);
    if (!book) continue;
    const chapter = Number(chap);
    if (!chapter) continue;
    out.push({
      start: m.index ?? 0,
      end: (m.index ?? 0) + raw.length,
      raw,
      book,
      chapter,
      verseStart: vs ? Number(vs) : undefined,
      verseEnd: ve ? Number(ve) : undefined,
    });
  }
  return out;
}
