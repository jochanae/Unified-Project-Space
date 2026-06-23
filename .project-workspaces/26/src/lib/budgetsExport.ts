import { format } from "date-fns";
import { escapeHtml as esc } from "./htmlEscape";

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
  is_active: boolean;
  start_date: string;
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

export const exportBudgetsToCSV = (budgets: Budget[]) => {
  const headers = [
    "Name",
    "Category",
    "Budget Amount",
    "Spent",
    "Remaining",
    "Percent Used",
    "Period",
    "Status",
    "Start Date",
  ];

  const rows = budgets.map(budget => {
    const remaining = budget.amount - budget.spent;
    const percentUsed = budget.amount > 0 ? ((budget.spent / budget.amount) * 100).toFixed(1) : "0";
    
    return [
      budget.name,
      budget.category,
      budget.amount.toFixed(2),
      budget.spent.toFixed(2),
      remaining.toFixed(2),
      `${percentUsed}%`,
      budget.period,
      budget.is_active ? "Active" : "Inactive",
      new Date(budget.start_date).toLocaleDateString(),
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `budgets_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportBudgetsToPDF = (budgets: Budget[]) => {
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallUsage = totalBudget > 0 ? ((totalSpent / totalBudget) * 100) : 0;

  // Category summary
  const categoryTotals: Record<string, { budget: number; spent: number }> = {};
  budgets.forEach(b => {
    if (!categoryTotals[b.category]) {
      categoryTotals[b.category] = { budget: 0, spent: 0 };
    }
    categoryTotals[b.category].budget += b.amount;
    categoryTotals[b.category].spent += b.spent;
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Budget Summary Report | CoinsBloom</title>
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
          border-bottom: 2px solid #f97316;
        }
        h1 { color: #1e293b; font-size: 24px; margin-bottom: 4px; font-weight: 600; }
        h2 { color: #1e293b; font-size: 18px; margin: 24px 0 12px; }
        .date { color: #64748b; font-size: 14px; }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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
        .progress-bar { 
          height: 8px; 
          background: #e2e8f0; 
          border-radius: 4px; 
          overflow: hidden;
          margin-top: 4px;
        }
        .progress-fill { height: 100%; border-radius: 4px; }
        .on-track { background: #10b981; }
        .warning { background: #f59e0b; }
        .over-budget { background: #ef4444; }
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
        <h1>Budget Summary Report</h1>
        <p class="date">Generated: ${format(new Date(), "PPP")}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">Total Budget</div>
          <div class="value">$${totalBudget.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Spent</div>
          <div class="value negative">$${totalSpent.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Remaining</div>
          <div class="value positive">$${totalRemaining.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Usage</div>
          <div class="value">${overallUsage.toFixed(1)}%</div>
        </div>
      </div>

      <h2>Budgets by Category</h2>
      <table>
        <thead>
          <tr>
            <th>Category</th>
            <th class="text-right">Budget</th>
            <th class="text-right">Spent</th>
            <th class="text-right">Remaining</th>
            <th class="text-right">Usage</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(categoryTotals).map(([cat, data]) => {
            const usage = data.budget > 0 ? ((data.spent / data.budget) * 100) : 0;
            const statusClass = usage > 100 ? 'over-budget' : usage > 80 ? 'warning' : 'on-track';
            return `
              <tr>
                <td style="text-transform: capitalize;">${esc(cat)}</td>
                <td class="text-right">$${data.budget.toLocaleString()}</td>
                <td class="text-right">$${data.spent.toLocaleString()}</td>
                <td class="text-right">$${(data.budget - data.spent).toLocaleString()}</td>
                <td class="text-right">
                  ${usage.toFixed(1)}%
                  <div class="progress-bar"><div class="progress-fill ${statusClass}" style="width: ${Math.min(usage, 100)}%"></div></div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>

      <h2>All Budgets</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th class="text-right">Budget</th>
            <th class="text-right">Spent</th>
            <th class="text-right">Usage</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${budgets.map(b => {
            const usage = b.amount > 0 ? ((b.spent / b.amount) * 100) : 0;
            const statusClass = usage > 100 ? 'over-budget' : usage > 80 ? 'warning' : 'on-track';
            return `
              <tr>
                <td>${esc(b.name)}</td>
                <td style="text-transform: capitalize;">${esc(b.category)}</td>
                <td class="text-right">$${b.amount.toLocaleString()}</td>
                <td class="text-right">$${b.spent.toLocaleString()}</td>
                <td class="text-right">${usage.toFixed(1)}%</td>
                <td><span style="color: ${usage > 100 ? '#ef4444' : usage > 80 ? '#f59e0b' : '#10b981'}">
                  ${usage > 100 ? '🚨 Over' : usage > 80 ? '⚠️ Warning' : '✅ On Track'}
                </span></td>
              </tr>
            `;
          }).join("")}
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

export const exportBudgetSummaryToCSV = (budgets: Budget[]) => {
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;

  // Category summary
  const categoryTotals: Record<string, { budget: number; spent: number }> = {};
  budgets.forEach(b => {
    if (!categoryTotals[b.category]) {
      categoryTotals[b.category] = { budget: 0, spent: 0 };
    }
    categoryTotals[b.category].budget += b.amount;
    categoryTotals[b.category].spent += b.spent;
  });

  const summaryRows = [
    ["Budget Summary Report", ""],
    ["Generated", new Date().toLocaleString()],
    ["", ""],
    ["Overall Summary", ""],
    ["Total Budget", `$${totalBudget.toFixed(2)}`],
    ["Total Spent", `$${totalSpent.toFixed(2)}`],
    ["Total Remaining", `$${totalRemaining.toFixed(2)}`],
    ["Overall Usage", `${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%`],
    ["", ""],
    ["By Category", "Budget", "Spent", "Remaining", "Usage"],
    ...Object.entries(categoryTotals).map(([cat, data]) => [
      cat.charAt(0).toUpperCase() + cat.slice(1),
      `$${data.budget.toFixed(2)}`,
      `$${data.spent.toFixed(2)}`,
      `$${(data.budget - data.spent).toFixed(2)}`,
      `${data.budget > 0 ? ((data.spent / data.budget) * 100).toFixed(1) : 0}%`,
    ]),
  ];

  const csvContent = summaryRows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `budget_summary_${new Date().toISOString().split("T")[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
