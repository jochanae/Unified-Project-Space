// Short book labels for tight (<400px) header viewports.
// Falls back to the original name when no abbreviation is defined.
const ABBREV: Record<string, string> = {
  Genesis: "Gen",
  Exodus: "Exo",
  Leviticus: "Lev",
  Numbers: "Num",
  Deuteronomy: "Deut",
  Joshua: "Josh",
  Judges: "Judg",
  Ruth: "Ruth",
  "1 Samuel": "1 Sam",
  "2 Samuel": "2 Sam",
  "1 Kings": "1 Kgs",
  "2 Kings": "2 Kgs",
  "1 Chronicles": "1 Chr",
  "2 Chronicles": "2 Chr",
  Ezra: "Ezra",
  Nehemiah: "Neh",
  Esther: "Est",
  Job: "Job",
  Psalms: "Ps",
  Proverbs: "Prov",
  Ecclesiastes: "Eccl",
  "Song of Solomon": "Song",
  Isaiah: "Isa",
  Jeremiah: "Jer",
  Lamentations: "Lam",
  Ezekiel: "Ezek",
  Daniel: "Dan",
  Hosea: "Hos",
  Joel: "Joel",
  Amos: "Amos",
  Obadiah: "Obad",
  Jonah: "Jon",
  Micah: "Mic",
  Nahum: "Nah",
  Habakkuk: "Hab",
  Zephaniah: "Zeph",
  Haggai: "Hag",
  Zechariah: "Zech",
  Malachi: "Mal",
  Matthew: "Matt",
  Mark: "Mark",
  Luke: "Luke",
  John: "John",
  Acts: "Acts",
  Romans: "Rom",
  "1 Corinthians": "1 Cor",
  "2 Corinthians": "2 Cor",
  Galatians: "Gal",
  Ephesians: "Eph",
  Philippians: "Phil",
  Colossians: "Col",
  "1 Thessalonians": "1 Thess",
  "2 Thessalonians": "2 Thess",
  "1 Timothy": "1 Tim",
  "2 Timothy": "2 Tim",
  Titus: "Titus",
  Philemon: "Phlm",
  Hebrews: "Heb",
  James: "Jas",
  "1 Peter": "1 Pet",
  "2 Peter": "2 Pet",
  "1 John": "1 Jn",
  "2 John": "2 Jn",
  "3 John": "3 Jn",
  Jude: "Jude",
  Revelation: "Rev",
};

export function abbreviateBook(name: string): string {
  return ABBREV[name] ?? name;
}

/** Build both full + short reference strings from a book name and chapter:verse suffix. */
export function buildReferenceLabels(
  bookName: string,
  suffix: string,
): { full: string; short: string } {
  return {
    full: `${bookName} ${suffix}`.trim(),
    short: `${abbreviateBook(bookName)} ${suffix}`.trim(),
  };
}

/**
 * Build a verse-range suffix using an en dash. When start === end (or end is
 * nullish), returns a single-verse suffix.
 */
export function buildVerseSuffix(
  chapter: number,
  verseStart: number,
  verseEnd?: number | null,
): string {
  if (verseEnd && verseEnd !== verseStart) {
    return `${chapter}:${verseStart}\u2013${verseEnd}`;
  }
  return `${chapter}:${verseStart}`;
}
