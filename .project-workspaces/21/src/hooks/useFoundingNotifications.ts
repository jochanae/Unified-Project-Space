import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FoundingNotification {
  id: string;
  message: string;
  serial_number: number;
  type: string;
}

export function useFoundingNotifications() {
  const [notifications, setNotifications] = useState<FoundingNotification[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from('founding_notifications')
        .select('id, message, serial_number, type')
        .eq('user_id', user.id)
        .is('seen_at', null)
        .order('created_at', { ascending: false });

      if (!error && data && !cancelled) {
        setNotifications(data);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase
      .from('founding_notifications')
      .update({ seen_at: new Date().toISOString() })
      .eq('id', id);
  }, []);

  return { notifications, dismiss };
}
