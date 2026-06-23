import { useState, useEffect } from "react";
import { Bell, Check, Trash2, X, RefreshCw, AlertCircle, Info, CheckCircle, ExternalLink, Receipt, Target, CreditCard, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow, format, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";
import { RemindersAlertsModal } from "@/components/dashboard/RemindersAlertsModal";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

interface ReminderItem {
  id: string;
  title: string;
  message: string;
  type: 'bill' | 'goal' | 'debt' | 'event';
  due_date: string;
  amount?: number;
  is_urgent: boolean;
}

export function NotificationCenter() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);
  // Removed unreliable unreadMessageCount - would need proper read receipts table
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remindersModalOpen, setRemindersModalOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const activeReminders = reminders.filter(r => !dismissedReminders.includes(r.id));
  // Badge only shows actual unread notifications - NOT reminders or fake message counts
  const totalBadgeCount = unreadCount;

  // Load dismissed reminders from localStorage (permanent dismissal)
  useEffect(() => {
    const stored = localStorage.getItem('dismissedReminders');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Permanent dismissal - just get the IDs
        const dismissedIds = Array.isArray(parsed) ? parsed : Object.keys(parsed);
        setDismissedReminders(dismissedIds);
      } catch (e) {
        console.error('Error parsing dismissed reminders:', e);
      }
    }
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch reminders (bills, goals, debts)
  const fetchReminders = async () => {
    if (!user) return;
    
    try {
      const today = new Date();
      const reminderWindow = new Date();
      reminderWindow.setDate(today.getDate() + 14); // Next 14 days
      
      const reminderItems: ReminderItem[] = [];

      // Get bills due soon or overdue
      const { data: bills } = await supabase
        .from('bills')
        .select('id, name, amount, due_date')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .lte('due_date', reminderWindow.toISOString().split('T')[0])
        .order('due_date', { ascending: true });
      
      bills?.forEach(bill => {
        const daysUntil = differenceInDays(new Date(bill.due_date), today);
        reminderItems.push({
          id: `bill-${bill.id}`,
          title: bill.name,
          message: `$${bill.amount.toFixed(2)} due ${format(new Date(bill.due_date), 'MMM d')}`,
          type: 'bill',
          due_date: bill.due_date,
          amount: bill.amount,
          is_urgent: daysUntil <= 3
        });
      });

      // Get goals near deadline
      const { data: goals } = await supabase
        .from('goals')
        .select('id, title, target_amount, current_amount, deadline')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .not('deadline', 'is', null)
        .lte('deadline', reminderWindow.toISOString().split('T')[0])
        .gte('deadline', today.toISOString().split('T')[0]);
      
      goals?.forEach(goal => {
        const daysUntil = differenceInDays(new Date(goal.deadline!), today);
        const remaining = goal.target_amount - goal.current_amount;
        reminderItems.push({
          id: `goal-${goal.id}`,
          title: goal.title,
          message: `$${remaining.toFixed(0)} left to reach goal by ${format(new Date(goal.deadline!), 'MMM d')}`,
          type: 'goal',
          due_date: goal.deadline!,
          amount: remaining,
          is_urgent: daysUntil <= 7
        });
      });

      // Get active debts with due day approaching
      const { data: debts } = await supabase
        .from('debts')
        .select('id, name, minimum_payment, due_day')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .not('due_day', 'is', null);
      
      debts?.forEach(debt => {
        if (debt.due_day) {
          const currentDay = today.getDate();
          const daysUntilDue = debt.due_day >= currentDay 
            ? debt.due_day - currentDay 
            : (30 - currentDay) + debt.due_day;
          
          if (daysUntilDue <= 7) {
            reminderItems.push({
              id: `debt-${debt.id}`,
              title: debt.name,
              message: `$${debt.minimum_payment.toFixed(2)} minimum due on day ${debt.due_day}`,
              type: 'debt',
              due_date: `${today.getFullYear()}-${today.getMonth() + 1}-${debt.due_day}`,
              amount: debt.minimum_payment,
              is_urgent: daysUntilDue <= 3
            });
          }
        }
      });

      setReminders(reminderItems);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    }
  };

  // Note: Removed unreliable "unread messages" logic that used 24-hour proxy
  // A proper implementation would need a dedicated read receipts table

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchReminders();

      // Subscribe to realtime notifications
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const dismissReminder = (id: string) => {
    const newDismissed = [...dismissedReminders, id];
    setDismissedReminders(newDismissed);
    
    // Store permanently (just array of IDs)
    localStorage.setItem('dismissedReminders', JSON.stringify(newDismissed));
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'sync':
        return <RefreshCw className="h-4 w-4 text-primary" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getReminderIcon = (type: ReminderItem['type']) => {
    switch (type) {
      case 'bill':
        return <Receipt className="h-4 w-4 text-orange-500" />;
      case 'goal':
        return <Target className="h-4 w-4 text-emerald-500" />;
      case 'debt':
        return <CreditCard className="h-4 w-4 text-red-500" />;
      case 'event':
        return <Calendar className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!user) return null;

  const hasContent = notifications.length > 0 || activeReminders.length > 0;
  // Auto-mark notifications as read when opening the popover
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && unreadCount > 0) {
      // Auto-mark all notifications as read when opening
      markAllAsRead();
    }
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-7 w-7 sm:h-9 sm:w-9 md:h-10 md:w-10 p-0">
            <Bell className="h-5 w-5 sm:h-7 sm:w-7 md:h-7 md:w-7 drop-shadow-[0_0_4px_rgba(253,230,138,0.8)]" fill="#FDE68A" stroke="#F59E0B" strokeWidth={2} />
            {totalBadgeCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {totalBadgeCount > 9 ? '9+' : totalBadgeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-96 p-0" align="end" sideOffset={8}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h4 className="font-semibold">Notifications</h4>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs h-7"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !hasContent ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">

                {/* Reminders Section */}
                {activeReminders.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground">Reminders</p>
                    </div>
                    {activeReminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className={cn(
                          "px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group relative",
                          reminder.is_urgent && "bg-orange-50 dark:bg-orange-950/20"
                        )}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getReminderIcon(reminder.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium truncate">
                                {reminder.title}
                              </p>
                              {reminder.is_urgent && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Urgent
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {reminder.message}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissReminder(reminder.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* System Notifications Section */}
                {notifications.length > 0 && (
                  <>
                    {activeReminders.length > 0 && (
                      <div className="px-4 py-2 bg-muted/30">
                        <p className="text-xs font-medium text-muted-foreground">System</p>
                      </div>
                    )}
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group relative",
                          !notification.is_read && "bg-primary/5"
                        )}
                        onClick={() => {
                          if (!notification.is_read) {
                            markAsRead(notification.id);
                          }
                          if (notification.action_url) {
                            window.location.href = notification.action_url;
                            setIsOpen(false);
                          }
                        }}
                      >
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={cn(
                                "text-sm truncate",
                                !notification.is_read && "font-medium"
                              )}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="px-4 py-2 border-t border-border space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                setRemindersModalOpen(true);
              }}
              className="w-full text-xs text-primary hover:text-primary"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View All Reminders & Alerts
            </Button>
            {notifications.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="w-full text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all notifications
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reminders Modal */}
      <RemindersAlertsModal open={remindersModalOpen} onOpenChange={setRemindersModalOpen} />
    </>
  );
}
