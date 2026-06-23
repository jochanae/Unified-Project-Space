/**
 * Blueprint export — produces a clean text snapshot and a branded PDF
 * preserving the Historical / Linguistic / Cross-Reference / Practical
 * structure. PDF uses jsPDF (already in deps) so no new bundle weight.
 */
import jsPDF from "jspdf";
import type { BlueprintData } from "@/components/blueprint/ScripturalBlueprint";

export function buildBlueprintText(data: BlueprintData): string {
  const lines: string[] = [];
  const rule = "─".repeat(56);

  lines.push("SCRIPTURAL BLUEPRINT");
  lines.push(rule);
  lines.push(`${data.reference}  (${data.version})`);
  lines.push("");
  lines.push(data.passageText);
  lines.push("");
  lines.push(rule);

  lines.push("");
  lines.push("HISTORICAL CONTEXT");
  data.historicalContext.forEach((h) => {
    lines.push("");
    lines.push(`• ${h.heading}`);
    lines.push(`  ${h.body}`);
  });

  lines.push("");
  lines.push(rule);
  lines.push("");
  lines.push("LINGUISTIC ROOTS");
  data.linguisticRoots.forEach((r) => {
    lines.push("");
    lines.push(`• ${r.term}  [${r.language}]`);
    lines.push(`  ${r.gloss}`);
    lines.push(`  ${r.note}`);
  });

  lines.push("");
  lines.push(rule);
  lines.push("");
  lines.push("CROSS-REFERENCES");
  data.crossReferences.forEach((c) => {
    lines.push("");
    lines.push(`• ${c.ref}`);
    lines.push(`  ${c.note}`);
  });

  lines.push("");
  lines.push(rule);
  lines.push("");
  lines.push("PRACTICAL BLUEPRINT");
  data.actionSteps.forEach((s, i) => {
    lines.push(`  ${i + 1}. ${s}`);
  });

  lines.push("");
  lines.push(rule);
  lines.push("SanctumIQ · Scriptural Blueprint");
  return lines.join("\n");
}

export function downloadBlueprintText(data: BlueprintData) {
  const blob = new Blob([buildBlueprintText(data)], {
    type: "text/plain;charset=utf-8",
  });
  triggerDownload(blob, `Blueprint — ${data.reference}.txt`);
}

export async function copyBlueprintText(data: BlueprintData): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(buildBlueprintText(data));
    return true;
  } catch {
    return false;
  }
}

/* ─────────────────────────── PDF ─────────────────────────── */

const GOLD: [number, number, number] = [194, 158, 76]; // hsl gold-ish
const INK: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [100, 100, 110];

export function downloadBlueprintPDF(data: BlueprintData) {
  const doc = buildBlueprintPDFDoc(data);
  doc.save(`Blueprint — ${data.reference}.pdf`);
}

/** Returns the PDF as a Blob (for Web Share API file sharing). */
export function buildBlueprintPDFBlob(data: BlueprintData): Blob {
  const doc = buildBlueprintPDFDoc(data);
  return doc.output("blob");
}

function buildBlueprintPDFDoc(data: BlueprintData) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 56;
  const contentW = pageW - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - margin) {
      addFooter();
      doc.addPage();
      y = margin;
    }
  };

  const addFooter = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("SanctumIQ · Scriptural Blueprint", margin, pageH - 28);
    doc.text(`${data.reference}  (${data.version})`, pageW - margin, pageH - 28, {
      align: "right",
    });
  };

  const goldRule = () => {
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(margin, y, pageW - margin, y);
    y += 14;
  };

  const sectionHeading = (label: string) => {
    ensureSpace(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(label.toUpperCase(), margin, y, { charSpace: 1.5 });
    y += 8;
    goldRule();
  };

  const writeWrapped = (
    text: string,
    opts: {
      size: number;
      bold?: boolean;
      color?: [number, number, number];
      indent?: number;
      lineGap?: number;
    },
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size);
    doc.setTextColor(...(opts.color ?? INK));
    const indent = opts.indent ?? 0;
    const wrapped = doc.splitTextToSize(text, contentW - indent);
    const lineHeight = opts.size * 1.35 + (opts.lineGap ?? 0);
    wrapped.forEach((line: string) => {
      ensureSpace(lineHeight);
      doc.text(line, margin + indent, y);
      y += lineHeight;
    });
  };

  // ── Header ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD);
  doc.text("SCRIPTURAL BLUEPRINT", margin, y, { charSpace: 2 });
  y += 22;

  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...INK);
  doc.text(data.reference, margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(data.version.toUpperCase(), margin, y, { charSpace: 1.5 });
  y += 18;

  goldRule();

  writeWrapped(data.passageText, { size: 12, color: INK, lineGap: 2 });
  y += 8;
  goldRule();

  // ── Historical ──
  sectionHeading("Historical Context");
  data.historicalContext.forEach((h) => {
    writeWrapped(h.heading, { size: 11, bold: true, color: GOLD });
    writeWrapped(h.body, { size: 10, color: INK, indent: 12 });
    y += 6;
  });

  // ── Linguistic ──
  sectionHeading("Linguistic Roots");
  data.linguisticRoots.forEach((r) => {
    writeWrapped(`${r.term}  [${r.language}]`, {
      size: 12,
      bold: true,
      color: GOLD,
    });
    writeWrapped(r.gloss, { size: 10, color: INK, indent: 12 });
    writeWrapped(r.note, { size: 9, color: MUTED, indent: 12 });
    y += 6;
  });

  // ── Cross-References ──
  sectionHeading("Cross-References");
  data.crossReferences.forEach((c) => {
    writeWrapped(c.ref, { size: 10, bold: true, color: GOLD });
    writeWrapped(c.note, { size: 10, color: INK, indent: 12 });
    y += 4;
  });

  // ── Practical ──
  sectionHeading("Practical Blueprint");
  data.actionSteps.forEach((s, i) => {
    writeWrapped(`${i + 1}.  ${s}`, { size: 10, color: INK });
    y += 4;
  });

  addFooter();
  return doc;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
