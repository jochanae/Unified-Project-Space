import { useState, useEffect, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Bell, FileText, TrendingUp, Clock, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link } from 'react-router-dom';

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'reminder' | 'trade' | 'note' | 'economic';
  description?: string;
  href?: string;
}

interface CalendarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CalendarModal({ open, onOpenChange }: CalendarModalProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch events when modal opens or month changes
  useEffect(() => {
    if (open && user) {
      fetchEvents();
    }
  }, [open, currentMonth, user]);

  const fetchEvents = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      // Fetch reminders
      const { data: reminders } = await supabase
        .from('reminders')
        .select('id, title, trigger_at, type, description')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .gte('trigger_at', monthStart.toISOString())
        .lte('trigger_at', monthEnd.toISOString());

      // Fetch trades (entry dates)
      const { data: trades } = await supabase
        .from('trades')
        .select('id, symbol, trade_type, entry_date, exit_date')
        .eq('user_id', user.id)
        .or(`entry_date.gte.${monthStart.toISOString()},exit_date.gte.${monthStart.toISOString()}`)
        .or(`entry_date.lte.${monthEnd.toISOString()},exit_date.lte.${monthEnd.toISOString()}`);

      const calendarEvents: CalendarEvent[] = [];

      // Add reminders
      if (reminders) {
        reminders.forEach((r) => {
          calendarEvents.push({
            id: `reminder-${r.id}`,
            title: r.title,
            date: new Date(r.trigger_at),
            type: 'reminder',
            description: r.description || undefined,
            href: '/reminders',
          });
        });
      }

      // Add trades
      if (trades) {
        trades.forEach((t) => {
          // Entry date
          calendarEvents.push({
            id: `trade-entry-${t.id}`,
            title: `${t.symbol} ${t.trade_type} entry`,
            date: new Date(t.entry_date),
            type: 'trade',
            href: '/journal',
          });

          // Exit date if closed
          if (t.exit_date) {
            calendarEvents.push({
              id: `trade-exit-${t.id}`,
              title: `${t.symbol} ${t.trade_type} exit`,
              date: new Date(t.exit_date),
              type: 'trade',
              href: '/journal',
            });
          }
        });
      }

      // Add economic events (sample data - in production would come from API)
      const economicEvents = getEconomicEvents(monthStart, monthEnd);
      calendarEvents.push(...economicEvents);

      setEvents(calendarEvents);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Sample economic events
  const getEconomicEvents = (start: Date, end: Date): CalendarEvent[] => {
    const now = new Date();
    const sampleEvents: CalendarEvent[] = [
      {
        id: 'econ-fomc',
        title: 'FOMC Meeting',
        date: new Date(now.getFullYear(), now.getMonth(), 15),
        type: 'economic' as const,
        description: 'Federal Reserve policy decision',
      },
      {
        id: 'econ-cpi',
        title: 'CPI Data',
        date: new Date(now.getFullYear(), now.getMonth(), 12),
        type: 'economic' as const,
        description: 'Consumer Price Index release',
      },
      {
        id: 'econ-jobs',
        title: 'Jobs Report',
        date: new Date(now.getFullYear(), now.getMonth(), 7),
        type: 'economic' as const,
        description: 'Non-farm payrolls',
      },
    ];
    return sampleEvents.filter((e) => e.date >= start && e.date <= end);
  };

  // Calculate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(event.date, day));
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const eventTypeConfig = {
    reminder: { icon: Bell, color: 'text-chart-5 bg-chart-5/10', label: 'Reminder' },
    trade: { icon: TrendingUp, color: 'text-gain bg-gain/10', label: 'Trade' },
    note: { icon: FileText, color: 'text-primary bg-primary/10', label: 'Note' },
    economic: { icon: CalendarIcon, color: 'text-gold bg-gold/10', label: 'Event' },
  };

  const CalendarContent = (
    <div className="flex flex-col h-full">
      {/* Month Navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-lg font-semibold">{format(currentMonth, 'MMMM yyyy')}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Calendar Grid */}
        <div className="flex-1 p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    'relative aspect-square p-1 rounded-lg transition-colors text-sm',
                    'hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary',
                    !isCurrentMonth && 'text-muted-foreground/40',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                    isTodayDate && !isSelected && 'bg-accent font-bold'
                  )}
                >
                  <span className="block">{format(day, 'd')}</span>
                  {/* Event indicators */}
                  {dayEvents.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                      {dayEvents.slice(0, 3).map((event, i) => (
                        <span
                          key={event.id}
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            event.type === 'reminder' && 'bg-chart-5',
                            event.type === 'trade' && 'bg-gain',
                            event.type === 'economic' && 'bg-gold',
                            event.type === 'note' && 'bg-primary'
                          )}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-muted-foreground">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-chart-5" /> Reminder
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gain" /> Trade
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-gold" /> Event
            </span>
          </div>
        </div>

        {/* Selected Day Details */}
        <div className="md:w-72 border-t md:border-t-0 md:border-l border-border p-4 bg-muted/30">
          {selectedDate ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold">{format(selectedDate, 'EEEE, MMM d')}</h4>
                <Link to="/reminders">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <ScrollArea className="h-[200px] md:h-[300px]">
                {selectedDateEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No events on this day</p>
                    <Link to="/reminders">
                      <Button variant="link" size="sm" className="mt-2">
                        Add a reminder
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDateEvents.map((event) => {
                      const config = eventTypeConfig[event.type];
                      const Icon = config.icon;

                      return (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn('p-2 rounded-lg', config.color)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm">{event.title}</p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-[10px]">
                                  {config.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {format(event.date, 'h:mm a')}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a day to see events</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="sr-only">
            <DrawerTitle>Calendar</DrawerTitle>
          </DrawerHeader>
          {CalendarContent}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Calendar</DialogTitle>
        </DialogHeader>
        {CalendarContent}
      </DialogContent>
    </Dialog>
  );
}
