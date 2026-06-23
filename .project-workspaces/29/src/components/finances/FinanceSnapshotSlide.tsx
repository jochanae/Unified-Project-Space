import { useState, useMemo } from 'react';
import { Clock, TrendingUp, BarChart3, Target, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BudgetEntry } from '@/hooks/useFinances';

interface FinanceSnapshotSlideProps {
  entries: BudgetEntry[];
  totalIncome: number;
  totalExpenses: number;
  totalBills: number;
  totalSaved?: number;
  totalSavingsTarget?: number;
}

type TabKey = 'spending' | 'trend' | 'budget';

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

export function FinanceSnapshotSlide({ entries, totalIncome, totalExpenses, totalBills, totalSaved = 0, totalSavingsTarget = 0 }: FinanceSnapshotSlideProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('spending');

  // Combined obligations = expenses + bills
  const totalObligations = totalExpenses + totalBills;
  const netRemaining = totalIncome - totalObligations;
  const budgetHealthPct = totalIncome > 0 ? Math.round(Math.max(0, netRemaining / totalIncome) * 100) : 0;
  const savingsRatePct = totalIncome > 0 ? Math.round(Math.max(0, Math.min(100, (netRemaining / totalIncome) * 100))) : 0;

  const expensesByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    for (const e of entries.filter((e) => e.type === 'expense')) {
      cats[e.category] = (cats[e.category] || 0) + Number(e.amount);
    }
    return Object.entries(cats)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries]);

  const hasExpenses = expensesByCategory.length > 0 || totalBills > 0;
  const hasIncome = totalIncome > 0;

  const tabs: { key: TabKey; label: string; icon: React.ElementType; activeColor: string; activeBg: string }[] = [
    { key: 'spending', label: 'Spending', icon: Clock, activeColor: 'text-amber-300', activeBg: 'hsl(var(--accent) / 0.25)' },
    { key: 'trend', label: 'Trend', icon: TrendingUp, activeColor: 'text-gain', activeBg: 'hsl(var(--gain) / 0.25)' },
    { key: 'budget', label: 'Budget', icon: BarChart3, activeColor: 'text-chart-3', activeBg: 'hsl(var(--chart-3) / 0.25)' },
  ];

  return (
    <div className="relative overflow-hidden min-h-[520px] sm:min-h-[560px] flex flex-col bg-background">

      {/* Title */}
      <div className="relative z-10 flex items-center justify-center gap-2 pt-8 pb-4">
        <BarChart3 className="h-5 w-5 text-foreground/80" />
        <span className="text-sm font-semibold text-foreground/80 tracking-wide uppercase">
          Financial Snapshot
        </span>
      </div>

      {/* Tab buttons */}
      <div className="relative z-10 flex items-center justify-center gap-3 px-6 pb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all',
                isActive
                  ? `${tab.activeColor} shadow-lg border border-border/40`
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground/70'
              )}
              style={isActive ? { background: tab.activeBg } : undefined}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-6">
        <div className="w-full max-w-sm rounded-2xl p-6 bg-card border border-border/30">
          {activeTab === 'spending' && (
            <>
              {hasExpenses ? (
                <div className="space-y-3">
                  {/* Show bills as a category if there are bills */}
                  {totalBills > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-3 w-3 rounded-full bg-gradient-to-br from-rose-500 to-rose-600 shrink-0" />
                        <span className="text-sm text-foreground/80">Bills & Obligations</span>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <span className="text-sm font-semibold text-foreground">${fmt(totalBills)}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">
                          {totalObligations > 0 ? Math.round((totalBills / totalObligations) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  )}
                  {expensesByCategory.slice(0, totalBills > 0 ? 4 : 5).map((cat) => {
                    const pct = totalObligations > 0 ? (cat.amount / totalObligations) * 100 : 0;
                    return (
                      <div key={cat.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-3 w-3 rounded-full bg-gradient-to-br from-chart-3 to-primary shrink-0" />
                          <span className="text-sm text-foreground/80 capitalize truncate">{cat.name}</span>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-sm font-semibold text-foreground">${fmt(cat.amount)}</span>
                          <span className="text-xs text-muted-foreground ml-1.5">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <Clock className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-foreground/70">No spending data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add expenses or bills to see your breakdown</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'trend' && (
            <>
              {hasIncome || hasExpenses ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-gain" />
                      <span className="text-sm text-muted-foreground">Income</span>
                    </div>
                    <span className="text-sm font-semibold text-gain">${fmt(totalIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-loss" />
                      <span className="text-sm text-muted-foreground">Expenses</span>
                    </div>
                    <span className="text-sm font-semibold text-loss">${fmt(totalExpenses)}</span>
                  </div>
                  {totalBills > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-rose-500" />
                        <span className="text-sm text-muted-foreground">Bills</span>
                      </div>
                      <span className="text-sm font-semibold text-rose-500">${fmt(totalBills)}</span>
                    </div>
                  )}
                  {/* Simple bar comparison */}
                  <div className="space-y-2 pt-2">
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gain transition-all"
                        style={{ width: `${Math.min(100, totalIncome > 0 ? 100 : 0)}%` }}
                      />
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-loss transition-all"
                        style={{
                          width: `${totalIncome > 0 ? Math.min(100, (totalObligations / totalIncome) * 100) : (totalObligations > 0 ? 100 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                  {/* Net summary */}
                  <div className="text-center pt-2 border-t border-border/30">
                    <span className={cn('text-sm font-semibold', netRemaining >= 0 ? 'text-gain' : 'text-loss')}>
                      {netRemaining >= 0 ? '+' : ''}${fmt(netRemaining)} net
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">after all obligations</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-foreground/70">No trend data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add income & expenses to see trends</p>
                </div>
              )}
            </>
          )}

          {activeTab === 'budget' && (
            <>
              {hasIncome || hasExpenses ? (
                <div className="space-y-3">
                  <div className="text-center mb-4">
                    <p className={cn(
                      'text-3xl font-bold',
                      budgetHealthPct > 20 ? 'text-foreground' : budgetHealthPct > 0 ? 'text-amber-500' : 'text-loss'
                    )}>
                      {budgetHealthPct}%
                    </p>
                    <p className="text-sm text-muted-foreground">Budget remaining</p>
                    {netRemaining < 0 && (
                      <p className="text-xs text-loss font-medium mt-1">
                        ⚠️ Over budget by ${fmt(Math.abs(netRemaining))}
                      </p>
                    )}
                  </div>
                  <div className="h-4 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        budgetHealthPct > 20 ? 'bg-gradient-to-r from-chart-3 to-primary' : budgetHealthPct > 0 ? 'bg-amber-500' : 'bg-loss'
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(0, budgetHealthPct))}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Obligations: ${fmt(totalObligations)}</span>
                    <span>Income: ${fmt(totalIncome)}</span>
                  </div>
                  {totalBills > 0 && totalExpenses > 0 && (
                    <div className="text-xs text-muted-foreground text-center pt-1">
                      Expenses ${fmt(totalExpenses)} + Bills ${fmt(totalBills)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="mx-auto mb-3 h-16 w-16 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="font-medium text-foreground/70">No budget data yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add entries to see your budget health</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Income / Total Obligations summary */}
      <div className="relative z-10 px-6 pb-3">
        <div className="flex items-center justify-between py-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-gain" />
            <span className="text-sm text-muted-foreground">Income</span>
          </div>
          <span className="text-sm font-semibold text-foreground">${fmt(totalIncome)}</span>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-loss" />
            <span className="text-sm text-muted-foreground">Total Obligations</span>
          </div>
          <span className="text-sm font-semibold text-foreground">${fmt(totalObligations)}</span>
        </div>
        {/* Budget bar */}
        <div className="h-2.5 rounded-full bg-muted overflow-hidden mt-1">
          <div
            className={cn(
              'h-full rounded-full transition-all',
              netRemaining >= 0 ? 'bg-gradient-to-r from-gain to-chart-2' : 'bg-loss'
            )}
            style={{ width: `${totalIncome > 0 ? Math.min(100, Math.max(0, (netRemaining / totalIncome) * 100)) : 0}%` }}
          />
        </div>
      </div>

      {/* Budget Health + Savings Rate cards */}
      <div className="relative z-10 px-6 pb-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 bg-muted/50 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Budget Health</span>
          </div>
          <p className={cn(
            'text-3xl font-bold',
            budgetHealthPct > 20 ? 'text-foreground' : budgetHealthPct > 0 ? 'text-amber-500' : 'text-loss'
          )}>
            {budgetHealthPct}%
          </p>
        </div>
        <div className="rounded-2xl p-4 bg-muted/50 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Savings Rate</span>
          </div>
          <p className={cn(
            'text-3xl font-bold',
            savingsRatePct > 20 ? 'text-foreground' : savingsRatePct > 0 ? 'text-amber-500' : 'text-loss'
          )}>
            {savingsRatePct}%
          </p>
        </div>
      </div>
    </div>
  );
}
