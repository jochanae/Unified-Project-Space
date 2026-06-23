import type { NewBudgetEntry, NewBill, NewSavingsGoal } from '@/hooks/useFinances';
import type { NewNetWorthItem } from '@/hooks/useNetWorth';

/** Generic CSV line parser (handles quoted commas) */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): string[][] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(parseCsvLine);
}

// ─── BUDGET ENTRIES ─────────────────────────────────────────────

export function parseBudgetEntriesCSV(text: string): { entries: NewBudgetEntry[]; errors: string[] } {
  const rows = parseCsv(text);
  const entries: NewBudgetEntry[] = [];
  const errors: string[] = [];

  // Skip header row
  const dataRows = rows.length > 0 && rows[0][0]?.toLowerCase().includes('type') ? rows.slice(1) : rows;

  dataRows.forEach((cols, idx) => {
    if (cols.length < 4) { errors.push(`Row ${idx + 2}: not enough columns`); return; }
    const type = cols[0].toLowerCase();
    if (type !== 'income' && type !== 'expense') { errors.push(`Row ${idx + 2}: type must be income or expense`); return; }
    const amount = parseFloat(cols[3]);
    if (isNaN(amount) || amount <= 0) { errors.push(`Row ${idx + 2}: invalid amount`); return; }

    entries.push({
      type: type as 'income' | 'expense',
      category: cols[1] || 'other',
      description: cols[2] || null,
      amount,
      entry_date: cols[4] || new Date().toISOString().split('T')[0],
      is_recurring: cols[5]?.toLowerCase() === 'yes',
      recurring_interval: cols[6] || null,
    });
  });

  return { entries, errors };
}

// ─── BILLS ──────────────────────────────────────────────────────

export function parseBillsCSV(text: string): { bills: NewBill[]; errors: string[] } {
  const rows = parseCsv(text);
  const bills: NewBill[] = [];
  const errors: string[] = [];

  const dataRows = rows.length > 0 && rows[0][0]?.toLowerCase().includes('name') ? rows.slice(1) : rows;

  dataRows.forEach((cols, idx) => {
    if (cols.length < 2) { errors.push(`Row ${idx + 2}: not enough columns`); return; }
    const name = cols[0];
    const amount = parseFloat(cols[1]);
    if (!name) { errors.push(`Row ${idx + 2}: name is required`); return; }
    if (isNaN(amount) || amount <= 0) { errors.push(`Row ${idx + 2}: invalid amount`); return; }

    bills.push({
      name,
      amount,
      due_day: parseInt(cols[2]) || 1,
      category: cols[3] || 'other',
      is_autopay: cols[4]?.toLowerCase() === 'yes',
    });
  });

  return { bills, errors };
}

// ─── SAVINGS GOALS ──────────────────────────────────────────────

export function parseSavingsGoalsCSV(text: string): { goals: NewSavingsGoal[]; errors: string[] } {
  const rows = parseCsv(text);
  const goals: NewSavingsGoal[] = [];
  const errors: string[] = [];

  const dataRows = rows.length > 0 && rows[0][0]?.toLowerCase().includes('title') ? rows.slice(1) : rows;

  dataRows.forEach((cols, idx) => {
    if (cols.length < 3) { errors.push(`Row ${idx + 2}: not enough columns`); return; }
    const title = cols[0];
    const target = parseFloat(cols[2]);
    if (!title) { errors.push(`Row ${idx + 2}: title is required`); return; }
    if (isNaN(target) || target <= 0) { errors.push(`Row ${idx + 2}: invalid target amount`); return; }

    goals.push({
      title,
      emoji: cols[1] || '🎯',
      target_amount: target,
      current_amount: parseFloat(cols[3]) || 0,
      deadline: cols[4] || null,
    });
  });

  return { goals, errors };
}

// ─── NET WORTH ──────────────────────────────────────────────────

export function parseNetWorthCSV(text: string): { items: NewNetWorthItem[]; errors: string[] } {
  const rows = parseCsv(text);
  const items: NewNetWorthItem[] = [];
  const errors: string[] = [];

  const dataRows = rows.length > 0 && rows[0][0]?.toLowerCase().includes('type') ? rows.slice(1) : rows;

  dataRows.forEach((cols, idx) => {
    if (cols.length < 4) { errors.push(`Row ${idx + 2}: not enough columns`); return; }
    const type = cols[0].toLowerCase();
    if (type !== 'asset' && type !== 'liability') { errors.push(`Row ${idx + 2}: type must be asset or liability`); return; }
    const amount = parseFloat(cols[3]);
    if (isNaN(amount) || amount < 0) { errors.push(`Row ${idx + 2}: invalid amount`); return; }

    items.push({
      type: type as 'asset' | 'liability',
      category: cols[1] || 'other',
      name: cols[2] || 'Untitled',
      amount,
      notes: cols[4] || null,
      review_frequency: cols[5] || 'quarterly',
    });
  });

  return { items, errors };
}

// ─── CSV TEMPLATES ──────────────────────────────────────────────

function dl(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function downloadBudgetTemplate() {
  dl(
    'Type,Category,Description,Amount,Date,Recurring,Interval\nincome,salary,Monthly paycheck,5000,2026-02-01,yes,monthly\nexpense,food,Grocery run,120,2026-02-03,no,',
    'budget_template.csv',
  );
}

export function downloadBillsTemplate() {
  dl(
    'Name,Amount,Due Day,Category,Autopay\nRent,1500,1,rent,no\nNetflix,15.99,15,subscriptions,yes',
    'bills_template.csv',
  );
}

export function downloadSavingsGoalsTemplate() {
  dl(
    'Title,Emoji,Target Amount,Current Amount,Deadline\nEmergency Fund,🏦,10000,2500,2026-12-31\nVacation,✈️,3000,800,2026-08-01',
    'savings_goals_template.csv',
  );
}

export function downloadNetWorthTemplate() {
  dl(
    'Type,Category,Name,Amount,Notes,Review Frequency\nasset,cash_savings,Checking Account,5000,Primary bank,monthly\nliability,credit_cards,Chase Visa,2400,Paying down,monthly',
    'net_worth_template.csv',
  );
}
