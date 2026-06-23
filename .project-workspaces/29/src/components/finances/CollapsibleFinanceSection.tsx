import { useState, useEffect, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleFinanceSectionProps {
  id: string;
  title: string;
  icon: ReactNode;
  badge?: ReactNode;
  actionButton?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

function getStorageKey(id: string) {
  return `finance-section-${id}`;
}

export function CollapsibleFinanceSection({
  id,
  title,
  icon,
  badge,
  actionButton,
  defaultOpen = true,
  children,
}: CollapsibleFinanceSectionProps) {
  const [isOpen, setIsOpen] = useState(() => {
    const stored = localStorage.getItem(getStorageKey(id));
    return stored !== null ? stored === 'true' : defaultOpen;
  });

  useEffect(() => {
    localStorage.setItem(getStorageKey(id), String(isOpen));
  }, [id, isOpen]);

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors"
      >
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <span className="text-sm font-bold flex-1 text-left">{title}</span>
        {badge && <div className="mr-1">{badge}</div>}
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Action button row — only when open */}
      {isOpen && actionButton && (
        <div className="flex justify-end px-4 pb-2 -mt-1">
          {actionButton}
        </div>
      )}

      {/* Collapsible content */}
      <div
        className={cn(
          'transition-all duration-200 ease-in-out overflow-hidden',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
