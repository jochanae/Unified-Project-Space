import { useState, useRef, useEffect, ReactNode } from 'react';
import { Sparkles, Undo2, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type RegenTone = 'punchier' | 'professional' | 'emotional' | 'bolder' | 'clearer';

interface EditableBlockProps {
  children: ReactNode;
  isEditing: boolean;
  canRevert: boolean;
  isRegenerating?: boolean;
  onRegenerate: (tone: RegenTone) => void;
  onRevert: () => void;
}

/**
 * Wraps a Page Builder block to provide:
 *  - Gold-glow draft state when any field inside is focused
 *  - Floating Action Dock (Regenerate ✨ / Revert ⏪) on hover or focus
 */
export function EditableBlock({
  children,
  isEditing,
  canRevert,
  isRegenerating = false,
  onRegenerate,
  onRevert,
}: EditableBlockProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-select text when an input/textarea inside this block is focused
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (
        (target instanceof HTMLInputElement && target.type === 'text') ||
        target instanceof HTMLTextAreaElement
      ) {
        // Defer so the browser places the caret first, then we select
        requestAnimationFrame(() => {
          try {
            (target as HTMLInputElement | HTMLTextAreaElement).select();
          } catch {}
        });
      }
    };
    el.addEventListener('focusin', onFocusIn);
    return () => el.removeEventListener('focusin', onFocusIn);
  }, []);

  const dockVisible = isHovered || isEditing || isRegenerating;

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative transition-all duration-300 rounded-xl',
        isEditing
          ? 'ring-2 ring-primary/50 shadow-[0_0_24px_-4px_hsl(var(--primary)/0.35)]'
          : 'ring-1 ring-transparent hover:ring-border',
      )}
    >
      {children}

      {/* Floating Action Dock */}
      <div
        className={cn(
          'absolute -top-3 right-3 z-20 flex items-center gap-1 px-1.5 py-1',
          'bg-background/90 backdrop-blur-md border border-border rounded-full shadow-lg',
          'transition-all duration-200',
          dockVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none',
        )}
      >
        <TooltipProvider delayDuration={200}>
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    disabled={isRegenerating}
                    className="p-1.5 rounded-full hover:bg-primary/10 text-primary disabled:opacity-50"
                    aria-label="Regenerate this block"
                  >
                    {isRegenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Regenerate this block</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onRegenerate('punchier')}>✦ Punchier</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRegenerate('professional')}>✦ More professional</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRegenerate('emotional')}>✦ More emotional</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRegenerate('bolder')}>✦ Bolder</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRegenerate('clearer')}>✦ Clearer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-px h-4 bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onRevert}
                disabled={!canRevert || isRegenerating}
                className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Revert to previous version"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {canRevert ? 'Revert to previous version' : 'Nothing to revert'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
