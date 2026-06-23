import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  X, 
  Bell, 
  AlertTriangle, 
  Receipt, 
  Target, 
  Wallet, 
  Video, 
  CheckCircle 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, differenceInDays, isPast, isToday, addDays } from "date-fns";

interface Reminder {
  id: string;
  title: string;
  description: string;
  type: "bill" | "goal" | "debt" | "webinar" | "custom";
  dueDate?: string;
  amount?: number;
  isUrgent?: boolean;
}

interface RemindersAlertsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tabItems = [
  { id: "all", label: "All", icon: null },
  { id: "urgent", label: "Urgent", icon: AlertTriangle },
  { id: "bills", label: "Bills", icon: Receipt },
  { id: "goals", label: "Goals", icon: Target },
  { id: "debt", label: "Debt", icon: Wallet },
  { id: "webinars", label: "Webinars", icon: Video },
  { id: "custom", label: "Custom", icon: Bell },
];

export function RemindersAlertsModal({ open, onOpenChange }: RemindersAlertsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchReminders();
    }
  }, [open, user]);

  const fetchReminders = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch bills with reminders
      const { data: billsData } = await supabase
        .from('bills')
        .select('id, name, amount, due_date')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .eq('reminder_enabled', true)
        .order('due_date', { ascending: true });

      // Fetch goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('id, title, target_amount, current_amount, deadline')
        .eq('user_id', user.id)
        .eq('is_archived', false);

      // Fetch debts
      const { data: debtsData } = await supabase
        .from('debts')
        .select('id, name, minimum_payment, due_day')
        .eq('user_id', user.id)
        .eq('status', 'active');

      // Fetch upcoming events
      const { data: eventsData } = await supabase
        .from('events')
        .select('id, title, start_time')
        .eq('is_published', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      const allReminders: Reminder[] = [];

      // Process bills
      if (billsData) {
        billsData.forEach((bill) => {
          const dueDate = new Date(bill.due_date);
          const daysUntilDue = differenceInDays(dueDate, new Date());
          const isUrgent = isPast(dueDate) || daysUntilDue <= 3;

          allReminders.push({
            id: `bill-${bill.id}`,
            title: bill.name,
            description: `$${bill.amount.toFixed(2)} due ${format(dueDate, 'MMM d')}`,
            type: "bill",
            dueDate: bill.due_date,
            amount: bill.amount,
            isUrgent,
          });
        });
      }

      // Process goals
      if (goalsData) {
        goalsData.forEach((goal) => {
          if (goal.deadline) {
            const deadlineDate = new Date(goal.deadline);
            const daysUntil = differenceInDays(deadlineDate, new Date());
            const isUrgent = daysUntil <= 7;

            allReminders.push({
              id: `goal-${goal.id}`,
              title: goal.title,
              description: `$${goal.current_amount.toFixed(0)}/$${goal.target_amount.toFixed(0)} - ${format(deadlineDate, 'MMM d')}`,
              type: "goal",
              dueDate: goal.deadline,
              isUrgent,
            });
          }
        });
      }

      // Process debts
      if (debtsData) {
        debtsData.forEach((debt) => {
          if (debt.due_day) {
            const today = new Date();
            const dueDate = new Date(today.getFullYear(), today.getMonth(), debt.due_day);
            if (dueDate < today) {
              dueDate.setMonth(dueDate.getMonth() + 1);
            }
            const daysUntilDue = differenceInDays(dueDate, today);
            const isUrgent = daysUntilDue <= 5;

            allReminders.push({
              id: `debt-${debt.id}`,
              title: debt.name,
              description: `Min payment: $${debt.minimum_payment.toFixed(2)}`,
              type: "debt",
              dueDate: dueDate.toISOString(),
              isUrgent,
            });
          }
        });
      }

      // Process events (webinars)
      if (eventsData) {
        eventsData.forEach((event) => {
          allReminders.push({
            id: `event-${event.id}`,
            title: event.title,
            description: format(new Date(event.start_time), 'MMM d, h:mm a'),
            type: "webinar",
            dueDate: event.start_time,
            isUrgent: false,
          });
        });
      }

      setReminders(allReminders);
    } catch (error) {
      console.error('Error fetching reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredReminders = () => {
    if (activeTab === "all") return reminders;
    if (activeTab === "urgent") return reminders.filter(r => r.isUrgent);
    if (activeTab === "bills") return reminders.filter(r => r.type === "bill");
    if (activeTab === "goals") return reminders.filter(r => r.type === "goal");
    if (activeTab === "debt") return reminders.filter(r => r.type === "debt");
    if (activeTab === "webinars") return reminders.filter(r => r.type === "webinar");
    if (activeTab === "custom") return reminders.filter(r => r.type === "custom");
    return reminders;
  };

  const filteredReminders = getFilteredReminders();

  const getCounts = () => {
    return {
      all: reminders.length,
      urgent: reminders.filter(r => r.isUrgent).length,
      bills: reminders.filter(r => r.type === "bill").length,
      goals: reminders.filter(r => r.type === "goal").length,
      debt: reminders.filter(r => r.type === "debt").length,
      webinars: reminders.filter(r => r.type === "webinar").length,
      custom: reminders.filter(r => r.type === "custom").length,
    };
  };

  const counts = getCounts();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Yellow Bell Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 flex items-center justify-center">
                <Bell className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">My Reminders & Alerts</DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {reminders.length === 0 ? "No reminders" : `${reminders.length} reminders`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="icon" 
                className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                <Plus className="h-5 w-5 text-white" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b bg-muted/30">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex p-2 gap-2">
              {tabItems.map((tab) => {
                const count = counts[tab.id as keyof typeof counts];
                const isActive = activeTab === tab.id;
                
                return (
                  <Button
                    key={tab.id}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                      isActive 
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white" 
                        : "hover:bg-muted"
                    }`}
                  >
                    {tab.icon && <tab.icon className="h-3.5 w-3.5" />}
                    <span>{tab.label}</span>
                    <span className={`text-xs ${isActive ? "text-white/80" : "text-muted-foreground"}`}>
                      ({count})
                    </span>
                  </Button>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-violet-400" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredReminders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                No reminders or alerts in the next 30 days
              </p>
              <p className="text-sm text-muted-foreground mt-6">
                Urgent alerts won't dismiss until you mark items as paid
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className={`p-4 rounded-xl border ${
                    reminder.isUrgent 
                      ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" 
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        reminder.type === "bill" ? "bg-orange-100 dark:bg-orange-900/30" :
                        reminder.type === "goal" ? "bg-emerald-100 dark:bg-emerald-900/30" :
                        reminder.type === "debt" ? "bg-red-100 dark:bg-red-900/30" :
                        "bg-blue-100 dark:bg-blue-900/30"
                      }`}>
                        {reminder.type === "bill" && <Receipt className="h-4 w-4 text-orange-500" />}
                        {reminder.type === "goal" && <Target className="h-4 w-4 text-emerald-500" />}
                        {reminder.type === "debt" && <Wallet className="h-4 w-4 text-red-500" />}
                        {reminder.type === "webinar" && <Video className="h-4 w-4 text-blue-500" />}
                        {reminder.type === "custom" && <Bell className="h-4 w-4 text-purple-500" />}
                      </div>
                      <div>
                        <p className="font-medium">{reminder.title}</p>
                        <p className="text-sm text-muted-foreground">{reminder.description}</p>
                      </div>
                    </div>
                    {reminder.isUrgent && (
                      <Badge variant="destructive" className="text-xs">Urgent</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
