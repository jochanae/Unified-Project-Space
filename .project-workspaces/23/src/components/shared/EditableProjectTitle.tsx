import { useEffect, useRef, useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EditableProjectTitleProps {
  projectId: string;
  name: string;
  onRename: (id: string, newName: string) => void;
  className?: string;
}

/**
 * Inline-editable project title. Click the title (or the gold pencil icon
 * that appears on hover) to rename. Enter saves, Escape cancels.
 */
export function EditableProjectTitle({ projectId, name, onRename, className }: EditableProjectTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(name);
  }, [name, projectId]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      setDraft(name);
      setEditing(false);
      return;
    }
    if (trimmed !== name) {
      onRename(projectId, trimmed);
      toast.success('Project renamed', { description: `Now called "${trimmed}"` });
    }
    setEditing(false);
  };

  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className={cn('group flex items-center gap-2', className)}>
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') cancel();
          }}
          maxLength={80}
          className={cn(
            'flex-1 min-w-0 rounded-xl border border-primary/40 bg-background/60 px-3 py-1.5',
            'text-sm font-medium text-foreground placeholder:text-muted-foreground/50',
            'shadow-[0_0_18px_hsl(var(--primary)/0.18)] outline-none',
            'focus:border-primary/70 focus:shadow-[0_0_24px_hsl(var(--primary)/0.28)]',
          )}
          aria-label="Project name"
        />
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); commit(); }}
          className="rounded-lg p-1.5 text-primary hover:bg-primary/10 transition-colors"
          aria-label="Save name"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); cancel(); }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'group flex items-center gap-2 rounded-xl px-2 py-1 -mx-2 -my-1',
        'text-left transition-colors hover:bg-primary/5',
        className,
      )}
      aria-label={`Rename project ${name}`}
      title="Click to rename"
    >
      <span className="truncate text-sm font-medium text-foreground">
        {name}
      </span>
      <Pencil
        className={cn(
          'h-3 w-3 shrink-0 text-primary/60 opacity-60 transition-all',
          'group-hover:opacity-100 group-hover:text-primary group-hover:drop-shadow-[0_0_4px_hsl(var(--primary)/0.5)]',
          'group-focus-visible:opacity-100',
        )}
      />
    </button>
  );
}
