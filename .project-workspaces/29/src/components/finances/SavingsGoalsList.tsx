import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trash2, Target, Pencil, Plus } from 'lucide-react';
import { SavingsGoal } from '@/hooks/useFinances';
import { AddSavingsGoalDialog } from './AddSavingsGoalDialog';
import { CollapsibleFinanceSection } from './CollapsibleFinanceSection';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import type { UseMutationResult } from '@tanstack/react-query';
import type { NewSavingsGoal, UpdateSavingsGoal } from '@/hooks/useFinances';
import { cn } from '@/lib/utils';

interface SavingsGoalsListProps {
  goals: SavingsGoal[];
  addGoal: UseMutationResult<void, Error, NewSavingsGoal>;
  updateGoal: UseMutationResult<void, Error, { id: string; current_amount: number }>;
  updateGoalFull: UseMutationResult<void, Error, UpdateSavingsGoal>;
  deleteGoal: UseMutationResult<void, Error, string>;
}

export function SavingsGoalsList({ goals, addGoal, updateGoal, updateGoalFull, deleteGoal }: SavingsGoalsListProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);

  const activeGoals = goals.filter(g => g.status === 'active');
  const totalSaved = activeGoals.reduce((s, g) => s + Number(g.current_amount), 0);
  const totalTarget = activeGoals.reduce((s, g) => s + Number(g.target_amount), 0);

  return (
    <CollapsibleFinanceSection
      id="savings-goals"
      title="Savings Goals"
      icon={<Target className="h-4 w-4 text-violet-500" />}
      badge={
        <span className="text-xs font-bold text-violet-600 dark:text-violet-400">
          ${totalSaved.toLocaleString('en-US', { maximumFractionDigits: 0 })} / ${totalTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </span>
      }
      actionButton={
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-500/10"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-3 w-3" /> Add Goal
        </Button>
      }
    >
      {activeGoals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No savings goals yet. Set a goal to start saving!
        </p>
      ) : (
        <div className="space-y-2">
          {activeGoals.map(goal => {
            const progress = goal.target_amount > 0
              ? Math.min(100, (Number(goal.current_amount) / Number(goal.target_amount)) * 100)
              : 0;

            return (
              <div
                key={goal.id}
                className={cn(
                  'p-3 rounded-lg border transition-colors group',
                  progress >= 100
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : progress >= 50
                    ? 'bg-violet-500/5 border-violet-500/15'
                    : 'bg-muted/20 border-border/40 hover:border-violet-500/20'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => setEditingGoal(goal)}>
                    <span className="text-lg">{goal.emoji}</span>
                    <div>
                      <h4 className="text-sm font-bold">{goal.title}</h4>
                      {goal.deadline && (
                        <p className="text-[10px] text-muted-foreground">
                          Target: {format(parseISO(goal.deadline), 'MMM d, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setEditingGoal(goal)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                      onClick={() => {
                        const goalData = { ...goal };
                        deleteGoal.mutate(goal.id);
                        toast(`"${goalData.title}" deleted`, {
                          action: {
                            label: 'Undo',
                            onClick: () => {
                              addGoal.mutate({
                                title: goalData.title,
                                target_amount: goalData.target_amount,
                                current_amount: goalData.current_amount,
                                emoji: goalData.emoji,
                                deadline: goalData.deadline,
                              });
                            },
                          },
                          duration: 6000,
                        });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <Progress value={progress} className="h-2 mb-1.5" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">${Number(goal.current_amount).toFixed(2)} saved</span>
                  <span className={cn(
                    'font-bold',
                    progress >= 100 ? 'text-emerald-600 dark:text-emerald-400'
                      : progress >= 50 ? 'text-violet-600 dark:text-violet-400'
                      : 'text-muted-foreground'
                  )}>
                    {progress.toFixed(0)}% of ${Number(goal.target_amount).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddSavingsGoalDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSubmit={(data) => {
          addGoal.mutate(data);
          setShowAdd(false);
        }}
      />

      <AddSavingsGoalDialog
        open={!!editingGoal}
        onOpenChange={(open) => !open && setEditingGoal(null)}
        onSubmit={() => {}}
        editGoal={editingGoal}
        onUpdate={(data) => {
          updateGoalFull.mutate(data);
          setEditingGoal(null);
        }}
      />
    </CollapsibleFinanceSection>
  );
}
