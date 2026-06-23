import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Target,
  TrendingUp,
  GraduationCap,
  Shield,
  Briefcase,
  PiggyBank,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const icons = [
  { value: 'target', icon: Target, label: 'Target' },
  { value: 'trending-up', icon: TrendingUp, label: 'Trading' },
  { value: 'graduation-cap', icon: GraduationCap, label: 'Learning' },
  { value: 'shield', icon: Shield, label: 'Protection' },
  { value: 'briefcase', icon: Briefcase, label: 'Career' },
  { value: 'piggy-bank', icon: PiggyBank, label: 'Savings' },
];

const colors = [
  { value: 'primary', class: 'bg-primary', label: 'Teal' },
  { value: 'chart-3', class: 'bg-chart-3', label: 'Purple' },
  { value: 'blue', class: 'bg-blue-500', label: 'Blue' },
  { value: 'emerald', class: 'bg-emerald-500', label: 'Green' },
  { value: 'amber', class: 'bg-amber-500', label: 'Amber' },
  { value: 'loss', class: 'bg-loss', label: 'Red' },
];

interface AddPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; description?: string; icon?: string; color?: string }) => Promise<unknown>;
}

export function AddPlanDialog({ open, onOpenChange, onSubmit }: AddPlanDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [selectedColor, setSelectedColor] = useState('primary');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor,
      });
      setName('');
      setDescription('');
      setSelectedIcon('target');
      setSelectedColor('primary');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Plan</DialogTitle>
          <DialogDescription>
            Create a focused plan for a specific area of your financial life.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Plan Name</Label>
            <Input
              id="name"
              placeholder="e.g., Options Strategy, Retirement Goals"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="What's this plan for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {icons.map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={selectedIcon === value ? 'default' : 'outline'}
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setSelectedIcon(value)}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map(({ value, class: colorClass, label }) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    colorClass,
                    selectedColor === value 
                      ? 'ring-2 ring-offset-2 ring-offset-background ring-primary scale-110' 
                      : 'hover:scale-105'
                  )}
                  onClick={() => setSelectedColor(value)}
                  title={label}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Plan
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
