import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { FooterShortcut } from '@/hooks/useFooterShortcuts';

interface SortableShortcutItemProps {
  shortcut: FooterShortcut;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}

export function SortableShortcutItem({ 
  shortcut, 
  isSelected, 
  onToggle, 
  disabled 
}: SortableShortcutItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: shortcut.id, disabled: !isSelected });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-3 rounded-lg border transition-colors",
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:bg-accent",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
    >
      {isSelected && (
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground hover:text-foreground touch-none"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      
      <div 
        className="flex items-center gap-3 flex-1 cursor-pointer"
        onClick={onToggle}
      >
        <Checkbox
          id={shortcut.id}
          checked={isSelected}
          onCheckedChange={onToggle}
          disabled={disabled && !isSelected}
        />
        <div className={cn("p-2 rounded-md bg-muted", shortcut.color)}>
          {getIcon(shortcut.icon)}
        </div>
        <Label htmlFor={shortcut.id} className="flex-1 cursor-pointer font-medium">
          {shortcut.label}
        </Label>
      </div>
    </div>
  );
}
