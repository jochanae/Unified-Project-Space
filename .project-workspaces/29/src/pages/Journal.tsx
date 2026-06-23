import { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { useTrades, Trade } from '@/hooks/useTrades';
import { TradeTable } from '@/components/journal/TradeTable';
import { TradeForm } from '@/components/journal/TradeForm';
import { TradeStats } from '@/components/journal/TradeStats';
import { TradingModeBanner } from '@/components/trading/TradingModeBanner';
import { ImportFormatGuide } from '@/components/journal/ImportFormatGuide';
import { QuinnJournalSidebar } from '@/components/journal/QuinnJournalSidebar';
import { TradeSparkline } from '@/components/journal/TradeSparkline';
import { TradeAnalysisCard } from '@/components/journal/TradeAnalysisCard';
import { ExportMenu } from '@/components/export/ExportMenu';
import { exportTradesToCSV, exportTradesToPDF } from '@/lib/exportUtils';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Upload,
  Search,
  BookOpen,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function Journal() {
  const {
    trades,
    isLoading,
    stats,
    addTrade,
    updateTrade,
    deleteTrade,
    closeTrade,
    importTrades,
    uploadScreenshot,
  } = useTrades();

  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const [showQuinnSidebar, setShowQuinnSidebar] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  // On desktop, show Quinn sidebar by default
  useEffect(() => {
    if (!isMobile) setShowQuinnSidebar(true);
  }, [isMobile]);

  // Listen for header toolbar events
  useEffect(() => {
    const handleToolbarImport = () => fileInputRef.current?.click();
    const handleToolbarPdf = () => {
      if (trades.length > 0) exportTradesToPDF(trades, stats);
    };
    window.addEventListener('toolbar-import', handleToolbarImport);
    window.addEventListener('toolbar-export-pdf', handleToolbarPdf);
    return () => {
      window.removeEventListener('toolbar-import', handleToolbarImport);
      window.removeEventListener('toolbar-export-pdf', handleToolbarPdf);
    };
  }, [trades, stats]);

  const filteredTrades = trades.filter((trade) => {
    const matchesSearch = trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || trade.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    await importTrades(file);
    setIsImporting(false);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTradeClick = (trade: Trade) => {
    setSelectedTrade(trade);
    if (isMobile) {
      setShowQuinnSidebar(true);
    }
  };

  const MainContent = () => (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto h-full">
      {/* Mode Banner */}
      <TradingModeBanner mode="live" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-gain shadow-lg">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Trade Journal</h1>
            <p className="text-sm text-muted-foreground">
              Track your trades and analyze performance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ImportFormatGuide />
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuinnSidebar(!showQuinnSidebar)}
            className="hidden md:flex"
            title={showQuinnSidebar ? 'Hide Quinn sidebar' : 'Show Quinn sidebar'}
          >
            {showQuinnSidebar ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Import
          </Button>
          <ExportMenu
            onExportCSV={() => exportTradesToCSV(trades)}
            onExportPDF={() => exportTradesToPDF(trades, stats)}
            disabled={trades.length === 0}
          />
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Trade
          </Button>
        </div>
      </div>

      {/* Stats */}
      <TradeStats stats={stats} />

      {/* AI Trade Analysis */}
      <TradeAnalysisCard trades={trades} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by symbol or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: 'all' | 'open' | 'closed') => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <TradeTable
          trades={filteredTrades}
          onUpdate={updateTrade}
          onDelete={deleteTrade}
          onClose={closeTrade}
          onUploadScreenshot={uploadScreenshot}
          onTradeClick={handleTradeClick}
          selectedTradeId={selectedTrade?.id}
          showSparklines
        />
      )}

      {/* Add Trade Form */}
      <TradeForm
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onSubmit={addTrade}
        onUploadScreenshot={uploadScreenshot}
        mode="add"
      />
    </div>
  );

  // Mobile layout - show Quinn as a slide-out panel
  if (isMobile) {
    return (
      <DashboardLayout>
        <div className="relative h-full">
          <MainContent />
          
          {/* Mobile Quinn toggle button */}
          <Button
            variant="default"
            size="icon"
            className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg bg-gradient-to-br from-chart-3 to-chart-3/60"
            onClick={() => setShowQuinnSidebar(!showQuinnSidebar)}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </Button>

          {/* Mobile Quinn sidebar overlay */}
          {showQuinnSidebar && (
            <>
              <div 
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
                onClick={() => setShowQuinnSidebar(false)}
              />
              <div className="fixed right-0 top-0 bottom-0 w-[85%] max-w-sm z-50 bg-card shadow-xl">
                <QuinnJournalSidebar
                  trades={trades}
                  selectedTrade={selectedTrade}
                  stats={stats}
                  className="h-full"
                />
              </div>
            </>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Desktop layout with resizable panels
  return (
    <DashboardLayout>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={showQuinnSidebar ? 70 : 100} minSize={50}>
          <MainContent />
        </ResizablePanel>

        {showQuinnSidebar && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
              <QuinnJournalSidebar
                trades={trades}
                selectedTrade={selectedTrade}
                stats={stats}
                className="h-full"
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </DashboardLayout>
  );
}
