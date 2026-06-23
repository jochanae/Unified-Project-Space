import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FREE_LIMITS } from './useSubscription';

interface UsageLimits {
  messagesSent: number;
  imagesGenerated: number;
  canSendMessage: boolean;
  canGenerateImage: boolean;
  messagesRemaining: number;
  imagesRemaining: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useUsageLimits(userId: string | undefined, subscribed: boolean): UsageLimits {
  const [messagesSent, setMessagesSent] = useState(0);
  const [imagesGenerated, setImagesGenerated] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('usage_tracking')
        .select('messages_sent, images_generated')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .maybeSingle();

      setMessagesSent(data?.messages_sent ?? 0);
      setImagesGenerated(data?.images_generated ?? 0);
    } catch (e) {
      console.error('[UsageLimits] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Premium users have no limits
  if (subscribed) {
    return {
      messagesSent, imagesGenerated,
      canSendMessage: true,
      canGenerateImage: true,
      messagesRemaining: Infinity,
      imagesRemaining: Infinity,
      loading, refresh,
    };
  }

  const messagesRemaining = Math.max(0, FREE_LIMITS.DAILY_MESSAGES - messagesSent);
  const imagesRemaining = Math.max(0, FREE_LIMITS.DAILY_IMAGES - imagesGenerated);

  return {
    messagesSent, imagesGenerated,
    canSendMessage: messagesRemaining > 0,
    canGenerateImage: imagesRemaining > 0,
    messagesRemaining,
    imagesRemaining,
    loading, refresh,
  };
}
