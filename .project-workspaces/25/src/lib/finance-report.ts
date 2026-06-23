import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Category = "tithe" | "offering" | "dues" | "other";
type Entry = {
  id: string;
  category: Category;
  amount_cents: number;
  recipient: string | null;
  memo: string | null;
  entry_date: string;
  verified: boolean;
};

const GOLD: [number, number, number] = [201, 168, 76]; // matches --gold token
const GOLD_SOFT: [number, number, number] = [240, 215, 140];
const INK: [number, number, number] = [20, 20, 22];
const MUTED: [number, number, number] = [120, 120, 128];

const CAT_LABEL: Record<Category, string> = {
  tithe: "Tithe",
  offering: "Offering",
  dues: "Dues",
  other: "Other",
};

const fmt = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export function generateAnnualReport(
  entries: Entry[],
  opts?: { year?: number; stewardName?: string },
) {
  const year = opts?.year ?? new Date().getUTCFullYear();
  const stewardName = opts?.stewardName ?? "Steward";

  const yearEntries = entries
    .filter((e) => e.entry_date.startsWith(String(year)))
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const totals: Record<Category, number> = { tithe: 0, offering: 0, dues: 0, other: 0 };
  let grand = 0;
  for (const e of yearEntries) {
    totals[e.category] += e.amount_cents;
    grand += e.amount_cents;
  }

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(...INK);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.6);
  doc.line(48, 110, pageW - 48, 110);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("STEWARDSHIP STATEMENT", 48, 48, { charSpace: 3 });

  doc.setFont("times", "normal");
  doc.setFontSize(28);
  doc.setTextColor(...GOLD_SOFT);
  doc.text(`Annual Report · ${year}`, 48, 82);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(180, 180, 180);
  doc.text(`Prepared for ${stewardName}`, 48, 100);

  // Summary block
  doc.setTextColor(...INK);
  doc.setFont("times", "normal");
  doc.setFontSize(11);
  doc.text("Total Contributions", 48, 150);

  doc.setFont("times", "normal");
  doc.setFontSize(36);
  doc.setTextColor(...GOLD);
  doc.text(fmt(grand), 48, 188);

  // Breakdown row
  const breakdownY = 220;
  const cats: Category[] = ["tithe", "offering", "dues", "other"];
  const colW = (pageW - 96) / cats.length;
  cats.forEach((c, i) => {
    const x = 48 + colW * i;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(CAT_LABEL[c].toUpperCase(), x, breakdownY, { charSpace: 2 });
    doc.setFont("times", "normal");
    doc.setFontSize(16);
    doc.setTextColor(...INK);
    doc.text(fmt(totals[c]), x, breakdownY + 22);
  });

  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.3);
  doc.line(48, breakdownY + 42, pageW - 48, breakdownY + 42);

  // Ledger table
  autoTable(doc, {
    startY: breakdownY + 60,
    head: [["Date", "Category", "Recipient", "Memo", "Status", "Amount"]],
    body: yearEntries.map((e) => [
      new Date(e.entry_date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      CAT_LABEL[e.category],
      e.recipient ?? "—",
      e.memo ?? "—",
      e.verified ? "Verified" : "Pending",
      fmt(e.amount_cents),
    ]),
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, textColor: INK },
    headStyles: {
      fillColor: INK,
      textColor: GOLD,
      fontStyle: "normal",
      fontSize: 8,
      cellPadding: 8,
    },
    alternateRowStyles: { fillColor: [250, 248, 242] },
    columnStyles: {
      0: { cellWidth: 78 },
      4: { cellWidth: 60 },
      5: { halign: "right", cellWidth: 78, textColor: GOLD },
    },
    margin: { left: 48, right: 48 },
    didDrawPage: () => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED);
      doc.text("SanctumIQ · Private steward ledger · Not a bank statement", pageW / 2, pageH - 24, {
        align: "center",
      });
    },
  });

  doc.save(`SanctumIQ-Stewardship-${year}.pdf`);
}
