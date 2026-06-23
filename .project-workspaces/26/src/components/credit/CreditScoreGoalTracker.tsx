import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Target, 
  Plus, 
  Trash2, 
  CalendarIcon,
  CheckCircle,
  TrendingUp,
  Trophy,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreditScoreGoal {
  id: string;
  target_score: number;
  target_date: string | null;
  starting_score: number;
  current_score: number | null;
  is_achieved: boolean;
  achieved_at: string | null;
  notes: string | null;
  created_at: string;
}

interface CreditScoreGoalTrackerProps {
  currentScore: number;
}

const CreditScoreGoalTracker = ({ currentScore }: CreditScoreGoalTrackerProps) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<CreditScoreGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGoal, setNewGoal] = useState({
    targetScore: '',
    targetDate: undefined as Date | undefined,
    notes: ''
  });

  const fetchGoals = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('credit_score_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  // Update current score in goals when it changes
  useEffect(() => {
    if (!user || !currentScore || goals.length === 0) return;

    const updateGoals = async () => {
      for (const goal of goals) {
        if (!goal.is_achieved && currentScore >= goal.target_score) {
          // Goal achieved!
          await supabase
            .from('credit_score_goals')
            .update({
              current_score: currentScore,
              is_achieved: true,
              achieved_at: new Date().toISOString()
            })
            .eq('id', goal.id);
          
          toast.success(`🎉 Congratulations! You've reached your goal of ${goal.target_score}!`);
          fetchGoals();
        } else if (!goal.is_achieved && goal.current_score !== currentScore) {
          await supabase
            .from('credit_score_goals')
            .update({ current_score: currentScore })
            .eq('id', goal.id);
        }
      }
    };

    updateGoals();
  }, [currentScore, goals, user]);

  const handleAddGoal = async () => {
    if (!user) {
      toast.error('You must be logged in');
      return;
    }

    const targetScore = parseInt(newGoal.targetScore);
    if (isNaN(targetScore) || targetScore < 300 || targetScore > 850) {
      toast.error('Please enter a valid target score between 300 and 850');
      return;
    }

    if (targetScore <= currentScore) {
      toast.error('Target score should be higher than your current score');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('credit_score_goals').insert({
        user_id: user.id,
        target_score: targetScore,
        target_date: newGoal.targetDate ? format(newGoal.targetDate, 'yyyy-MM-dd') : null,
        starting_score: currentScore,
        current_score: currentScore,
        notes: newGoal.notes.trim() || null
      });

      if (error) throw error;

      toast.success('Goal created successfully!');
      setNewGoal({ targetScore: '', targetDate: undefined, notes: '' });
      setIsAddModalOpen(false);
      fetchGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('credit_score_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
      
      toast.success('Goal deleted');
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  const getProgressPercentage = (goal: CreditScoreGoal) => {
    const progress = (goal.current_score || goal.starting_score) - goal.starting_score;
    const total = goal.target_score - goal.starting_score;
    return Math.min(Math.max((progress / total) * 100, 0), 100);
  };

  const getDaysRemaining = (targetDate: string | null) => {
    if (!targetDate) return null;
    const days = differenceInDays(parseISO(targetDate), new Date());
    return days > 0 ? days : 0;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const activeGoals = goals.filter(g => !g.is_achieved);
  const achievedGoals = goals.filter(g => g.is_achieved);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Credit Score Goals
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Set and track your credit score improvement goals
            </p>
          </div>
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Set a Credit Score Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="current">Current Score</Label>
                  <Input
                    id="current"
                    value={currentScore}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="target">Target Score</Label>
                  <Input
                    id="target"
                    type="number"
                    min={currentScore + 1}
                    max={850}
                    value={newGoal.targetScore}
                    onChange={(e) => setNewGoal({ ...newGoal, targetScore: e.target.value })}
                    placeholder={`e.g., ${Math.min(currentScore + 50, 850)}`}
                  />
                </div>
                <div>
                  <Label>Target Date (Optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newGoal.targetDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newGoal.targetDate ? format(newGoal.targetDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-0" 
                      align="center"
                      side="top"
                      sideOffset={8}
                    >
                      <Calendar
                        mode="single"
                        selected={newGoal.targetDate}
                        onSelect={(date) => setNewGoal({ ...newGoal, targetDate: date })}
                        initialFocus
                        disabled={(date) => date < new Date()}
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    value={newGoal.notes}
                    onChange={(e) => setNewGoal({ ...newGoal, notes: e.target.value })}
                    placeholder="e.g., Pay off credit card debt"
                  />
                </div>
                <Button 
                  onClick={handleAddGoal} 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Goal'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeGoals.map((goal, index) => {
              const progress = getProgressPercentage(goal);
              const daysRemaining = getDaysRemaining(goal.target_date);
              const pointsRemaining = goal.target_score - (goal.current_score || goal.starting_score);

              return (
                <motion.div
                  key={goal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">{goal.target_score}</span>
                        <Badge variant="outline">
                          {pointsRemaining} pts to go
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Started at {goal.starting_score} • Current: {goal.current_score || goal.starting_score}
                      </p>
                      {goal.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{goal.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-muted-foreground hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {daysRemaining !== null && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {daysRemaining > 0 
                        ? `${daysRemaining} days remaining`
                        : 'Target date passed'}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Achieved Goals */}
      {achievedGoals.length > 0 && (
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-emerald-500" />
              Achieved Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {achievedGoals.map((goal, index) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="font-medium">Reached {goal.target_score} score!</p>
                      <p className="text-sm text-muted-foreground">
                        Started at {goal.starting_score} • {goal.achieved_at && format(parseISO(goal.achieved_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="text-muted-foreground hover:text-rose-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <h3 className="font-medium mb-1">No goals set yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set a credit score goal to track your progress
            </p>
            <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreditScoreGoalTracker;
