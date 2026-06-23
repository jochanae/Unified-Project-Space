import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const FREE_MONTHLY_CONVERSATIONS = 10;
const FREE_MONTHLY_MESSAGES = 50;
const FREE_PER_CONVERSATION_MESSAGES = 15;

interface UsageData {
  conversationsUsed: number;
  conversationsLimit: number;
  messagesUsed: number;
  messagesLimit: number;
  perConversationLimit: number;
  isAtLimit: boolean;
  isAtMessageLimit: boolean;
  resetDate: string;
  resetDateISO: string;
  isLoading: boolean;
  isPro: boolean;
  refetch: () => void;
}

export function useQuinnUsage(): UsageData {
  const { session, subscriptionTier, role } = useAuth();
  const [conversationsUsed, setConversationsUsed] = useState(0);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = role === 'admin' || role === 'super_admin';
  const isPro = subscriptionTier === 'pro' || isAdmin;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const now = new Date();
  const resetDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetDate = resetDateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const resetDateISO = resetDateObj.toISOString();

  const fetchUsage = useCallback(async () => {
    if (!session?.user?.id || isPro) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_usage')
        .select('conversations_used, messages_used')
        .eq('user_id', session.user.id)
        .eq('month', currentMonth)
        .maybeSingle();

      if (!error && data) {
        setConversationsUsed(data.conversations_used);
        setMessagesUsed((data as any).messages_used ?? 0);
      } else {
        setConversationsUsed(0);
        setMessagesUsed(0);
      }
    } catch {
      setConversationsUsed(0);
      setMessagesUsed(0);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, isPro, currentMonth]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    conversationsUsed: isPro ? 0 : conversationsUsed,
    conversationsLimit: FREE_MONTHLY_CONVERSATIONS,
    messagesUsed: isPro ? 0 : messagesUsed,
    messagesLimit: FREE_MONTHLY_MESSAGES,
    perConversationLimit: FREE_PER_CONVERSATION_MESSAGES,
    isAtLimit: !isPro && conversationsUsed >= FREE_MONTHLY_CONVERSATIONS,
    isAtMessageLimit: !isPro && messagesUsed >= FREE_MONTHLY_MESSAGES,
    resetDate,
    resetDateISO,
    isLoading,
    isPro,
    refetch: fetchUsage,
  };
}
