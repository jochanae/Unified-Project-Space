import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { getLogoBase64 } from '@/lib/logoBase64';
import type { BudgetEntry, Bill, SavingsGoal } from '@/hooks/useFinances';
import type { NetWorthItem } from '@/hooks/useNetWorth';

const fmt = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(v);

/** Get natural dimensions of a base64-encoded image */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ─── CSV EXPORTS ────────────────────────────────────────────────

export function exportBudgetToCSV(entries: BudgetEntry[]) {
  const headers = 'Type,Category,Description,Amount,Date,Recurring,Interval';
  const rows = entries.map(e => [
    e.type,
    e.category,
    `"${(e.description || '').replace(/"/g, '""')}"`,
    e.amount,
    e.entry_date,
    e.is_recurring ? 'yes' : 'no',
    e.recurring_interval || '',
  ].join(','));
  downloadFile([headers, ...rows].join('\n'), `budget_entries_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

export function exportBillsToCSV(bills: Bill[]) {
  const headers = 'Name,Amount,Due Day,Category,Autopay,Paid This Month';
  const rows = bills.map(b => [
    `"${b.name.replace(/"/g, '""')}"`,
    b.amount,
    b.due_day,
    b.category,
    b.is_autopay ? 'yes' : 'no',
    b.is_paid_this_month ? 'yes' : 'no',
  ].join(','));
  downloadFile([headers, ...rows].join('\n'), `bills_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

export function exportSavingsGoalsToCSV(goals: SavingsGoal[]) {
  const headers = 'Title,Emoji,Target Amount,Current Amount,Deadline,Status';
  const rows = goals.map(g => [
    `"${g.title.replace(/"/g, '""')}"`,
    g.emoji,
    g.target_amount,
    g.current_amount,
    g.deadline || '',
    g.status,
  ].join(','));
  downloadFile([headers, ...rows].join('\n'), `savings_goals_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

export function exportNetWorthToCSV(items: NetWorthItem[]) {
  const headers = 'Type,Category,Name,Amount,Notes,Review Frequency';
  const rows = items.map(i => [
    i.type,
    i.category,
    `"${i.name.replace(/"/g, '""')}"`,
    i.amount,
    `"${(i.notes || '').replace(/"/g, '""')}"`,
    i.review_frequency || '',
  ].join(','));
  downloadFile([headers, ...rows].join('\n'), `net_worth_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

/** Export ALL finance data as a single combined CSV */
export function exportAllFinancesToCSV(
  entries: BudgetEntry[],
  bills: Bill[],
  goals: SavingsGoal[],
  netWorthItems: NetWorthItem[],
) {
  const lines: string[] = [
    'IntoIQ - My Finances Export',
    `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
    '',
    '=== BUDGET ENTRIES ===',
    'Type,Category,Description,Amount,Date,Recurring,Interval',
    ...entries.map(e => [
      e.type, e.category, `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount, e.entry_date, e.is_recurring ? 'yes' : 'no', e.recurring_interval || '',
    ].join(',')),
    '',
    '=== BILLS ===',
    'Name,Amount,Due Day,Category,Autopay,Paid This Month',
    ...bills.map(b => [
      `"${b.name.replace(/"/g, '""')}"`, b.amount, b.due_day, b.category,
      b.is_autopay ? 'yes' : 'no', b.is_paid_this_month ? 'yes' : 'no',
    ].join(',')),
    '',
    '=== SAVINGS GOALS ===',
    'Title,Emoji,Target Amount,Current Amount,Deadline,Status',
    ...goals.map(g => [
      `"${g.title.replace(/"/g, '""')}"`, g.emoji, g.target_amount, g.current_amount,
      g.deadline || '', g.status,
    ].join(',')),
    '',
    '=== NET WORTH ===',
    'Type,Category,Name,Amount,Notes,Review Frequency',
    ...netWorthItems.map(i => [
      i.type, i.category, `"${i.name.replace(/"/g, '""')}"`, i.amount,
      `"${(i.notes || '').replace(/"/g, '""')}"`, i.review_frequency || '',
    ].join(',')),
  ];
  downloadFile(lines.join('\n'), `my_finances_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

// ─── PDF EXPORT ─────────────────────────────────────────────────

export async function exportFinancesToPDF(
  entries: BudgetEntry[],
  bills: Bill[],
  goals: SavingsGoal[],
  netWorthItems: NetWorthItem[],
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalBills: number;
    netCashFlow: number;
    totalSaved: number;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
  },
) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  const logoBase64 = await getLogoBase64();
  if (logoBase64) {
    const logoSize = await getImageDimensions(logoBase64);
    const logoHeight = 12;
    const logoWidth = logoSize ? (logoSize.width / logoSize.height) * logoHeight : 24;
    doc.addImage(logoBase64, 'PNG', 14, 10, logoWidth, logoHeight);
    y = 10 + logoHeight + 10;
  }

  // Title
  doc.setFontSize(22);
  doc.setTextColor(33, 33, 33);
  doc.text('My Finances Report', pw / 2, y, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy')}`, pw / 2, y + 8, { align: 'center' });
  y += 20;

  // ── Summary ────────────────────────
  const heading = (label: string) => {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.setTextColor(33, 33, 33);
    doc.text(label, 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
  };

  heading('Financial Summary');
  const col2 = 110;
  doc.text(`Income: ${fmt(summary.totalIncome)}`, 14, y);
  doc.text(`Expenses: ${fmt(summary.totalExpenses)}`, col2, y); y += 6;
  doc.text(`Bills: ${fmt(summary.totalBills)}`, 14, y);
  doc.text(`Net Cash Flow: ${fmt(summary.netCashFlow)}`, col2, y); y += 6;
  doc.text(`Net Worth: ${fmt(summary.netWorth)}`, 14, y);
  doc.text(`Total Saved: ${fmt(summary.totalSaved)}`, col2, y); y += 6;
  doc.text(`Total Assets: ${fmt(summary.totalAssets)}`, 14, y);
  doc.text(`Total Liabilities: ${fmt(summary.totalLiabilities)}`, col2, y); y += 12;

  // ── Budget Entries ─────────────────
  heading('Budget Entries');
  const bCols = ['Date', 'Type', 'Category', 'Description', 'Amount'];
  const bWidths = [22, 16, 24, 70, 28];
  let x = 14;
  doc.setTextColor(100, 100, 100);
  bCols.forEach((c, i) => { doc.text(c, x, y); x += bWidths[i]; });
  y += 5;
  doc.setTextColor(60, 60, 60);

  entries.slice(0, 40).forEach(e => {
    if (y > 275) { doc.addPage(); y = 20; }
    x = 14;
    const row = [e.entry_date, e.type, e.category, (e.description || '').slice(0, 35), fmt(e.amount)];
    row.forEach((cell, i) => { doc.text(cell, x, y); x += bWidths[i]; });
    y += 5;
  });
  if (entries.length > 40) { doc.text(`... and ${entries.length - 40} more entries`, 14, y); y += 5; }
  y += 8;

  // ── Bills ──────────────────────────
  heading('Bills');
  const biCols = ['Name', 'Amount', 'Due', 'Category', 'Autopay', 'Paid'];
  const biW = [40, 25, 14, 28, 18, 14];
  x = 14;
  doc.setTextColor(100, 100, 100);
  biCols.forEach((c, i) => { doc.text(c, x, y); x += biW[i]; });
  y += 5;
  doc.setTextColor(60, 60, 60);

  bills.forEach(b => {
    if (y > 275) { doc.addPage(); y = 20; }
    x = 14;
    [b.name.slice(0, 20), fmt(b.amount), String(b.due_day), b.category, b.is_autopay ? 'Yes' : 'No', b.is_paid_this_month ? 'Yes' : '--']
      .forEach((cell, i) => { doc.text(cell, x, y); x += biW[i]; });
    y += 5;
  });
  y += 8;

  // ── Savings Goals ──────────────────
  heading('Savings Goals');
  goals.forEach(g => {
    if (y > 275) { doc.addPage(); y = 20; }
    const pct = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(0) : '0';
    // Strip emoji — jsPDF default font cannot render Unicode emoji
    const title = g.title || 'Untitled';
    doc.text(`${title}: ${fmt(g.current_amount)} / ${fmt(g.target_amount)} (${pct}%)`, 14, y);
    y += 5;
  });
  y += 8;

  // ── Net Worth ──────────────────────
  heading('Net Worth Items');
  const nCols = ['Type', 'Category', 'Name', 'Amount'];
  const nW = [18, 30, 60, 30];
  x = 14;
  doc.setTextColor(100, 100, 100);
  nCols.forEach((c, i) => { doc.text(c, x, y); x += nW[i]; });
  y += 5;
  doc.setTextColor(60, 60, 60);

  netWorthItems.forEach(item => {
    if (y > 275) { doc.addPage(); y = 20; }
    x = 14;
    [item.type, item.category, item.name.slice(0, 30), fmt(item.amount)]
      .forEach((cell, i) => { doc.text(cell, x, y); x += nW[i]; });
    y += 5;
  });

  doc.save(`my_finances_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
