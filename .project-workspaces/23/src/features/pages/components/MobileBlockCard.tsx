import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronUp, ChevronDown, Pencil, Copy, Trash2, Sparkles, Undo2 } from 'lucide-react';
import { PageBlock, BlockType } from '@/types/funnelhub';
import { BlockField } from './BlockField';
import { BlockDeleteConfirm } from './BlockDeleteConfirm';
import { RegenTone } from './EditableBlock';
import { cn } from '@/lib/utils';

interface MobileBlockCardProps {
  block: PageBlock;
  index: number;
  total: number;
  meta: { type: BlockType; label: string; icon: React.ReactNode } | undefined;
  projectId?: string;
  isRegenerating: boolean;
  canRevert: boolean;
  onUpdate: (content: Record<string, string>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: 'up' | 'down') => void;
  onRegenerate: (tone: RegenTone) => void;
  onRevert: () => void;
}

const REGEN_TONES: { tone: RegenTone; label: string }[] = [
  { tone: 'punchier', label: 'Punchier' },
  { tone: 'clearer', label: 'Clearer' },
  { tone: 'bolder', label: 'Bolder' },
];

/**
 * Mobile-only block card.
 * Collapsed by default — shows a one-line summary, ▲▼ reorder buttons, and an Edit
 * button that opens a bottom sheet hosting the full property panel.
 */
export function MobileBlockCard({
  block, index, total, meta, projectId,
  isRegenerating, canRevert,
  onUpdate, onDelete, onDuplicate, onMove, onRegenerate, onRevert,
}: MobileBlockCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // One-line summary from first textual field
  const firstText = Object.values(block.content).find(v => typeof v === 'string' && v.trim().length > 0) || '';
  const summary = firstText.length > 60 ? firstText.slice(0, 60) + '…' : firstText;

  const fields = Object.entries(block.content);

  return (
    <>
      <Card className="relative overflow-hidden">
        <div className="flex items-stretch">
          {/* Reorder rail */}
          <div className="flex flex-col border-r border-border/50 bg-muted/20">
            <button
              type="button"
              onClick={() => onMove('up')}
              disabled={index === 0}
              className={cn(
                'h-10 w-10 flex items-center justify-center text-muted-foreground transition-colors',
                'hover:bg-accent/40 hover:text-foreground active:bg-accent/60',
                'disabled:opacity-30 disabled:pointer-events-none',
              )}
              aria-label="Move block up"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <div className="h-px bg-border/50" />
            <button
              type="button"
              onClick={() => onMove('down')}
              disabled={index === total - 1}
              className={cn(
                'h-10 w-10 flex items-center justify-center text-muted-foreground transition-colors',
                'hover:bg-accent/40 hover:text-foreground active:bg-accent/60',
                'disabled:opacity-30 disabled:pointer-events-none',
              )}
              aria-label="Move block down"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="flex-1 text-left p-3 min-w-0"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
              {meta?.icon}
              <span>{meta?.label}</span>
              <span className="ml-auto text-[10px] tabular-nums opacity-60">#{index + 1}</span>
            </div>
            <p className="text-sm text-foreground truncate">
              {summary || <span className="italic text-muted-foreground/60">Empty — tap to edit</span>}
            </p>
          </button>

          {/* Edit affordance */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="px-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors border-l border-border/50"
            aria-label="Edit block"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </Card>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[88vh] glass border-border/30 rounded-t-2xl p-0 flex flex-col"
        >
          <SheetHeader className="px-4 pt-5 pb-3 border-b border-border/30 shrink-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              {meta?.icon}
              {meta?.label}
              <span className="ml-auto text-[10px] font-normal tabular-nums text-muted-foreground">
                Block {index + 1} of {total}
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {fields.map(([key, val]) => (
              <BlockField
                key={`${block.id}-${key}`}
                fieldKey={key}
                initialValue={val as string}
                block={block}
                onUpdate={onUpdate}
                projectId={projectId}
              />
            ))}

            {/* Regenerate row */}
            <div className="pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                MarQ rewrite
              </p>
              <div className="flex gap-2 flex-wrap">
                {REGEN_TONES.map(({ tone, label }) => (
                  <Button
                    key={tone}
                    variant="outline"
                    size="sm"
                    disabled={isRegenerating}
                    onClick={() => onRegenerate(tone)}
                    className="gap-1.5 h-8"
                  >
                    <Sparkles className="h-3 w-3" />
                    {label}
                  </Button>
                ))}
                {canRevert && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRevert}
                    className="gap-1.5 h-8"
                  >
                    <Undo2 className="h-3 w-3" />
                    Revert
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Sticky footer actions */}
          <div className="border-t border-border/30 px-4 py-3 flex items-center gap-2 shrink-0 bg-background/50 backdrop-blur">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onDuplicate(); }}
              className="gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
            <Button
              size="sm"
              onClick={() => setSheetOpen(false)}
              className="ml-auto"
            >
              Done
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <BlockDeleteConfirm
        open={showDeleteConfirm}
        blockLabel={meta?.label || block.type}
        onConfirm={() => { setShowDeleteConfirm(false); setSheetOpen(false); onDelete(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
