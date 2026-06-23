import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface KidGoal {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  title: string;
  description: string | null;
  target_amount: number | null;
  current_amount: number | null;
  category: 'savings' | 'learning' | 'trading' | 'challenge';
  emoji: string;
  status: 'active' | 'completed' | 'archived';
  stars_reward: number;
  is_template: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalTemplate {
  title: string;
  description: string;
  category: KidGoal['category'];
  emoji: string;
  target_amount?: number;
  stars_reward: number;
}

// Pre-defined goal templates for kids
export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    title: 'Save $50 for something special',
    description: 'Put aside money from your allowance or gifts!',
    category: 'savings',
    emoji: '🎁',
    target_amount: 50,
    stars_reward: 3,
  },
  {
    title: 'Complete 3 money lessons',
    description: 'Learn about saving, investing, and stocks!',
    category: 'learning',
    emoji: '📚',
    stars_reward: 2,
  },
  {
    title: 'Make my first trade',
    description: 'Buy shares of a company you like!',
    category: 'trading',
    emoji: '🚀',
    stars_reward: 2,
  },
  {
    title: 'Save $20 for a game',
    description: 'A smaller goal to get started!',
    category: 'savings',
    emoji: '🎮',
    target_amount: 20,
    stars_reward: 1,
  },
  {
    title: 'Make a winning trade',
    description: 'Sell a stock for more than you bought it!',
    category: 'challenge',
    emoji: '🏆',
    stars_reward: 3,
  },
  {
    title: 'Learn what a stock is',
    description: 'Complete the Understanding Stocks lesson!',
    category: 'learning',
    emoji: '⭐',
    stars_reward: 1,
  },
  {
    title: 'Save for 4 weeks in a row',
    description: 'Add money to your savings every week!',
    category: 'challenge',
    emoji: '💪',
    stars_reward: 2,
  },
  {
    title: 'Research a company',
    description: 'Learn about a company before buying their stock!',
    category: 'learning',
    emoji: '🔍',
    stars_reward: 1,
  },
];

export function useKidGoals(portfolioId?: string | null, kidProfileId?: string | null) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<KidGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGoals = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('kid_goals')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'archived')
        .order('created_at', { ascending: false });

      // Filter by kid_profile_id if provided
      if (kidProfileId) {
        query = query.eq('kid_profile_id', kidProfileId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setGoals(data as KidGoal[]);
    } catch (error) {
      console.error('Error fetching kid goals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user, portfolioId, kidProfileId]);

  const addGoal = async (goal: {
    title: string;
    description?: string;
    category?: KidGoal['category'];
    emoji?: string;
    target_amount?: number;
    stars_reward?: number;
  }) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('kid_goals')
        .insert({
          user_id: user.id,
          portfolio_id: portfolioId || null,
          kid_profile_id: kidProfileId || null,
          title: goal.title,
          description: goal.description || null,
          category: goal.category || 'savings',
          emoji: goal.emoji || '🎯',
          target_amount: goal.target_amount || null,
          stars_reward: goal.stars_reward || 1,
        })
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => [data as KidGoal, ...prev]);
      toast.success('🎯 New goal added! You can do it!');
      return data as KidGoal;
    } catch (error) {
      console.error('Error adding kid goal:', error);
      toast.error('Oops! Could not add goal 😅');
      return null;
    }
  };

  const addGoalFromTemplate = async (template: GoalTemplate) => {
    return addGoal({
      title: template.title,
      description: template.description,
      category: template.category,
      emoji: template.emoji,
      target_amount: template.target_amount,
      stars_reward: template.stars_reward,
    });
  };

  const updateGoal = async (id: string, updates: Partial<KidGoal>) => {
    try {
      const { data, error } = await supabase
        .from('kid_goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setGoals(prev => prev.map(g => g.id === id ? data as KidGoal : g));
      return data as KidGoal;
    } catch (error) {
      console.error('Error updating kid goal:', error);
      toast.error('Could not update goal 😅');
      return null;
    }
  };

  const completeGoal = async (id: string, earnedStars: number) => {
    try {
      const { data, error } = await supabase
        .from('kid_goals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update portfolio stars if connected
      if (portfolioId) {
        const { data: portfolio } = await supabase
          .from('kid_portfolios')
          .select('total_stars_earned')
          .eq('id', portfolioId)
          .single();

        if (portfolio) {
          await supabase
            .from('kid_portfolios')
            .update({
              total_stars_earned: (portfolio.total_stars_earned || 0) + earnedStars,
            })
            .eq('id', portfolioId);
        }
      }

      setGoals(prev => prev.map(g => g.id === id ? data as KidGoal : g));
      toast.success(`🌟 Amazing! You completed a goal and earned ${earnedStars} star${earnedStars > 1 ? 's' : ''}!`);
      return data as KidGoal;
    } catch (error) {
      console.error('Error completing kid goal:', error);
      toast.error('Could not complete goal 😅');
      return null;
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('kid_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGoals(prev => prev.filter(g => g.id !== id));
      toast.success('Goal removed!');
    } catch (error) {
      console.error('Error deleting kid goal:', error);
      toast.error('Could not remove goal 😅');
    }
  };

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const totalStarsEarned = completedGoals.reduce((sum, g) => sum + g.stars_reward, 0);

  return {
    goals,
    activeGoals,
    completedGoals,
    totalStarsEarned,
    isLoading,
    addGoal,
    addGoalFromTemplate,
    updateGoal,
    completeGoal,
    deleteGoal,
    refetch: fetchGoals,
  };
}
