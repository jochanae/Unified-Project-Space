import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ASSET_CATEGORIES,
  LIABILITY_CATEGORIES,
  REVIEW_FREQUENCIES,
  type NewNetWorthItem,
} from '@/hooks/useNetWorth';

interface AddNetWorthItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (item: NewNetWorthItem) => void;
  defaultType?: 'asset' | 'liability';
}

export function AddNetWorthItemDialog({ open, onOpenChange, onSubmit, defaultType = 'asset' }: AddNetWorthItemDialogProps) {
  const [type, setType] = useState<'asset' | 'liability'>(defaultType);
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [reviewFrequency, setReviewFrequency] = useState('quarterly');

  useEffect(() => { setType(defaultType); }, [defaultType, open]);

  const categories = type === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES;

  const handleSubmit = () => {
    if (!name.trim() || !amount || !category) return;
    onSubmit({
      type,
      category,
      name: name.trim(),
      amount: parseFloat(amount),
      notes: notes.trim() || null,
      review_frequency: reviewFrequency,
    });
    // Reset
    setCategory('');
    setName('');
    setAmount('');
    setNotes('');
    setReviewFrequency('quarterly');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Net Worth</DialogTitle>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => { setType(v as 'asset' | 'liability'); setCategory(''); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="asset" className="text-sm">💰 Asset</TabsTrigger>
            <TabsTrigger value="liability" className="text-sm">💳 Liability</TabsTrigger>
          </TabsList>

          <TabsContent value={type} className="space-y-4 mt-4">
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
              <Input
                placeholder={type === 'asset' ? 'e.g. Chase Savings' : 'e.g. Student Loan'}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{type === 'asset' ? 'Current Value' : 'Balance Owed'}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-7"
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

            <Button
              onClick={handleSubmit}
              disabled={!name.trim() || !amount || !category}
              className="w-full"
            >
              Add {type === 'asset' ? 'Asset' : 'Liability'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
