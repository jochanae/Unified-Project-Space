import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Bell, Mail, MessageSquare, TrendingDown, Calendar, Target, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  bill_reminders: boolean;
  budget_alerts: boolean;
  goal_updates: boolean;
  credit_score_changes: boolean;
  weekly_summary: boolean;
  marketing_emails: boolean;
}

export const NotificationsSection = () => {
  const { user } = useAuth();
  const { 
    isSupported, 
    isSubscribed, 
    permission, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: false,
    bill_reminders: true,
    budget_alerts: true,
    goal_updates: true,
    credit_score_changes: true,
    weekly_summary: true,
    marketing_emails: false,
  });

  // Sync push notification state with actual subscription status
  useEffect(() => {
    setPreferences(prev => ({ ...prev, push_notifications: isSubscribed }));
  }, [isSubscribed]);

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from("user_settings")
        .select("notification_preferences")
        .eq("user_id", user.id)
        .single();
      
      if (data?.notification_preferences && typeof data.notification_preferences === 'object') {
        setPreferences(prev => ({ ...prev, ...(data.notification_preferences as Record<string, boolean>) }));
      }
    };
    loadPreferences();
  }, [user?.id]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    // Special handling for push notifications - request browser permission
    if (key === 'push_notifications') {
      if (!preferences.push_notifications) {
        // Turning ON - request permission
        if (!isSupported) {
          toast.error("Push notifications are not supported on this device/browser");
          return;
        }
        if (permission === 'denied') {
          toast.info("Notifications are blocked. To enable: tap the lock icon in your address bar → Site Settings → Notifications → Allow, then reload the page.", { duration: 8000 });
          return;
        }
        const success = await subscribe();
        if (!success) {
          return; // Don't update state if subscription failed
        }
      } else {
        // Turning OFF - unsubscribe
        await unsubscribe();
      }
    }
    setPreferences(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setLoading(true);
    
    // Check if settings exist
    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .single();
    
    let error;
    if (existing) {
      ({ error } = await supabase
        .from("user_settings")
        .update({ notification_preferences: JSON.parse(JSON.stringify(preferences)) })
        .eq("user_id", user.id));
    } else {
      ({ error } = await supabase
        .from("user_settings")
        .insert([{ user_id: user.id, notification_preferences: JSON.parse(JSON.stringify(preferences)) }]));
    }
    
    setLoading(false);
    if (error) {
      toast.error("Failed to save preferences");
    } else {
      toast.success("Notification preferences saved!");
    }
  };

  // Extended option type to include disabled state
  interface NotificationOption {
    key: keyof NotificationPreferences;
    icon: typeof Mail;
    label: string;
    description: string;
    disabled?: boolean;
  }

  const notificationOptions: NotificationOption[] = [
    {
      key: "email_notifications",
      icon: Mail,
      label: "Email Notifications",
      description: "Receive important updates via email",
    },
    {
      key: "push_notifications" as const,
      icon: Bell,
      label: "Push Notifications",
      description: !isSupported 
        ? "Not supported on this browser" 
        : permission === 'denied' 
          ? "Blocked - tap to learn how to enable" 
          : "Get instant alerts on your device",
      disabled: !isSupported,
    },
    {
      key: "bill_reminders" as const,
      icon: Calendar,
      label: "Bill Reminders",
      description: "Get notified before bills are due",
    },
    {
      key: "budget_alerts" as const,
      icon: TrendingDown,
      label: "Budget Alerts",
      description: "Alerts when approaching budget limits",
    },
    {
      key: "goal_updates" as const,
      icon: Target,
      label: "Goal Updates",
      description: "Progress updates on your savings goals",
    },
    {
      key: "credit_score_changes" as const,
      icon: CreditCard,
      label: "Credit Score Changes",
      description: "Notifications when your score changes",
    },
    {
      key: "weekly_summary" as const,
      icon: MessageSquare,
      label: "Weekly Summary",
      description: "Weekly overview of your finances",
    },
    {
      key: "marketing_emails" as const,
      icon: Mail,
      label: "Marketing Emails",
      description: "Tips, offers, and product updates",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notifications</h2>
        <p className="text-muted-foreground">Manage how you receive updates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notificationOptions.map((option) => (
            <div 
              key={option.key}
              className="flex items-center justify-between py-3 border-b last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <option.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <Label htmlFor={option.key} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <Switch
                id={option.key}
                checked={preferences[option.key]}
                onCheckedChange={() => handleToggle(option.key)}
                disabled={option.disabled}
              />
            </div>
          ))}

          <Button 
            onClick={handleSave} 
            className="w-full mt-4"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
