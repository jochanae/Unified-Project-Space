/**
 * selah-chat-export — download a Companion chat as Markdown or PDF.
 *
 * Companion-only. Altar conversations are zero-trace and never reach this code.
 */

import jsPDF from "jspdf";

export interface ExportableMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function exportChatAsMarkdown(messages: ExportableMessage[]) {
  const lines: string[] = [];
  lines.push("# Selah ✦ — Companion Conversation");
  lines.push("");
  lines.push(`*Saved ${new Date().toLocaleString()}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const m of messages) {
    const speaker = m.role === "user" ? "**You**" : "**Selah**";
    lines.push(speaker);
    lines.push("");
    lines.push(m.content.trim());
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
  triggerDownload(blob, `selah-conversation_${timestamp()}.md`);
}

export function exportChatAsPDF(messages: ExportableMessage[]) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  // Title
  doc.setFont("times", "italic");
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text("Selah \u2726", margin, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(140, 140, 140);
  doc.text(`Companion conversation \u00b7 saved ${new Date().toLocaleString()}`, margin, y);
  y += 22;

  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  for (const m of messages) {
    const isUser = m.role === "user";
    const speaker = isUser ? "You" : "Selah \u2726";

    if (y > pageHeight - margin - 60) {
      doc.addPage();
      y = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(isUser ? 80 : 160, isUser ? 80 : 130, isUser ? 80 : 60);
    doc.text(speaker.toUpperCase(), margin, y);
    y += 14;

    doc.setFont(isUser ? "helvetica" : "times", isUser ? "normal" : "italic");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const lines = doc.splitTextToSize(m.content.trim(), maxWidth);
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 15;
    }
    y += 12;
  }

  doc.save(`selah-conversation_${timestamp()}.pdf`);
}
