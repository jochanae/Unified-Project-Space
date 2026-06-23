import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  REVIEW_FREQUENCIES,
  type NetWorthItem,
} from '@/hooks/useNetWorth';

interface EditNetWorthItemDialogProps {
  item: NetWorthItem | null;
  onOpenChange: (open: boolean) => void;
  onUpdate: (data: { id: string; amount: number; name?: string; notes?: string; category?: string; review_frequency?: string }) => void;
}

export function EditNetWorthItemDialog({ item, onOpenChange, onUpdate }: EditNetWorthItemDialogProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [notes, setNotes] = useState('');
  const [reviewFrequency, setReviewFrequency] = useState('quarterly');

  useEffect(() => {
    if (item) {
      setName(item.name);
      setAmount(String(item.amount));
      setCategory(item.category);
      setNotes(item.notes || '');
      setReviewFrequency(item.review_frequency || 'quarterly');
    }
  }, [item]);

  const categories = item?.type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || !name.trim() || !amount) return;
    onUpdate({
      id: item.id,
      amount: parseFloat(amount),
      name: name.trim(),
      notes: notes.trim() || undefined,
      category,
      review_frequency: reviewFrequency,
    });
  };

  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {item?.type === 'asset' ? 'Asset' : 'Liability'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label>{item?.type === 'asset' ? 'Current Value' : 'Balance Owed'}</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Remind me to update</Label>
            <Select value={reviewFrequency} onValueChange={setReviewFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REVIEW_FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any details about this item..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!name.trim() || !amount}>
            Save Changes
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
