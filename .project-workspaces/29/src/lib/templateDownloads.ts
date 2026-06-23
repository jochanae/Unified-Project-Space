import { format } from 'date-fns';

/**
 * Download a CSV template for the Trade Journal.
 * Columns match the import format exactly so users can fill in offline and re-import.
 */
export function downloadTradeTemplate() {
  const headers = 'Symbol,Type,Entry Price,Exit Price,Quantity,Entry Date,Exit Date,Status,Notes';
  const exampleRows = [
    'AAPL,long,175.50,182.30,10,2024-01-15,2024-01-22,closed,Earnings play',
    'MSFT,long,378.00,,5,2024-01-18,,,Holding for AI momentum',
  ];

  const csvContent = [headers, ...exampleRows].join('\n');
  downloadFile(csvContent, `intoiq_trade_template_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

/**
 * Download a CSV template for the Financial Plan.
 * Columns mirror the plan item fields so users can bulk-import plan items.
 */
export function downloadPlanTemplate() {
  const headers = 'Section,Title,Description,Priority,Status,Target Date,Notes';
  const exampleRows = [
    'Foundations,Build emergency fund,Save 3-6 months of expenses,high,not_started,2024-06-01,Starting with $500/month',
    'Wealth Building,Open brokerage account,Research low-cost brokers,medium,in_progress,,Looking at Fidelity and Schwab',
    'Risk Management,Review insurance policies,Health / auto / life,low,not_started,,',
  ];

  const csvContent = [headers, ...exampleRows].join('\n');
  downloadFile(csvContent, `intoiq_plan_template_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
