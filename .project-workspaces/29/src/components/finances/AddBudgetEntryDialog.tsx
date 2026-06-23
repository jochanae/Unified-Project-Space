import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type NewBudgetEntry, type BudgetEntry } from '@/hooks/useFinances';
import { format } from 'date-fns';

interface AddBudgetEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: NewBudgetEntry) => void;
  /** Pass an existing entry to enable edit mode */
  editEntry?: BudgetEntry | null;
  onUpdate?: (entry: { id: string } & NewBudgetEntry) => void;
}

export function AddBudgetEntryDialog({ open, onOpenChange, onSubmit, editEntry, onUpdate }: AddBudgetEntryDialogProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('other');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [entryDate, setEntryDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState('monthly');

  const isEditing = !!editEntry;

  // Populate form when editing
  useEffect(() => {
    if (editEntry && open) {
      setType(editEntry.type as 'income' | 'expense');
      setCategory(editEntry.category);
      setAmount(String(editEntry.amount));
      setDescription(editEntry.description || '');
      setEntryDate(editEntry.entry_date);
      setIsRecurring(editEntry.is_recurring);
      setRecurringInterval(editEntry.recurring_interval || 'monthly');
    } else if (!open) {
      // Reset on close
      setType('expense');
      setCategory('other');
      setAmount('');
      setDescription('');
      setEntryDate(format(new Date(), 'yyyy-MM-dd'));
      setIsRecurring(false);
      setRecurringInterval('monthly');
    }
  }, [editEntry, open]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    const data: NewBudgetEntry = {
      type,
      category,
      amount: Number(amount),
      description: description || null,
      entry_date: entryDate,
      is_recurring: isRecurring,
      recurring_interval: isRecurring ? recurringInterval : null,
    };

    if (isEditing && onUpdate) {
      onUpdate({ id: editEntry!.id, ...data });
    } else {
      onSubmit(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} {type === 'income' ? 'Income' : 'Expense'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this transaction.' : 'Record an income or expense transaction.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'outline'}
              size="sm"
              className={type === 'income' ? 'bg-gain hover:bg-gain/90' : ''}
              onClick={() => { setType('income'); setCategory('other'); }}
            >
              Income
            </Button>
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'outline'}
              size="sm"
              className={type === 'expense' ? 'bg-loss hover:bg-loss/90' : ''}
              onClick={() => { setType('expense'); setCategory('other'); }}
            >
              Expense
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Amount ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              placeholder="e.g. Monthly rent"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="recurring" className="cursor-pointer">Recurring?</Label>
            <Switch
              id="recurring"
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Interval</Label>
              <Select value={recurringInterval} onValueChange={setRecurringInterval}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button type="submit" className="w-full">
            {isEditing ? 'Save Changes' : `Add ${type === 'income' ? 'Income' : 'Expense'}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
