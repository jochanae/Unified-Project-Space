import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { AVAILABLE_SHORTCUTS, type FooterShortcut } from './AppFooterBar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FooterShortcutEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftIds: string[];
  rightIds: string[];
  onSave: (left: string[], right: string[]) => void;
}

export function FooterShortcutEditor({ open, onOpenChange, leftIds, rightIds, onSave }: FooterShortcutEditorProps) {
  const [editLeft, setEditLeft] = useState(leftIds);
  const [editRight, setEditRight] = useState(rightIds);
  const [editingSide, setEditingSide] = useState<'left' | 'right'>('left');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEditLeft(leftIds);
      setEditRight(rightIds);
    }
    onOpenChange(isOpen);
  };

  const selectedIds = [...editLeft, ...editRight];

  const toggleShortcut = (id: string) => {
    const setter = editingSide === 'left' ? setEditLeft : setEditRight;
    const current = editingSide === 'left' ? editLeft : editRight;

    if (current.includes(id)) {
      setter(current.filter(s => s !== id));
    } else {
      if (current.length >= 3) {
        toast.error('Max 3 shortcuts per side');
        return;
      }
      // Remove from the other side if present
      if (editingSide === 'left' && editRight.includes(id)) {
        setEditRight(editRight.filter(s => s !== id));
      } else if (editingSide === 'right' && editLeft.includes(id)) {
        setEditLeft(editLeft.filter(s => s !== id));
      }
      setter([...current, id]);
    }
  };

  const handleSave = () => {
    onSave(editLeft, editRight);
    onOpenChange(false);
    toast.success('Footer shortcuts updated');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Customize Footer</DialogTitle>
        </DialogHeader>

        {/* Side selector */}
        <div className="flex gap-2 mb-3">
          <Button
            variant={editingSide === 'left' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditingSide('left')}
            className="flex-1"
          >
            Left Side ({editLeft.length}/3)
          </Button>
          <Button
            variant={editingSide === 'right' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setEditingSide('right')}
            className="flex-1"
          >
            Right Side ({editRight.length}/3)
          </Button>
        </div>

        {/* Currently selected for this side */}
        <div className="flex gap-2 mb-3 min-h-[40px] flex-wrap">
          {(editingSide === 'left' ? editLeft : editRight).map(id => {
            const s = AVAILABLE_SHORTCUTS.find(x => x.id === id);
            if (!s) return null;
            return (
              <Badge key={id} variant="secondary" className="gap-1 px-3 py-1.5">
                {s.label}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleShortcut(id)}
                />
              </Badge>
            );
          })}
          {(editingSide === 'left' ? editLeft : editRight).length === 0 && (
            <span className="text-sm text-muted-foreground">Tap below to add</span>
          )}
        </div>

        {/* Available options */}
        <div className="grid grid-cols-3 gap-2">
          {AVAILABLE_SHORTCUTS.map(shortcut => {
            const isSelected = selectedIds.includes(shortcut.id);
            const isOnThisSide = (editingSide === 'left' ? editLeft : editRight).includes(shortcut.id);

            return (
              <button
                key={shortcut.id}
                onClick={() => toggleShortcut(shortcut.id)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all',
                  isOnThisSide
                    ? 'border-primary bg-primary/10 text-primary'
                    : isSelected
                      ? 'border-muted-foreground/30 bg-muted/50 text-muted-foreground/60'
                      : 'border-border hover:border-primary/50 hover:bg-muted'
                )}
              >
                <div className="relative">
                  {shortcut.icon}
                  {isOnThisSide && (
                    <Check className="h-3 w-3 absolute -top-1 -right-1 text-primary" />
                  )}
                </div>
                <span className="text-[11px] font-medium">{shortcut.label}</span>
              </button>
            );
          })}
        </div>

        <Button onClick={handleSave} className="w-full mt-3">
          Save Shortcuts
        </Button>
      </DialogContent>
    </Dialog>
  );
}
