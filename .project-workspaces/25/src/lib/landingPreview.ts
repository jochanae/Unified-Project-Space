import { loadBible } from "@/lib/scripture";

export type LandingPreviewSetting = {
  book: string;
  chapter: number;
  verse: number;
  reference?: string;
};

export type LandingPreviewVerse = LandingPreviewSetting & {
  reference: string;
  kjv: string;
  modern: string;
};

export type ScriptureBookOption = {
  name: string;
  chapterCount: number;
};

const DEFAULT_PREVIEW: LandingPreviewSetting = {
  book: "Psalms",
  chapter: 46,
  verse: 10,
  reference: "Psalms 46:10",
};

export async function resolveLandingPreviewVerse(
  setting?: Partial<LandingPreviewSetting> | null,
): Promise<LandingPreviewVerse> {
  const merged: LandingPreviewSetting = {
    ...DEFAULT_PREVIEW,
    ...setting,
  };

  const bible = await loadBible();
  const bookIndex = bible.books.findIndex((book) => book.name === merged.book);
  const fallbackBookIndex = bible.books.findIndex((book) => book.name === DEFAULT_PREVIEW.book);
  const safeBookIndex = bookIndex >= 0 ? bookIndex : fallbackBookIndex;
  const safeChapter = Math.max(1, merged.chapter);
  const safeVerse = Math.max(1, merged.verse);
  const book = bible.books[safeBookIndex];
  const kjv = bible.KJV[safeBookIndex]?.chapters[safeChapter - 1]?.[safeVerse - 1];
  const modern = bible.ASV[safeBookIndex]?.chapters[safeChapter - 1]?.[safeVerse - 1];

  const fallbackKjv =
    bible.KJV[fallbackBookIndex]?.chapters[DEFAULT_PREVIEW.chapter - 1]?.[
      DEFAULT_PREVIEW.verse - 1
    ] ?? "";
  const fallbackModern =
    bible.ASV[fallbackBookIndex]?.chapters[DEFAULT_PREVIEW.chapter - 1]?.[
      DEFAULT_PREVIEW.verse - 1
    ] ?? "";
  const reference = `${book.name} ${safeChapter}:${safeVerse}`;

  return {
    book: book.name,
    chapter: safeChapter,
    verse: safeVerse,
    reference: merged.reference || reference,
    kjv: kjv ?? fallbackKjv,
    modern: modern ?? fallbackModern,
  };
}

export async function getScriptureBooks(): Promise<ScriptureBookOption[]> {
  const bible = await loadBible();
  return bible.books.map((book, index) => ({
    name: book.name,
    chapterCount: bible.KJV[index]?.chapters.length ?? book.chapterCount,
  }));
}

export async function getVerseCount(bookName: string, chapter: number): Promise<number> {
  const bible = await loadBible();
  const bookIndex = bible.books.findIndex((book) => book.name === bookName);
  const safeBookIndex =
    bookIndex >= 0
      ? bookIndex
      : bible.books.findIndex((book) => book.name === DEFAULT_PREVIEW.book);
  return bible.KJV[safeBookIndex]?.chapters[Math.max(1, chapter) - 1]?.length ?? 1;
}
