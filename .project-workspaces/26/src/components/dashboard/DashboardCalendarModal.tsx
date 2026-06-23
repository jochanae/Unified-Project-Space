import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X, Calendar, CreditCard, DollarSign, ShoppingCart, Target, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, format } from "date-fns";

interface CalendarEvent {
  date: number;
  types: ("bill" | "income" | "expense" | "goal" | "reminder")[];
}

interface DashboardCalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDateSelect?: (date: Date) => void;
}

export function DashboardCalendarModal({ open, onOpenChange, onDateSelect }: DashboardCalendarModalProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startingDay = firstDay.getDay();
  const totalDays = lastDay.getDate();

  useEffect(() => {
    if (open && user) {
      fetchEventsForMonth();
    }
  }, [open, user, year, month]);

  const fetchEventsForMonth = async () => {
    if (!user) return;
    
    setLoading(true);
    const monthStart = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentDate), "yyyy-MM-dd");

    try {
      // Fetch bills for the month
      const { data: billsData } = await supabase
        .from("bills")
        .select("due_date, status")
        .eq("user_id", user.id)
        .gte("due_date", monthStart)
        .lte("due_date", monthEnd);

      // Fetch transactions for the month
      const { data: transactionsData } = await supabase
        .from("transactions")
        .select("transaction_date, type")
        .eq("user_id", user.id)
        .gte("transaction_date", monthStart)
        .lte("transaction_date", monthEnd);

      // Fetch goals with deadlines in this month
      const { data: goalsData } = await supabase
        .from("goals")
        .select("deadline")
        .eq("user_id", user.id)
        .gte("deadline", monthStart)
        .lte("deadline", monthEnd);

      // Fetch event reminders for the month
      const { data: remindersData } = await supabase
        .from("event_reminders")
        .select("event_time")
        .eq("user_id", user.id)
        .gte("event_time", monthStart)
        .lte("event_time", monthEnd);

      // Aggregate events by day
      const eventMap = new Map<number, Set<"bill" | "income" | "expense" | "goal" | "reminder">>();

      billsData?.forEach((bill) => {
        const day = new Date(bill.due_date).getDate();
        if (!eventMap.has(day)) eventMap.set(day, new Set());
        eventMap.get(day)?.add("bill");
      });

      transactionsData?.forEach((tx) => {
        const day = new Date(tx.transaction_date).getDate();
        if (!eventMap.has(day)) eventMap.set(day, new Set());
        eventMap.get(day)?.add(tx.type === "income" ? "income" : "expense");
      });

      goalsData?.forEach((goal) => {
        if (goal.deadline) {
          const day = new Date(goal.deadline).getDate();
          if (!eventMap.has(day)) eventMap.set(day, new Set());
          eventMap.get(day)?.add("goal");
        }
      });

      remindersData?.forEach((reminder) => {
        const day = new Date(reminder.event_time).getDate();
        if (!eventMap.has(day)) eventMap.set(day, new Set());
        eventMap.get(day)?.add("reminder");
      });

      const eventsArray: CalendarEvent[] = [];
      eventMap.forEach((types, date) => {
        eventsArray.push({ date, types: Array.from(types) });
      });

      setEvents(eventsArray);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getEventDots = (day: number) => {
    const event = events.find(e => e.date === day);
    return event?.types || [];
  };

  const isHighlighted = (day: number) => {
    const eventTypes = getEventDots(day);
    return eventTypes.length > 0;
  };

  const getHighlightColor = (day: number) => {
    const eventTypes = getEventDots(day);
    if (eventTypes.includes("reminder")) return "bg-purple-100 dark:bg-purple-950/50";
    if (eventTypes.includes("bill")) return "bg-amber-100 dark:bg-amber-950/50";
    if (eventTypes.includes("income")) return "bg-green-100 dark:bg-green-950/50";
    if (eventTypes.includes("expense")) return "bg-red-100 dark:bg-red-950/50";
    if (eventTypes.includes("goal")) return "bg-blue-100 dark:bg-blue-950/50";
    return "";
  };

  const eventColors: Record<string, string> = {
    bill: "bg-amber-500",
    income: "bg-green-500",
    expense: "bg-red-500",
    goal: "bg-blue-500",
    reminder: "bg-purple-500",
  };

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  const prevMonthName = monthNames[month === 0 ? 11 : month - 1].substring(0, 3).toUpperCase();
  const nextMonthName = monthNames[month === 11 ? 0 : month + 1].substring(0, 3).toUpperCase();

  const renderCalendarDays = () => {
    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // Previous month days
    for (let i = startingDay - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="h-10 w-10 flex flex-col items-center justify-center text-muted-foreground/40">
          <span className="text-sm">{prevMonthLastDay - i}</span>
        </div>
      );
    }
    
    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const eventDots = getEventDots(day);
      const highlighted = isHighlighted(day);
      const highlightColor = getHighlightColor(day);
      const hasEvents = eventDots.length > 0;
      
      days.push(
        <div
          key={day}
          className={`h-10 w-10 flex flex-col items-center justify-center cursor-pointer rounded-lg transition-colors hover:bg-muted ${highlighted ? highlightColor : ""}`}
          onClick={() => {
            onDateSelect?.(new Date(year, month, day));
          }}
        >
          <span className={`text-sm font-medium ${eventDots.includes("reminder") ? "text-purple-600 dark:text-purple-400" : eventDots.includes("bill") ? "text-amber-600 dark:text-amber-400" : eventDots.includes("expense") ? "text-red-600 dark:text-red-400" : eventDots.includes("income") ? "text-green-600 dark:text-green-400" : "text-foreground"}`}>
            {day}
          </span>
          {hasEvents && (
            <div className="flex gap-0.5 mt-0.5">
              {eventDots.slice(0, 3).map((type, i) => (
                <span key={i} className={`w-1.5 h-1.5 rounded-full ${eventColors[type]}`} />
              ))}
            </div>
          )}
        </div>
      );
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(
        <div key={`next-${i}`} className="h-10 w-10 flex flex-col items-center justify-center text-muted-foreground/40">
          <span className="text-sm">{i}</span>
        </div>
      );
    }
    
    return days;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden [&>button]:hidden max-h-[90vh] overflow-y-auto">
        {/* Gradient Header with Navigation */}
        <div className="bg-gradient-to-r from-[hsl(200,85%,55%)] via-[hsl(270,70%,55%)] to-[hsl(330,75%,55%)] p-4 relative">
          {/* Decorative orbs */}
          <div className="absolute -left-8 top-0 w-24 h-24 rounded-full bg-blue-400/30 blur-sm" />
          <div className="absolute -right-8 bottom-0 w-32 h-32 rounded-full bg-purple-400/30 blur-sm" />
          
          <div className="relative z-10 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousMonth}
              className="flex flex-col items-center gap-0.5 text-white hover:bg-white/20 h-auto py-1"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-xs font-medium">{prevMonthName}</span>
            </Button>
            
            <h2 className="text-xl font-bold text-white">
              {monthNames[month]} {year}
            </h2>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextMonth}
                className="flex flex-col items-center gap-0.5 text-white hover:bg-white/20 h-auto py-1"
              >
                <ChevronRight className="h-5 w-5" />
                <span className="text-xs font-medium">{nextMonthName}</span>
              </Button>
              
              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/20 h-8 w-8 ml-1"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" text="Loading calendar..." />
            </div>
          ) : (
            <div className="bg-background rounded-xl p-4 shadow-sm">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <div key={day} className="h-8 flex items-center justify-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {renderCalendarDays()}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-4 pb-4 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Calendar className="h-4 w-4" />
            <span className="font-medium">Calendar Legend:</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400">Bills Due</span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Income</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShoppingCart className="h-4 w-4 text-red-500" />
              <span className="text-red-600 dark:text-red-400">Expenses</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-1">
            <div className="flex items-center gap-1.5">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-blue-600 dark:text-blue-400">Goal Deadlines</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-purple-500" />
              <span className="text-purple-600 dark:text-purple-400">Event Reminders</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
