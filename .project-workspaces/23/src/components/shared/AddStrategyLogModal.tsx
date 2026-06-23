import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { NoteType } from '@/types/funnelhub';

const TYPES: NoteType[] = ['Note', 'Plan', 'Idea', 'Hypothesis', 'Result', 'Backlog'];

interface AddStrategyLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (entry: { type: NoteType; title: string; body: string }) => void;
  projectName: string | null;
  submitting?: boolean;
}

export function AddStrategyLogModal({
  open,
  onOpenChange,
  onSubmit,
  projectName,
  submitting,
}: AddStrategyLogModalProps) {
  const [type, setType] = useState<NoteType>('Note');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (open) {
      setType('Note');
      setTitle('');
      setBody('');
    }
  }, [open]);

  const canSubmit = title.trim().length > 0 && !submitting;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ type, title: title.trim(), body: body.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-serif tracking-tight">New Strategy Entry</DialogTitle>
          <DialogDescription>
            {projectName ? `Logged to ${projectName}` : 'Logged to active project'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Type
            </label>
            <Select value={type} onValueChange={(v) => setType(v as NoteType)}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Title
            </label>
            <Input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Test gold CTA on hero"
              className="mt-1.5"
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              Details <span className="normal-case opacity-60">(optional)</span>
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Context, hypothesis, or expected outcome..."
              rows={4}
              className="mt-1.5 resize-none"
              maxLength={1000}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? 'Saving…' : 'Log entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
