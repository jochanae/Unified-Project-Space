import { format } from "date-fns";

interface ExportData {
  selectedDate: Date;
  income: number;
  expenses: number;
  netCashFlow: number;
  savingsRate: number;
  budgetHealth: number;
  categories: { name: string; value: number }[];
  budgetStats: { onTrack: number; warning: number; overBudget: number };
  trendData: { month: string; income: number; expenses: number }[];
  goalsData: { current: number; target: number; monthly: number; monthsLeft: number };
}

export const exportToCSV = (data: ExportData): void => {
  const monthYear = format(data.selectedDate, "MMMM_yyyy");
  
  let csvContent = "Financial Report - " + format(data.selectedDate, "MMMM yyyy") + "\n\n";
  
  // Summary Section
  csvContent += "SUMMARY\n";
  csvContent += "Metric,Value\n";
  csvContent += `Total Income,$${data.income.toLocaleString()}\n`;
  csvContent += `Total Expenses,$${data.expenses.toLocaleString()}\n`;
  csvContent += `Net Cash Flow,$${data.netCashFlow.toLocaleString()}\n`;
  csvContent += `Savings Rate,${data.savingsRate}%\n`;
  csvContent += `Budget Health,${data.budgetHealth}%\n\n`;
  
  // Category Breakdown
  csvContent += "SPENDING BY CATEGORY\n";
  csvContent += "Category,Amount\n";
  data.categories.forEach(cat => {
    csvContent += `${cat.name},$${cat.value.toLocaleString()}\n`;
  });
  csvContent += "\n";
  
  // Budget Status
  csvContent += "BUDGET STATUS\n";
  csvContent += "Status,Count\n";
  csvContent += `On Track,${data.budgetStats.onTrack}\n`;
  csvContent += `Warning,${data.budgetStats.warning}\n`;
  csvContent += `Over Budget,${data.budgetStats.overBudget}\n\n`;
  
  // Monthly Trends
  csvContent += "MONTHLY TRENDS (Last 6 Months)\n";
  csvContent += "Month,Income,Expenses,Net\n";
  data.trendData.forEach(trend => {
    csvContent += `${trend.month},$${trend.income.toLocaleString()},$${trend.expenses.toLocaleString()},$${(trend.income - trend.expenses).toLocaleString()}\n`;
  });
  csvContent += "\n";
  
  // Savings Goals
  csvContent += "SAVINGS GOALS\n";
  csvContent += "Metric,Value\n";
  csvContent += `Current Savings,$${data.goalsData.current.toLocaleString()}\n`;
  csvContent += `Target Amount,$${data.goalsData.target.toLocaleString()}\n`;
  csvContent += `Monthly Contribution,$${data.goalsData.monthly.toLocaleString()}\n`;
  csvContent += `Months to Goal,${data.goalsData.monthsLeft}\n`;
  
  // Create and download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `financial_report_${monthYear}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportToPDF = (data: ExportData): void => {
  const monthYear = format(data.selectedDate, "MMMM yyyy");
  
  // Create a printable HTML document
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to export PDF");
    return;
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Financial Report - ${monthYear} | CoinsBloom</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px; 
          color: #1a1a1a;
          line-height: 1.6;
        }
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
        }
        .header { 
          text-align: center; 
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #10b981;
        }
        .header h1 { 
          color: #1e293b; 
          font-size: 24px;
          margin-bottom: 4px;
          font-weight: 600;
        }
        .header p { color: #666; font-size: 14px; }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 40px;
        }
        .summary-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .summary-card .label { 
          font-size: 12px; 
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .summary-card .value { 
          font-size: 24px; 
          font-weight: 700;
          color: #1e293b;
          margin-top: 4px;
        }
        .summary-card .value.positive { color: #10b981; }
        .summary-card .value.negative { color: #ef4444; }
        .section { margin-bottom: 30px; }
        .section h2 { 
          font-size: 18px;
          color: #1e293b;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        table { 
          width: 100%; 
          border-collapse: collapse;
          font-size: 14px;
        }
        th, td { 
          padding: 12px; 
          text-align: left; 
          border-bottom: 1px solid #e2e8f0;
        }
        th { 
          background: #f8fafc; 
          font-weight: 600;
          color: #64748b;
        }
        .text-right { text-align: right; }
        .footer { 
          margin-top: 40px; 
          text-align: center; 
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
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
        }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand-header">
          <div class="brand-logo">✨</div>
          <span class="brand-name">CoinsBloom</span>
        </div>
        <p class="brand-tagline">Smart Money Management for Everyone</p>
        <h1>Financial Report</h1>
        <p>${monthYear}</p>
      </div>
      
      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">Total Income</div>
          <div class="value positive">$${data.income.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Expenses</div>
          <div class="value negative">$${data.expenses.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Net Cash Flow</div>
          <div class="value ${data.netCashFlow >= 0 ? 'positive' : 'negative'}">$${data.netCashFlow.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Savings Rate</div>
          <div class="value">${data.savingsRate}%</div>
        </div>
        <div class="summary-card">
          <div class="label">Budget Health</div>
          <div class="value">${data.budgetHealth}%</div>
        </div>
        <div class="summary-card">
          <div class="label">Goals Progress</div>
          <div class="value">${data.goalsData.target > 0 ? Math.round((data.goalsData.current / data.goalsData.target) * 100) : 0}%</div>
        </div>
      </div>
      
      <div class="section">
        <h2>Spending by Category</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th class="text-right">Amount</th>
              <th class="text-right">% of Total</th>
            </tr>
          </thead>
          <tbody>
            ${data.categories.map(cat => `
              <tr>
                <td>${cat.name}</td>
                <td class="text-right">$${cat.value.toLocaleString()}</td>
                <td class="text-right">${data.expenses > 0 ? Math.round((cat.value / data.expenses) * 100) : 0}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <h2>Budget Performance</h2>
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th class="text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>✅ On Track</td>
              <td class="text-right">${data.budgetStats.onTrack}</td>
            </tr>
            <tr>
              <td>⚠️ Warning</td>
              <td class="text-right">${data.budgetStats.warning}</td>
            </tr>
            <tr>
              <td>🚨 Over Budget</td>
              <td class="text-right">${data.budgetStats.overBudget}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <h2>Monthly Trends (Last 6 Months)</h2>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th class="text-right">Income</th>
              <th class="text-right">Expenses</th>
              <th class="text-right">Net</th>
            </tr>
          </thead>
          <tbody>
            ${data.trendData.map(trend => `
              <tr>
                <td>${trend.month}</td>
                <td class="text-right">$${trend.income.toLocaleString()}</td>
                <td class="text-right">$${trend.expenses.toLocaleString()}</td>
                <td class="text-right" style="color: ${trend.income - trend.expenses >= 0 ? '#10b981' : '#ef4444'}">
                  $${(trend.income - trend.expenses).toLocaleString()}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <h2>Savings Goals</h2>
        <table>
          <tbody>
            <tr>
              <td>Current Savings</td>
              <td class="text-right">$${data.goalsData.current.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Target Amount</td>
              <td class="text-right">$${data.goalsData.target.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Monthly Contribution</td>
              <td class="text-right">$${data.goalsData.monthly.toLocaleString()}</td>
            </tr>
            <tr>
              <td>Months to Goal</td>
              <td class="text-right">${data.goalsData.monthsLeft}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="footer">
        <div class="footer-brand">
          <div class="footer-logo">✨</div>
          <span class="footer-text">Generated by CoinsBloom</span>
        </div>
        <p class="footer-meta">${format(new Date(), "PPP 'at' p")} • coinsbloom.com</p>
      </div>
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.print();
  };
};
