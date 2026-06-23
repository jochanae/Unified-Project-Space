import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { loadBible } from "@/lib/scripture";

export const Route = createFileRoute("/__dev/reader-diagnostics")({
  head: () => ({
    meta: [{ title: "Reader Diagnostics — SanctumIQ" }, { name: "robots", content: "noindex" }],
  }),
  ssr: false,
  component: ReaderDiagnosticsPage,
});

const STORAGE_KEYS = [
  "sanctumiq:reader:position",
  "sanctumiq:reader:focus-mode",
  "sanctumiq:reader:history",
  "sanctumiq:reader:prefetch-hint-seen",
  "sanctumiq:reader:verse-dot-help-dismissed",
  "sanctumiq:reader:aggressive-prefetch",
  "sanctumiq:reader:service-mode",
  "sanctumiq:reader:service-drawer",
  "sanctumiq:reader:picker-state",
  "sanctumiq:reader:version",
  "sanctumiq:reader:immersive-hint-seen",
  "sanctumiq:reader:anchor",
  "sanctumiq:reader:header-discovery-seen",
  "sanctumiq:library-docked",
  "sanctumiq:companion-open",
  "sanctumiq:text-scale",
];

type BibleStatus =
  | { state: "loading" }
  | { state: "ok"; bookCount: number; firstBook: string }
  | { state: "error"; message: string };

function readKeys() {
  if (typeof window === "undefined") return [] as Array<{ key: string; value: string | null }>;
  return STORAGE_KEYS.map((key) => {
    try {
      return { key, value: localStorage.getItem(key) };
    } catch {
      return { key, value: "(unreadable)" };
    }
  });
}

function ReaderDiagnosticsPage() {
  const { user, isReady } = useAuth();
  const [bible, setBible] = useState<BibleStatus>({ state: "loading" });
  const [storage, setStorage] = useState(() => readKeys());
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    let cancelled = false;
    loadBible()
      .then((data) => {
        if (cancelled) return;
        setBible({
          state: "ok",
          bookCount: data.books.length,
          firstBook: data.books[0]?.name ?? "(unknown)",
        });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBible({ state: "error", message: err instanceof Error ? err.message : String(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ua = useMemo(() => (typeof navigator !== "undefined" ? navigator.userAgent : "ssr"), []);
  const online = useMemo(() => (typeof navigator !== "undefined" ? navigator.onLine : true), []);

  const refresh = () => {
    setStorage(readKeys());
    setNow(new Date().toISOString());
  };

  const clearReaderKeys = () => {
    if (!confirm("Clear all reader localStorage keys on this device?")) return;
    STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    refresh();
  };

  const resetAndReload = () => {
    if (!confirm("Reset reader state and reload? This clears reader localStorage on this device."))
      return;
    STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    if (typeof window !== "undefined") {
      window.location.assign("/reader");
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-5 py-10">
      <header className="space-y-1">
        <p className="font-display text-[10px] uppercase tracking-[0.32em] text-gold/70">
          Internal · /__dev
        </p>
        <h1 className="font-display text-2xl text-foreground">Reader Diagnostics</h1>
        <p className="text-sm text-muted-foreground">
          Snapshot of the reader's runtime state. Use this when filing bugs or recovering from a
          stuck render.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card/40 p-4 text-sm">
        <h2 className="mb-2 font-display text-base text-foreground">Session</h2>
        <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-xs">
          <dt className="text-muted-foreground">Auth ready</dt>
          <dd className="font-mono">{String(isReady)}</dd>
          <dt className="text-muted-foreground">User</dt>
          <dd className="font-mono break-all">{user?.email ?? "(anonymous)"}</dd>
          <dt className="text-muted-foreground">User id</dt>
          <dd className="font-mono break-all">{user?.id ?? "—"}</dd>
          <dt className="text-muted-foreground">Online</dt>
          <dd className="font-mono">{String(online)}</dd>
          <dt className="text-muted-foreground">Snapshot at</dt>
          <dd className="font-mono">{now}</dd>
          <dt className="text-muted-foreground">User agent</dt>
          <dd className="font-mono break-all">{ua}</dd>
        </dl>
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4 text-sm">
        <h2 className="mb-2 font-display text-base text-foreground">Scripture bundle</h2>
        {bible.state === "loading" && (
          <p className="text-xs text-muted-foreground">Loading bible JSON…</p>
        )}
        {bible.state === "ok" && (
          <p className="text-xs">
            <span className="font-mono text-gold">OK</span> · {bible.bookCount} books · first:{" "}
            <span className="font-mono">{bible.firstBook}</span>
          </p>
        )}
        {bible.state === "error" && (
          <p className="text-xs text-destructive">Failed: {bible.message}</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card/40 p-4 text-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-base text-foreground">Local storage</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={refresh}
              className="rounded border border-border px-2 py-1 text-[11px] text-foreground hover:bg-accent"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={clearReaderKeys}
              className="rounded border border-destructive/40 px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10"
            >
              Clear reader keys
            </button>
          </div>
        </div>
        <ul className="space-y-1 text-[11px]">
          {storage.map(({ key, value }) => (
            <li
              key={key}
              className="grid grid-cols-[1fr_auto] gap-2 border-b border-border/40 py-1"
            >
              <span className="font-mono text-muted-foreground break-all">{key}</span>
              <span className="font-mono text-foreground break-all text-right">
                {value === null ? "—" : value.length > 80 ? `${value.slice(0, 80)}…` : value}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={resetAndReload}
          className="rounded-md bg-gold/90 px-4 py-2 text-sm font-medium text-obsidian transition-colors hover:bg-gold"
        >
          Reset reader state &amp; reload
        </button>
        <Link
          to="/reader"
          className="rounded-md border border-gold/40 px-4 py-2 text-sm text-gold-soft transition-colors hover:bg-gold/10"
        >
          Back to reader
        </Link>
        <Link
          to="/"
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-accent"
        >
          Home
        </Link>
      </div>
    </div>
  );
}
