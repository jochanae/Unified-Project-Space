import { useState, useMemo } from 'react';
import { Plus, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { BudgetEntry, EXPENSE_CATEGORIES } from '@/hooks/useFinances';

interface BudgetPlannerProps {
  entries: BudgetEntry[];
  totalIncome: number;
  onAddEntry: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  housing: '🏠',
  food: '🍽️',
  transport: '🚗',
  utilities: '💡',
  insurance: '🛡️',
  entertainment: '🎬',
  healthcare: '🏥',
  education: '📚',
  subscriptions: '📱',
  other: '📦',
};

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

export function BudgetPlanner({ entries, totalIncome, onAddEntry }: BudgetPlannerProps) {
  const [showAll, setShowAll] = useState(false);

  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, { spent: number; count: number }> = {};

    for (const entry of entries.filter((e) => e.type === 'expense')) {
      const cat = entry.category || 'other';
      if (!cats[cat]) cats[cat] = { spent: 0, count: 0 };
      cats[cat].spent += Number(entry.amount);
      cats[cat].count += 1;
    }

    return EXPENSE_CATEGORIES.map((cat) => ({
      category: cat,
      emoji: CATEGORY_ICONS[cat] || '📦',
      spent: cats[cat]?.spent || 0,
      count: cats[cat]?.count || 0,
      pctOfIncome: totalIncome > 0 ? ((cats[cat]?.spent || 0) / totalIncome) * 100 : 0,
    })).sort((a, b) => b.spent - a.spent);
  }, [entries, totalIncome]);

  const totalSpent = categoryBreakdown.reduce((sum, c) => sum + c.spent, 0);
  const displayCategories = showAll ? categoryBreakdown : categoryBreakdown.slice(0, 5);
  const budgetUsedPct = totalIncome > 0 ? Math.min(100, (totalSpent / totalIncome) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Wallet className="h-4.5 w-4.5 text-primary" />
          </div>
          Budget Planner
        </h3>
        <Button variant="outline" size="sm" onClick={onAddEntry} className="text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10">
          <Plus className="h-3.5 w-3.5" /> Add Expense
        </Button>
      </div>

      {/* Overall Budget Bar */}
      <div className={cn(
        'rounded-xl border p-4 space-y-3 shadow-sm',
        budgetUsedPct > 90
          ? 'bg-rose-500/5 border-rose-500/20'
          : budgetUsedPct > 70
          ? 'bg-amber-500/5 border-amber-500/20'
          : 'bg-emerald-500/5 border-emerald-500/20'
      )}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Total Spent</span>
          <span className="text-sm font-bold">{fmt(totalSpent)} of {fmt(totalIncome)} income</span>
        </div>
        <Progress
          value={budgetUsedPct}
          className="h-3"
        />
        <div className="flex items-center justify-between text-xs">
          {totalIncome > totalSpent ? (
            <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{fmt(totalIncome - totalSpent)} remaining</span>
            </div>
          ) : totalSpent > totalIncome ? (
            <div className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{fmt(totalSpent - totalIncome)} over budget</span>
            </div>
          ) : (
            <span className="text-muted-foreground">No data yet</span>
          )}
          <span className={cn(
            'font-bold',
            budgetUsedPct > 90 ? 'text-rose-600 dark:text-rose-400'
              : budgetUsedPct > 70 ? 'text-amber-600 dark:text-amber-400'
              : 'text-emerald-600 dark:text-emerald-400'
          )}>
            {budgetUsedPct.toFixed(0)}% used
          </span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-card rounded-xl border border-border/60 divide-y divide-border/30 overflow-hidden shadow-sm">
        {displayCategories.map((cat) => (
          <div key={cat.category} className="flex items-center gap-3 p-3 hover:bg-accent/20 transition-colors">
            <span className="text-lg w-8 text-center">{cat.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold capitalize">{cat.category.replace('_', ' ')}</span>
                <span className="text-sm font-bold">{fmt(cat.spent)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-accent/40 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      cat.pctOfIncome > 30 ? 'bg-rose-500' : cat.pctOfIncome > 15 ? 'bg-amber-500' : 'bg-emerald-500'
                    )}
                    style={{ width: `${Math.min(100, cat.pctOfIncome)}%` }}
                  />
                </div>
                <span className={cn(
                  'text-xs font-bold shrink-0 w-10 text-right',
                  cat.pctOfIncome > 30 ? 'text-rose-600 dark:text-rose-400'
                    : cat.pctOfIncome > 15 ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                )}>
                  {cat.pctOfIncome.toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        ))}

        {categoryBreakdown.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2.5 text-xs text-primary font-semibold hover:bg-primary/10 transition-colors"
          >
            {showAll ? 'Show less' : `Show all ${categoryBreakdown.length} categories`}
          </button>
        )}
      </div>

      {/* Empty state */}
      {totalSpent === 0 && (
        <div className="text-center py-6 bg-card rounded-xl border border-border/60 shadow-sm">
          <Wallet className="h-10 w-10 text-primary/30 mx-auto mb-3" />
          <p className="text-sm font-semibold text-muted-foreground">No expense transactions yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add expense transactions in the Expenses section above to see your budget breakdown. Bills are tracked separately.
          </p>
          <Button variant="outline" size="sm" onClick={onAddEntry} className="mt-3 text-xs border-primary/30 text-primary hover:bg-primary/10">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add First Expense
          </Button>
        </div>
      )}
    </div>
  );
}
