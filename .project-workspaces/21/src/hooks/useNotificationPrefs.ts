import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPrefs {
  pushNotifications: boolean;
  timelineReplies: boolean;
  companionReminders: boolean;
  smsCheckins: boolean;
}

const defaults: NotificationPrefs = {
  pushNotifications: true,
  timelineReplies: true,
  companionReminders: true,
  smsCheckins: true,
};

export function useNotificationPrefs(userId: string | undefined) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        setPrefs({
          pushNotifications: data.push_notifications,
          timelineReplies: data.community_replies,
          companionReminders: data.companion_reminders,
          smsCheckins: data.sms_checkins,
        });
      } else {
        // No row yet — persist the defaults so the UI matches reality
        // and so the auto-resubscribe path in usePushNotifications can fire.
        await supabase
          .from('notification_preferences')
          .upsert(
            {
              user_id: userId,
              push_notifications: defaults.pushNotifications,
              community_replies: defaults.timelineReplies,
              companion_reminders: defaults.companionReminders,
              sms_checkins: defaults.smsCheckins,
            },
            { onConflict: 'user_id' }
          );
      }
      setLoading(false);
    })();
  }, [userId]);

  const updatePref = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    if (!userId) return;
    setPrefs((p) => ({ ...p, [key]: value }));

    const dbKey = {
      pushNotifications: 'push_notifications',
      timelineReplies: 'community_replies',
      companionReminders: 'companion_reminders',
      smsCheckins: 'sms_checkins',
    }[key];

    await supabase
      .from('notification_preferences')
      .upsert(
        { user_id: userId, [dbKey]: value },
        { onConflict: 'user_id' }
      );
  }, [userId]);

  return { prefs, loading, updatePref };
}
