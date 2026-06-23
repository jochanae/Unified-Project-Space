import { format } from "date-fns";
import { escapeHtml as esc } from "./htmlEscape";

interface Transaction {
  id: string;
  title: string;
  category: string;
  transaction_date: string;
  amount: number;
  type: "income" | "expense";
  is_recurring: boolean;
  merchant: string | null;
  notes: string | null;
}

// Shared branding styles
const brandStyles = `
  .brand-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  .brand-logo {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 24px;
  }
  .brand-name {
    font-size: 32px;
    font-weight: 700;
    color: #10b981;
  }
  .brand-tagline {
    color: #64748b;
    font-size: 14px;
    margin-bottom: 8px;
    text-align: center;
  }
  .footer-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .footer-logo {
    width: 20px;
    height: 20px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 10px;
  }
  .footer-text {
    color: #10b981;
    font-weight: 600;
    font-size: 14px;
  }
  .footer-meta {
    color: #94a3b8;
    font-size: 12px;
    text-align: center;
  }
`;

export const exportTransactionsToCSV = (transactions: Transaction[]) => {
  const headers = [
    "Date",
    "Title",
    "Category",
    "Type",
    "Amount",
    "Merchant",
    "Recurring",
    "Notes",
  ];

  const rows = transactions.map(t => [
    format(new Date(t.transaction_date), "yyyy-MM-dd"),
    t.title,
    t.category,
    t.type,
    t.amount.toFixed(2),
    t.merchant || "",
    t.is_recurring ? "Yes" : "No",
    t.notes || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `transactions_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportTransactionsToPDF = (transactions: Transaction[]) => {
  const totalIncome = transactions.filter(t => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const netFlow = totalIncome - totalExpenses;

  // Category breakdown for expenses
  const categoryTotals: Record<string, number> = {};
  transactions.filter(t => t.type === "expense").forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transaction History Report | CoinsBloom</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px; 
          color: #1a1a1a;
          line-height: 1.6;
        }
        ${brandStyles}
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #3b82f6;
        }
        h1 { color: #1e293b; font-size: 24px; margin-bottom: 4px; font-weight: 600; }
        h2 { color: #1e293b; font-size: 18px; margin: 24px 0 12px; }
        .date { color: #64748b; font-size: 14px; }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 30px;
        }
        .summary-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 16px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .summary-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; }
        .summary-card .value { font-size: 24px; font-weight: 700; color: #1e293b; margin-top: 4px; }
        .summary-card .value.positive { color: #10b981; }
        .summary-card .value.negative { color: #ef4444; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; font-weight: 600; color: #64748b; }
        .text-right { text-align: right; }
        .income { color: #10b981; }
        .expense { color: #ef4444; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand-header">
          <div class="brand-logo">✨</div>
          <span class="brand-name">CoinsBloom</span>
        </div>
        <p class="brand-tagline">Smart Money Management for Everyone</p>
        <h1>Transaction History Report</h1>
        <p class="date">${transactions.length} transactions • Generated: ${format(new Date(), "PPP")}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">Total Income</div>
          <div class="value positive">$${totalIncome.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Expenses</div>
          <div class="value negative">$${totalExpenses.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Net Cash Flow</div>
          <div class="value ${netFlow >= 0 ? 'positive' : 'negative'}">$${netFlow.toLocaleString()}</div>
        </div>
      </div>

      ${Object.keys(categoryTotals).length > 0 ? `
        <h2>Spending by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th class="text-right">Amount</th>
              <th class="text-right">% of Expenses</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(categoryTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, amount]) => `
                <tr>
                  <td style="text-transform: capitalize;">${esc(cat)}</td>
                  <td class="text-right">$${amount.toLocaleString()}</td>
                  <td class="text-right">${totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : 0}%</td>
                </tr>
              `).join("")}
          </tbody>
        </table>
      ` : ""}

      <h2>Transaction Details</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Title</th>
            <th>Category</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.slice(0, 50).map(t => `
            <tr>
              <td>${format(new Date(t.transaction_date), "MMM d, yyyy")}</td>
              <td>${esc(t.title)}${t.is_recurring ? ' <span style="color: #64748b; font-size: 10px;">🔄</span>' : ''}</td>
              <td style="text-transform: capitalize;">${esc(t.category)}</td>
              <td class="text-right ${t.type}">
                ${t.type === "income" ? "+" : "-"}$${t.amount.toLocaleString()}
              </td>
            </tr>
          `).join("")}
          ${transactions.length > 50 ? `
            <tr>
              <td colspan="4" style="text-align: center; color: #64748b; font-style: italic;">
                ... and ${transactions.length - 50} more transactions
              </td>
            </tr>
          ` : ""}
        </tbody>
      </table>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
        <div class="footer-brand">
          <div class="footer-logo">✨</div>
          <span class="footer-text">Generated by CoinsBloom</span>
        </div>
        <p class="footer-meta">${format(new Date(), "PPP 'at' p")} • coinsbloom.com</p>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }
};
