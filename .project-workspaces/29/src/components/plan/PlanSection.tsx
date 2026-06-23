import { useState } from 'react';
import { PlanSectionWithItems, PlanItem } from '@/hooks/usePlan';
import { PlanItemCard } from './PlanItemCard';
import { AddPlanItemSheet } from './AddPlanItemSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Shield,
  TrendingUp,
  BarChart2,
  Target,
  Lightbulb,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanSectionProps {
  section: PlanSectionWithItems;
  onUpdateSection: (id: string, updates: Partial<PlanSectionWithItems>) => void;
  onDeleteSection: (id: string) => void;
  onUpdateItem: (id: string, updates: Partial<PlanItem>) => void;
  onDeleteItem: (id: string) => void;
  onArchiveItem: (id: string) => void;
  onAddItem: (item: { title: string; description?: string; section_id?: string; priority?: 'low' | 'medium' | 'high' }) => void;
  onAskQuinn?: (item: PlanItem) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  'trending-up': TrendingUp,
  'bar-chart-2': BarChart2,
  target: Target,
  lightbulb: Lightbulb,
  wallet: Wallet,
};

const colorMap: Record<string, string> = {
  emerald: 'text-emerald-500',
  blue: 'text-blue-500',
  purple: 'text-purple-500',
  primary: 'text-primary',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
};

const progressColorMap: Record<string, string> = {
  emerald: '[&>div]:bg-emerald-500',
  blue: '[&>div]:bg-blue-500',
  purple: '[&>div]:bg-purple-500',
  primary: '[&>div]:bg-primary',
  amber: '[&>div]:bg-amber-500',
  rose: '[&>div]:bg-rose-500',
};

export function PlanSection({
  section,
  onUpdateSection,
  onDeleteSection,
  onUpdateItem,
  onDeleteItem,
  onArchiveItem,
  onAddItem,
  onAskQuinn,
}: PlanSectionProps) {
  const [isOpen, setIsOpen] = useState(!section.is_collapsed);
  const [showAddItem, setShowAddItem] = useState(false);

  const Icon = iconMap[section.icon] || Target;
  const iconColor = colorMap[section.color] || 'text-primary';
  const progressColor = progressColorMap[section.color] || '[&>div]:bg-primary';

  const completedCount = section.items.filter(i => i.status === 'completed').length;
  const inProgressCount = section.items.filter(i => i.status === 'in_progress').length;
  const totalCount = section.items.length;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = (open: boolean) => {
    setIsOpen(open);
    onUpdateSection(section.id, { is_collapsed: !open });
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={handleToggle}>
        {/* Section Header */}
        <div className="px-4 py-3 bg-muted/30">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger className="flex items-center gap-3 flex-1 text-left">
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <Icon className={cn('h-5 w-5', iconColor)} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{section.name}</h3>
                  {totalCount > 0 && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {completedCount}/{totalCount}
                    </Badge>
                  )}
                </div>
              </div>
            </CollapsibleTrigger>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowAddItem(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              {!section.is_default && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit section
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteSection(section.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete section
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Section progress bar */}
          {totalCount > 0 && (
            <div className="mt-2 flex items-center gap-3">
              <Progress value={completionPercent} className={cn('h-1.5 flex-1', progressColor)} />
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {completionPercent}%
                {inProgressCount > 0 && ` · ${inProgressCount} active`}
              </span>
            </div>
          )}
        </div>

        {/* Section Items */}
        <CollapsibleContent>
          <div className="p-3 space-y-2">
            {section.items.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No items yet</p>
                <Button
                  variant="link"
                  size="sm"
                  className="mt-1"
                  onClick={() => setShowAddItem(true)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add your first item
                </Button>
              </div>
            ) : (
              section.items.map((item) => (
                <PlanItemCard
                  key={item.id}
                  item={item}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                  onArchive={onArchiveItem}
                  onAskQuinn={onAskQuinn}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Add Item Sheet */}
      <AddPlanItemSheet
        open={showAddItem}
        onOpenChange={setShowAddItem}
        sectionId={section.id}
        sectionName={section.name}
        onSubmit={(item) => {
          onAddItem({ ...item, section_id: section.id });
          setShowAddItem(false);
        }}
      />
    </div>
  );
}
