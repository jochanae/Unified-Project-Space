import { useState, useRef } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Pencil, Trash2, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BudgetEntry } from '@/hooks/useFinances';
import { AddBudgetEntryDialog } from './AddBudgetEntryDialog';
import { CollapsibleFinanceSection } from './CollapsibleFinanceSection';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { NewBudgetEntry, UpdateBudgetEntry } from '@/hooks/useFinances';

const categoryLabels: Record<string, string> = {
  housing: '🏠 Housing',
  food: '🍕 Food',
  transport: '🚗 Transport',
  transportation: '🚗 Transport',
  utilities: '⚡ Utilities',
  insurance: '🛡️ Insurance',
  entertainment: '🎬 Entertainment',
  healthcare: '💊 Healthcare',
  health: '💊 Health',
  education: '📚 Education',
  subscriptions: '📱 Subscriptions',
  shopping: '🛍️ Shopping',
  personal: '👤 Personal',
  salary: '💰 Salary',
  freelance: '💻 Freelance',
  investments: '📈 Investments',
  side_hustle: '🛠️ Side Hustle',
  gifts: '🎁 Gifts',
  other: '📦 Other',
};

interface BudgetEntryListProps {
  entries: BudgetEntry[];
  addEntry: UseMutationResult<void, Error, NewBudgetEntry>;
  updateEntry: UseMutationResult<void, Error, UpdateBudgetEntry>;
  deleteEntry: UseMutationResult<void, Error, string>;
}

function fmt(n: number): string {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BudgetEntryList({ entries, addEntry, updateEntry, deleteEntry }: BudgetEntryListProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);
  const undoRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const incomeEntries = entries.filter(e => e.type === 'income');
  const expenseEntries = entries.filter(e => e.type === 'expense');
  const totalIncome = incomeEntries.reduce((s, e) => s + Number(e.amount), 0);
  const totalExpenses = expenseEntries.reduce((s, e) => s + Number(e.amount), 0);

  const handleDelete = (entry: BudgetEntry) => {
    const entryData = { ...entry };
    deleteEntry.mutate(entry.id);
    toast(`"${entryData.description || entryData.category}" deleted`, {
      action: {
        label: 'Undo',
        onClick: () => {
          addEntry.mutate({
            type: entryData.type as 'income' | 'expense',
            category: entryData.category,
            description: entryData.description,
            amount: entryData.amount,
            entry_date: entryData.entry_date,
            is_recurring: entryData.is_recurring,
            recurring_interval: entryData.recurring_interval,
          });
        },
      },
      duration: 6000,
    });
  };

  return (
    <div className="space-y-4">
      {/* Income Section */}
      <CollapsibleFinanceSection
        id="budget-income"
        title="Income"
        icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
        badge={
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {fmt(totalIncome)}
          </span>
        }
        actionButton={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3 w-3" /> Add Income
          </Button>
        }
      >
        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mb-2">
          <Info className="h-3 w-3 shrink-0" /> Salary, freelance gigs, investment returns, side hustles, or gifts received.
        </p>
        {incomeEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No income entries yet. Add your income sources.
          </p>
        ) : (
          <div className="space-y-1">
            {incomeEntries.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onEdit={() => setEditingEntry(entry)}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </div>
        )}
      </CollapsibleFinanceSection>

      {/* Expenses Section */}
      <CollapsibleFinanceSection
        id="budget-expenses"
        title="Expenses"
        icon={<TrendingDown className="h-4 w-4 text-rose-500" />}
        badge={
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
            {fmt(totalExpenses)}
          </span>
        }
        actionButton={
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10"
            onClick={() => setShowAdd(true)}
          >
            <Plus className="h-3 w-3" /> Add Expense
          </Button>
        }
      >
        <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1 mb-2">
          <Info className="h-3 w-3 shrink-0" /> One-time purchases like groceries, dining, gas, or shopping. Fixed monthly bills go in the Bills section.
        </p>
        {expenseEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No expenses tracked yet. Add individual transactions — fixed monthly bills go in the Bills section.
          </p>
        ) : (
          <div className="space-y-1">
            {expenseEntries.map(entry => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onEdit={() => setEditingEntry(entry)}
                onDelete={() => handleDelete(entry)}
              />
            ))}
          </div>
        )}
      </CollapsibleFinanceSection>

      <AddBudgetEntryDialog
        open={showAdd || !!editingEntry}
        onOpenChange={(open) => { if (!open) { setShowAdd(false); setEditingEntry(null); } }}
        onSubmit={(data) => { addEntry.mutate(data); setShowAdd(false); }}
        editEntry={editingEntry}
        onUpdate={(data) => { updateEntry.mutate(data); setEditingEntry(null); }}
      />
    </div>
  );
}

function EntryRow({ entry, onEdit, onDelete }: { entry: BudgetEntry; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group border border-border/30">
      <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={onEdit}>
        <span className="text-sm">{categoryLabels[entry.category]?.split(' ')[0] || '📦'}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold capitalize">
              {categoryLabels[entry.category]?.split(' ').slice(1).join(' ') || entry.category}
            </span>
            {entry.is_recurring && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary gap-0.5">
                <RefreshCw className="h-2.5 w-2.5" />
                {entry.recurring_interval}
              </Badge>
            )}
          </div>
          {entry.description && (
            <p className="text-xs text-muted-foreground truncate">{entry.description}</p>
          )}
          <p className="text-[10px] text-muted-foreground/60">
            {format(parseISO(entry.entry_date), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className={`text-sm font-bold tabular-nums ${entry.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {entry.type === 'income' ? '+' : '-'}${Number(entry.amount).toFixed(2)}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
