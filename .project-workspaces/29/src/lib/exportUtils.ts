import jsPDF from 'jspdf';
import { Trade } from '@/hooks/useTrades';
import { format, parseISO } from 'date-fns';
import { getLogoBase64 } from '@/lib/logoBase64';

interface AnalyticsStats {
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  avgHoldTime: number;
  expectancy: number;
  riskRewardRatio: number;
  winStreak: number;
  loseStreak: number;
}

interface TradeStats {
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfitLoss: number;
  winRate: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Export trades to CSV
export function exportTradesToCSV(trades: Trade[], filename?: string) {
  const headers = ['Symbol', 'Type', 'Entry Price', 'Exit Price', 'Quantity', 'Entry Date', 'Exit Date', 'P&L', 'Status', 'Notes'];
  const csvContent = [
    headers.join(','),
    ...trades.map(trade => [
      trade.symbol,
      trade.trade_type,
      trade.entry_price,
      trade.exit_price || '',
      trade.quantity,
      format(parseISO(trade.entry_date), 'yyyy-MM-dd'),
      trade.exit_date ? format(parseISO(trade.exit_date), 'yyyy-MM-dd') : '',
      trade.profit_loss || '',
      trade.status,
      `"${(trade.notes || '').replace(/"/g, '""')}"`,
    ].join(','))
  ].join('\n');

  downloadFile(csvContent, filename || `trades_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

// Export trades to PDF
export async function exportTradesToPDF(trades: Trade[], stats: TradeStats, filename?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo
  const logoBase64 = await getLogoBase64();
  let startY = 20;
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', (pageWidth - 36) / 2, 8, 36, 12);
    startY = 28;
  }
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(33, 33, 33);
  doc.text('Trade Journal Report', pageWidth / 2, startY, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, 28, { align: 'center' });
  
  // Summary Stats
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text('Summary', 14, 42);
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const summaryY = 50;
  doc.text(`Total Trades: ${stats.totalTrades}`, 14, summaryY);
  doc.text(`Open: ${stats.openTrades} | Closed: ${stats.closedTrades}`, 14, summaryY + 6);
  doc.text(`Win Rate: ${stats.winRate.toFixed(1)}%`, 14, summaryY + 12);
  doc.text(`Total P&L: ${formatCurrency(stats.totalProfitLoss)}`, 14, summaryY + 18);
  doc.text(`Winning: ${stats.winningTrades} | Losing: ${stats.losingTrades}`, 14, summaryY + 24);
  
  // Trades table
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text('Trade Details', 14, summaryY + 40);
  
  // Table header
  const tableY = summaryY + 48;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const columns = ['Symbol', 'Type', 'Entry', 'Exit', 'Qty', 'P&L', 'Status'];
  const colWidths = [25, 18, 25, 25, 18, 30, 20];
  let xPos = 14;
  columns.forEach((col, i) => {
    doc.text(col, xPos, tableY);
    xPos += colWidths[i];
  });
  
  // Table rows
  doc.setTextColor(60, 60, 60);
  let yPos = tableY + 6;
  const maxRows = 25; // Per page
  
  trades.slice(0, 50).forEach((trade, index) => {
    if (index > 0 && index % maxRows === 0) {
      doc.addPage();
      yPos = 20;
    }
    
    xPos = 14;
    const row = [
      trade.symbol,
      trade.trade_type.toUpperCase(),
      formatCurrency(trade.entry_price),
      trade.exit_price ? formatCurrency(trade.exit_price) : '-',
      trade.quantity.toString(),
      trade.profit_loss ? formatCurrency(trade.profit_loss) : '-',
      trade.status,
    ];
    
    row.forEach((cell, i) => {
      doc.text(cell, xPos, yPos);
      xPos += colWidths[i];
    });
    yPos += 5;
  });
  
  if (trades.length > 50) {
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`... and ${trades.length - 50} more trades`, 14, yPos + 5);
  }
  
  doc.save(filename || `trade_journal_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// Export analytics to CSV
export function exportAnalyticsToCSV(trades: Trade[], stats: AnalyticsStats, filename?: string) {
  const closedTrades = trades.filter(t => t.status === 'closed');
  
  // Summary section
  const summaryLines = [
    'IntoIQ Analytics Report',
    `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
    '',
    'Performance Metrics',
    `Sharpe Ratio,${stats.sharpeRatio.toFixed(2)}`,
    `Profit Factor,${stats.profitFactor === Infinity ? 'Infinite' : stats.profitFactor.toFixed(2)}`,
    `Max Drawdown,${formatCurrency(stats.maxDrawdown)} (${stats.maxDrawdownPercent.toFixed(1)}%)`,
    `Average Win,${formatCurrency(stats.avgWin)}`,
    `Average Loss,${formatCurrency(stats.avgLoss)}`,
    `Risk/Reward Ratio,${stats.riskRewardRatio === Infinity ? 'Infinite' : stats.riskRewardRatio.toFixed(2)}`,
    `Expectancy,${formatCurrency(stats.expectancy)}`,
    `Avg Hold Time,${stats.avgHoldTime.toFixed(1)} days`,
    `Best Win Streak,${stats.winStreak} trades`,
    `Worst Loss Streak,${stats.loseStreak} trades`,
    '',
    'Closed Trades',
    'Symbol,Type,Entry Price,Exit Price,Quantity,Entry Date,Exit Date,P&L',
  ];
  
  closedTrades.forEach(trade => {
    summaryLines.push([
      trade.symbol,
      trade.trade_type,
      trade.entry_price,
      trade.exit_price || '',
      trade.quantity,
      format(parseISO(trade.entry_date), 'yyyy-MM-dd'),
      trade.exit_date ? format(parseISO(trade.exit_date), 'yyyy-MM-dd') : '',
      trade.profit_loss || '',
    ].join(','));
  });
  
  downloadFile(summaryLines.join('\n'), filename || `analytics_${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

// Export analytics to PDF
export async function exportAnalyticsToPDF(trades: Trade[], stats: AnalyticsStats, tradeStats: TradeStats, filename?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Logo
  const logoBase64 = await getLogoBase64();
  let startY = 20;
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', (pageWidth - 36) / 2, 8, 36, 12);
    startY = 28;
  }
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(33, 33, 33);
  doc.text('Performance Analytics Report', pageWidth / 2, startY, { align: 'center' });
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy')}`, pageWidth / 2, 28, { align: 'center' });
  
  // Key Metrics Section
  doc.setFontSize(14);
  doc.setTextColor(33, 33, 33);
  doc.text('Key Performance Metrics', 14, 45);
  
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  
  const metricsY = 55;
  const col1X = 14;
  const col2X = 110;
  
  // Left column
  doc.text(`Sharpe Ratio: ${stats.sharpeRatio.toFixed(2)}`, col1X, metricsY);
  doc.text(`Profit Factor: ${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}`, col1X, metricsY + 8);
  doc.text(`Max Drawdown: ${formatCurrency(stats.maxDrawdown)}`, col1X, metricsY + 16);
  doc.text(`Max Drawdown %: ${stats.maxDrawdownPercent.toFixed(1)}%`, col1X, metricsY + 24);
  doc.text(`Expectancy: ${formatCurrency(stats.expectancy)}/trade`, col1X, metricsY + 32);
  
  // Right column
  doc.text(`Average Win: ${formatCurrency(stats.avgWin)}`, col2X, metricsY);
  doc.text(`Average Loss: ${formatCurrency(stats.avgLoss)}`, col2X, metricsY + 8);
  doc.text(`Risk/Reward: ${stats.riskRewardRatio === Infinity ? '∞' : `1:${stats.riskRewardRatio.toFixed(1)}`}`, col2X, metricsY + 16);
  doc.text(`Avg Hold Time: ${stats.avgHoldTime.toFixed(1)} days`, col2X, metricsY + 24);
  doc.text(`Win Rate: ${tradeStats.winRate.toFixed(1)}%`, col2X, metricsY + 32);
  
  // Streak info
  doc.setFontSize(14);
  doc.text('Streak Analysis', 14, metricsY + 50);
  doc.setFontSize(10);
  doc.text(`Best Win Streak: ${stats.winStreak} consecutive wins`, col1X, metricsY + 58);
  doc.text(`Worst Loss Streak: ${stats.loseStreak} consecutive losses`, col1X, metricsY + 66);
  
  // Trade summary
  doc.setFontSize(14);
  doc.text('Trade Summary', 14, metricsY + 84);
  doc.setFontSize(10);
  doc.text(`Total Trades: ${tradeStats.totalTrades}`, col1X, metricsY + 92);
  doc.text(`Winning Trades: ${tradeStats.winningTrades}`, col1X, metricsY + 100);
  doc.text(`Losing Trades: ${tradeStats.losingTrades}`, col1X, metricsY + 108);
  doc.text(`Total P&L: ${formatCurrency(tradeStats.totalProfitLoss)}`, col1X, metricsY + 116);
  
  doc.save(filename || `analytics_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
