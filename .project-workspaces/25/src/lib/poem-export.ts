/**
 * poem-export.ts
 *
 * Produces a formatted PDF "Poem Scroll" from PoemData.
 * Uses jsPDF (already in bundle via Blueprint). No new dependencies.
 *
 * Layout per template:
 *   Heart Cry  — full-width centered italic stanzas, free line breaks preserved
 *   Psalm      — praise/lament movement in larger italic, gold rule, anchor verse below
 *   Proverb    — single large centered line, generous white space above/below
 *
 * All templates share: SanctumIQ header mark, inspiration reference if present,
 * gold rule footer with date.
 *
 * Extras (added):
 *   • Quality presets — standard / high / print (compression + precision)
 *   • Inspiration scripture refs become clickable PDF link annotations
 *     pointing to /reader?bookIndex=X&chapter=Y on the published origin
 *   • Returns a verse-link page map so the UI can show "John 3 → page 2" badges
 */

import jsPDF from "jspdf";
import type { PoemData } from "@/components/notes/PoemEditor";
import { findScriptureRefs, type ScriptureMatch } from "@/lib/scripture-refs";

const GOLD: [number, number, number] = [201, 168, 76];
const IVORY: [number, number, number] = [240, 233, 216];
const INK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [110, 110, 120];
const LINK_BLUE: [number, number, number] = [80, 110, 180];

// ─── canonical 66-book index (matches reader's bookIndex param) ──────────────
const CANON_BOOKS: string[] = [
  "Genesis",
  "Exodus",
  "Leviticus",
  "Numbers",
  "Deuteronomy",
  "Joshua",
  "Judges",
  "Ruth",
  "1 Samuel",
  "2 Samuel",
  "1 Kings",
  "2 Kings",
  "1 Chronicles",
  "2 Chronicles",
  "Ezra",
  "Nehemiah",
  "Esther",
  "Job",
  "Psalms",
  "Proverbs",
  "Ecclesiastes",
  "Song of Solomon",
  "Isaiah",
  "Jeremiah",
  "Lamentations",
  "Ezekiel",
  "Daniel",
  "Hosea",
  "Joel",
  "Amos",
  "Obadiah",
  "Jonah",
  "Micah",
  "Nahum",
  "Habakkuk",
  "Zephaniah",
  "Haggai",
  "Zechariah",
  "Malachi",
  "Matthew",
  "Mark",
  "Luke",
  "John",
  "Acts",
  "Romans",
  "1 Corinthians",
  "2 Corinthians",
  "Galatians",
  "Ephesians",
  "Philippians",
  "Colossians",
  "1 Thessalonians",
  "2 Thessalonians",
  "1 Timothy",
  "2 Timothy",
  "Titus",
  "Philemon",
  "Hebrews",
  "James",
  "1 Peter",
  "2 Peter",
  "1 John",
  "2 John",
  "3 John",
  "Jude",
  "Revelation",
];

function bookIndexFor(name: string): number {
  return CANON_BOOKS.indexOf(name);
}

// ─── public API ──────────────────────────────────────────────────────────────

export type PdfQuality = "standard" | "high" | "print";

export interface PoemExportOptions {
  quality?: PdfQuality;
  /** Origin used for verse link URLs. Defaults to current location, then sanctumiq.app. */
  origin?: string;
}

/** Page number (1-based) where each scripture ref link landed. */
export interface VerseLinkRecord {
  match: ScriptureMatch;
  /** Absolute URL the annotation points to. */
  url: string;
  /** PDF page (1-based) where the link was placed. */
  page: number;
  /** Display label, e.g. "John 3:16–18". */
  label: string;
}

export interface PoemPdfMeta {
  blob: Blob;
  pageCount: number;
  quality: PdfQuality;
  /** ~Bytes — useful for "1.2 MB" badges. */
  byteSize: number;
  verseLinks: VerseLinkRecord[];
}

export function downloadPoemPDF(
  data: PoemData,
  inspiration?: string,
  opts: PoemExportOptions = {},
) {
  const { doc } = buildPoemDoc(data, inspiration, opts);
  const slug = poemSlug(data);
  doc.save(`${slug}.pdf`);
}

export function buildPoemPDFBlob(
  data: PoemData,
  inspiration?: string,
  opts: PoemExportOptions = {},
): Blob {
  const { doc } = buildPoemDoc(data, inspiration, opts);
  return doc.output("blob");
}

/** Build the PDF and return the blob plus full metadata for preview UI. */
export function buildPoemPDFBlobWithMeta(
  data: PoemData,
  inspiration?: string,
  opts: PoemExportOptions = {},
): PoemPdfMeta {
  const { doc, verseLinks, quality } = buildPoemDoc(data, inspiration, opts);
  const blob = doc.output("blob");
  return {
    blob,
    pageCount: doc.getNumberOfPages(),
    quality,
    byteSize: blob.size,
    verseLinks,
  };
}

/** Back-compat shim — older call sites may import this name. */
export { buildPoemPDFBlobWithMeta as buildPoemPDFBlobWithMetaLegacy };

function poemSlug(data: PoemData): string {
  const label =
    data.template === "heart_cry" ? "Heart Cry" : data.template === "psalm" ? "Psalm" : "Proverb";
  return `SanctumIQ — ${label}`;
}

// ─── core builder ────────────────────────────────────────────────────────────

function buildPoemDoc(
  data: PoemData,
  inspiration: string | undefined,
  opts: PoemExportOptions,
): { doc: jsPDF; verseLinks: VerseLinkRecord[]; quality: PdfQuality } {
  const quality: PdfQuality = opts.quality ?? "standard";

  // Quality preset — controls compression + numeric precision.
  // jsPDF "compress" enables FlateDecode on streams; "precision" rounds coords.
  const qualityOpts =
    quality === "print"
      ? { compress: false, precision: 16 } // largest, sharpest, AAA print
      : quality === "high"
        ? { compress: true, precision: 8 } // crisp, still ~25% smaller
        : { compress: true, precision: 2 }; // standard — smallest file

  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
    orientation: "portrait",
    ...qualityOpts,
  });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 72;
  const contentW = pageW - margin * 2;
  let y = margin;

  const verseLinks: VerseLinkRecord[] = [];
  const origin = resolveOrigin(opts.origin);

  // ── helpers ───────────────────────────────────────────────────────────────

  const goldRule = (alpha = 1) => {
    doc.setDrawColor(
      Math.round(GOLD[0] * alpha + 255 * (1 - alpha)),
      Math.round(GOLD[1] * alpha + 255 * (1 - alpha)),
      Math.round(GOLD[2] * alpha + 255 * (1 - alpha)),
    );
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageW - margin, y);
    y += 16;
  };

  const shortRule = (width = 80, alpha = 0.5) => {
    const cx = pageW / 2;
    doc.setDrawColor(
      Math.round(GOLD[0] * alpha + 255 * (1 - alpha)),
      Math.round(GOLD[1] * alpha + 255 * (1 - alpha)),
      Math.round(GOLD[2] * alpha + 255 * (1 - alpha)),
    );
    doc.setLineWidth(0.4);
    doc.line(cx - width / 2, y, cx + width / 2, y);
    y += 14;
  };

  // Writes centered, wrapped text. Returns new y.
  const writeCentered = (
    text: string,
    opts: {
      size: number;
      style?: "normal" | "italic" | "bold";
      font?: "times" | "helvetica";
      color?: [number, number, number];
      lineGap?: number;
      maxWidth?: number;
    },
  ) => {
    const {
      size,
      style = "normal",
      font = "times",
      color = INK,
      lineGap = 0,
      maxWidth = contentW,
    } = opts;
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lineH = size * 1.55 + lineGap;

    // Preserve intentional line breaks
    const paragraphs = text.split("\n");
    for (const para of paragraphs) {
      if (!para.trim()) {
        y += lineH * 0.6; // blank line = partial gap
        continue;
      }
      const wrapped = doc.splitTextToSize(para, maxWidth);
      for (const line of wrapped) {
        if (y + lineH > pageH - margin) {
          addFooter();
          doc.addPage();
          y = margin;
          // jsPDF does NOT reliably preserve font/size/color across addPage() —
          // re-apply every time to guarantee consistent rendering on pages 2+.
          doc.setFont(font, style);
          doc.setFontSize(size);
          doc.setTextColor(...color);
        }
        doc.text(line, pageW / 2, y, { align: "center" });
        y += lineH;
      }
    }
  };

  const addFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("SanctumIQ", margin, pageH - 32);
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    doc.text(dateStr, pageW - margin, pageH - 32, { align: "right" });
    // thin gold rule above footer
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 44, pageW - margin, pageH - 44);
  };

  // ── header ────────────────────────────────────────────────────────────────

  // SanctumIQ eyebrow
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GOLD);
  doc.text("S A N C T U M I Q", pageW / 2, y, { align: "center", charSpace: 2.5 });
  y += 18;

  goldRule();

  // template label
  const templateLabel =
    data.template === "heart_cry" ? "Heart Cry" : data.template === "psalm" ? "Psalm" : "Proverb";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(templateLabel.toUpperCase(), pageW / 2, y, { align: "center", charSpace: 1.8 });
  y += 28;

  // ── body by template ──────────────────────────────────────────────────────

  if (data.template === "heart_cry") {
    const body = data.body.trim();
    if (body) {
      y += 12;
      writeCentered(body, {
        size: 16,
        style: "italic",
        color: INK,
        lineGap: 3,
        maxWidth: contentW - 40,
      });
      y += 16;
    }
  }

  if (data.template === "psalm") {
    if (data.praise.trim()) {
      y += 12;
      writeCentered(data.praise.trim(), {
        size: 16,
        style: "italic",
        color: INK,
        lineGap: 4,
        maxWidth: contentW - 20,
      });
      y += 20;
    }
    if (data.anchor.trim()) {
      shortRule(100, 0.45);
      y += 8;
      writeCentered(data.anchor.trim(), {
        size: 12,
        style: "normal",
        color: [160, 130, 60] as [number, number, number],
        lineGap: 2,
        maxWidth: contentW - 80,
      });
      y += 16;
    }
  }

  if (data.template === "proverb") {
    y += pageH * 0.1;
    writeCentered(data.line.trim(), {
      size: 22,
      style: "italic",
      color: INK,
      lineGap: 0,
      maxWidth: contentW - 60,
    });
    y += 20;
  }

  // ── inspiration reference + verse link annotations ────────────────────────

  if (inspiration?.trim()) {
    y += 8;
    shortRule(60, 0.3);

    const inspLine = inspiration.trim();
    const matches = findScriptureRefs(inspLine);

    // Page-break guard — keep the inspiration block whole.
    if (y + 28 > pageH - margin) {
      addFooter();
      doc.addPage();
      y = margin;
    }

    doc.setFont("times", "normal");
    doc.setFontSize(10);

    if (matches.length === 0) {
      // No detectable refs — render plain muted text.
      doc.setTextColor(...MUTED);
      doc.text(inspLine, pageW / 2, y, { align: "center" });
      y += 20;
    } else {
      // Render the line as alternating plain / linked segments, centered.
      const segments = segmentInspiration(inspLine, matches);
      // Measure full width to compute starting x for centering.
      const totalW = segments.reduce((sum, s) => {
        doc.setTextColor(...(s.kind === "link" ? LINK_BLUE : MUTED));
        return sum + doc.getTextWidth(s.text);
      }, 0);
      let cursor = (pageW - totalW) / 2;
      const lineY = y;
      const lineH = 10 * 1.55;

      for (const seg of segments) {
        const w = doc.getTextWidth(seg.text);
        if (seg.kind === "link" && seg.match) {
          const idx = bookIndexFor(seg.match.book);
          if (idx >= 0) {
            const url = `${origin}/reader?bookIndex=${idx}&chapter=${seg.match.chapter}`;
            doc.setTextColor(...LINK_BLUE);
            doc.text(seg.text, cursor, lineY);
            // Underline + clickable annotation
            doc.setDrawColor(...LINK_BLUE);
            doc.setLineWidth(0.4);
            doc.line(cursor, lineY + 1.5, cursor + w, lineY + 1.5);
            doc.link(cursor, lineY - lineH * 0.75, w, lineH, { url });
            verseLinks.push({
              match: seg.match,
              url,
              page: doc.getNumberOfPages(),
              label: labelForMatch(seg.match),
            });
          } else {
            // Unknown book — fall back to muted plain text
            doc.setTextColor(...MUTED);
            doc.text(seg.text, cursor, lineY);
          }
        } else {
          doc.setTextColor(...MUTED);
          doc.text(seg.text, cursor, lineY);
        }
        cursor += w;
      }
      y += 20;
    }
  }

  addFooter();
  return { doc, verseLinks, quality };
}

// ─── inspiration segmentation ────────────────────────────────────────────────

interface InspSegment {
  kind: "text" | "link";
  text: string;
  match?: ScriptureMatch;
}

function segmentInspiration(line: string, matches: ScriptureMatch[]): InspSegment[] {
  const sorted = [...matches].sort((a, b) => a.start - b.start);
  const out: InspSegment[] = [];
  let cursor = 0;
  for (const m of sorted) {
    if (m.start > cursor) out.push({ kind: "text", text: line.slice(cursor, m.start) });
    out.push({ kind: "link", text: m.raw, match: m });
    cursor = m.end;
  }
  if (cursor < line.length) out.push({ kind: "text", text: line.slice(cursor) });
  return out;
}

function labelForMatch(m: ScriptureMatch): string {
  if (m.verseStart && m.verseEnd && m.verseEnd !== m.verseStart) {
    return `${m.book} ${m.chapter}:${m.verseStart}–${m.verseEnd}`;
  }
  if (m.verseStart) return `${m.book} ${m.chapter}:${m.verseStart}`;
  return `${m.book} ${m.chapter}`;
}

function resolveOrigin(explicit?: string): string {
  if (explicit) return explicit.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "https://sanctumiq.app";
}
