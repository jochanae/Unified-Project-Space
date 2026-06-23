import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, MessageCircle, Heart, Smartphone, Loader2 } from 'lucide-react';
import { useNotificationPrefs, NotificationPrefs } from '@/hooks/useNotificationPrefs';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationPreferencesProps {
  userId: string | undefined;
}

const PREF_ITEMS: { key: keyof NotificationPrefs; label: string; desc: string; icon: typeof Bell }[] = [
  { key: 'pushNotifications', label: 'Push Notifications', desc: 'Get notified about activity', icon: Bell },
  { key: 'timelineReplies', label: 'Timeline Replies', desc: 'When someone replies to your posts', icon: MessageCircle },
  { key: 'companionReminders', label: 'Friend Reminders', desc: 'Gentle check-ins from your friend', icon: Heart },
];

export default function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const { prefs, loading, updatePref } = useNotificationPrefs(userId);
  const { subscribe, unsubscribe, isSupported } = usePushNotifications();
  const [togglingPush, setTogglingPush] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleToggle = async (key: keyof NotificationPrefs, newValue: boolean) => {
    if (key === 'pushNotifications' && isSupported) {
      setTogglingPush(true);
      try {
        const success = newValue ? await subscribe() : await unsubscribe();
        if (success) {
          await updatePref(key, newValue);
        }
      } finally {
        setTogglingPush(false);
      }
      return;
    }
    updatePref(key, newValue);
  };

  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Bell className="h-3.5 w-3.5" /> Notifications
      </h3>
      <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-1">
        {PREF_ITEMS.map((item, i) => {
          const enabled = prefs[item.key];
          const Icon = item.icon;
          const isLoading = item.key === 'pushNotifications' && togglingPush;
          return (
            <div
              key={item.key}
              className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-border/30' : ''}`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4 w-4 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(item.key, !enabled)}
                disabled={isLoading}
                className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-primary' : 'bg-muted'} ${isLoading ? 'opacity-50' : ''}`}
              >
                <motion.div
                  animate={{ x: enabled ? 22 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm"
                />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
