import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { SavingsGoal } from '@/hooks/useFinances';

interface UpdateSavingsAmountDialogProps {
  goal: SavingsGoal | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, amount: number) => void;
}

export function UpdateSavingsAmountDialog({ goal, onOpenChange, onSubmit }: UpdateSavingsAmountDialogProps) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (goal) setAmount(String(goal.current_amount));
  }, [goal]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal || Number(amount) < 0) return;
    onSubmit(goal.id, Number(amount));
  };

  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {goal?.emoji} Update "{goal?.title}"
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Amount Saved ($)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            {goal && (
              <p className="text-xs text-muted-foreground">
                Target: ${Number(goal.target_amount).toFixed(2)}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full">Update</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
