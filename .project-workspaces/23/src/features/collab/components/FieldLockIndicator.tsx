import { Lock } from 'lucide-react';
import type { FieldLockInfo } from '../hooks/use-field-lock';
import { cn } from '@/lib/utils';

interface Props {
  lock: FieldLockInfo | null;
  className?: string;
}

/**
 * Inline badge shown next to a field that another collaborator is currently editing.
 */
export function FieldLockIndicator({ lock, className }: Props) {
  if (!lock) return null;
  const color = lock.locked_by_color || 'hsl(var(--primary))';
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold animate-in fade-in',
        className,
      )}
      style={{
        background: color.replace(')', ' / 0.15)'),
        color,
        border: `1px solid ${color.replace(')', ' / 0.4)')}`,
      }}
      title={`${lock.locked_by_name || 'Teammate'} is editing this field`}
    >
      <Lock className="h-2.5 w-2.5" />
      <span>{lock.locked_by_name || 'Teammate'}</span>
    </div>
  );
}
