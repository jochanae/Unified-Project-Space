import { ReactNode, useMemo } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableWidget } from './SortableWidget';
import { useDashboardOrder } from '@/hooks/useDashboardOrder';

interface WidgetConfig {
  id: string;
  component: ReactNode;
}

interface DashboardWidgetGridProps {
  widgets: WidgetConfig[];
}

export function DashboardWidgetGrid({ widgets }: DashboardWidgetGridProps) {
  const { order, updateOrder } = useDashboardOrder();

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

  // Sort widgets based on saved order
  const sortedWidgets = useMemo(() => {
    const widgetMap = new Map(widgets.map(w => [w.id, w]));
    const sorted: WidgetConfig[] = [];
    
    // First, add widgets in the saved order
    for (const id of order) {
      const widget = widgetMap.get(id);
      if (widget) {
        sorted.push(widget);
        widgetMap.delete(id);
      }
    }
    
    // Then add any remaining widgets (new ones not in saved order)
    for (const widget of widgetMap.values()) {
      sorted.push(widget);
    }
    
    return sorted;
  }, [widgets, order]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      
      // Handle case where item might not be in order yet
      if (oldIndex === -1 || newIndex === -1) {
        const currentOrder = sortedWidgets.map(w => w.id);
        const oldIdx = currentOrder.indexOf(active.id as string);
        const newIdx = currentOrder.indexOf(over.id as string);
        if (oldIdx !== -1 && newIdx !== -1) {
          updateOrder(arrayMove(currentOrder, oldIdx, newIdx));
        }
      } else {
        updateOrder(arrayMove(order, oldIndex, newIndex));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortedWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {sortedWidgets.map((widget) => (
            <SortableWidget key={widget.id} id={widget.id}>
              {widget.component}
            </SortableWidget>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
