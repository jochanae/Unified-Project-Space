import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface GreetingContext {
  isFirstVisit: boolean;
  userName: string | null;
  profileComplete: boolean;
  hasRecentTrades: boolean;
  recentTradeCount: number;
  hasPlanItems: boolean;
  planItemsDueCount: number;
  planItemsCompletedThisWeek: number;
  conversationCount: number;
  lastConversationDate: Date | null;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | null;
}

interface GreetingResult {
  greeting: string;
  subtext: string;
  showTopics: boolean;
}

const DEFAULT_CONTEXT: GreetingContext = {
  isFirstVisit: true,
  userName: null,
  profileComplete: false,
  hasRecentTrades: false,
  recentTradeCount: 0,
  hasPlanItems: false,
  planItemsDueCount: 0,
  planItemsCompletedThisWeek: 0,
  conversationCount: 0,
  lastConversationDate: null,
  experienceLevel: null,
};

function generateGreeting(context: GreetingContext): GreetingResult {
  const { 
    isFirstVisit, 
    userName, 
    profileComplete, 
    hasRecentTrades,
    recentTradeCount,
    hasPlanItems,
    planItemsDueCount,
    planItemsCompletedThisWeek,
    experienceLevel,
  } = context;

  const name = userName ? `, ${userName}` : '';
  
  // First-time visitor - full introduction
  if (isFirstVisit) {
    return {
      greeting: `Hey there! 👋 I'm **Quinn**, your smart money mentor.`,
      subtext: `I'm here to help you build wealth and master your finances—from emergency funds and retirement accounts to trading strategies and insurance-based products. Whether you're just starting out or looking to level up, I've got you covered!`,
      showTopics: true,
    };
  }

  // Returning user with activity
  const greetings: GreetingResult[] = [];

  // Check for plan activity
  if (planItemsCompletedThisWeek > 0) {
    greetings.push({
      greeting: `Welcome back${name}! 🎉`,
      subtext: `Nice work—you completed ${planItemsCompletedThisWeek} plan item${planItemsCompletedThisWeek > 1 ? 's' : ''} this week! Ready to keep the momentum going?`,
      showTopics: false,
    });
  }

  // Check for items due
  if (planItemsDueCount > 0) {
    greetings.push({
      greeting: `Hey${name}! 👋`,
      subtext: `You've got ${planItemsDueCount} item${planItemsDueCount > 1 ? 's' : ''} coming up in your plan. Want to tackle one today?`,
      showTopics: false,
    });
  }

  // Check for recent trades
  if (hasRecentTrades && recentTradeCount > 0) {
    greetings.push({
      greeting: `Welcome back${name}! 📊`,
      subtext: `I see you've logged ${recentTradeCount} trade${recentTradeCount > 1 ? 's' : ''} recently. Want me to help analyze your performance?`,
      showTopics: false,
    });
  }

  // Profile incomplete - gentle nudge
  if (!profileComplete && !isFirstVisit) {
    greetings.push({
      greeting: `Good to see you${name}! 👋`,
      subtext: `I'd love to get to know you better so I can give more personalized guidance. Want to tell me a bit about your financial goals?`,
      showTopics: false,
    });
  }

  // Generic returning user greetings based on experience level
  if (experienceLevel === 'beginner') {
    greetings.push({
      greeting: `Hey${name}! 👋`,
      subtext: `Great to see you back! What would you like to learn about today?`,
      showTopics: true,
    });
  } else if (experienceLevel === 'advanced') {
    greetings.push({
      greeting: `Welcome back${name}! 💪`,
      subtext: `Ready to dive in? What's on your mind today?`,
      showTopics: false,
    });
  }

  // Default returning user greeting
  greetings.push({
    greeting: `Hey${name}, good to see you! 👋`,
    subtext: `What's on your mind today?`,
    showTopics: true,
  });

  // Pick the most relevant greeting (first one with activity context, or last as default)
  return greetings[0];
}

export function useQuinnGreeting() {
  const { user } = useAuth();
  const [context, setContext] = useState<GreetingContext>(DEFAULT_CONTEXT);
  const [isLoading, setIsLoading] = useState(true);

  const fetchGreetingContext = useCallback(async () => {
    if (!user?.id) {
      setContext(DEFAULT_CONTEXT);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch all data in parallel for efficiency
      const [
        conversationsResult,
        quinnContextResult,
        tradesResult,
        planItemsResult,
        profileResult,
      ] = await Promise.all([
        // Check conversation history
        supabase
          .from('conversations')
          .select('id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        // Get Quinn context (profile data)
        supabase
          .from('user_quinn_context')
          .select('preferred_name, experience_level, primary_goal, emergency_fund_status')
          .eq('user_id', user.id)
          .maybeSingle(),
        
        // Get recent trades (last 7 days)
        supabase
          .from('trades')
          .select('id')
          .eq('user_id', user.id)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        
        // Get plan items
        supabase
          .from('plan_items')
          .select('id, status, target_date, completed_at')
          .eq('user_id', user.id),
        
        // Get profile for fallback name
        supabase
          .from('profiles')
          .select('full_name, username')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const conversations = conversationsResult.data || [];
      const quinnContext = quinnContextResult.data;
      const recentTrades = tradesResult.data || [];
      const planItems = planItemsResult.data || [];
      const profile = profileResult.data;

      // Determine if first visit (no conversations ever)
      const isFirstVisit = conversations.length === 0;

      // Get user name (priority: quinn context preferred_name > profile full_name > profile username)
      let userName: string | null = null;
      if (quinnContext?.preferred_name) {
        userName = quinnContext.preferred_name;
      } else if (profile?.full_name && !profile.full_name.includes('@')) {
        userName = profile.full_name.split(' ')[0];
      } else if (profile?.username) {
        userName = profile.username;
      }

      // Check profile completeness
      const profileComplete = !!(
        quinnContext?.preferred_name &&
        quinnContext?.experience_level &&
        (quinnContext?.primary_goal || quinnContext?.emergency_fund_status)
      );

      // Calculate plan stats
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const planItemsDue = planItems.filter(item => {
        if (!item.target_date || item.status === 'completed') return false;
        const targetDate = new Date(item.target_date);
        return targetDate <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Due within a week
      });
      const completedThisWeek = planItems.filter(item => {
        if (!item.completed_at) return false;
        return new Date(item.completed_at) >= weekAgo;
      });

      // Last conversation date
      const lastConversationDate = conversations.length > 0 
        ? new Date(conversations[0].created_at) 
        : null;

      setContext({
        isFirstVisit,
        userName,
        profileComplete,
        hasRecentTrades: recentTrades.length > 0,
        recentTradeCount: recentTrades.length,
        hasPlanItems: planItems.length > 0,
        planItemsDueCount: planItemsDue.length,
        planItemsCompletedThisWeek: completedThisWeek.length,
        conversationCount: conversations.length,
        lastConversationDate,
        experienceLevel: quinnContext?.experience_level as GreetingContext['experienceLevel'] || null,
      });
    } catch (error) {
      console.error('Error fetching greeting context:', error);
      setContext(DEFAULT_CONTEXT);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchGreetingContext();
  }, [fetchGreetingContext]);

  const greetingResult = generateGreeting(context);

  return {
    context,
    greeting: greetingResult.greeting,
    subtext: greetingResult.subtext,
    showTopics: greetingResult.showTopics,
    isLoading,
    refetch: fetchGreetingContext,
  };
}
