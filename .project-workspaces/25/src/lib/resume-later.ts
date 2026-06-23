/**
 * Resume Later — named bookmarks of book/chapter/version saved by the user
 * from the Reader. Persisted in localStorage (per-device, no auth required).
 *
 * Surfaced inside the Gold-Dot Quick-Peek so the user can jump back instantly.
 * Cap at 8 entries; newest first; same (book,chapter,version) replaces.
 */

const KEY = "sanctumiq:reader:resume-later-v1";
const MAX = 8;

export type ResumeLaterPin = {
  id: string;
  label: string;
  book: string;
  bookIndex: number;
  chapter: number;
  verse: number | null;
  version: string;
  savedAt: string; // ISO
};

function read(): ResumeLaterPin[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ResumeLaterPin[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(list: ResumeLaterPin[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* ignore */
  }
}

export function listResumeLater(): ResumeLaterPin[] {
  return read();
}

export function saveResumeLater(pin: Omit<ResumeLaterPin, "id" | "savedAt">): ResumeLaterPin {
  const list = read();
  const filtered = list.filter(
    (p) => !(p.book === pin.book && p.chapter === pin.chapter && p.version === pin.version),
  );
  const entry: ResumeLaterPin = {
    ...pin,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: new Date().toISOString(),
  };
  write([entry, ...filtered]);
  return entry;
}

export function removeResumeLater(id: string): void {
  write(read().filter((p) => p.id !== id));
}
