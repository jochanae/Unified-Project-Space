import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Reminder {
  id: string;
  type: 'trade' | 'learning' | 'journal';
  title: string;
  description: string | null;
  trigger_at: string;
  repeat_interval: 'none' | 'daily' | 'weekly' | 'monthly';
  is_completed: boolean;
  is_dismissed: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useAuth();

  const fetchReminders = useCallback(async () => {
    if (!session?.user) {
      setReminders([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('is_dismissed', false)
      .order('trigger_at', { ascending: true });

    if (error) {
      console.error('Error fetching reminders:', error);
      return;
    }

    setReminders((data || []) as Reminder[]);
    setIsLoading(false);
  }, [session?.user]);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const createReminder = useCallback(async (reminder: {
    type: 'trade' | 'learning' | 'journal';
    title: string;
    description?: string;
    trigger_at: string;
    repeat_interval?: 'none' | 'daily' | 'weekly' | 'monthly';
  }) => {
    if (!session?.user) {
      toast.error('Please log in to create reminders');
      return null;
    }

    const { data, error } = await supabase
      .from('reminders')
      .insert({
        user_id: session.user.id,
        type: reminder.type,
        title: reminder.title,
        description: reminder.description || '',
        trigger_at: reminder.trigger_at,
        repeat_interval: reminder.repeat_interval || 'none',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating reminder:', error);
      toast.error('Failed to create reminder');
      return null;
    }

    setReminders(prev => [...prev, data as Reminder].sort(
      (a, b) => new Date(a.trigger_at).getTime() - new Date(b.trigger_at).getTime()
    ));
    toast.success('Reminder created');
    return data as Reminder;
  }, [session?.user]);

  const completeReminder = useCallback(async (reminderId: string) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('reminders')
      .update({ is_completed: true })
      .eq('id', reminderId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error completing reminder:', error);
      return;
    }

    setReminders(prev => prev.map(r => 
      r.id === reminderId ? { ...r, is_completed: true } : r
    ));
    toast.success('Reminder completed');
  }, [session?.user]);

  const dismissReminder = useCallback(async (reminderId: string) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('reminders')
      .update({ is_dismissed: true })
      .eq('id', reminderId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error dismissing reminder:', error);
      return;
    }

    setReminders(prev => prev.filter(r => r.id !== reminderId));
    toast.success('Reminder dismissed');
  }, [session?.user]);

  const deleteReminder = useCallback(async (reminderId: string) => {
    if (!session?.user) return;

    const { error } = await supabase
      .from('reminders')
      .delete()
      .eq('id', reminderId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('Error deleting reminder:', error);
      return;
    }

    setReminders(prev => prev.filter(r => r.id !== reminderId));
    toast.success('Reminder deleted');
  }, [session?.user]);

  const updateReminder = useCallback(async (reminderId: string, updates: {
    title?: string;
    description?: string;
    type?: 'trade' | 'learning' | 'journal';
    trigger_at?: string;
    repeat_interval?: 'none' | 'daily' | 'weekly' | 'monthly';
  }) => {
    if (!session?.user) return null;

    const { data, error } = await supabase
      .from('reminders')
      .update(updates)
      .eq('id', reminderId)
      .eq('user_id', session.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating reminder:', error);
      toast.error('Failed to update reminder');
      return null;
    }

    setReminders(prev => prev.map(r => 
      r.id === reminderId ? { ...r, ...data } as Reminder : r
    ).sort((a, b) => new Date(a.trigger_at).getTime() - new Date(b.trigger_at).getTime()));
    toast.success('Reminder updated');
    return data as Reminder;
  }, [session?.user]);

  // Get upcoming reminders (due within the next hour)
  const upcomingReminders = reminders.filter(r => {
    if (r.is_completed) return false;
    const triggerTime = new Date(r.trigger_at).getTime();
    const now = Date.now();
    const hourFromNow = now + 60 * 60 * 1000;
    return triggerTime >= now && triggerTime <= hourFromNow;
  });

  // Get active (not completed) reminders
  const activeReminders = reminders.filter(r => !r.is_completed);

  // Get all reminders including completed ones
  const allReminders = reminders;

  return {
    reminders,
    allReminders,
    activeReminders,
    upcomingReminders,
    isLoading,
    createReminder,
    updateReminder,
    completeReminder,
    dismissReminder,
    deleteReminder,
    refetch: fetchReminders,
  };
}
