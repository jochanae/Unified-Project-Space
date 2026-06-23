import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GitBranch, Plus, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEP_COLORS: Record<string, string> = {
  landing: 'hsl(var(--primary))',
  optin: 'hsl(174 72% 40%)',
  thankyou: 'hsl(142 71% 45%)',
  sales: 'hsl(48 96% 53%)',
  email: 'hsl(270 60% 55%)',
  upsell: 'hsl(25 95% 53%)',
  page: 'hsl(var(--primary))',
};

const STEP_ICONS: Record<string, string> = {
  landing: '🏠',
  optin: '📧',
  thankyou: '✅',
  sales: '💰',
  email: '📬',
  upsell: '⚡',
  page: '📄',
};

export interface FunnelFlowStep {
  id: string;
  title: string;
  step_type: string;
  description: string;
}

interface VisualFunnelFlowProps {
  steps: FunnelFlowStep[];
  onReorder?: (stepIds: string[]) => void;
  onAddStep?: (step: { title: string; step_type: string; description: string }) => void;
  onDeleteStep?: (stepId: string) => void;
}

/* ── Sortable Node ── */
function SortableNode({
  step,
  isSelected,
  onSelect,
  onDelete,
}: {
  step: FunnelFlowStep;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative shrink-0" onClick={onSelect}>
      <div
        className={cn(
          'w-[140px] rounded-xl border p-3 transition-shadow',
          'bg-card/60 backdrop-blur-md',
          isDragging && 'shadow-[0_0_30px_hsl(var(--primary)/0.2)] z-10',
          isSelected
            ? 'border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.15)]'
            : 'border-border/30 hover:border-primary/30'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{STEP_ICONS[step.step_type] || '📄'}</span>
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: `${STEP_COLORS[step.step_type] || 'hsl(var(--muted))'}20`,
                color: STEP_COLORS[step.step_type] || 'hsl(var(--muted-foreground))',
              }}
            >
              {step.step_type}
            </span>
          </div>
          <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none">
            <GripVertical className="h-3 w-3 text-muted-foreground/30 hover:text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs font-medium truncate">{step.title}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{step.description}</p>
      </div>

      {isSelected && onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive/80 flex items-center justify-center hover:bg-destructive transition-colors z-20"
        >
          <Trash2 className="h-2.5 w-2.5 text-destructive-foreground" />
        </button>
      )}
    </div>
  );
}

/* ── Overlay card (shown while dragging) ── */
function DragOverlayCard({ step }: { step: FunnelFlowStep }) {
  return (
    <div className="w-[140px] rounded-xl border border-primary/50 p-3 bg-card/90 backdrop-blur-md shadow-[0_0_40px_hsl(var(--primary)/0.3)] rotate-2">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{STEP_ICONS[step.step_type] || '📄'}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider">{step.step_type}</span>
      </div>
      <p className="text-xs font-medium truncate">{step.title}</p>
    </div>
  );
}

/* ── Main Component ── */
export function VisualFunnelFlow({ steps, onReorder, onAddStep, onDeleteStep }: VisualFunnelFlowProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const stepIds = useMemo(() => steps.map(s => s.id), [steps]);
  const activeStep = activeId ? steps.find(s => s.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setSelectedNode(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stepIds.indexOf(active.id as string);
    const newIndex = stepIds.indexOf(over.id as string);
    const newOrder = arrayMove(stepIds, oldIndex, newIndex);
    onReorder?.(newOrder);
  };

  const addStep = (type: string) => {
    onAddStep?.({ title: `New ${type} Step`, step_type: type, description: `${type} page` });
    setShowAddMenu(false);
  };

  return (
    <div data-funnel-flow className="glass rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2 text-primary">
          <GitBranch className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">Funnel Flow</span>
        </div>
        <div className="relative">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddMenu(!showAddMenu)}>
            <Plus className="h-3.5 w-3.5" /> Add Step
          </Button>
          {showAddMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 glass rounded-xl border border-border/50 p-2 min-w-[160px] shadow-xl animate-fade-in">
              {['landing', 'optin', 'thankyou', 'sales', 'email'].map(type => (
                <button key={type} onClick={() => addStep(type)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent/30 transition-colors text-left">
                  <span>{STEP_ICONS[type]}</span>
                  <span className="text-sm capitalize">{type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative min-h-[220px] overflow-x-auto overflow-y-hidden p-6">
        {/* Grid bg */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
          <defs>
            <pattern id="funnel-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="hsl(var(--border))" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#funnel-grid)" />
        </svg>

        {steps.length === 0 ? (
          <div className="flex items-center justify-center h-[180px] relative z-10">
            <div className="text-center">
              <GitBranch className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No funnel steps yet</p>
              <p className="text-xs text-muted-foreground/50">Run a build to generate your funnel</p>
            </div>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <SortableContext items={stepIds} strategy={horizontalListSortingStrategy}>
              <div className="flex items-center gap-2 relative z-10">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-2">
                    <SortableNode
                      step={step}
                      isSelected={selectedNode === step.id}
                      onSelect={() => setSelectedNode(selectedNode === step.id ? null : step.id)}
                      onDelete={onDeleteStep ? () => { onDeleteStep(step.id); setSelectedNode(null); } : undefined}
                    />
                    {i < steps.length - 1 && (
                      <svg width="32" height="20" className="shrink-0 text-primary/30">
                        <line x1="0" y1="10" x2="24" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                        <polygon points="24,5 32,10 24,15" fill="currentColor" />
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            </SortableContext>

            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
              {activeStep ? <DragOverlayCard step={activeStep} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
