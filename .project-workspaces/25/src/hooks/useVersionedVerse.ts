/**
 * useVersionedVerse
 *
 * Returns a verse's text in the user's preferred Bible version.
 * Reads the stored version from localStorage (same key the reader uses),
 * loads the bible bundle, then resolves the verse text dynamically.
 *
 * Falls back to the hardcoded KJV text if:
 *   - No version preference is stored
 *   - The bible bundle hasn't loaded yet
 *   - The reference can't be parsed or found
 *
 * Usage:
 *   const { text, version, loading } = useVersionedVerse(ref, fallbackKjvText);
 */

import { useEffect, useState } from "react";
import { loadBible, getChapter, type Version } from "@/lib/scripture";

const VERSION_KEY = "sanctumiq:reader:version";

function readStoredVersion(): Version {
  try {
    const v = localStorage.getItem(VERSION_KEY);
    if (v === "KJV" || v === "ASV") return v;
  } catch {
    /* noop */
  }
  return "KJV";
}

/**
 * Parse a scripture reference like "John 3:16" or "Psalm 119:105"
 * into { bookName, chapter, verse }.
 * Returns null if the format can't be recognized.
 */
function parseRef(ref: string): { bookName: string; chapter: number; verse: number } | null {
  // Match "Book Name Chapter:Verse"
  const match = ref.trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!match) return null;
  return {
    bookName: match[1].trim(),
    chapter: parseInt(match[2], 10),
    verse: parseInt(match[3], 10),
  };
}

export function useVersionedVerse(
  ref: string,
  fallbackText: string,
): { text: string; version: Version; loading: boolean } {
  const [version] = useState<Version>(readStoredVersion);
  const [text, setText] = useState(fallbackText);
  const [loading, setLoading] = useState(version !== "KJV");

  useEffect(() => {
    // KJV text is already in the hardcoded curated list — no need to load
    if (version === "KJV") {
      setText(fallbackText);
      setLoading(false);
      return;
    }

    const parsed = parseRef(ref);
    if (!parsed) {
      setText(fallbackText);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    loadBible()
      .then((bible) => {
        if (!active) return;
        const bookIndex = bible.books.findIndex(
          (b) => b.name.toLowerCase() === parsed.bookName.toLowerCase(),
        );
        if (bookIndex < 0) {
          setText(fallbackText);
          return;
        }
        const verses = getChapter(bible, version, bookIndex, parsed.chapter);
        // Verses are 1-indexed
        const verseText = verses[parsed.verse - 1];
        setText(verseText || fallbackText);
      })
      .catch(() => {
        if (active) setText(fallbackText);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [ref, version, fallbackText]);

  return { text, version, loading };
}
