import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';
import { formatShortcut } from '@/hooks/useKeyboardShortcuts';

const shortcuts = [
  { key: 'Esc', description: 'Close any modal or dialog' },
  { key: 'k', ctrl: true, description: 'Open Global Search' },
  { key: 'q', alt: true, description: 'Open Quinn Mentor' },
  { key: 'j', alt: true, description: 'Open Trade Journal' },
  { key: 'd', alt: true, description: 'Go to Dashboard' },
  { key: 'c', alt: true, description: 'Open Options Calculator' },
  { key: 'p', alt: true, description: 'Open Paper Trading' },
  { key: 's', alt: true, description: 'Open Strategies' },
  { key: 'l', alt: true, description: 'Open Learning Hub' },
  { key: 'r', alt: true, description: 'Open Reminders' },
  { key: 'a', alt: true, description: 'Open Analytics' },
  { key: 'g', alt: true, description: 'Open Glossary' },
  { key: '/', description: 'Show this dialog' },
];

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleToggle = () => setOpen((prev) => !prev);
    document.addEventListener('toggle-shortcuts-dialog', handleToggle);
    return () => document.removeEventListener('toggle-shortcuts-dialog', handleToggle);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-4">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key + (shortcut.alt ? '-alt' : '')}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
            >
              <span className="text-sm">{shortcut.description}</span>
              <Badge variant="outline" className="font-mono text-xs">
                {formatShortcut(shortcut)}
              </Badge>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">/</kbd> anytime to show this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}
