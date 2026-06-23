import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Settings2, Loader2 } from 'lucide-react';
import { useFooterShortcuts, FooterShortcutId, ALL_SHORTCUTS } from '@/hooks/useFooterShortcuts';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableShortcutItem } from './SortableShortcutItem';

export function FooterShortcutsSettings() {
  const { shortcuts, updateShortcuts, isLoading } = useFooterShortcuts();
  const [selectedShortcuts, setSelectedShortcuts] = useState<FooterShortcutId[]>(shortcuts);
  const [isOpen, setIsOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleToggle = (id: FooterShortcutId) => {
    setSelectedShortcuts(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) {
          toast.info('You need at least 2 shortcuts');
          return prev;
        }
        return prev.filter(s => s !== id);
      }
      if (prev.length >= 5) {
        toast.info('Maximum 5 shortcuts. Deselect one first.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSelectedShortcuts((items) => {
        const oldIndex = items.indexOf(active.id as FooterShortcutId);
        const newIndex = items.indexOf(over.id as FooterShortcutId);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    await updateShortcuts(selectedShortcuts);
    setIsOpen(false);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setSelectedShortcuts(shortcuts);
    }
  };

  // Sort shortcuts: selected ones first (in their order), then unselected
  // Filter out any invalid shortcut IDs that no longer exist in ALL_SHORTCUTS
  const validSelectedShortcuts = selectedShortcuts.filter(id => 
    ALL_SHORTCUTS.some(s => s.id === id)
  );
  const sortedShortcuts = [
    ...validSelectedShortcuts.map(id => ALL_SHORTCUTS.find(s => s.id === id)!),
    ...ALL_SHORTCUTS.filter(s => !validSelectedShortcuts.includes(s.id)),
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-11 px-1 text-[10px] text-muted-foreground flex flex-col items-center gap-0.5 transition-all duration-200 hover:text-foreground hover:bg-accent/50 hover:scale-105 active:scale-95"
        >
          <Settings2 className="h-5 w-5 text-muted-foreground transition-transform" />
          <span>Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Customize Footer Shortcuts</DialogTitle>
          <DialogDescription>
            Select 2-5 shortcuts and drag to reorder them
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4 overflow-y-auto flex-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedShortcuts}
              strategy={verticalListSortingStrategy}
            >
              {sortedShortcuts.map((shortcut) => (
                <SortableShortcutItem
                  key={shortcut.id}
                  shortcut={shortcut}
                  isSelected={validSelectedShortcuts.includes(shortcut.id)}
                  onToggle={() => handleToggle(shortcut.id)}
                  disabled={validSelectedShortcuts.length >= 5}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            {validSelectedShortcuts.length}/5 selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading || selectedShortcuts.length < 2}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
