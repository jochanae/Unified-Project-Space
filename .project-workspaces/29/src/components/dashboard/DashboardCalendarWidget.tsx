import { useState, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardCalendarWidgetProps {
  onOpenCalendar: () => void;
}

export function DashboardCalendarWidget({ onOpenCalendar }: DashboardCalendarWidgetProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchEventCount();
    }
  }, [user, currentDate]);

  const fetchEventCount = async () => {
    if (!user) return;

    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const { count } = await supabase
        .from('reminders')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_completed', false)
        .eq('is_dismissed', false)
        .gte('trigger_at', startOfMonth.toISOString())
        .lte('trigger_at', endOfMonth.toISOString());

      setEventCount(count || 0);
    } catch (error) {
      console.error('Error fetching event count:', error);
    }
  };

  const goToPrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const goToNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleMainClick = () => {
    // Reset to today and open modal
    goToToday();
    onOpenCalendar();
  };

  return (
    <div
      onClick={handleMainClick}
      className="flex items-center justify-center gap-2 h-12 px-4 rounded-full border-2 border-primary/30 bg-card/60 backdrop-blur-sm shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)] hover:border-primary/50 hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.4)] transition-all cursor-pointer"
    >
      {/* Back arrow */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrevMonth}
        className="h-7 w-7 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Calendar icon and date */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-chart-4" />
        <span className="text-sm font-medium whitespace-nowrap">
          {format(currentDate, 'MMM d')}
        </span>
        
        {/* Event count badge */}
        {eventCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium px-1.5">
            {eventCount}
          </span>
        )}
      </div>

      {/* Forward arrow */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNextMonth}
        className="h-7 w-7 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
