import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { usePaperTrading, PaperTradeInput, AssetClass } from '@/hooks/usePaperTrading';
import { useMarketData, popularSymbols, StockQuote } from '@/hooks/useMarketData';
import { SymbolSearchInput } from '@/components/paper-trading/SymbolSearchInput';
import { SymbolResult } from '@/hooks/useSymbolSearch';
import { TradingModeBanner } from '@/components/trading/TradingModeBanner';
import { PriceChart } from '@/components/paper-trading/PriceChart';
import { OptionsChain } from '@/components/paper-trading/OptionsChain';
import { QuinnTradingSidebar } from '@/components/paper-trading/QuinnTradingSidebar';
import { StrategyBacktester } from '@/components/paper-trading/StrategyBacktester';
import { StrategyWizard } from '@/components/paper-trading/StrategyWizard';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  RotateCcw,
  Plus,
  Loader2,
  Wallet,
  PiggyBank,
  BarChart3,
  Search,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  FlaskConical,
  Wand2,
  Monitor,
  ShieldAlert,
  Bitcoin,
  Globe,
} from 'lucide-react';
import { QuinnBrowserWindowButton } from '@/components/quinn/QuinnBrowserWindow';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  equity: 'Stocks',
  options: 'Options',
  forex: 'Forex',
  crypto: 'Crypto',
};

const ASSET_CLASS_ICONS: Record<AssetClass, typeof TrendingUp> = {
  equity: TrendingUp,
  options: Target,
  forex: Globe,
  crypto: Bitcoin,
};

export default function PaperTrading() {
  const {
    trades,
    openPositions,
    filteredClosedTrades,
    orders,
    stats,
    isLoading,
    historyFilter,
    setHistoryFilter,
    openTrade,
    closeTrade,
    resetPortfolio,
  } = usePaperTrading();

  const { fetchQuote, loading: quoteLoading } = useMarketData();

  const [showTradeForm, setShowTradeForm] = useState(false);
  const [closingTrade, setClosingTrade] = useState<string | null>(null);
  const [closePrice, setClosePrice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveQuote, setLiveQuote] = useState<StockQuote | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [showQuinnSidebar, setShowQuinnSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('trade');
  const [showWizard, setShowWizard] = useState(false);
  const [historyPage, setHistoryPage] = useState(0);
  const HISTORY_PAGE_SIZE = 20;
  const [showSymbolSearch, setShowSymbolSearch] = useState(false);

  const [tradeForm, setTradeForm] = useState<PaperTradeInput>({
    symbol: '',
    trade_type: 'long',
    asset_class: 'equity',
    entry_price: 0,
    quantity: 1,
    stop_loss: null,
    take_profit: null,
  });

  // Fetch live quote when symbol changes
  useEffect(() => {
    const symbol = tradeForm.symbol.trim();
    if (symbol.length >= 1) {
      const timeout = setTimeout(async () => {
        const quote = await fetchQuote(symbol);
        if (quote) {
          setLiveQuote(quote);
          if (tradeForm.entry_price === 0) {
            setTradeForm((prev) => ({ ...prev, entry_price: quote.price }));
          }
        }
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      setLiveQuote(null);
    }
  }, [tradeForm.symbol, fetchQuote]);

  // Fetch live quote for closing trade
  useEffect(() => {
    if (closingTrade) {
      const trade = trades.find((t) => t.id === closingTrade);
      if (trade) {
        fetchQuote(trade.symbol).then((quote) => {
          if (quote) {
            setClosePrice(quote.price.toFixed(2));
          }
        });
      }
    }
  }, [closingTrade, trades, fetchQuote]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const handleSymbolChange = (symbol: string, result?: SymbolResult) => {
    setTradeForm((prev) => ({
      ...prev,
      symbol,
      entry_price: 0,
      asset_class: result?.asset_class || prev.asset_class,
      base_currency: result?.base_currency || null,
      quote_currency: result?.quote_currency || null,
    }));
  };

  const handleOpenTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await openTrade(tradeForm);
    setIsSubmitting(false);
    setShowTradeForm(false);
    setTradeForm({ symbol: '', trade_type: 'long', asset_class: 'equity', entry_price: 0, quantity: 1, stop_loss: null, take_profit: null });
  };

  const handleCloseTrade = async () => {
    if (!closingTrade || !closePrice) return;
    setIsSubmitting(true);
    await closeTrade(closingTrade, parseFloat(closePrice));
    setIsSubmitting(false);
    setClosingTrade(null);
    setClosePrice('');
  };

  const handleStrategyComplete = (strategy: any) => {
    setShowWizard(false);
    setActiveTab('backtest');
  };

  const paginatedHistory = filteredClosedTrades.slice(
    historyPage * HISTORY_PAGE_SIZE,
    (historyPage + 1) * HISTORY_PAGE_SIZE
  );
  const totalHistoryPages = Math.ceil(filteredClosedTrades.length / HISTORY_PAGE_SIZE);

  const statCards = [
    {
      label: 'Cash Balance',
      value: formatCurrency(stats.balance),
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Portfolio Value',
      value: formatCurrency(stats.portfolioValue),
      icon: PiggyBank,
      color: stats.totalReturn >= 0 ? 'text-gain' : 'text-loss',
      bgColor: stats.totalReturn >= 0 ? 'bg-gain/10' : 'bg-loss/10',
      subtext: `${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(2)}%`,
    },
    {
      label: 'Total P&L',
      value: formatCurrency(stats.totalProfitLoss),
      icon: stats.totalProfitLoss >= 0 ? TrendingUp : TrendingDown,
      color: stats.totalProfitLoss >= 0 ? 'text-gain' : 'text-loss',
      bgColor: stats.totalProfitLoss >= 0 ? 'bg-gain/10' : 'bg-loss/10',
    },
    {
      label: 'Win Rate',
      value: `${stats.winRate.toFixed(1)}%`,
      icon: Target,
      color: stats.winRate >= 50 ? 'text-gain' : 'text-muted-foreground',
      bgColor: stats.winRate >= 50 ? 'bg-gain/10' : 'bg-muted',
    },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const MainContent = () => (
    <div className="space-y-4 p-4 overflow-y-auto h-full">
      {/* Mode Banner */}
      <TradingModeBanner mode="paper" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-chart-1 to-chart-2 shadow-lg">
            <LineChart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Paper Trading</h1>
            <p className="text-sm text-muted-foreground">
              Practice with {formatCurrency(stats.initialBalance)} • Stocks, Forex, Crypto & Options
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <QuinnBrowserWindowButton className="hidden sm:flex" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuinnSidebar(!showQuinnSidebar)}
            className="hidden md:flex"
            title={showQuinnSidebar ? 'Hide Quinn sidebar' : 'Show Quinn sidebar'}
          >
            {showQuinnSidebar ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Portfolio?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will close all positions and reset your balance to $100,000.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={resetPortfolio}>Reset Portfolio</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="sm" onClick={() => setShowTradeForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Trade
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.label} className="border-border/50 overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className={cn('rounded-lg p-1.5 shrink-0', stat.bgColor)}>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-muted-foreground truncate">{stat.label}</p>
                  <p className={cn('text-sm sm:text-base font-bold truncate', stat.color)}>{stat.value}</p>
                  {stat.subtext && <p className={cn('text-[10px] truncate', stat.color)}>{stat.subtext}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="trade" className="gap-1.5">
              <LineChart className="h-4 w-4" />
              <span className="hidden xs:inline">Trade</span>
            </TabsTrigger>
            <TabsTrigger value="backtest" className="gap-1.5">
              <FlaskConical className="h-4 w-4" />
              <span className="hidden xs:inline">Backtest</span>
            </TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => setShowWizard(true)}>
            <Wand2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Strategy Wizard</span>
          </Button>
        </div>

        <TabsContent value="trade" className="space-y-4 mt-0">
          {/* Symbol Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {popularSymbols.slice(0, 8).map((stock) => (
              <Button
                key={stock.symbol}
                variant={selectedSymbol === stock.symbol ? 'secondary' : 'outline'}
                size="sm"
                className="h-8"
                onClick={() => setSelectedSymbol(stock.symbol)}
              >
                {stock.symbol}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1"
              onClick={() => setShowSymbolSearch(true)}
            >
              <Search className="h-3.5 w-3.5" />
              Search All
            </Button>
          </div>

          {/* Symbol Search Dialog */}
          <Dialog open={showSymbolSearch} onOpenChange={setShowSymbolSearch}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Search Symbol</DialogTitle>
                <DialogDescription>
                  Search for any stock, forex pair, or crypto by ticker or name.
                </DialogDescription>
              </DialogHeader>
              <SymbolSearchInput
                value=""
                onChange={(symbol) => {
                  if (symbol) {
                    setSelectedSymbol(symbol);
                    setShowSymbolSearch(false);
                  }
                }}
                placeholder="Search stocks, forex, crypto..."
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {popularSymbols.map((stock) => (
                  <Button
                    key={stock.symbol}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSelectedSymbol(stock.symbol);
                      setShowSymbolSearch(false);
                    }}
                  >
                    {stock.symbol}
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Price Chart */}
          <PriceChart symbol={selectedSymbol} />

          {/* Options Chain - show when viewing equity symbols */}
          <OptionsChain
            symbol={selectedSymbol}
            onSelectOption={(opt) => {
              setTradeForm({
                symbol: opt.symbol,
                trade_type: opt.type === 'call' ? 'long' : 'long',
                asset_class: 'options',
                entry_price: opt.price,
                quantity: 1,
                stop_loss: null,
                take_profit: null,
                option_type: opt.type,
                strike_price: opt.strike,
                expiration_date: opt.expiration,
                contract_size: 100,
              });
              setShowTradeForm(true);
            }}
          />

          {/* Open Positions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-primary" />
                Open Positions ({openPositions.length})
                {orders.length > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    <ShieldAlert className="h-3 w-3 mr-1" />
                    {orders.length} pending order{orders.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {openPositions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No open positions. Open a trade to get started!
                </div>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Symbol</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="hidden sm:table-cell">Class</TableHead>
                        <TableHead className="text-right">Entry</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">SL / TP</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Value</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openPositions.map((trade) => {
                        const tradeOrders = orders.filter(o => o.trade_id === trade.id);
                        const sl = tradeOrders.find(o => o.order_type === 'stop_loss');
                        const tp = tradeOrders.find(o => o.order_type === 'take_profit');
                        const AssetIcon = ASSET_CLASS_ICONS[trade.asset_class] || TrendingUp;
                        return (
                          <TableRow key={trade.id}>
                            <TableCell className="font-semibold">{trade.symbol}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  trade.trade_type === 'long'
                                    ? 'border-gain/50 text-gain bg-gain/10'
                                    : 'border-loss/50 text-loss bg-loss/10'
                                )}
                              >
                                {trade.trade_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <AssetIcon className="h-3 w-3" />
                                {ASSET_CLASS_LABELS[trade.asset_class]}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(trade.entry_price)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs hidden sm:table-cell">
                              {sl ? <span className="text-loss">{formatCurrency(sl.trigger_price)}</span> : '—'}
                              {' / '}
                              {tp ? <span className="text-gain">{formatCurrency(tp.trigger_price)}</span> : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{trade.quantity}</TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {formatCurrency(trade.entry_price * trade.quantity * trade.contract_size)}
                            </TableCell>
                            <TableCell>
                              <Button size="sm" variant="outline" onClick={() => setClosingTrade(trade.id)}>
                                <DollarSign className="h-3 w-3 mr-1" />
                                Close
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trade History - Full with filters */}
          {trades.filter((t) => t.status === 'closed').length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Trade History ({filteredClosedTrades.length})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Select
                      value={historyFilter.assetClass || 'all'}
                      onValueChange={(v) => {
                        setHistoryFilter(prev => ({ ...prev, assetClass: v === 'all' ? undefined : v as AssetClass }));
                        setHistoryPage(0);
                      }}
                    >
                      <SelectTrigger className="h-8 w-28 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        <SelectItem value="equity">Stocks</SelectItem>
                        <SelectItem value="options">Options</SelectItem>
                        <SelectItem value="forex">Forex</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        placeholder="Symbol..."
                        className="h-8 w-24 pl-7 text-xs"
                        value={historyFilter.symbol || ''}
                        onChange={(e) => {
                          setHistoryFilter(prev => ({ ...prev, symbol: e.target.value || undefined }));
                          setHistoryPage(0);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Symbol</TableHead>
                        <TableHead className="hidden sm:table-cell">Class</TableHead>
                        <TableHead className="text-right">Entry</TableHead>
                        <TableHead className="text-right">Exit</TableHead>
                        <TableHead className="text-right">P&L</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedHistory.map((trade) => (
                        <TableRow key={trade.id}>
                          <TableCell className="font-semibold">{trade.symbol}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className="text-[10px]">
                              {ASSET_CLASS_LABELS[trade.asset_class]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {formatCurrency(trade.entry_price)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {trade.exit_price ? formatCurrency(trade.exit_price) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                'font-semibold font-mono text-sm',
                                trade.profit_loss && trade.profit_loss >= 0 ? 'text-gain' : 'text-loss'
                              )}
                            >
                              {trade.profit_loss && trade.profit_loss >= 0 ? '+' : ''}
                              {formatCurrency(trade.profit_loss || 0)}
                            </span>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(trade.entry_date), 'MMM d')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-muted-foreground">
                      Page {historyPage + 1} of {totalHistoryPages}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={historyPage === 0}
                        onClick={() => setHistoryPage(p => p - 1)}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={historyPage >= totalHistoryPages - 1}
                        onClick={() => setHistoryPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="backtest" className="mt-0">
          <FeatureGate
            requiredTier="pro"
            featureName="Strategy Backtester"
            featureDescription="Test your trading strategies against historical data to see how they would have performed"
            showLockedPreview
          >
            <StrategyBacktester symbol={selectedSymbol} />
          </FeatureGate>
        </TabsContent>
      </Tabs>

      {/* Strategy Wizard Dialog */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <StrategyWizard onComplete={handleStrategyComplete} onClose={() => setShowWizard(false)} />
        </DialogContent>
      </Dialog>

      {/* New Trade Dialog - Enhanced */}
      <Dialog
        open={showTradeForm}
        onOpenChange={(open) => {
          setShowTradeForm(open);
          if (!open) {
            setLiveQuote(null);
            setTradeForm({ symbol: '', trade_type: 'long', asset_class: 'equity', entry_price: 0, quantity: 1, stop_loss: null, take_profit: null });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Open New Position</DialogTitle>
            <DialogDescription>Available: {formatCurrency(stats.balance)}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleOpenTrade} className="space-y-4">
            {/* Asset class selector */}
            <div className="flex gap-1">
              {(['equity', 'options', 'forex', 'crypto'] as AssetClass[]).map((ac) => {
                const Icon = ASSET_CLASS_ICONS[ac];
                return (
                  <Button
                    key={ac}
                    type="button"
                    variant={tradeForm.asset_class === ac ? 'secondary' : 'outline'}
                    size="sm"
                    className="flex-1 gap-1 text-xs"
                    onClick={() => setTradeForm(prev => ({ ...prev, asset_class: ac, symbol: '', entry_price: 0 }))}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {ASSET_CLASS_LABELS[ac]}
                  </Button>
                );
              })}
            </div>

            {liveQuote && (
              <div className="rounded-lg border bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-lg">{liveQuote.symbol}</span>
                    <span className="text-2xl font-bold ml-3">{formatCurrency(liveQuote.price)}</span>
                  </div>
                  <div
                    className={cn('text-sm font-medium', liveQuote.change >= 0 ? 'text-gain' : 'text-loss')}
                  >
                    {liveQuote.change >= 0 ? '+' : ''}
                    {liveQuote.change.toFixed(2)} ({liveQuote.changePercent >= 0 ? '+' : ''}
                    {liveQuote.changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>
            )}

            {quoteLoading && tradeForm.symbol && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching live price...
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Symbol</Label>
                <SymbolSearchInput
                  value={tradeForm.symbol}
                  onChange={handleSymbolChange}
                  assetClassFilter={tradeForm.asset_class}
                  placeholder={tradeForm.asset_class === 'forex' ? 'EUR/USD...' : tradeForm.asset_class === 'crypto' ? 'BTC, ETH...' : 'AAPL, TSLA...'}
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Type</Label>
                <Select
                  value={tradeForm.trade_type}
                  onValueChange={(value: 'long' | 'short') =>
                    setTradeForm((prev) => ({ ...prev, trade_type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long (Buy)</SelectItem>
                    <SelectItem value="short">Short (Sell)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Options-specific fields */}
            {tradeForm.asset_class === 'options' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Option Type</Label>
                  <Select
                    value={tradeForm.option_type || 'call'}
                    onValueChange={(v) => setTradeForm(prev => ({ ...prev, option_type: v }))}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="put">Put</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Strike Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={tradeForm.strike_price || ''}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, strike_price: parseFloat(e.target.value) || null }))}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Expiration</Label>
                  <Input
                    type="date"
                    value={tradeForm.expiration_date || ''}
                    onChange={(e) => setTradeForm(prev => ({ ...prev, expiration_date: e.target.value || null }))}
                    className="h-9"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Price
                  {liveQuote && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 ml-2 text-xs text-primary"
                      onClick={() => setTradeForm((prev) => ({ ...prev, entry_price: liveQuote.price }))}
                    >
                      Use live price
                    </Button>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={tradeForm.entry_price || ''}
                  onChange={(e) =>
                    setTradeForm((prev) => ({
                      ...prev,
                      entry_price: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>{tradeForm.asset_class === 'options' ? 'Contracts' : 'Quantity'}</Label>
                <Input
                  type="number"
                  step="1"
                  min="1"
                  placeholder="1"
                  value={tradeForm.quantity || ''}
                  onChange={(e) =>
                    setTradeForm((prev) => ({
                      ...prev,
                      quantity: parseFloat(e.target.value) || 1,
                    }))
                  }
                  required
                />
              </div>
            </div>

            {/* Stop-Loss & Take-Profit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3 text-loss" />
                  Stop-Loss <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={tradeForm.stop_loss || ''}
                  onChange={(e) =>
                    setTradeForm((prev) => ({
                      ...prev,
                      stop_loss: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Target className="h-3 w-3 text-gain" />
                  Take-Profit <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={tradeForm.take_profit || ''}
                  onChange={(e) =>
                    setTradeForm((prev) => ({
                      ...prev,
                      take_profit: parseFloat(e.target.value) || null,
                    }))
                  }
                />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Total: {formatCurrency(tradeForm.entry_price * tradeForm.quantity * (tradeForm.asset_class === 'options' ? 100 : 1))}
              {tradeForm.asset_class === 'options' && <span className="text-xs ml-1">(100 shares/contract)</span>}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowTradeForm(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !tradeForm.symbol || !tradeForm.entry_price}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Open Position
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Close Trade Dialog */}
      <Dialog open={!!closingTrade} onOpenChange={(open) => !open && setClosingTrade(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Position</DialogTitle>
            <DialogDescription>Live price auto-filled. Adjust if needed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Exit Price</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={closePrice}
                onChange={(e) => setClosePrice(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setClosingTrade(null)}>
                Cancel
              </Button>
              <Button onClick={handleCloseTrade} disabled={isSubmitting || !closePrice}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Close Position
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quinn's Second Screen Tip */}
      <Card className="bg-gradient-to-r from-chart-3/5 via-primary/5 to-chart-3/5 border-chart-3/20">
        <CardContent className="flex items-start gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-chart-3/20">
            <Sparkles className="h-5 w-5 text-chart-3" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm">Use as Your Second Screen</p>
            <p className="text-sm text-muted-foreground mt-1">
              Keep this app open alongside your broker (like thinkorswim). Quinn can guide you through
              trades in real-time, explain charts, and help you make decisions as you trade.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-2rem)]">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Main Content */}
          <ResizablePanel defaultSize={showQuinnSidebar ? 70 : 100} minSize={50}>
            <MainContent />
          </ResizablePanel>

          {/* Quinn Sidebar */}
          {showQuinnSidebar && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={45}>
                <QuinnTradingSidebar
                  symbol={selectedSymbol}
                  context={activeTab === 'backtest' ? 'backtest' : 'chart'}
                  className="h-full"
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </DashboardLayout>
  );
}
