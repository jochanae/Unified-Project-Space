import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, ChevronLeft, ChevronRight, TrendingUp, BarChart3, Target, Wallet, PiggyBank, ArrowLeftRight, DollarSign, Receipt, Landmark, CreditCard, CheckCircle } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { cn } from '@/lib/utils';
import { BudgetEntry, Bill, SavingsGoal, NewBudgetEntry, NewBill, NewSavingsGoal } from '@/hooks/useFinances';
import { AddBudgetEntryDialog } from './AddBudgetEntryDialog';
import { AddBillDialog } from './AddBillDialog';
import { AddSavingsGoalDialog } from './AddSavingsGoalDialog';
import { MarkBillsPaidDialog } from './MarkBillsPaidDialog';
import { FinanceDataChart } from './FinanceDataChart';
import { FinanceSnapshotSlide } from './FinanceSnapshotSlide';
import type { UseMutationResult } from '@tanstack/react-query';

/* ─── Floating bubble decorations ─── */
function FloatingBubbles({ tint }: { tint: string }) {
  return (
    <>
      <div
        className="absolute -left-16 top-1/4 h-44 w-44 rounded-full pointer-events-none"
        style={{ background: tint, opacity: 0.18 }}
      />
      <div
        className="absolute -right-10 top-[35%] h-36 w-36 rounded-full pointer-events-none"
        style={{ background: tint, opacity: 0.14 }}
      />
      <div
        className="absolute right-20 top-16 h-14 w-14 rounded-full pointer-events-none"
        style={{ background: tint, opacity: 0.1 }}
      />
    </>
  );
}

/* ─── Large circle nav dots at TOP — CoinsBoom: 48px circles, colored active, gray inactive ─── */
function TopCircleDots({
  count,
  current,
  dotColors,
  onSelect,
}: {
  count: number;
  current: number;
  dotColors: string[];
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          className={cn(
            'rounded-full transition-all duration-300',
            current === i
              ? 'h-12 w-12 ring-2 ring-white/40 scale-110 shadow-lg'
              : 'h-10 w-10 opacity-40'
          )}
          style={{
            background: dotColors[i],
            filter: current === i ? 'brightness(1.1) saturate(1.2)' : 'saturate(0.5) brightness(0.8)',
          }}
          aria-label={`Slide ${i + 1}`}
        />
      ))}
    </div>
  );
}

/* ─── Types ─── */
interface FinanceSummary {
  totalIncome: number;
  totalExpenses: number;
  totalBills: number;
  paidBills: number;
  unpaidBills: number;
  netCashFlow: number;
  availableToInvest: number;
  totalSavingsTarget: number;
  totalSaved: number;
}

interface FinanceSummaryExtended extends FinanceSummary {
  netWorth?: number;
  totalAssets?: number;
  totalLiabilities?: number;
}

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

/* ─── Quick action config ─── */
interface QuickAction {
  icon: React.ElementType;
  label: string;
  action: 'add-entry' | 'add-bill' | 'add-goal' | 'add-asset' | 'add-liability' | 'mark-paid';
}

/* ─── Slide configs (without Financial Snapshot — that's slide index 0) ─── */
interface SlideConfig {
  id: string;
  icon: React.ElementType;
  title: string;
  gradient: string;
  bubbleTint: string;
  chartFill: string;
  dotColor: string;
  getValue: (s: FinanceSummary) => string;
  getSubtitle: (s: FinanceSummary) => string;
  getTrend: (s: FinanceSummary) => string;
  getDescription: () => string;
  getChartValue: (s: FinanceSummary) => number;
  getChartMax: (s: FinanceSummary) => number;
  quickActions: QuickAction[];
}

const metricSlides: SlideConfig[] = [
  {
    id: 'total-balance',
    icon: TrendingUp,
    title: 'Total Balance',
    gradient: 'linear-gradient(135deg, hsl(270,80%,55%), hsl(290,75%,50%), hsl(320,70%,55%))',
    bubbleTint: 'hsla(280,60%,70%,0.35)',
    chartFill: 'hsla(280,60%,30%,0.6)',
    dotColor: 'hsl(270,80%,55%)',
    getValue: (s) => `$${fmt(s.totalIncome)}`,
    getSubtitle: (s) => {
      const incomeEntries = s.totalIncome > 0 ? 1 : 0;
      const expenseEntries = s.totalExpenses > 0 ? 1 : 0;
      const billEntries = s.totalBills > 0 ? 1 : 0;
      const total = incomeEntries + expenseEntries + billEntries;
      if (total === 0) return 'No transactions yet';
      return `Income: $${fmt(s.totalIncome)}`;
    },
    getTrend: (s) => {
      if (s.totalIncome === 0) return 'Add income to get started';
      return `Net: ${s.netCashFlow >= 0 ? '+' : ''}$${fmt(s.netCashFlow)}`;
    },
    getDescription: () =>
      'Your total balance tracks the sum of all income sources. It changes as you earn income and spend money.',
    getChartValue: (s) => s.totalIncome,
    getChartMax: (s) => Math.max(s.totalIncome, s.totalExpenses, 1),
    quickActions: [
      { icon: DollarSign, label: 'Add Income', action: 'add-entry' },
      { icon: Receipt, label: 'Add Expense', action: 'add-entry' },
      { icon: FileText, label: 'Add Bill', action: 'add-bill' },
    ],
  },
  {
    id: 'cash-flow',
    icon: BarChart3,
    title: 'Cash Flow',
    gradient: 'linear-gradient(135deg, hsl(200,80%,45%), hsl(210,85%,50%), hsl(220,80%,55%))',
    bubbleTint: 'hsla(210,70%,60%,0.3)',
    chartFill: 'hsla(210,70%,20%,0.6)',
    dotColor: 'hsl(200,80%,50%)',
    getValue: (s) => `${s.netCashFlow >= 0 ? '+' : ''}$${fmt(s.netCashFlow)}`,
    getSubtitle: () => 'Net Cash Flow',
    getTrend: (s) => `$${fmt(s.totalIncome)} in · $${fmt(s.totalExpenses + s.totalBills)} out`,
    getDescription: () =>
      'Cash flow = Income − Expenses. Positive means you\'re saving; negative means you\'re spending more than you earn.',
    getChartValue: (s) => Math.abs(s.netCashFlow),
    getChartMax: (s) => Math.max(s.totalIncome, s.totalExpenses + s.totalBills, 1),
    quickActions: [
      { icon: DollarSign, label: 'Add Income', action: 'add-entry' },
      { icon: Receipt, label: 'Add Expense', action: 'add-entry' },
      { icon: FileText, label: 'Add Bill', action: 'add-bill' },
    ],
  },
  {
    id: 'budget-health',
    icon: Target,
    title: 'Budget Health',
    gradient: 'linear-gradient(135deg, hsl(45,70%,50%), hsl(35,80%,55%))',
    bubbleTint: 'hsla(40,70%,60%,0.3)',
    chartFill: 'hsla(40,60%,25%,0.6)',
    dotColor: 'hsl(45,70%,50%)',
    getValue: (s) => `$${fmt(s.availableToInvest)}`,
    getSubtitle: () => 'Available to Spend',
    getTrend: (s) => {
      const pct = s.totalIncome > 0 ? Math.round((s.availableToInvest / s.totalIncome) * 100) : 0;
      return `${pct}% remaining`;
    },
    getDescription: () =>
      'Budget health shows what % of income remains after expenses. Higher is better — aim for at least 20% for healthy savings.',
    getChartValue: (s) => s.availableToInvest,
    getChartMax: (s) => Math.max(s.totalIncome, 1),
    quickActions: [
      { icon: Plus, label: 'Transaction', action: 'add-entry' },
      { icon: Target, label: 'Set Goal', action: 'add-goal' },
      { icon: FileText, label: 'Add Bill', action: 'add-bill' },
    ],
  },
  {
    id: 'net-worth',
    icon: PiggyBank,
    title: 'Net Worth',
    gradient: 'linear-gradient(135deg, hsl(160,60%,35%), hsl(170,70%,45%))',
    bubbleTint: 'hsla(165,60%,55%,0.25)',
    chartFill: 'hsla(165,50%,22%,0.6)',
    dotColor: 'hsl(160,60%,40%)',
    getValue: (s) => {
      const nw = (s as FinanceSummaryExtended).netWorth ?? s.totalSaved;
      return `${nw < 0 ? '-' : ''}$${fmt(Math.abs(nw))}`;
    },
    getSubtitle: (s) => {
      const ext = s as FinanceSummaryExtended;
      if (ext.totalAssets !== undefined) {
        return `$${fmt(ext.totalAssets)} assets · $${fmt(ext.totalLiabilities ?? 0)} liabilities`;
      }
      const pct = s.totalSavingsTarget > 0 ? Math.round((s.totalSaved / s.totalSavingsTarget) * 100) : 0;
      return `${pct}% of $${fmt(s.totalSavingsTarget)} target`;
    },
    getTrend: (s) => {
      const ext = s as FinanceSummaryExtended;
      if (ext.netWorth !== undefined) {
        return ext.netWorth >= 0 ? '↑ Positive net worth!' : '↓ Work on reducing debt';
      }
      return '↑ Keep going!';
    },
    getDescription: () =>
      'Net worth = Assets − Liabilities. It grows as you pay down debt and accumulate savings over time.',
    getChartValue: (s) => {
      const ext = s as FinanceSummaryExtended;
      return ext.totalAssets ?? s.totalSaved;
    },
    getChartMax: (s) => {
      const ext = s as FinanceSummaryExtended;
      return Math.max(ext.totalAssets ?? 0, ext.totalLiabilities ?? 0, s.totalSavingsTarget, 1);
    },
    quickActions: [
      { icon: Landmark, label: 'Add Asset', action: 'add-asset' },
      { icon: CreditCard, label: 'Add Debt', action: 'add-liability' },
      { icon: Target, label: 'Savings Goal', action: 'add-goal' },
    ],
  },
  {
    id: 'bills',
    icon: Wallet,
    title: 'Bills & Obligations',
    gradient: 'linear-gradient(135deg, hsl(340,70%,50%), hsl(350,65%,55%))',
    bubbleTint: 'hsla(345,60%,60%,0.25)',
    chartFill: 'hsla(345,50%,25%,0.6)',
    dotColor: 'hsl(340,70%,50%)',
    getValue: (s) => `$${fmt(s.totalBills)}`,
    getSubtitle: () => 'Monthly Bills',
    getTrend: (s) => `$${fmt(s.paidBills)} paid · $${fmt(s.unpaidBills)} remaining`,
    getDescription: () =>
      'Stay on top of your obligations. Mark bills as paid to keep your budget accurate.',
    getChartValue: (s) => s.totalBills,
    getChartMax: (s) => Math.max(s.totalIncome, s.totalBills, 1),
    quickActions: [
      { icon: FileText, label: 'Add Bill', action: 'add-bill' },
      { icon: CheckCircle, label: 'Mark Paid', action: 'mark-paid' },
      { icon: Receipt, label: 'Add Expense', action: 'add-entry' },
    ],
  },
];

// Dot colors are intentionally DIFFERENT from slide backgrounds for visual contrast
const allDotColors = [
  'hsl(320,85%,60%)',  // Financial Snapshot → Magenta/Hot Pink
  'hsl(185,80%,50%)',  // Total Balance → Cyan
  'hsl(35,90%,55%)',   // Cash Flow → Orange
  'hsl(260,75%,60%)',  // Budget Health → Purple
  'hsl(145,70%,45%)',  // Net Worth → Emerald
  'hsl(15,85%,55%)',   // Bills → Coral/Red-Orange
];

/* ─── Main Component ─── */
interface FinanceCarouselProps {
  entries: BudgetEntry[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  summary: FinanceSummary;
  addEntry: UseMutationResult<void, Error, NewBudgetEntry>;
  deleteEntry: UseMutationResult<void, Error, string>;
  addBill: UseMutationResult<void, Error, NewBill>;
  toggleBillPaid: UseMutationResult<void, Error, { id: string; isPaid: boolean }>;
  deleteBill: UseMutationResult<void, Error, string>;
  addSavingsGoal: UseMutationResult<void, Error, NewSavingsGoal>;
  updateSavingsGoal: UseMutationResult<void, Error, { id: string; current_amount: number }>;
  deleteSavingsGoal: UseMutationResult<void, Error, string>;
  onAddAsset?: () => void;
  onAddLiability?: () => void;
}

export function FinanceCarousel({
  entries, bills, savingsGoals, summary,
  addEntry, deleteEntry,
  addBill, toggleBillPaid, deleteBill,
  addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
  onAddAsset, onAddLiability,
}: FinanceCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showMarkPaid, setShowMarkPaid] = useState(false);

  const actionHandlers: Record<QuickAction['action'], () => void> = {
    'add-entry': () => setShowAddEntry(true),
    'add-bill': () => setShowAddBill(true),
    'add-goal': () => setShowAddGoal(true),
    'add-asset': () => onAddAsset?.(),
    'add-liability': () => onAddLiability?.(),
    'mark-paid': () => setShowMarkPaid(true),
  };

  const onSelect = useCallback(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
  }, [api]);

  useEffect(() => {
    if (!api) return;
    onSelect();
    api.on('select', onSelect);
    return () => { api.off('select', onSelect); };
  }, [api, onSelect]);

  const totalSlides = 1 + metricSlides.length; // Financial Snapshot + metrics

  return (
    <div className="space-y-3">
      {/* ─── Immersive Carousel ─── */}
      <Carousel
        setApi={setApi}
        opts={{ align: 'start', loop: true }}
        className="w-[100vw] relative left-1/2 -translate-x-1/2"
      >
        {/* Large circle navigation dots at TOP */}
        <div className={current === 0 ? 'bg-background' : ''} style={current !== 0 ? { background: metricSlides[current - 1]?.gradient } : undefined}>
          <TopCircleDots
            count={totalSlides}
            current={current}
            dotColors={allDotColors}
            onSelect={(i) => api?.scrollTo(i)}
          />
        </div>

        <CarouselContent className="ml-0 [&>*]:pl-0">
          {/* Slide 0: Financial Snapshot */}
          <CarouselItem className="pl-0 basis-full">
            <FinanceSnapshotSlide
              entries={entries}
              totalIncome={summary.totalIncome}
              totalExpenses={summary.totalExpenses}
              totalBills={summary.totalBills}
              totalSaved={summary.totalSaved}
              totalSavingsTarget={summary.totalSavingsTarget}
            />
          </CarouselItem>

          {/* Metric slides */}
          {metricSlides.map((slide) => {
            const Icon = slide.icon;
            return (
              <CarouselItem key={slide.id} className="pl-0 basis-full">
                <div
                  className="relative overflow-hidden min-h-[520px] sm:min-h-[560px] flex flex-col"
                  style={{ background: slide.gradient }}
                >
                  {/* Floating bubbles */}
                  <FloatingBubbles tint={slide.bubbleTint} />

                  {/* Main content — centered */}
                  <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-8 pt-6 pb-0">
                    {/* Title */}
                    <div className="flex items-center gap-2 mb-4">
                      <Icon className="h-5 w-5 text-white/80" />
                      <span className="text-sm font-semibold text-white/80 tracking-wide uppercase">
                        {slide.title}
                      </span>
                    </div>

                    {/* Big value */}
                    <h2 className="text-5xl sm:text-7xl font-extrabold text-white mb-3 tracking-tight">
                      {slide.getValue(summary)}
                    </h2>

                    {/* Subtitle */}
                    <p className="text-base sm:text-lg text-white/65 mb-3">
                      {slide.getSubtitle(summary)}
                    </p>

                    {/* Trend badge */}
                    <div className="flex items-center gap-1.5 text-sm text-white/75">
                      <TrendingUp className="h-4 w-4" />
                      <span>{slide.getTrend(summary)}</span>
                    </div>
                  </div>

                  {/* Data-driven area chart */}
                  <div className="relative z-10 mt-auto">
                    <FinanceDataChart
                      entries={entries}
                      slideId={slide.id}
                      fillColor={slide.chartFill}
                      value={slide.getChartValue(summary)}
                      maxValue={slide.getChartMax(summary)}
                    />
                  </div>

                  {/* Dynamic trend — per-slide metric */}
                  <div className="relative z-10 text-center pb-2">
                    {summary.totalIncome > 0 ? (() => {
                      let pct = 0;
                      let label = 'net';
                      if (slide.id === 'total-balance') {
                        pct = Math.round((summary.netCashFlow / summary.totalIncome) * 100);
                        label = 'net';
                      } else if (slide.id === 'cash-flow') {
                        pct = Math.round(((summary.totalIncome - summary.totalExpenses - summary.totalBills) / summary.totalIncome) * 100);
                        label = 'flow';
                      } else if (slide.id === 'budget-health') {
                        pct = Math.round((summary.availableToInvest / summary.totalIncome) * 100);
                        label = 'remaining';
                      } else if (slide.id === 'net-worth') {
                        pct = summary.totalSavingsTarget > 0 ? Math.round((summary.totalSaved / summary.totalSavingsTarget) * 100) : 0;
                        label = 'of goal';
                      } else if (slide.id === 'bills') {
                        pct = summary.totalBills > 0 ? Math.round((summary.paidBills / summary.totalBills) * 100) : 100;
                        label = 'paid';
                      }
                      return (
                        <>
                          <span className="text-sm text-emerald-300 font-medium">
                            {slide.id === 'bills' ? '' : '↑ '}{pct}% {label}
                          </span>
                          <span className="text-sm text-white/40 ml-2">this month</span>
                        </>
                      );
                    })() : (
                      <span className="text-sm text-white/40">Add data to see trends</span>
                    )}
                  </div>

                  {/* Description text */}
                  <div className="relative z-10 px-6 pb-2">
                    <p className="text-xs text-white/50 text-center leading-relaxed max-w-sm mx-auto">
                      {slide.getDescription()}
                    </p>
                  </div>

                  {/* Contextual quick action buttons — frosted glass */}
                  <div className="relative z-10 px-4 pb-6 pt-2">
                    <div className="grid grid-cols-3 gap-3">
                      {slide.quickActions.map((qa) => {
                        const QaIcon = qa.icon;
                        return (
                          <button
                            key={qa.label}
                            onClick={() => actionHandlers[qa.action]()}
                            className="flex flex-col items-center gap-2 py-4 px-3 rounded-2xl transition-all active:scale-95"
                            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}
                          >
                            <QaIcon className="h-5 w-5 text-white" />
                            <span className="text-xs font-medium text-white">{qa.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Nav arrows */}
        <button
          onClick={() => api?.scrollPrev()}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.2)' }}
          aria-label="Previous slide"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        <button
          onClick={() => api?.scrollNext()}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-12 w-12 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(255,255,255,0.2)' }}
          aria-label="Next slide"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </Carousel>

      {/* Swipe hint */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 pb-1">
        <ChevronLeft className="h-3 w-3" />
        <span>Swipe</span>
        <ChevronRight className="h-3 w-3" />
      </div>


      {/* Quick-Add Dialogs */}
      <AddBudgetEntryDialog
        open={showAddEntry}
        onOpenChange={setShowAddEntry}
        onSubmit={(data) => { addEntry.mutate(data); setShowAddEntry(false); }}
      />
      <AddBillDialog
        open={showAddBill}
        onOpenChange={setShowAddBill}
        onSubmit={(data) => { addBill.mutate(data); setShowAddBill(false); }}
      />
      <AddSavingsGoalDialog
        open={showAddGoal}
        onOpenChange={setShowAddGoal}
        onSubmit={(data) => { addSavingsGoal.mutate(data); setShowAddGoal(false); }}
      />
      <MarkBillsPaidDialog
        open={showMarkPaid}
        onOpenChange={setShowMarkPaid}
        bills={bills}
        toggleBillPaid={toggleBillPaid}
      />
    </div>
  );
}
