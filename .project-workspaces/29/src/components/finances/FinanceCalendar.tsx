import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, DollarSign, FileText, PiggyBank, Plus, Calendar as CalendarIcon, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BudgetEntry, Bill, SavingsGoal } from '@/hooks/useFinances';
import type { Reminder } from '@/hooks/useReminders';

interface FinanceCalendarProps {
  entries: BudgetEntry[];
  bills: Bill[];
  savingsGoals: SavingsGoal[];
  reminders?: Reminder[];
  selectedMonth: Date;
  onMonthChange: (date: Date) => void;
  onAddEntry: () => void;
  onAddBill: () => void;
  onAddGoal: () => void;
}

interface DayEvent {
  type: 'income' | 'expense' | 'bill' | 'savings' | 'reminder';
  label: string;
  amount: number;
  isPaid?: boolean;
  isCompleted?: boolean;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function fmt(n: number): string {
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(2)}`;
}

export function FinanceCalendar({
  entries, bills, savingsGoals, reminders = [], selectedMonth,
  onMonthChange, onAddEntry, onAddBill, onAddGoal,
}: FinanceCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = getDay(monthStart);

  // Build events map: day number → events
  const eventsMap = useMemo(() => {
    const map: Record<number, DayEvent[]> = {};

    for (const entry of entries) {
      const day = new Date(entry.entry_date).getDate();
      if (!map[day]) map[day] = [];
      map[day].push({
        type: entry.type as 'income' | 'expense',
        label: entry.description || entry.category,
        amount: Number(entry.amount),
      });
    }

    for (const bill of bills) {
      const day = bill.due_day;
      if (!map[day]) map[day] = [];
      map[day].push({
        type: 'bill',
        label: bill.name,
        amount: Number(bill.amount),
        isPaid: bill.is_paid_this_month,
      });
    }

    for (const goal of savingsGoals) {
      if (goal.deadline) {
        const deadlineDate = new Date(goal.deadline);
        if (
          deadlineDate.getMonth() === selectedMonth.getMonth() &&
          deadlineDate.getFullYear() === selectedMonth.getFullYear()
        ) {
          const day = deadlineDate.getDate();
          if (!map[day]) map[day] = [];
          map[day].push({
            type: 'savings',
            label: `${goal.emoji || '🎯'} ${goal.title}`,
            amount: Number(goal.target_amount),
          });
        }
      }
    }

    // Reminders
    for (const reminder of reminders) {
      const triggerDate = new Date(reminder.trigger_at);
      if (
        triggerDate.getMonth() === selectedMonth.getMonth() &&
        triggerDate.getFullYear() === selectedMonth.getFullYear()
      ) {
        const day = triggerDate.getDate();
        if (!map[day]) map[day] = [];
        map[day].push({
          type: 'reminder',
          label: reminder.title,
          amount: 0,
          isCompleted: reminder.is_completed,
        });
      }
    }

    return map;
  }, [entries, bills, savingsGoals, reminders, selectedMonth]);

  const selectedDayEvents = selectedDay ? eventsMap[selectedDay.getDate()] || [] : [];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <CalendarIcon className="h-4.5 w-4.5 text-primary" />
          </div>
          Finance Calendar
        </h3>
        <Button variant="outline" size="sm" className="gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10" onClick={onAddEntry}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between rounded-xl p-3 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/15" onClick={() => onMonthChange(subMonths(selectedMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-bold tracking-wide">{format(selectedMonth, 'MMMM yyyy')}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/15" onClick={() => onMonthChange(addMonths(selectedMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-sm">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-muted/50 border-b border-border/40">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[56px] border-b border-r border-border/15" />
          ))}

          {daysInMonth.map((day) => {
            const dayNum = day.getDate();
            const events = eventsMap[dayNum] || [];
            const hasIncome = events.some((e) => e.type === 'income');
            const hasExpense = events.some((e) => e.type === 'expense');
            const hasBill = events.some((e) => e.type === 'bill');
            const hasSavings = events.some((e) => e.type === 'savings');
            const hasReminder = events.some((e) => e.type === 'reminder');
            const isSelected = selectedDay && isSameDay(day, selectedDay);
            const today = isToday(day);

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={cn(
                  'min-h-[56px] p-1.5 border-b border-r border-border/15 flex flex-col items-center gap-1 transition-all relative',
                  isSelected && 'bg-primary/15 ring-1 ring-inset ring-primary/30',
                  today && !isSelected && 'bg-primary/5',
                  !isSelected && !today && 'hover:bg-accent/30'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-colors',
                    today && 'bg-primary text-primary-foreground font-bold shadow-sm',
                    isSelected && !today && 'bg-primary/25 font-bold'
                  )}
                >
                  {dayNum}
                </span>
                {/* Event dots — larger & more vivid */}
                {events.length > 0 && (
                  <div className="flex items-center gap-[3px]">
                    {hasIncome && <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]" />}
                    {hasExpense && <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.4)]" />}
                    {hasBill && <div className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_4px_rgba(244,63,94,0.4)]" />}
                    {hasSavings && <div className="h-2 w-2 rounded-full bg-violet-500 shadow-[0_0_4px_rgba(139,92,246,0.4)]" />}
                    {hasReminder && <div className="h-2 w-2 rounded-full bg-sky-500 shadow-[0_0_4px_rgba(14,165,233,0.4)]" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend — more colorful */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm" />
          <span className="text-emerald-700 dark:text-emerald-400">Income</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-amber-500 shadow-sm" />
          <span className="text-amber-700 dark:text-amber-400">Expense</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-rose-500 shadow-sm" />
          <span className="text-rose-700 dark:text-rose-400">Bill Due</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-violet-500 shadow-sm" />
          <span className="text-violet-700 dark:text-violet-400">Savings Goal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-full bg-sky-500 shadow-sm" />
          <span className="text-sky-700 dark:text-sky-400">Reminder</span>
        </div>
      </div>

      {/* Selected Day Detail */}
      {selectedDay && (
        <div className="bg-card rounded-xl border border-border/60 p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold">
              {format(selectedDay, 'EEEE, MMMM d')}
            </h4>
            <span className="text-xs text-muted-foreground font-medium">
              {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
            </span>
          </div>

          {selectedDayEvents.length > 0 ? (
            <div className="space-y-2">
              {selectedDayEvents.map((event, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border',
                    event.type === 'income' && 'bg-emerald-500/10 border-emerald-500/20',
                    event.type === 'expense' && 'bg-amber-500/10 border-amber-500/20',
                    event.type === 'bill' && 'bg-rose-500/10 border-rose-500/20',
                    event.type === 'savings' && 'bg-violet-500/10 border-violet-500/20',
                    event.type === 'reminder' && 'bg-sky-500/10 border-sky-500/20',
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn(
                      'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                      event.type === 'income' && 'bg-emerald-500/20',
                      event.type === 'expense' && 'bg-amber-500/20',
                      event.type === 'bill' && 'bg-rose-500/20',
                      event.type === 'savings' && 'bg-violet-500/20',
                      event.type === 'reminder' && 'bg-sky-500/20',
                    )}>
                      {event.type === 'income' && <DollarSign className="h-4 w-4 text-emerald-500" />}
                      {event.type === 'expense' && <DollarSign className="h-4 w-4 text-amber-500" />}
                      {event.type === 'bill' && <FileText className="h-4 w-4 text-rose-500" />}
                      {event.type === 'savings' && <PiggyBank className="h-4 w-4 text-violet-500" />}
                      {event.type === 'reminder' && <Bell className="h-4 w-4 text-sky-500" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate capitalize">{event.label}</p>
                      <p className={cn(
                        'text-xs font-medium capitalize',
                        event.type === 'income' && 'text-emerald-600 dark:text-emerald-400',
                        event.type === 'expense' && 'text-amber-600 dark:text-amber-400',
                        event.type === 'bill' && 'text-rose-600 dark:text-rose-400',
                        event.type === 'savings' && 'text-violet-600 dark:text-violet-400',
                        event.type === 'reminder' && 'text-sky-600 dark:text-sky-400',
                      )}>{event.type}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {event.type === 'reminder' ? (
                      <p className={cn('text-xs font-semibold', event.isCompleted ? 'text-emerald-500' : 'text-sky-500')}>
                        {event.isCompleted ? '✓ Done' : '⏰ Pending'}
                      </p>
                    ) : (
                      <>
                        <span className={cn(
                          'text-sm font-bold',
                          event.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : ''
                        )}>
                          {event.type === 'income' ? '+' : '-'}{fmt(event.amount)}
                        </span>
                        {event.isPaid !== undefined && (
                          <p className={cn('text-xs font-semibold', event.isPaid ? 'text-emerald-500' : 'text-rose-500')}>
                            {event.isPaid ? '✓ Paid' : 'Unpaid'}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-3">No events on this day</p>
          )}

          {/* Quick add for selected day */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10" onClick={onAddEntry}>
              <Plus className="h-3 w-3 mr-1" /> Transaction
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10" onClick={onAddBill}>
              <FileText className="h-3 w-3 mr-1" /> Bill
            </Button>
            <Button variant="outline" size="sm" className="flex-1 text-xs border-violet-500/30 text-violet-700 dark:text-violet-400 hover:bg-violet-500/10" onClick={onAddGoal}>
              <PiggyBank className="h-3 w-3 mr-1" /> Goal
            </Button>
          </div>
        </div>
      )}

      {/* Upcoming Bills */}
      {bills.length > 0 && (
        <div className="bg-card rounded-xl border border-border/60 p-4 space-y-3 shadow-sm">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-rose-500/15 flex items-center justify-center">
              <FileText className="h-3.5 w-3.5 text-rose-500" />
            </div>
            Upcoming Bills
          </h4>
          <div className="space-y-2">
            {bills
              .sort((a, b) => a.due_day - b.due_day)
              .slice(0, 5)
              .map((bill) => (
                <div key={bill.id} className={cn(
                  'flex items-center justify-between p-2.5 rounded-lg border transition-colors',
                  bill.is_paid_this_month
                    ? 'bg-emerald-500/5 border-emerald-500/15'
                    : 'bg-rose-500/5 border-rose-500/10 hover:border-rose-500/25'
                )}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{bill.name}</p>
                    <p className="text-xs text-muted-foreground">Due day {bill.due_day}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="text-sm font-bold">{fmt(bill.amount)}</span>
                    <p className={cn('text-xs font-semibold', bill.is_paid_this_month ? 'text-emerald-500' : 'text-rose-400')}>
                      {bill.is_paid_this_month ? '✓ Paid' : 'Pending'}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
