import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { differenceInDays, isPast, isToday } from "date-fns";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  reminder_enabled: boolean;
  reminder_days_before: number;
}

interface BillRemindersProps {
  onPayBill?: (bill: Bill) => void;
}

export const BillReminders = ({ onPayBill }: BillRemindersProps) => {
  const { user } = useAuth();
  const { isSubscribed, permission, sendNotification } = usePushNotifications();
  const [hasNotified, setHasNotified] = useState<Set<string>>(new Set());

  const sendBillReminder = useCallback((bill: Bill) => {
    const dueDate = new Date(bill.due_date);
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isDueToday = isToday(dueDate);
    const daysUntilDue = differenceInDays(dueDate, new Date());

    let title = '📅 Bill Reminder';
    let body = '';

    if (isOverdue) {
      title = '⚠️ Overdue Bill!';
      body = `${bill.name} ($${Number(bill.amount).toFixed(2)}) is overdue`;
    } else if (isDueToday) {
      title = '🔔 Bill Due Today';
      body = `${bill.name} ($${Number(bill.amount).toFixed(2)}) is due today`;
    } else {
      title = '📅 Upcoming Bill';
      body = `${bill.name} ($${Number(bill.amount).toFixed(2)}) is due in ${daysUntilDue} days`;
    }

    sendNotification({
      title,
      body,
      tag: `bill-reminder-${bill.id}`,
      requireInteraction: isOverdue || isDueToday,
    });
  }, [sendNotification]);

  useEffect(() => {
    const fetchAndNotify = async () => {
      if (!user || !isSubscribed || permission !== 'granted') return;

      const { data, error } = await supabase
        .from('bills')
        .select('id, name, amount, due_date, reminder_enabled, reminder_days_before')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .eq('reminder_enabled', true)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching bills for reminders:', error);
        return;
      }

      if (data) {
        // Filter bills that should show reminders
        const billsToRemind = data.filter((bill) => {
          const dueDate = new Date(bill.due_date);
          const daysUntilDue = differenceInDays(dueDate, new Date());
          return daysUntilDue <= bill.reminder_days_before || isPast(dueDate);
        });

        // Send push notification for each bill (once per session)
        billsToRemind.forEach((bill) => {
          if (!hasNotified.has(bill.id)) {
            sendBillReminder(bill);
            setHasNotified(prev => new Set(prev).add(bill.id));
          }
        });
      }
    };

    fetchAndNotify();
  }, [user, isSubscribed, permission, hasNotified, sendBillReminder]);

  // This component no longer renders any UI - it just handles push notifications
  return null;
};

export default BillReminders;
