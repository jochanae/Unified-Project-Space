import { useState } from 'react';
import { Plan } from '@/hooks/usePlan';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Target,
  TrendingUp,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  GraduationCap,
  Shield,
  Briefcase,
  PiggyBank,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  target: Target,
  'trending-up': TrendingUp,
  'graduation-cap': GraduationCap,
  shield: Shield,
  briefcase: Briefcase,
  'piggy-bank': PiggyBank,
};

const colorMap: Record<string, string> = {
  primary: 'text-primary',
  'chart-3': 'text-chart-3',
  'chart-4': 'text-chart-4',
  gain: 'text-gain',
  loss: 'text-loss',
  amber: 'text-amber-500',
  blue: 'text-blue-500',
  emerald: 'text-emerald-500',
  purple: 'text-purple-500',
};

interface PlanSelectorProps {
  plans: Plan[];
  activePlan: Plan | undefined;
  onSelectPlan: (planId: string) => void;
  onAddPlan: () => void;
  onEditPlan?: (plan: Plan) => void;
  onDeletePlan?: (planId: string) => void;
}

export function PlanSelector({
  plans,
  activePlan,
  onSelectPlan,
  onAddPlan,
  onEditPlan,
  onDeletePlan,
}: PlanSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const ActiveIcon = activePlan ? (iconMap[activePlan.icon] || Target) : Target;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2 h-10 px-4">
          {activePlan && (
            <ActiveIcon className={cn('h-4 w-4', colorMap[activePlan.color] || 'text-primary')} />
          )}
          <span className="font-medium">{activePlan?.name || 'Select Plan'}</span>
          {activePlan?.is_default && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              Default
            </Badge>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {plans.map((plan) => {
          const Icon = iconMap[plan.icon] || Target;
          const isActive = plan.id === activePlan?.id;
          
          return (
            <DropdownMenuItem
              key={plan.id}
              onClick={() => {
                onSelectPlan(plan.id);
                setIsOpen(false);
              }}
              className={cn(
                'flex items-center gap-3 py-2.5 cursor-pointer',
                isActive && 'bg-primary/5'
              )}
            >
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                isActive ? 'bg-primary/10' : 'bg-muted/50'
              )}>
                <Icon className={cn('h-4 w-4', colorMap[plan.color] || 'text-primary')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{plan.name}</span>
                  {plan.is_default && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      Default
                    </Badge>
                  )}
                </div>
                {plan.description && (
                  <p className="text-xs text-muted-foreground truncate">
                    {plan.description}
                  </p>
                )}
              </div>
              {isActive && (
                <div className="flex items-center gap-1">
                  {onEditPlan && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditPlan(plan);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  {onDeletePlan && !plan.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePlan(plan.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => {
            onAddPlan();
            setIsOpen(false);
          }}
          className="gap-2 py-2.5 cursor-pointer text-primary"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Plan</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
