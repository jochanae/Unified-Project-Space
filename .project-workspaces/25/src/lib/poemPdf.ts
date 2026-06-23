/**
 * poemPdf.ts — Client-side PDF export for a single poem.
 *
 * Sanctuary aesthetic: cream page (warmer than pure white), thin gold
 * hairline frame, small-caps template band at top, italic serif title,
 * gold rule, body in serif, optional inspiration + scripture citations,
 * and a centered footer mark. Quiet, premium, shareable. No clip-art.
 */

import jsPDF from "jspdf";
import type { PoemRecord } from "@/lib/poems";
import { TEMPLATE_LABEL, poemFullText } from "@/lib/poems";

// Sanctuary palette tuned for paper.
const PAPER = { r: 250, g: 246, b: 238 }; // warm cream
const INK = { r: 28, g: 26, b: 22 }; // near-black with warmth
const INK_SOFT = { r: 70, g: 64, b: 50 };
const MUTED = { r: 130, g: 120, b: 95 };
const GOLD = { r: 175, g: 140, b: 60 }; // brushed gold
const GOLD_SOFT = { r: 210, g: 180, b: 110 };

function safeFilename(input: string): string {
  return (
    input
      .replace(/[^a-z0-9\-_\s]/gi, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "poem"
  );
}

export function exportPoemToPdf(poem: PoemRecord): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 72;
  const maxWidth = pageWidth - margin * 2;

  paintPage(doc, pageWidth, pageHeight);

  // ── Top band: template label, centered, small-caps ───────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
  doc.text(
    TEMPLATE_LABEL[poem.template].toUpperCase().split("").join(" "),
    pageWidth / 2,
    margin + 8,
    { align: "center" },
  );

  // Title
  const title = poem.title?.trim() || "Untitled";
  doc.setFont("times", "italic");
  doc.setFontSize(26);
  doc.setTextColor(INK.r, INK.g, INK.b);
  const titleLines = doc.splitTextToSize(title, maxWidth);
  let cursor = margin + 48;
  for (const line of titleLines) {
    doc.text(line, pageWidth / 2, cursor, { align: "center" });
    cursor += 30;
  }

  // Centered hairline gold rule under title
  cursor += 4;
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.6);
  const ruleHalf = 36;
  doc.line(pageWidth / 2 - ruleHalf, cursor, pageWidth / 2 + ruleHalf, cursor);
  cursor += 26;

  // ── Body ─────────────────────────────────────────────────────────────────
  doc.setFont("times", "normal");
  doc.setFontSize(13.5);
  doc.setTextColor(INK_SOFT.r, INK_SOFT.g, INK_SOFT.b);

  const bodyText = (() => {
    if (poem.template === "heart_cry") return poem.body;
    if (poem.template === "psalm") {
      const parts: string[] = [];
      if (poem.praise) parts.push(poem.praise);
      if (poem.anchor) parts.push(`\n— ${poem.anchor}`);
      return parts.join("\n");
    }
    return poem.line;
  })();

  const lineHeight = 22;
  cursor = renderParagraph(
    doc,
    bodyText || "(empty)",
    cursor,
    margin,
    maxWidth,
    pageHeight,
    lineHeight,
    () => paintPage(doc, pageWidth, pageHeight),
  );

  // Inspiration line
  if (poem.inspiration?.trim()) {
    cursor += 18;
    cursor = ensureSpace(doc, cursor, 28, margin, pageHeight, pageWidth, () =>
      paintPage(doc, pageWidth, pageHeight),
    );
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    const lines = doc.splitTextToSize(`Inspired by ${poem.inspiration.trim()}`, maxWidth);
    for (const line of lines) {
      doc.text(line, pageWidth / 2, cursor, { align: "center" });
      cursor += 14;
    }
  }

  // ── Scripture citations from Deep Dive ───────────────────────────────────
  const citations = extractScriptureCitations(poem.deep_dive);
  if (citations.length > 0) {
    cursor += 26;
    cursor = ensureSpace(doc, cursor, 60, margin, pageHeight, pageWidth, () =>
      paintPage(doc, pageWidth, pageHeight),
    );

    // Centered diamond divider
    doc.setTextColor(GOLD_SOFT.r, GOLD_SOFT.g, GOLD_SOFT.b);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("✦", pageWidth / 2, cursor, { align: "center" });
    cursor += 22;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GOLD.r, GOLD.g, GOLD.b);
    doc.text("S C R I P T U R E   C O N N E C T I O N S", pageWidth / 2, cursor, {
      align: "center",
    });
    cursor += 20;

    for (const c of citations) {
      cursor = ensureSpace(doc, cursor, 50, margin, pageHeight, pageWidth, () =>
        paintPage(doc, pageWidth, pageHeight),
      );
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(INK.r, INK.g, INK.b);
      doc.text(c.reference, pageWidth / 2, cursor, { align: "center" });
      cursor += 14;

      if (c.why) {
        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.setTextColor(INK_SOFT.r, INK_SOFT.g, INK_SOFT.b);
        const whyLines = doc.splitTextToSize(c.why, maxWidth - 60);
        for (const line of whyLines) {
          cursor = ensureSpace(doc, cursor, 16, margin, pageHeight, pageWidth, () =>
            paintPage(doc, pageWidth, pageHeight),
          );
          doc.text(line, pageWidth / 2, cursor, { align: "center" });
          cursor += 15;
        }
      }
      cursor += 8;
    }
  }

  // ── Footer mark on every page ────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  const stamp = new Date(poem.updated_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text(`SANCTUMIQ  ·  ${stamp.toUpperCase()}`, pageWidth / 2, pageHeight - margin / 2, {
      align: "center",
    });
  }

  const filename = `${safeFilename(poem.title || TEMPLATE_LABEL[poem.template])}.pdf`;
  doc.save(filename);

  void poemFullText;
}

// ── helpers ────────────────────────────────────────────────────────────────

function paintPage(doc: jsPDF, w: number, h: number) {
  // Cream background
  doc.setFillColor(PAPER.r, PAPER.g, PAPER.b);
  doc.rect(0, 0, w, h, "F");
  // Outer hairline gold frame
  const inset = 32;
  doc.setDrawColor(GOLD_SOFT.r, GOLD_SOFT.g, GOLD_SOFT.b);
  doc.setLineWidth(0.4);
  doc.rect(inset, inset, w - inset * 2, h - inset * 2);
  // Inner ultra-fine frame for sanctum feel
  const inner = inset + 6;
  doc.setDrawColor(GOLD.r, GOLD.g, GOLD.b);
  doc.setLineWidth(0.2);
  doc.rect(inner, inner, w - inner * 2, h - inner * 2);
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  margin: number,
  pageHeight: number,
  _pageWidth: number,
  paint: () => void,
): number {
  if (y + needed > pageHeight - margin - 24) {
    doc.addPage();
    paint();
    return margin + 16;
  }
  return y;
}

function renderParagraph(
  doc: jsPDF,
  text: string,
  startY: number,
  margin: number,
  maxWidth: number,
  pageHeight: number,
  lineHeight: number,
  paint: () => void,
): number {
  let y = startY;
  // Preserve intentional blank lines from the user.
  const blocks = text.split(/\n\n+/);
  for (let bi = 0; bi < blocks.length; bi++) {
    const lines = doc.splitTextToSize(blocks[bi].replace(/\n/g, " \n"), maxWidth);
    for (const raw of lines) {
      const line = String(raw);
      if (y + lineHeight > pageHeight - margin - 36) {
        doc.addPage();
        paint();
        y = margin + 16;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    if (bi < blocks.length - 1) y += lineHeight * 0.5;
  }
  return y;
}

function extractScriptureCitations(deepDive: unknown): Array<{ reference: string; why: string }> {
  if (!deepDive || typeof deepDive !== "object") return [];
  const raw = (deepDive as { scripture_connections?: unknown }).scripture_connections;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const r = (item as { reference?: unknown }).reference;
      const w = (item as { why?: unknown }).why;
      const reference = typeof r === "string" ? r.trim() : "";
      if (!reference) return null;
      return { reference, why: typeof w === "string" ? w.trim() : "" };
    })
    .filter((x): x is { reference: string; why: string } => x !== null);
}
