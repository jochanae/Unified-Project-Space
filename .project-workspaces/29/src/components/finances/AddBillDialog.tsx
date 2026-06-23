import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { BILL_CATEGORIES, type NewBill, type Bill } from '@/hooks/useFinances';

interface AddBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (bill: NewBill) => void;
  editBill?: Bill | null;
  onUpdate?: (bill: { id: string } & NewBill) => void;
}

export function AddBillDialog({ open, onOpenChange, onSubmit, editBill, onUpdate }: AddBillDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDay, setDueDay] = useState('1');
  const [category, setCategory] = useState('other');
  const [isAutopay, setIsAutopay] = useState(false);

  const isEditing = !!editBill;

  useEffect(() => {
    if (editBill && open) {
      setName(editBill.name);
      setAmount(String(editBill.amount));
      setDueDay(String(editBill.due_day));
      setCategory(editBill.category);
      setIsAutopay(editBill.is_autopay);
    } else if (!open) {
      setName('');
      setAmount('');
      setDueDay('1');
      setCategory('other');
      setIsAutopay(false);
    }
  }, [editBill, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || Number(amount) <= 0) return;

    const data: NewBill = {
      name,
      amount: Number(amount),
      due_day: Number(dueDay),
      category,
      is_autopay: isAutopay,
    };

    if (isEditing && onUpdate) {
      onUpdate({ id: editBill!.id, ...data });
    } else {
      onSubmit(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'Add'} Bill</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update this bill\'s details.' : 'Add a recurring bill to track each month.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Bill Name</Label>
            <Input
              placeholder="e.g. Electric bill"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="off"
            />
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
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILL_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Due Day of Month</Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="autopay" className="cursor-pointer">Autopay enabled?</Label>
              <Switch
                id="autopay"
                checked={isAutopay}
                onCheckedChange={setIsAutopay}
              />
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight">
              Mark this if you pay this bill via autopay on your bank or card. This is just a label — the app won't charge anything.
            </p>
          </div>

          <Button type="submit" className="w-full">
            {isEditing ? 'Save Changes' : 'Add Bill'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
