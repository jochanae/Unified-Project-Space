// SanctumIQ scripture loader — fetches the bundled KJV+ASV JSON once and caches.

export type Version = "KJV" | "ASV";

export type BookMeta = {
  name: string;
  abbr: string;
  chapterCount: number;
};

type VersionData = { name: string; chapters: string[][] }[]; // [book][chapter][verse]

type Bible = {
  books: BookMeta[];
  KJV: VersionData;
  ASV: VersionData;
};

let cache: Bible | null = null;
let inflight: Promise<Bible> | null = null;

export async function loadBible(): Promise<Bible> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = fetch("/bible/scripture.json", { cache: "force-cache" })
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load scripture");
      return r.json();
    })
    .then((data: Bible) => {
      cache = data;
      inflight = null;
      return data;
    });
  return inflight;
}

export function getChapter(
  bible: Bible,
  version: Version,
  bookIndex: number,
  chapter: number,
): string[] {
  return bible[version][bookIndex]?.chapters[chapter - 1] ?? [];
}

export const VERSION_LABELS: Record<Version, string> = {
  KJV: "King James",
  ASV: "American Standard",
};
