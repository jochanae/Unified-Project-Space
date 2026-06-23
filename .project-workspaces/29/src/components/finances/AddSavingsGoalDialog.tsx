import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { NewSavingsGoal, SavingsGoal } from '@/hooks/useFinances';

const EMOJI_OPTIONS = ['🎯', '🏠', '🚗', '✈️', '💍', '📱', '🎓', '🏖️', '💰', '🏋️'];

interface AddSavingsGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (goal: NewSavingsGoal) => void;
  editGoal?: SavingsGoal | null;
  onUpdate?: (data: { id: string } & NewSavingsGoal) => void;
}

export function AddSavingsGoalDialog({ open, onOpenChange, onSubmit, editGoal, onUpdate }: AddSavingsGoalDialogProps) {
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [emoji, setEmoji] = useState('🎯');
  const [deadline, setDeadline] = useState('');

  const isEditing = !!editGoal;

  useEffect(() => {
    if (editGoal && open) {
      setTitle(editGoal.title);
      setTargetAmount(String(editGoal.target_amount));
      setCurrentAmount(String(editGoal.current_amount));
      setEmoji(editGoal.emoji);
      setDeadline(editGoal.deadline || '');
    } else if (!open) {
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('0');
      setEmoji('🎯');
      setDeadline('');
    }
  }, [editGoal, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !targetAmount || Number(targetAmount) <= 0) return;

    const data: NewSavingsGoal = {
      title,
      emoji,
      target_amount: Number(targetAmount),
      current_amount: Number(currentAmount) || 0,
      deadline: deadline || null,
    };

    if (isEditing && onUpdate) {
      onUpdate({ id: editGoal!.id, ...data });
    } else {
      onSubmit(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit' : 'New'} Savings Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Emoji picker */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-xl p-1.5 rounded-lg transition-colors ${
                    emoji === e ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Goal Name</Label>
            <Input
              placeholder="e.g. Emergency fund"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Target ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="5000.00"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{isEditing ? 'Current Amount' : 'Already Saved'} ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Target Date (optional)</Label>
            <Input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full">
            {isEditing ? 'Save Changes' : 'Create Goal'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
