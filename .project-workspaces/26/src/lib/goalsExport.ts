import { format } from "date-fns";
import { escapeHtml as esc } from "./htmlEscape";

interface Goal {
  id: string;
  title: string;
  description: string | null;
  target_amount: number;
  current_amount: number;
  goal_type: string;
  deadline: string | null;
  is_archived: boolean;
  created_at: string;
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

const goalTypeEmojis: Record<string, string> = {
  individual: "🎯",
  joint: "👫",
  family: "👨‍👩‍👧‍👦",
  friends: "👥",
  business: "💼",
  community: "🌍",
};

export const exportGoalsToCSV = (goals: Goal[]) => {
  const headers = [
    "Title",
    "Description",
    "Type",
    "Target Amount",
    "Current Amount",
    "Progress %",
    "Remaining",
    "Deadline",
    "Status",
    "Created",
  ];

  const rows = goals.map(g => {
    const progress = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100) : 0;
    return [
      g.title,
      g.description || "",
      g.goal_type,
      g.target_amount.toFixed(2),
      g.current_amount.toFixed(2),
      `${progress.toFixed(1)}%`,
      (g.target_amount - g.current_amount).toFixed(2),
      g.deadline ? format(new Date(g.deadline), "yyyy-MM-dd") : "",
      g.is_archived ? "Archived" : progress >= 100 ? "Completed" : "Active",
      format(new Date(g.created_at), "yyyy-MM-dd"),
    ];
  });

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `savings_goals_${format(new Date(), "yyyy-MM-dd")}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportGoalsToPDF = (goals: Goal[]) => {
  const activeGoals = goals.filter(g => !g.is_archived);
  const totalTarget = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalSaved = activeGoals.reduce((sum, g) => sum + g.current_amount, 0);
  const totalRemaining = totalTarget - totalSaved;
  const overallProgress = totalTarget > 0 ? ((totalSaved / totalTarget) * 100) : 0;
  const completedGoals = activeGoals.filter(g => g.current_amount >= g.target_amount).length;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Savings Goals Progress Report | CoinsBloom</title>
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
          border-bottom: 2px solid #8b5cf6;
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
        .goal-card {
          background: #f8fafc;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
          border: 1px solid #e2e8f0;
        }
        .goal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .goal-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e293b;
        }
        .goal-type {
          font-size: 14px;
          color: #64748b;
          text-transform: capitalize;
        }
        .goal-amounts {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          font-size: 14px;
        }
        .goal-saved { color: #10b981; font-weight: 600; }
        .goal-target { color: #64748b; }
        .progress-bar { 
          height: 12px; 
          background: #e2e8f0; 
          border-radius: 6px; 
          overflow: hidden;
        }
        .progress-fill { 
          height: 100%; 
          background: linear-gradient(90deg, #10b981, #059669);
          border-radius: 6px;
          transition: width 0.3s;
        }
        .goal-meta {
          margin-top: 12px;
          font-size: 12px;
          color: #64748b;
        }
        .completed-badge {
          background: #dcfce7;
          color: #16a34a;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }
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
        <h1>Savings Goals Progress Report</h1>
        <p class="date">${activeGoals.length} active goals • Generated: ${format(new Date(), "PPP")}</p>
      </div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="label">Total Target</div>
          <div class="value">$${totalTarget.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Total Saved</div>
          <div class="value positive">$${totalSaved.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Remaining</div>
          <div class="value">$${totalRemaining.toLocaleString()}</div>
        </div>
        <div class="summary-card">
          <div class="label">Overall Progress</div>
          <div class="value">${overallProgress.toFixed(1)}%</div>
        </div>
      </div>

      <h2>Goal Details</h2>
      ${activeGoals.map(g => {
        const progress = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100) : 0;
        const isCompleted = progress >= 100;
        const emoji = goalTypeEmojis[g.goal_type] || "🎯";
        
        return `
          <div class="goal-card">
            <div class="goal-header">
              <div>
                <span class="goal-title">${emoji} ${esc(g.title)}</span>
                <span class="goal-type"> • ${esc(g.goal_type)}</span>
              </div>
              ${isCompleted ? '<span class="completed-badge">✓ Completed</span>' : ''}
            </div>
            ${g.description ? `<p style="color: #64748b; font-size: 14px; margin-bottom: 12px;">${esc(g.description)}</p>` : ''}
            <div class="goal-amounts">
              <span class="goal-saved">$${g.current_amount.toLocaleString()} saved</span>
              <span class="goal-target">of $${g.target_amount.toLocaleString()}</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
            </div>
            <div class="goal-meta">
              ${progress.toFixed(1)}% complete
              ${g.deadline ? ` • Target date: ${format(new Date(g.deadline), "MMM d, yyyy")}` : ''}
              ${!isCompleted ? ` • $${(g.target_amount - g.current_amount).toLocaleString()} remaining` : ''}
            </div>
          </div>
        `;
      }).join("")}

      ${completedGoals > 0 ? `
        <p style="text-align: center; margin-top: 20px; color: #10b981; font-weight: 600;">
          🎉 ${completedGoals} goal${completedGoals > 1 ? 's' : ''} completed!
        </p>
      ` : ''}

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
