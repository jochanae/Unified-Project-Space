import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Shield, TrendingUp, Target, Lightbulb, Wallet, BarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AddSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (section: { name: string; icon?: string; color?: string }) => void;
}

const iconOptions = [
  { value: 'target', label: 'Target', icon: Target },
  { value: 'shield', label: 'Shield', icon: Shield },
  { value: 'trending-up', label: 'Trending Up', icon: TrendingUp },
  { value: 'lightbulb', label: 'Lightbulb', icon: Lightbulb },
  { value: 'wallet', label: 'Wallet', icon: Wallet },
  { value: 'bar-chart-2', label: 'Chart', icon: BarChart2 },
];

const colorOptions = [
  { value: 'primary', label: 'Primary', class: 'bg-primary' },
  { value: 'emerald', label: 'Green', class: 'bg-emerald-500' },
  { value: 'blue', label: 'Blue', class: 'bg-blue-500' },
  { value: 'purple', label: 'Purple', class: 'bg-purple-500' },
  { value: 'amber', label: 'Amber', class: 'bg-amber-500' },
  { value: 'rose', label: 'Rose', class: 'bg-rose-500' },
];

export function AddSectionDialog({
  open,
  onOpenChange,
  onSubmit,
}: AddSectionDialogProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('target');
  const [color, setColor] = useState('primary');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), icon, color });
      setName('');
      setIcon('target');
      setColor('primary');
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const SelectedIcon = iconOptions.find(i => i.value === icon)?.icon || Target;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Section</DialogTitle>
          <DialogDescription>
            Organize your plan with custom sections
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Section Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Retirement Planning"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <SelectedIcon className="h-4 w-4" />
                      {iconOptions.find(i => i.value === icon)?.label}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {colorOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setColor(opt.value)}
                    className={cn(
                      'h-8 w-8 rounded-full transition-all',
                      opt.class,
                      color === opt.value 
                        ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' 
                        : 'hover:scale-105'
                    )}
                    title={opt.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Section
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
