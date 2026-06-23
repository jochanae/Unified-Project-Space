/**
 * Reader · Print Export
 *
 * Print-ready view of a passage range. Opened in a new tab from the Reader
 * via /reader/print?book=John&chapter=3&start=16&end=21&version=KJV
 *
 * Includes the selected verses, the user's highlight bands within that range,
 * and any notes attached to verses in the range. On load it auto-invokes
 * window.print() so users can save as PDF (iOS Safari supports this natively).
 */

import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { loadBible, getChapter, type Version, VERSION_LABELS } from "@/lib/scripture";

type MarginPreset = "narrow" | "standard" | "wide";

const MARGIN_PRESETS: Record<MarginPreset, { label: string; page: string }> = {
  narrow: { label: "Narrow", page: "12mm 12mm" },
  standard: { label: "Standard", page: "20mm 18mm" },
  wide: { label: "Wide", page: "28mm 26mm" },
};

type NotesLayout = "inline" | "grouped";

type PrintSearch = {
  book?: string;
  chapter?: number;
  start?: number;
  end?: number;
  version?: Version;
  cols?: 1 | 2;
  margins?: MarginPreset;
  notesLayout?: NotesLayout;
};

export const Route = createFileRoute("/reader/print")({
  validateSearch: (search: Record<string, unknown>): PrintSearch => {
    const colsRaw =
      typeof search.cols === "string" ? Number(search.cols) : (search.cols as number | undefined);
    const cols: 1 | 2 = colsRaw === 2 ? 2 : colsRaw === 1 ? 1 : (undefined as unknown as 1 | 2);
    const marginsRaw = typeof search.margins === "string" ? search.margins : undefined;
    const margins: MarginPreset | undefined =
      marginsRaw === "narrow" || marginsRaw === "standard" || marginsRaw === "wide"
        ? marginsRaw
        : undefined;
    const notesLayoutRaw = typeof search.notesLayout === "string" ? search.notesLayout : undefined;
    const notesLayout: NotesLayout | undefined =
      notesLayoutRaw === "inline" || notesLayoutRaw === "grouped" ? notesLayoutRaw : undefined;
    return {
      book: typeof search.book === "string" ? search.book : undefined,
      chapter:
        typeof search.chapter === "string"
          ? Number(search.chapter)
          : (search.chapter as number | undefined),
      start:
        typeof search.start === "string"
          ? Number(search.start)
          : (search.start as number | undefined),
      end: typeof search.end === "string" ? Number(search.end) : (search.end as number | undefined),
      version: (typeof search.version === "string" ? search.version : "KJV") as Version,
      cols,
      margins,
      notesLayout,
    };
  },
  head: () => ({
    meta: [{ title: "Print Passage — SanctumIQ" }, { name: "robots", content: "noindex" }],
  }),
  ssr: false,
  component: ReaderPrintPage,
});

interface NoteRow {
  id: string;
  verse: number | null;
  body_text: string;
  scripture_ref: string | null;
}

interface HighlightRow {
  verse_start: number;
  verse_end: number;
}

function ReaderPrintPage() {
  const search = useSearch({ from: "/reader/print" });
  const { user } = useAuth();
  const version: Version = search.version ?? "KJV";
  const book = search.book ?? "";
  const chapter = search.chapter ?? 1;
  const start = search.start ?? 1;
  const end = search.end ?? start;

  const [verses, setVerses] = useState<string[]>([]);
  const [parallelVerses, setParallelVerses] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<HighlightRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  // Notes column count. Auto-default: 2 columns when there are 6+ notes.
  // Explicit ?cols=1 or ?cols=2 in the URL overrides the auto choice.
  const [notesColumns, setNotesColumns] = useState<1 | 2>(search.cols ?? 1);
  const [columnsTouched, setColumnsTouched] = useState(Boolean(search.cols));
  const [margins, setMargins] = useState<MarginPreset>(search.margins ?? "standard");
  const [notesLayout, setNotesLayout] = useState<NotesLayout>(search.notesLayout ?? "inline");

  // Load scripture (KJV always for parallel reference)
  useEffect(() => {
    let active = true;
    if (!book) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const bible = await loadBible();
        if (!active) return;
        const bookIndex = bible.books.findIndex((b) => b.name.toLowerCase() === book.toLowerCase());
        if (bookIndex === -1) {
          setVerses([]);
          return;
        }
        const primary = getChapter(bible, version, bookIndex, chapter) ?? [];
        setVerses(primary);
        if (version !== "KJV") {
          const parallel = getChapter(bible, "KJV", bookIndex, chapter) ?? [];
          setParallelVerses(parallel);
        }
      } catch (err) {
        console.error("Print: failed to load bible", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [book, chapter, version]);

  // Load highlights + notes for this user
  useEffect(() => {
    if (!user || !book) return;
    let active = true;
    (async () => {
      const [hRes, nRes] = await Promise.all([
        supabase
          .from("verse_highlights")
          .select("verse_start, verse_end")
          .eq("user_id", user.id)
          .eq("book", book)
          .eq("chapter", chapter)
          .eq("version", version),
        supabase
          .from("notes")
          .select("id, verse, body_text, scripture_ref")
          .eq("user_id", user.id)
          .eq("book", book)
          .eq("chapter", chapter)
          .order("verse", { ascending: true }),
      ]);
      if (!active) return;
      if (hRes.data) setHighlights(hRes.data as HighlightRow[]);
      if (nRes.data) setNotes(nRes.data as NoteRow[]);
    })();
    return () => {
      active = false;
    };
  }, [user, book, chapter, version]);

  // Filter to the selected range
  const passage = useMemo(() => {
    if (!verses.length) return [];
    const safeStart = Math.max(1, Math.min(start, verses.length));
    const safeEnd = Math.max(safeStart, Math.min(end, verses.length));
    return Array.from({ length: safeEnd - safeStart + 1 }, (_, i) => ({
      number: safeStart + i,
      text: verses[safeStart + i - 1] ?? "",
      kjv: parallelVerses[safeStart + i - 1] ?? "",
    }));
  }, [verses, parallelVerses, start, end]);

  const highlightedSet = useMemo(() => {
    const set = new Set<number>();
    highlights.forEach((h) => {
      for (let v = h.verse_start; v <= h.verse_end; v += 1) set.add(v);
    });
    return set;
  }, [highlights]);

  const rangeNotes = useMemo(() => {
    const safeStart = Math.max(1, start);
    const safeEnd = Math.max(safeStart, end);
    return notes.filter((n) => {
      if (n.verse == null) return false;
      return n.verse >= safeStart && n.verse <= safeEnd;
    });
  }, [notes, start, end]);

  // Group notes by verse so each verse + its notes can render and paginate together.
  const notesByVerse = useMemo(() => {
    const map = new Map<number, NoteRow[]>();
    rangeNotes.forEach((n) => {
      if (n.verse == null) return;
      const arr = map.get(n.verse) ?? [];
      arr.push(n);
      map.set(n.verse, arr);
    });
    return map;
  }, [rangeNotes]);

  const reference = `${book} ${chapter}:${start}${end !== start ? `-${end}` : ""}`;

  // Auto-pick 2 columns when notes are dense, unless the user has chosen explicitly.
  useEffect(() => {
    if (columnsTouched) return;
    setNotesColumns(rangeNotes.length >= 6 ? 2 : 1);
  }, [rangeNotes.length, columnsTouched]);

  // Auto-trigger print once content is ready
  useEffect(() => {
    if (loading) return;
    if (!passage.length) return;
    const timer = window.setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error("print failed", err);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [loading, passage.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <LoadingSpinner context="page" text="Preparing passage" />
      </div>
    );
  }

  if (!passage.length) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12 text-center text-slate-700">
        <h1 className="text-2xl font-semibold">No passage to print</h1>
        <p className="mt-2 text-sm">Open the Reader, select a verse range, and try again.</p>
      </div>
    );
  }

  return (
    <div className="print-root mx-auto max-w-3xl bg-white px-8 py-10 text-slate-900">
      <style>{`
        @page { margin: ${MARGIN_PRESETS[margins].page}; size: auto; }
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-root { padding: 0 !important; max-width: none !important; }
          /* Repeat the passage heading at the top of each printed page. */
          thead.print-running-head { display: table-header-group; }
          tfoot.print-running-foot { display: table-footer-group; }
          h1, h2 { page-break-after: avoid; break-after: avoid; }
          section { page-break-inside: auto; }
        }
        .print-root { font-family: Georgia, "Times New Roman", serif; line-height: 1.6; color: #111827; }
        /* Use a table so thead/tfoot can repeat across pages while verses flow naturally. */
        .print-sheet { width: 100%; border-collapse: collapse; }
        .print-sheet td { padding: 0; }
        .print-running-head th { text-align: left; font-weight: 400; padding-bottom: 0.5rem; }
        .print-running-foot td { padding-top: 0.5rem; font-size: 9px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.22em; text-align: center; }
        .print-verse {
          display: flex;
          gap: 0.7rem;
          padding: 0.22rem 0;
          /* Keep each verse on a single page; orphans/widows guard line-breaks within. */
          page-break-inside: avoid;
          break-inside: avoid;
          orphans: 3;
          widows: 3;
        }
        .print-verse-num { flex: 0 0 1.8rem; font-size: 0.72rem; font-weight: 600; color: #6b7280; padding-top: 0.28rem; font-variant-numeric: tabular-nums; }
        .print-verse-text { flex: 1; font-size: 1rem; }
        .print-highlight { background: #fff4c2; padding: 0 0.18rem; border-radius: 2px; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
        .print-divider { border-top: 1px solid #e5e7eb; margin: 1.6rem 0 1.2rem; }
        .print-section-title { font-size: 1.05rem; font-weight: 600; color: #1f2937; margin: 0; page-break-after: avoid; break-after: avoid; }
        .print-section-meta { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.18em; color: #6b7280; margin: 0.2rem 0 0.9rem; }
        /* Verse + its inline notes: keep together when possible. */
        .print-verse-group {
          page-break-inside: avoid;
          break-inside: avoid;
          margin: 0 0 0.35rem;
        }
        /* Hint that the next block (the note) should stay with this verse. */
        .print-verse-group .print-verse { page-break-after: avoid; break-after: avoid; }
        .print-note-inline {
          margin: 0.35rem 0 0 1.8rem; /* align under verse text, past the verse number gutter */
          padding: 0.5rem 0.75rem;
          border-left: 3px solid #d4a017;
          background: #fafaf6;
          page-break-inside: avoid;
          break-inside: avoid;
          orphans: 3;
          widows: 3;
          font-size: 0.92rem;
          line-height: 1.55;
        }
        .print-note-inline + .print-note-inline { margin-top: 0.3rem; }
        .print-note {
          padding: 0.6rem 0.85rem;
          border-left: 3px solid #d4a017;
          background: #fafaf6;
          margin: 0 0 0.7rem;
          page-break-inside: avoid;
          break-inside: avoid;
          orphans: 3;
          widows: 3;
          font-size: 0.92rem;
          line-height: 1.55;
        }
        .print-note + .print-note { margin-top: 0; }
        .print-note-head { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.14em; color: #6b7280; margin: 0 0 0.3rem; }
        .print-note-body { margin: 0; white-space: pre-wrap; color: #1f2937; }
        .print-parallel { color: #6b7280; font-size: 0.85rem; font-style: italic; margin-top: 0.2rem; line-height: 1.5; }
        .print-notes-grid { display: block; }
        .print-notes-grid.cols-2 {
          column-count: 2;
          column-gap: 1.2rem;
          column-rule: 1px solid #f1f5f9;
        }
        .print-notes-grid.cols-2 .print-note {
          /* Avoid splitting a single note across columns. */
          break-inside: avoid;
          -webkit-column-break-inside: avoid;
          page-break-inside: avoid;
          display: inline-block;
          width: 100%;
        }
      `}</style>

      <table className="print-sheet">
        <thead className="print-running-head">
          <tr>
            <th>
              <div className="border-b border-slate-200 pb-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
                  SanctumIQ · Passage Export
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-slate-900">{reference}</h1>
                <p className="mt-1 text-xs text-slate-500">
                  {VERSION_LABELS[version] ?? version}
                  {parallelVerses.length > 0 && version !== "KJV" ? " (with KJV reference)" : ""}
                </p>
              </div>
            </th>
          </tr>
        </thead>
        <tfoot className="print-running-foot">
          <tr>
            <td>SanctumIQ · {new Date().toLocaleDateString()}</td>
          </tr>
        </tfoot>
        <tbody>
          <tr>
            <td>
              <section aria-label="Scripture" className="pt-4">
                {passage.map((v) => {
                  const verseNotes =
                    notesLayout === "inline" ? (notesByVerse.get(v.number) ?? []) : [];
                  return (
                    <div key={v.number} className="print-verse-group">
                      <div className="print-verse">
                        <span className="print-verse-num">{v.number}</span>
                        <div className="print-verse-text">
                          <span
                            className={highlightedSet.has(v.number) ? "print-highlight" : undefined}
                          >
                            {v.text}
                          </span>
                          {v.kjv && version !== "KJV" && (
                            <div className="print-parallel">KJV — {v.kjv}</div>
                          )}
                        </div>
                      </div>
                      {verseNotes.map((note) => (
                        <div key={note.id} className="print-note-inline">
                          <p className="print-note-head">
                            {note.scripture_ref ?? `${book} ${chapter}:${note.verse}`}
                          </p>
                          <p className="print-note-body">{note.body_text}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </section>

              {notesLayout === "grouped" && rangeNotes.length > 0 && (
                <>
                  <div className="print-divider" />
                  <section aria-label="Notes">
                    <h2 className="print-section-title">Your notes</h2>
                    <p className="print-section-meta">
                      {rangeNotes.length} entr{rangeNotes.length === 1 ? "y" : "ies"}
                    </p>
                    <div className={`print-notes-grid cols-${notesColumns}`}>
                      {rangeNotes.map((note) => (
                        <div key={note.id} className="print-note">
                          <p className="print-note-head">
                            {note.scripture_ref ?? `${book} ${chapter}:${note.verse}`}
                          </p>
                          <p className="print-note-body">{note.body_text}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer is rendered as a repeating tfoot inside the print table. */}

      <div className="no-print mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-slate-300 bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
        >
          Print / Save as PDF
        </button>
        {rangeNotes.length > 0 && (
          <div
            role="group"
            aria-label="Notes layout"
            className="inline-flex items-center overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm"
          >
            <span className="border-r border-slate-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Notes
            </span>
            {(["inline", "grouped"] as NotesLayout[]).map((opt) => {
              const active = notesLayout === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setNotesLayout(opt)}
                  aria-pressed={active}
                  className={`px-3 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {opt === "inline" ? "With verses" : "At end"}
                </button>
              );
            })}
          </div>
        )}
        {notesLayout === "grouped" && rangeNotes.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setColumnsTouched(true);
              setNotesColumns((c) => (c === 2 ? 1 : 2));
            }}
            className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
            aria-pressed={notesColumns === 2}
          >
            Columns: {notesColumns === 2 ? "2" : "1"}
          </button>
        )}
        <div
          role="group"
          aria-label="Page margins"
          className="inline-flex items-center overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm"
        >
          <span className="border-r border-slate-200 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Margins
          </span>
          {(Object.keys(MARGIN_PRESETS) as MarginPreset[]).map((preset) => {
            const active = margins === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => setMargins(preset)}
                aria-pressed={active}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {MARGIN_PRESETS[preset].label}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => window.close()}
          className="rounded-md border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-100"
        >
          Close
        </button>
      </div>
    </div>
  );
}
