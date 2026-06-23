/**
 * poemImport.ts — Extract plain text from a user-provided file for import
 * into the Poem Library.
 *
 * Paste is the primary path; this is the optional file-upload helper.
 *
 * Supported:
 *  - text/plain (.txt, .md) — read directly
 *  - .docx — parsed via mammoth (raw text, formatting discarded)
 *  - .pdf — parsed via pdfjs-dist (text content per page, joined with blank lines)
 *
 * All parsers are dynamically imported so the bundle stays light.
 */

const MAX_BYTES = 1_500_000; // ~1.5 MB upper bound — poems are tiny
const MAX_CHARS = 20_000; // ~3-4k words; poems should never exceed this
const MIN_CHARS = 2;

export interface ImportedPoem {
  text: string;
  filename: string;
}

export class PoemImportError extends Error {}

/**
 * Validate poem text from any source (paste or file).
 * Returns cleaned text or throws PoemImportError with a user-facing reason.
 */
export function validatePoemText(raw: string): string {
  // Strip control chars except \n and \t — catches binary paste / null bytes.
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x08\x0B-\x1F\x7F]/g, "");
  const cleaned = normalise(stripped);
  if (cleaned.length < MIN_CHARS) {
    throw new PoemImportError("That looks empty. Paste or upload a poem first.");
  }
  if (cleaned.length > MAX_CHARS) {
    throw new PoemImportError(
      `Too long (${cleaned.length.toLocaleString()} chars). Keep poems under ${MAX_CHARS.toLocaleString()}.`,
    );
  }
  // Suspicious paste detection: very low ratio of letters to total chars
  // suggests binary/encoded content rather than written text.
  const letters = (cleaned.match(/\p{L}/gu) ?? []).length;
  if (letters / cleaned.length < 0.4) {
    throw new PoemImportError("This doesn't look like written text. Try pasting again.");
  }
  return cleaned;
}

export async function extractPoemText(file: File): Promise<ImportedPoem> {
  if (file.size > MAX_BYTES) {
    throw new PoemImportError("File too large. Keep imports under 1.5 MB.");
  }

  const lower = file.name.toLowerCase();
  const text = await dispatch(file, lower);
  const cleaned = validatePoemText(text);
  return { text: cleaned, filename: file.name };
}

async function dispatch(file: File, lower: string): Promise<string> {
  if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type.startsWith("text/")) {
    return await file.text();
  }
  if (lower.endsWith(".docx")) {
    const mod = (await import("mammoth/mammoth.browser" as string)) as {
      extractRawText: (opts: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    };
    const buf = await file.arrayBuffer();
    const result = await mod.extractRawText({ arrayBuffer: buf });
    return result.value ?? "";
  }
  if (lower.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    // Workerless mode — fine for tiny poem PDFs and avoids a worker URL setup.
    // @ts-expect-error — disableWorker is honored at runtime even if untyped.
    const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer(), disableWorker: true });
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      pages.push(reconstructPageText(content.items as PdfTextItem[]));
    }
    return pages.join("\n\n");
  }
  throw new PoemImportError("Unsupported file. Use .txt, .docx, or .pdf — or paste the text.");
}

/**
 * pdf.js delivers text items with absolute transform matrices but no line
 * breaks — `.join(" ")` flattens stanzas. We rebuild structure by:
 *   1. Grouping items by Y baseline (within a small tolerance).
 *   2. Sorting groups top→down, items left→right within each line.
 *   3. Inserting a blank line when the vertical gap between two lines is
 *      noticeably larger than the page's typical line height (stanza break).
 *   4. Treating pdf.js `hasEOL` items as hard newlines.
 */
interface PdfTextItem {
  str: string;
  transform?: number[];
  height?: number;
  hasEOL?: boolean;
}

function reconstructPageText(items: PdfTextItem[]): string {
  if (items.length === 0) return "";

  type Line = { y: number; parts: Array<{ x: number; str: string }>; height: number };
  const lines: Line[] = [];
  const Y_TOL = 2; // pt — items within 2pt share a baseline

  for (const it of items) {
    const str = it.str ?? "";
    const tx = it.transform;
    if (!tx) continue;
    const x = tx[4];
    const y = tx[5];
    const height = it.height ?? Math.abs(tx[3]) ?? 12;

    // Find an existing line at this baseline.
    let line = lines.find((l) => Math.abs(l.y - y) <= Y_TOL);
    if (!line) {
      line = { y, parts: [], height };
      lines.push(line);
    } else {
      line.height = Math.max(line.height, height);
    }
    if (str) line.parts.push({ x, str });

    // pdf.js emits explicit EOL markers for hard line breaks; close current
    // line by nudging y so the next item starts a new line even at same Y.
    if (it.hasEOL) line.y = y - 0.001;
  }

  // Top to bottom (PDF y-axis grows upward).
  lines.sort((a, b) => b.y - a.y);

  // Assemble each line, joining parts left→right with a single space.
  const built = lines.map((l) => {
    l.parts.sort((a, b) => a.x - b.x);
    let text = "";
    let lastEnd = -Infinity;
    for (const p of l.parts) {
      // Heuristic: if there's a real horizontal gap, ensure a space; if
      // strings already end/start with whitespace, don't double up.
      if (text && p.x - lastEnd > 1 && !/\s$/.test(text) && !/^\s/.test(p.str)) {
        text += " ";
      }
      text += p.str;
      lastEnd = p.x + p.str.length; // approximate; we only need ordering
    }
    return { y: l.y, height: l.height, text: text.trimEnd() };
  });

  // Determine typical line height from gaps between consecutive lines.
  const gaps: number[] = [];
  for (let i = 1; i < built.length; i++) {
    gaps.push(built[i - 1].y - built[i].y);
  }
  gaps.sort((a, b) => a - b);
  const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
  const stanzaThreshold = medianGap * 1.6;

  const out: string[] = [];
  for (let i = 0; i < built.length; i++) {
    out.push(built[i].text);
    if (i < built.length - 1 && medianGap > 0) {
      const gap = built[i].y - built[i + 1].y;
      if (gap > stanzaThreshold) out.push(""); // blank line = stanza break
    }
  }
  return out.join("\n");
}

function normalise(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Derive a reasonable title from imported text (first non-empty line, max 80 chars). */
export function deriveTitle(text: string): string {
  const firstLine =
    text
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0) ?? "";
  return firstLine.length > 80 ? firstLine.slice(0, 80).trim() : firstLine;
}
