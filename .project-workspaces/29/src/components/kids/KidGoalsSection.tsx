import { useState } from 'react';
import { useKidGoals, GOAL_TEMPLATES, GoalTemplate, KidGoal } from '@/hooks/useKidGoals';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Star,
  Plus,
  Target,
  CheckCircle,
  Sparkles,
  Trophy,
  PiggyBank,
  BookOpen,
  TrendingUp,
  Zap,
  PartyPopper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface KidGoalsSectionProps {
  portfolioId?: string | null;
  kidProfileId?: string | null;
  allowanceBalance?: number;
}

const categoryIcons = {
  savings: PiggyBank,
  learning: BookOpen,
  trading: TrendingUp,
  challenge: Zap,
};

const categoryColors = {
  savings: 'from-chart-3 to-gain',
  learning: 'from-primary to-chart-4',
  trading: 'from-gain to-gold',
  challenge: 'from-gold to-chart-3',
};

function GoalCard({
  goal,
  onComplete,
  onDelete,
}: {
  goal: KidGoal;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [showConfetti, setShowConfetti] = useState(false);
  const CategoryIcon = categoryIcons[goal.category];
  const progress = goal.target_amount 
    ? goal.category === 'savings' && (goal as any)._allowanceBalance != null
      ? Math.min(100, ((goal as any)._allowanceBalance / goal.target_amount) * 100)
      : Math.min(100, ((goal.current_amount || 0) / goal.target_amount) * 100)
    : 0;
  const displayCurrent = goal.category === 'savings' && (goal as any)._allowanceBalance != null
    ? (goal as any)._allowanceBalance
    : (goal.current_amount || 0);

  const handleComplete = () => {
    setShowConfetti(true);
    setTimeout(() => {
      onComplete();
      setShowConfetti(false);
    }, 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative"
    >
      {showConfetti && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.5, 1] }}
            className="text-6xl"
          >
            🎉
          </motion.div>
        </div>
      )}
      
      <Card className={cn(
        'overflow-hidden transition-all hover:shadow-lg',
        goal.status === 'completed' && 'opacity-75 border-gain'
      )}>
        <div className={cn('h-2 bg-gradient-to-r', categoryColors[goal.category])} />
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-2xl',
              categoryColors[goal.category]
            )}>
              {goal.emoji}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className={cn(
                    'font-bold text-base',
                    goal.status === 'completed' && 'line-through text-muted-foreground'
                  )}>
                    {goal.title}
                  </h3>
                  {goal.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {goal.description}
                    </p>
                  )}
                </div>
                <Badge className="shrink-0 bg-gold/20 text-gold gap-1">
                  <Star className="h-3 w-3 fill-gold" />
                  {goal.stars_reward}
                </Badge>
              </div>

              {goal.target_amount && goal.status !== 'completed' && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      ${displayCurrent} / ${goal.target_amount}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              {goal.status === 'completed' ? (
                <div className="flex items-center gap-2 mt-3 text-gain">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Completed! 🎉</span>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    className="flex-1 rounded-full bg-gradient-to-r from-gain to-chart-3"
                    onClick={handleComplete}
                  >
                    <Trophy className="h-4 w-4 mr-1" />
                    Complete!
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={onDelete}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TemplatePickerDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (template: GoalTemplate) => void;
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');

  const handleCustomSubmit = () => {
    if (!customTitle.trim()) return;
    onSelect({
      title: customTitle.trim(),
      description: 'My own goal!',
      category: 'challenge',
      emoji: '🎯',
      stars_reward: 2,
    });
    setCustomTitle('');
    setShowCustom(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            Pick a Goal
          </DialogTitle>
          <DialogDescription>
            Choose a goal you want to work towards!
          </DialogDescription>
        </DialogHeader>

        {showCustom ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="custom-goal">What's your goal?</Label>
              <Input
                id="custom-goal"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="e.g., Save $30 for a toy"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCustom(false)}>
                Back
              </Button>
              <Button onClick={handleCustomSubmit} disabled={!customTitle.trim()}>
                Add Goal
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 gap-3">
              {GOAL_TEMPLATES.map((template, index) => {
                const CategoryIcon = categoryIcons[template.category];
                return (
                  <button
                    key={index}
                    onClick={() => {
                      onSelect(template);
                      onOpenChange(false);
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-xl border-2 border-transparent',
                      'bg-muted/50 hover:bg-muted hover:border-primary/30 transition-all text-left'
                    )}
                  >
                    <span className="text-2xl">{template.emoji}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{template.title}</p>
                      <p className="text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    <Badge variant="secondary" className="bg-gold/20 text-gold gap-1">
                      <Star className="h-3 w-3 fill-gold" />
                      {template.stars_reward}
                    </Badge>
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => setShowCustom(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create My Own Goal
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function KidGoalsSection({ portfolioId, kidProfileId, allowanceBalance }: KidGoalsSectionProps) {
  const {
    activeGoals: rawActiveGoals,
    completedGoals: rawCompletedGoals,
    totalStarsEarned,
    isLoading,
    addGoalFromTemplate,
    completeGoal,
    deleteGoal,
  } = useKidGoals(portfolioId, kidProfileId);

  // Inject allowance balance into savings goals for progress tracking
  const activeGoals = rawActiveGoals.map(g => 
    g.category === 'savings' && g.target_amount && allowanceBalance != null
      ? { ...g, _allowanceBalance: allowanceBalance } as any
      : g
  );
  const completedGoals = rawCompletedGoals;

  const [showPicker, setShowPicker] = useState(false);

  const handleSelectTemplate = async (template: GoalTemplate) => {
    await addGoalFromTemplate(template);
  };

  return (
    <div className="space-y-6">
      {/* Header with stars count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold/60">
            <Target className="h-6 w-6 text-gold-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold">My Goals</h2>
            <p className="text-sm text-muted-foreground">
              {activeGoals.length} active · {completedGoals.length} completed
            </p>
          </div>
        </div>
        
        <Button
          onClick={() => setShowPicker(true)}
          className="rounded-full bg-gradient-to-r from-primary to-gain"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Goal
        </Button>
      </div>

      {/* Goals earned summary */}
      {completedGoals.length > 0 && (
        <Card className="bg-gradient-to-r from-gold/10 to-chart-3/10 border-gold/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PartyPopper className="h-6 w-6 text-gold" />
              <div>
                <p className="font-bold text-sm">Great job!</p>
                <p className="text-xs text-muted-foreground">
                  You've completed {completedGoals.length} goal{completedGoals.length !== 1 ? 's' : ''}!
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-gold/20 px-3 py-1.5 rounded-full">
              <Star className="h-5 w-5 text-gold fill-gold" />
              <span className="font-bold text-gold">{totalStarsEarned} earned</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Working On
          </h3>
          <AnimatePresence mode="popLayout">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onComplete={() => completeGoal(goal.id, goal.stars_reward)}
                onDelete={() => deleteGoal(goal.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Completed Goals */}
      {completedGoals.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Completed
          </h3>
          <div className="space-y-3 opacity-75">
            {completedGoals.slice(0, 3).map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onComplete={() => {}}
                onDelete={() => deleteGoal(goal.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {activeGoals.length === 0 && completedGoals.length === 0 && !isLoading && (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold/10 mx-auto mb-4">
              <Target className="h-8 w-8 text-gold" />
            </div>
            <h3 className="text-lg font-bold mb-2">Set Your First Goal!</h3>
            <p className="text-muted-foreground text-sm mb-4 max-w-xs mx-auto">
              Goals help you focus on what's important. Pick one and start working towards it!
            </p>
            <Button
              onClick={() => setShowPicker(true)}
              className="rounded-full bg-gradient-to-r from-primary to-gain"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Pick a Goal
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Template Picker */}
      <TemplatePickerDialog
        open={showPicker}
        onOpenChange={setShowPicker}
        onSelect={handleSelectTemplate}
      />
    </div>
  );
}
