import { useState, useRef } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, FileText, Loader2, Crown, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { toast } from 'sonner';
import type { BudgetEntry, Bill, SavingsGoal } from '@/hooks/useFinances';
import type { NetWorthItem } from '@/hooks/useNetWorth';
import {
  exportBudgetToCSV,
  exportBillsToCSV,
  exportSavingsGoalsToCSV,
  exportNetWorthToCSV,
  exportAllFinancesToCSV,
  exportFinancesToPDF,
} from '@/lib/financeExportUtils';
import {
  parseBudgetEntriesCSV,
  parseBillsCSV,
  parseSavingsGoalsCSV,
  parseNetWorthCSV,
  downloadBudgetTemplate,
  downloadBillsTemplate,
  downloadSavingsGoalsTemplate,
  downloadNetWorthTemplate,
} from '@/lib/financeImportUtils';

type ImportTarget = 'budget' | 'bills' | 'savings' | 'networth';

interface FinanceExportImportProps {
  entries: BudgetEntry[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  netWorthItems: NetWorthItem[];
  summary: {
    totalIncome: number;
    totalExpenses: number;
    totalBills: number;
    netCashFlow: number;
    totalSaved: number;
    netWorth: number;
    totalAssets: number;
    totalLiabilities: number;
  };
  onImportBudget: (entries: Parameters<typeof parseBudgetEntriesCSV>[0]) => void;
  onImportBills: (text: string) => void;
  onImportSavings: (text: string) => void;
  onImportNetWorth: (text: string) => void;
}

export function FinanceExportImport({
  entries,
  bills,
  savingsGoals,
  netWorthItems,
  summary,
  onImportBudget,
  onImportBills,
  onImportSavings,
  onImportNetWorth,
}: FinanceExportImportProps) {
  const { checkAccess } = useFeatureAccess();
  const hasAccess = checkAccess('exportReports');
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [importTarget, setImportTarget] = useState<ImportTarget | null>(null);
  const [importResult, setImportResult] = useState<{ count: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const guard = (fn: () => void | Promise<void>) => {
    if (!hasAccess) { setShowUpgrade(true); return; }
    fn();
  };

  const handleExport = async (fn: () => void | Promise<void>, label: string) => {
    guard(async () => {
      setIsExporting(true);
      try {
        await fn();
        toast.success(`${label} exported`);
      } catch {
        toast.error(`Failed to export ${label}`);
      } finally {
        setIsExporting(false);
      }
    });
  };

  const triggerImport = (target: ImportTarget) => {
    setImportTarget(target);
    setImportResult(null);
    setTimeout(() => fileRef.current?.click(), 100);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !importTarget) return;
    const text = await file.text();

    let count = 0;
    let errors: string[] = [];

    try {
      switch (importTarget) {
        case 'budget': {
          const r = parseBudgetEntriesCSV(text);
          errors = r.errors;
          count = r.entries.length;
          if (count > 0) onImportBudget(text);
          break;
        }
        case 'bills': {
          const r = parseBillsCSV(text);
          errors = r.errors;
          count = r.bills.length;
          if (count > 0) onImportBills(text);
          break;
        }
        case 'savings': {
          const r = parseSavingsGoalsCSV(text);
          errors = r.errors;
          count = r.goals.length;
          if (count > 0) onImportSavings(text);
          break;
        }
        case 'networth': {
          const r = parseNetWorthCSV(text);
          errors = r.errors;
          count = r.items.length;
          if (count > 0) onImportNetWorth(text);
          break;
        }
      }

      setImportResult({ count, errors });
      if (count > 0 && errors.length === 0) {
        toast.success(`Imported ${count} records`);
      } else if (count > 0) {
        toast.success(`Imported ${count} records (${errors.length} skipped)`);
      } else {
        toast.error('No valid records found');
      }
    } catch {
      toast.error('Failed to parse CSV file');
    }

    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const targetLabels: Record<ImportTarget, string> = {
    budget: 'Budget Entries',
    bills: 'Bills',
    savings: 'Savings Goals',
    networth: 'Net Worth Items',
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />

      <div className="flex gap-2">
        {/* Export */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Export
              {!hasAccess && <Crown className="h-3 w-3 ml-1.5 text-amber-500" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Export Format</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleExport(() => exportAllFinancesToCSV(entries, bills, savingsGoals, netWorthItems), 'All Finances CSV')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              All Finances (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport(() => exportFinancesToPDF(entries, bills, savingsGoals, netWorthItems, summary), 'Finances PDF')}>
              <FileText className="h-4 w-4 mr-2" />
              Full Report (PDF)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">Individual</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleExport(() => exportBudgetToCSV(entries), 'Budget CSV')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Budget Entries
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport(() => exportBillsToCSV(bills), 'Bills CSV')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Bills
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport(() => exportSavingsGoalsToCSV(savingsGoals), 'Goals CSV')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Savings Goals
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport(() => exportNetWorthToCSV(netWorthItems), 'Net Worth CSV')}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Net Worth
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Import */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Import CSV</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => triggerImport('budget')}>
              <Upload className="h-4 w-4 mr-2" />
              Budget Entries
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerImport('bills')}>
              <Upload className="h-4 w-4 mr-2" />
              Bills
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerImport('savings')}>
              <Upload className="h-4 w-4 mr-2" />
              Savings Goals
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => triggerImport('networth')}>
              <Upload className="h-4 w-4 mr-2" />
              Net Worth Items
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Download className="h-4 w-4 mr-2" />
                Download Templates
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={downloadBudgetTemplate}>Budget Template</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadBillsTemplate}>Bills Template</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadSavingsGoalsTemplate}>Savings Goals Template</DropdownMenuItem>
                <DropdownMenuItem onClick={downloadNetWorthTemplate}>Net Worth Template</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Import Result Dialog */}
      <Dialog open={!!importResult} onOpenChange={() => setImportResult(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {importResult && importResult.count > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-gain" />
              ) : (
                <AlertCircle className="h-5 w-5 text-loss" />
              )}
              Import {importTarget ? targetLabels[importTarget] : ''}
            </DialogTitle>
            <DialogDescription>
              {importResult?.count ?? 0} records imported successfully.
              {importResult && importResult.errors.length > 0 && ` ${importResult.errors.length} rows skipped.`}
            </DialogDescription>
          </DialogHeader>
          {importResult && importResult.errors.length > 0 && (
            <div className="max-h-40 overflow-auto text-sm text-muted-foreground space-y-1 bg-muted/50 rounded-lg p-3">
              {importResult.errors.map((err, i) => (
                <p key={i} className="text-loss text-xs">{err}</p>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        feature="Finance Export"
        requiredTier="pro"
        description="Export your financial data as PDF or CSV with the Pro plan."
      />
    </>
  );
}
