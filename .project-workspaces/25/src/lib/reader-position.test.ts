/**
 * Reader resume invariant tests.
 *
 * These verify the contract that powers "always resumes the last opened book
 * and chapter" across:
 *   - page refresh        → local snapshot is the source of truth on mount
 *   - logout/login        → server snapshot is fetched and reconciled
 *   - mobile/desktop swap → newer `updated_at` wins (server vs local)
 *
 * We mock the supabase client so tests are pure and deterministic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// In-memory mock of the supabase reader_positions table.
let mockServerRow: {
  book: string;
  book_index: number;
  chapter: number;
  verse: number | null;
  version: string;
  updated_at: string;
} | null = null;
let mockServerError: { message: string } | null = null;
const upsertSpy = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mockServerRow, error: mockServerError }),
        }),
      }),
      upsert: (row: unknown, opts: unknown) => {
        upsertSpy(row, opts);
        return { then: (cb: (r: { error: null }) => void) => cb({ error: null }) };
      },
    }),
  },
}));

import {
  flushPosition,
  getLocalPosition,
  hydrateFromServer,
  savePosition,
} from "./reader-position";

beforeEach(() => {
  localStorage.clear();
  mockServerRow = null;
  mockServerError = null;
  upsertSpy.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("reader-position — refresh invariant", () => {
  it("restores last book/chapter/version from localStorage", () => {
    savePosition({ book: "John", bookIndex: 42, chapter: 3, verse: 16, version: "ASV" }, "user-1");
    const restored = getLocalPosition();
    expect(restored?.book).toBe("John");
    expect(restored?.bookIndex).toBe(42);
    expect(restored?.chapter).toBe(3);
    expect(restored?.verse).toBe(16);
    expect(restored?.version).toBe("ASV");
  });

  it("works for unauthenticated users (offline-first)", () => {
    savePosition({ book: "Psalms", bookIndex: 18, chapter: 23, verse: null, version: "KJV" }, null);
    expect(getLocalPosition()?.chapter).toBe(23);
    // No userId → no server write scheduled.
    vi.advanceTimersByTime(5000);
    expect(upsertSpy).not.toHaveBeenCalled();
  });
});

describe("reader-position — login/device-switch invariant", () => {
  it("server position wins when its updated_at is newer than local", async () => {
    // Local: older snapshot.
    savePosition({ book: "Genesis", bookIndex: 0, chapter: 1, verse: null, version: "KJV" }, null);
    const local = getLocalPosition()!;
    // Server: a newer snapshot from another device.
    mockServerRow = {
      book: "Romans",
      book_index: 44,
      chapter: 8,
      verse: 28,
      version: "ASV",
      updated_at: new Date(new Date(local.updatedAt).getTime() + 10_000).toISOString(),
    };
    const reconciled = await hydrateFromServer("user-1");
    expect(reconciled?.book).toBe("Romans");
    expect(reconciled?.chapter).toBe(8);
    expect(reconciled?.version).toBe("ASV");
    // Local cache should now reflect the server snapshot.
    expect(getLocalPosition()?.book).toBe("Romans");
  });

  it("local position wins when it is newer than server", async () => {
    mockServerRow = {
      book: "Romans",
      book_index: 44,
      chapter: 8,
      verse: 28,
      version: "ASV",
      updated_at: new Date(Date.now() - 60_000).toISOString(),
    };
    savePosition({ book: "John", bookIndex: 42, chapter: 3, verse: 16, version: "KJV" }, null);
    const reconciled = await hydrateFromServer("user-1");
    expect(reconciled?.book).toBe("John");
    expect(reconciled?.chapter).toBe(3);
  });

  it("falls back to local when server lookup errors", async () => {
    savePosition({ book: "John", bookIndex: 42, chapter: 3, verse: 16, version: "KJV" }, null);
    mockServerError = { message: "network down" };
    const reconciled = await hydrateFromServer("user-1");
    expect(reconciled?.book).toBe("John");
  });
});

describe("reader-position — debounced server sync", () => {
  it("coalesces rapid saves into a single server upsert", () => {
    savePosition({ book: "Acts", bookIndex: 43, chapter: 1, verse: null, version: "KJV" }, "u");
    savePosition({ book: "Acts", bookIndex: 43, chapter: 2, verse: null, version: "KJV" }, "u");
    savePosition({ book: "Acts", bookIndex: 43, chapter: 3, verse: null, version: "KJV" }, "u");
    expect(upsertSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy.mock.calls[0][0]).toMatchObject({ chapter: 3 });
  });

  it("flushPosition forces an immediate write (unmount safety)", () => {
    savePosition({ book: "Acts", bookIndex: 43, chapter: 5, verse: 1, version: "KJV" }, "u");
    flushPosition();
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy.mock.calls[0][0]).toMatchObject({ chapter: 5, verse: 1 });
  });
});
