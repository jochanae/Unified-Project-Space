import { useState, useEffect } from "react";
import { Menu, Sun, Moon, ChevronDown, Lightbulb, Users, Camera, Upload, Download, Calculator, FileText, Monitor, X, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import coinsbloomLogo from "@/assets/coinsbloom-logo.png";
import { MainMenuDrawer } from "@/components/navigation/MainMenuDrawer";
import { AvatarMenu } from "@/components/navigation/AvatarMenu";
import { NotificationCenter } from "@/components/navigation/NotificationCenter";
import { CSVImportModal } from "@/components/shared/CSVImportModal";
import { ReceiptScannerModal } from "@/components/transactions/ReceiptScannerModal";
import { QuickCalculatorModal } from "@/components/dashboard/QuickCalculatorModal";
import { QuickNotesModal } from "@/components/dashboard/QuickNotesModal";
import { DashboardBlobs } from "@/components/DashboardBlobs";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { PoweredByBadge } from "@/components/branding/PoweredByBadge";
import { exportTransactionsToCSV, exportTransactionsToPDF } from "@/lib/transactionsExport";
import { exportGoalsToCSV, exportGoalsToPDF } from "@/lib/goalsExport";
import { exportBudgetsToCSV, exportBudgetsToPDF } from "@/lib/budgetsExport";
import { exportBillsToPDF } from "@/lib/billsExport";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export function DashboardHeader() {
  const navigate = useNavigate();
  const { partner, isPartnerBranded } = usePartnerBranding();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark' | 'system') || 'system';
  });
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importType, setImportType] = useState<'transactions' | 'accounts' | 'debts' | 'bills'>('transactions');
  const [showImportTypeMenu, setShowImportTypeMenu] = useState(false);
  const [showExportCSVMenu, setShowExportCSVMenu] = useState(false);
  const [showExportPDFMenu, setShowExportPDFMenu] = useState(false);
  const [receiptScannerOpen, setReceiptScannerOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const handleImportClick = () => {
    setShowImportTypeMenu(true);
  };

  const handleSelectImportType = (type: 'transactions' | 'accounts' | 'debts' | 'bills') => {
    setImportType(type);
    setShowImportTypeMenu(false);
    setImportModalOpen(true);
  };

  const handleExportCSV = async (type: 'transactions' | 'accounts' | 'debts' | 'bills' | 'budgets' | 'goals') => {
    setShowExportCSVMenu(false);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      if (type === 'transactions') {
        const result = await supabase.from('transactions').select('*');
        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) {
          toast.info('No transactions to export');
          return;
        }
        exportTransactionsToCSV(result.data as any);
        toast.success(`Exported ${result.data.length} transactions`);
      } else if (type === 'budgets') {
        const result = await supabase.from('budgets').select('*');
        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) {
          toast.info('No budgets to export');
          return;
        }
        exportBudgetsToCSV(result.data as any);
        toast.success(`Exported ${result.data.length} budgets`);
      } else if (type === 'goals') {
        const result = await supabase.from('goals').select('*');
        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) {
          toast.info('No goals to export');
          return;
        }
        exportGoalsToCSV(result.data as any);
        toast.success(`Exported ${result.data.length} goals`);
      } else {
        // Generic CSV export for accounts, debts, bills
        let data: Record<string, unknown>[] | null = null;
        let error: Error | null = null;

        if (type === 'accounts') {
          const result = await supabase.from('accounts').select('*');
          data = result.data;
          error = result.error;
        } else if (type === 'debts') {
          const result = await supabase.from('debts').select('*');
          data = result.data;
          error = result.error;
        } else if (type === 'bills') {
          const result = await supabase.from('bills').select('*');
          data = result.data;
          error = result.error;
        }

        if (error) throw error;
        if (!data || data.length === 0) {
          toast.info(`No ${type} data to export`);
          return;
        }

        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(row => 
          Object.values(row).map(val => 
            typeof val === 'string' && val.includes(',') ? `"${val}"` : val
          ).join(',')
        ).join('\n');
        
        const csv = `${headers}\n${rows}`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast.success(`Exported ${data.length} ${type} records`);
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export ${type}`);
    }
  };

  const handleExportPDF = async (type: 'transactions' | 'bills' | 'budgets' | 'goals' | 'financial-report') => {
    setShowExportPDFMenu(false);

    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      if (type === 'financial-report') {
        navigate('/reports');
        toast.info('Use the PDF button on the Reports page for full financial reports');
        return;
      }

      if (type === 'transactions') {
        const result = await supabase.from('transactions').select('*');
        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) {
          toast.info('No transactions to export');
          return;
        }
        exportTransactionsToPDF(result.data as any);
        toast.success('Generating PDF report...');
      } else if (type === 'budgets') {
        const result = await supabase.from('budgets').select('*');
        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) {
          toast.info('No budgets to export');
          return;
        }
        exportBudgetsToPDF(result.data as any);
        toast.success('Generating PDF report...');
      } else if (type === 'goals') {
        const result = await supabase.from('goals').select('*');
        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) {
          toast.info('No goals to export');
          return;
        }
        exportGoalsToPDF(result.data as any);
        toast.success('Generating PDF report...');
      } else if (type === 'bills') {
        const result = await supabase.from('bills').select('*');
        if (result.error) throw result.error;
        if (!result.data || result.data.length === 0) {
          toast.info('No bills to export');
          return;
        }
        exportBillsToPDF(result.data as any);
        toast.success('Generating PDF report...');
      }
    } catch (err) {
      console.error('Export error:', err);
      toast.error(`Failed to export ${type}`);
    }
  };

  // Apply theme on mount and when theme changes
  useEffect(() => {
    const applyTheme = () => {
      const isDark = theme === 'dark' || 
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();
    localStorage.setItem('theme', theme);

    // Listen for system theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light': return <Sun className="h-5 w-5 md:h-6 md:w-6" />;
      case 'dark': return <Moon className="h-5 w-5 md:h-6 md:w-6" />;
      case 'system': return <Monitor className="h-5 w-5 md:h-6 md:w-6" />;
    }
  };

  return (
    <>
      <header 
        className={`sticky z-[45] backdrop-blur-md border-b border-border/30 relative transition-colors duration-300 ${
          isMenuOpen 
            ? 'bg-black/40 dark:bg-black/60 rounded-b-none' 
            : 'bg-white/50 dark:bg-background/50 rounded-b-3xl'
        }`}
        style={{
          top: 'var(--preview-banner-offset, 0px)',
          boxShadow: isMenuOpen 
            ? '0 10px 15px -3px rgba(0,0,0,0.2)' 
            : '0 20px 25px -5px rgba(147,51,234,0.2), 0 8px 10px -6px rgba(147,51,234,0.1)' 
        }}
      >
        <DashboardBlobs />
        <div className="w-full flex items-center justify-between px-2 min-[360px]:px-3 sm:px-4 md:px-6 py-1 min-[360px]:py-1.5 sm:py-2">
          {/* Left: Menu + Logo */}
          <div className="flex items-center gap-0.5 min-[360px]:gap-1 sm:gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className={`hover:bg-muted/50 p-1 min-[360px]:p-1.5 ${isMenuOpen ? 'text-white' : 'text-foreground'}`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <div className="flex flex-col items-center">
                {isMenuOpen ? (
                  <X className="h-5 w-5 min-[360px]:h-6 min-[360px]:w-6 sm:h-7 sm:w-7" />
                ) : (
                  <Menu className="h-5 w-5 min-[360px]:h-6 min-[360px]:w-6 sm:h-7 sm:w-7" />
                )}
                <span className="text-[8px] min-[360px]:text-[10px] sm:text-xs mt-0.5">Menu</span>
              </div>
            </Button>

            <div className="flex flex-col">
              <div className="flex items-center gap-0.5 min-[360px]:gap-1.5 sm:gap-2 cursor-pointer" onClick={() => navigate("/dashboard")}>
                {isPartnerBranded && partner?.logo_url ? (
                  <img src={partner.logo_url} alt={partner.name} className="h-6 min-[360px]:h-7 sm:h-8 md:h-10 w-auto object-contain" />
                ) : (
                  <>
                    <img src={coinsbloomLogo} alt="CoinsBloom" className="h-6 w-6 min-[360px]:h-7 min-[360px]:w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-lg bg-transparent" style={{ background: 'transparent' }} />
                    <span className="font-semibold text-xs min-[360px]:text-sm sm:text-base md:text-lg bg-gradient-to-r from-[hsl(280,70%,55%)] via-[hsl(320,75%,55%)] to-[hsl(350,80%,55%)] bg-clip-text text-transparent">CoinsBloom</span>
                  </>
                )}
                {/* Show inline on larger screens */}
                {isPartnerBranded && (
                  <PoweredByBadge size="sm" className="hidden sm:flex ml-2" />
                )}
              </div>
              {/* Tagline - hidden on tiny screens to save header space */}
              <span className="hidden min-[360px]:block text-[8px] min-[360px]:text-[9px] font-bold text-muted-foreground/70 dark:text-white/80 ml-7 min-[360px]:ml-8 sm:ml-9 md:ml-11 -mt-0.5 leading-tight">
                All Your Finances. One View.
              </span>
              {/* Powered by badge below logo on tiny screens */}
              {isPartnerBranded && (
                <PoweredByBadge size="xs" className="flex sm:hidden" />
              )}
            </div>
          </div>

          {/* Right: Notifications + Theme + Coach + Learn + Tools + Avatar */}
          <div className="flex items-center gap-0 sm:gap-1 md:gap-2">
            {/* Search icon — mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-7 w-7 rounded-full hover:bg-transparent text-primary dark:text-primary p-0"
              onClick={() => window.dispatchEvent(new CustomEvent('coinsbloom_open_search'))}
            >
              <Search className="h-4 w-4 min-[360px]:h-5 min-[360px]:w-5" />
            </Button>
            <NotificationCenter />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full hover:bg-transparent text-amber-500 dark:text-amber-300 p-0"
                >
                  {getThemeIcon()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36 p-1">
                <DropdownMenuItem onClick={() => setTheme('light')} className="gap-2.5 cursor-pointer rounded-md px-3 py-2 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span className="font-medium">Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')} className="gap-2.5 cursor-pointer rounded-md px-3 py-2 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30">
                  <Moon className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  <span className="font-medium">Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')} className="gap-2.5 cursor-pointer rounded-md px-3 py-2 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/30">
                  <Monitor className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                  <span className="font-medium">System</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Learn button removed - now in footer bar */}

            <Button 
              variant="ghost" 
              onClick={() => setIsToolsOpen(!isToolsOpen)}
              className="flex flex-col items-center justify-center h-auto py-1 px-0.5 sm:px-2 md:px-3 rounded-full hover:bg-muted/50 text-cyan-700 dark:text-cyan-300 gap-0.5"
            >
              <ChevronDown className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 transition-transform ${isToolsOpen ? "rotate-180" : ""}`} strokeWidth={1.5} />
              <span className="text-[8px] md:text-[10px] font-medium leading-none">
                {isToolsOpen ? "Hide" : "Tools"}
              </span>
            </Button>

            <div className="ml-1 sm:ml-1.5 md:ml-2">
              <AvatarMenu />
            </div>
          </div>
        </div>

        {/* Tools Dropdown Bar - Overlay on content below */}
        {isToolsOpen && (
          <div className="absolute left-0 right-0 top-full w-full py-3 border-t border-border/20 z-50">
            <div className="px-4 md:px-6 flex items-center gap-2 overflow-x-auto animate-fade-in">
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-9 px-3 bg-white/90 hover:bg-white border-0 text-[hsl(270,70%,35%)] font-medium gap-1.5 rounded-full shadow-sm"
              onClick={() => setReceiptScannerOpen(true)}
            >
              <Camera className="h-4 w-4" />
              Camera
            </Button>
            <DropdownMenu open={showImportTypeMenu} onOpenChange={setShowImportTypeMenu}>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-9 px-3 bg-white/90 hover:bg-white border-0 text-[hsl(210,80%,45%)] font-medium gap-1.5 rounded-full shadow-sm"
                  onClick={handleImportClick}
                >
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => handleSelectImportType('transactions')} className="cursor-pointer">
                  Transactions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSelectImportType('accounts')} className="cursor-pointer">
                  Accounts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSelectImportType('debts')} className="cursor-pointer">
                  Debts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSelectImportType('bills')} className="cursor-pointer">
                  Bills
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={showExportCSVMenu} onOpenChange={setShowExportCSVMenu}>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-9 px-3 bg-white/90 hover:bg-white dark:bg-card dark:hover:bg-card/80 border-0 text-[hsl(210,80%,45%)] dark:text-blue-400 font-medium gap-1.5 rounded-full shadow-sm"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44 bg-popover border border-border shadow-lg z-50">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Export as CSV</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportCSV('transactions')} className="cursor-pointer">
                  📊 Transactions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV('accounts')} className="cursor-pointer">
                  🏦 Accounts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV('debts')} className="cursor-pointer">
                  💳 Debts
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV('bills')} className="cursor-pointer">
                  📅 Bills
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV('budgets')} className="cursor-pointer">
                  📈 Budgets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCSV('goals')} className="cursor-pointer">
                  🎯 Goals
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu open={showExportPDFMenu} onOpenChange={setShowExportPDFMenu}>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-xs h-9 px-3 bg-white/90 hover:bg-white dark:bg-card dark:hover:bg-card/80 border-0 text-[hsl(0,65%,50%)] dark:text-red-400 font-medium gap-1.5 rounded-full shadow-sm"
                >
                  <Printer className="h-4 w-4" />
                  PDF
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 bg-popover border border-border shadow-lg z-50">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Export as PDF Report</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportPDF('transactions')} className="cursor-pointer">
                  📊 Transactions
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF('bills')} className="cursor-pointer">
                  📅 Bills
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF('budgets')} className="cursor-pointer">
                  📈 Budgets
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportPDF('goals')} className="cursor-pointer">
                  🎯 Goals
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExportPDF('financial-report')} className="cursor-pointer">
                  📋 Financial Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-9 px-3 bg-white/90 hover:bg-white border-0 text-[hsl(175,70%,40%)] font-medium gap-1.5 rounded-full shadow-sm"
              onClick={() => setCalculatorOpen(true)}
            >
              <Calculator className="h-4 w-4" />
              Calculator
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="text-xs h-9 px-3 bg-white/90 hover:bg-white border-0 text-[hsl(160,50%,40%)] font-medium gap-1.5 rounded-full shadow-sm"
              onClick={() => setNotesOpen(true)}
            >
              <FileText className="h-4 w-4" />
              Notepad
            </Button>
            </div>
          </div>
        )}
      </header>

      {/* CSV Import Modal */}
      <CSVImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        importType={importType}
      />

      {/* Receipt Scanner Modal */}
      <ReceiptScannerModal
        open={receiptScannerOpen}
        onOpenChange={setReceiptScannerOpen}
      />

      {/* Calculator Modal */}
      <QuickCalculatorModal
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
      />

      {/* Notes Modal */}
      <QuickNotesModal
        open={notesOpen}
        onOpenChange={setNotesOpen}
      />

      {/* Main Menu Drawer */}
      <MainMenuDrawer 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        isCollapsed={isMenuCollapsed}
        onToggleCollapse={() => setIsMenuCollapsed(!isMenuCollapsed)}
      />
    </>
  );
}
