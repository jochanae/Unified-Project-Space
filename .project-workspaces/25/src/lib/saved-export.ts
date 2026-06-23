/**
 * Export helpers for /saved — produce JSON, CSV bundle, and Markdown digest
 * from the user's bookmarks, highlights, and notes. Each function returns
 * { filename, mime, content } so the caller can trigger a single download.
 */

export type ExportBookmark = {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  version: string;
  created_at: string;
};

export type ExportHighlight = {
  id: string;
  book: string;
  chapter: number;
  verse_start: number;
  verse_end: number;
  version: string;
  tone: string;
  created_at: string;
};

export type ExportNote = {
  id: string;
  book: string | null;
  chapter: number | null;
  verse: number | null;
  scripture_ref: string | null;
  body_text: string;
  updated_at: string;
};

export type ExportPayload = {
  bookmarks: ExportBookmark[];
  highlights: ExportHighlight[];
  notes: ExportNote[];
};

export type ExportFile = { filename: string; mime: string; content: string };

const stamp = () => new Date().toISOString().slice(0, 10);

export function buildJson(p: ExportPayload): ExportFile {
  return {
    filename: `sanctumiq-saved-${stamp()}.json`,
    mime: "application/json",
    content: JSON.stringify({ exported_at: new Date().toISOString(), ...p }, null, 2),
  };
}

const csvCell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvRow = (cells: unknown[]) => cells.map(csvCell).join(",");

export function buildCsv(p: ExportPayload): ExportFile {
  const lines: string[] = [];
  lines.push("# SanctumIQ Saved Export — " + new Date().toISOString());
  lines.push("");
  lines.push("## Bookmarks");
  lines.push(csvRow(["book", "chapter", "verse", "version", "created_at"]));
  for (const b of p.bookmarks) {
    lines.push(csvRow([b.book, b.chapter, b.verse, b.version, b.created_at]));
  }
  lines.push("");
  lines.push("## Highlights");
  lines.push(
    csvRow(["book", "chapter", "verse_start", "verse_end", "version", "tone", "created_at"]),
  );
  for (const h of p.highlights) {
    lines.push(
      csvRow([h.book, h.chapter, h.verse_start, h.verse_end, h.version, h.tone, h.created_at]),
    );
  }
  lines.push("");
  lines.push("## Notes");
  lines.push(csvRow(["scripture_ref", "book", "chapter", "verse", "body_text", "updated_at"]));
  for (const n of p.notes) {
    lines.push(
      csvRow([
        n.scripture_ref ?? "",
        n.book ?? "",
        n.chapter ?? "",
        n.verse ?? "",
        n.body_text,
        n.updated_at,
      ]),
    );
  }
  return {
    filename: `sanctumiq-saved-${stamp()}.csv`,
    mime: "text/csv",
    content: lines.join("\n"),
  };
}

export function buildMarkdown(p: ExportPayload): ExportFile {
  const lines: string[] = [];
  lines.push(`# SanctumIQ — Saved & Highlights`);
  lines.push(`*Exported ${new Date().toLocaleString()}*`);
  lines.push("");

  lines.push(`## Bookmarks (${p.bookmarks.length})`);
  if (p.bookmarks.length === 0) lines.push("_None_");
  for (const b of p.bookmarks) {
    lines.push(`- **${b.book} ${b.chapter}:${b.verse}** · ${b.version}`);
  }
  lines.push("");

  lines.push(`## Highlights (${p.highlights.length})`);
  if (p.highlights.length === 0) lines.push("_None_");
  for (const h of p.highlights) {
    const range =
      h.verse_start === h.verse_end ? `${h.verse_start}` : `${h.verse_start}–${h.verse_end}`;
    lines.push(`- **${h.book} ${h.chapter}:${range}** · ${h.version} · _${h.tone}_`);
  }
  lines.push("");

  lines.push(`## Notes (${p.notes.length})`);
  if (p.notes.length === 0) lines.push("_None_");
  for (const n of p.notes) {
    const ref = n.scripture_ref ?? (n.book ? `${n.book} ${n.chapter ?? ""}` : "Untitled");
    lines.push("");
    lines.push(`### ${ref}`);
    lines.push(`*${new Date(n.updated_at).toLocaleDateString()}*`);
    lines.push("");
    lines.push(n.body_text || "_(empty)_");
  }

  return {
    filename: `sanctumiq-saved-${stamp()}.md`,
    mime: "text/markdown",
    content: lines.join("\n"),
  };
}

export function downloadFile(file: ExportFile) {
  if (typeof window === "undefined") return;
  const blob = new Blob([file.content], { type: `${file.mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
