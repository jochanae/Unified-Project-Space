import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, getDay } from "date-fns";

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: string;
}

interface BillsCalendarProps {
  bills: Bill[];
  selectedMonth?: Date;
}

const BillsCalendar = ({ bills, selectedMonth }: BillsCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(selectedMonth || new Date());

  // Sync with parent's selected month when it changes
  useEffect(() => {
    if (selectedMonth) {
      setCurrentMonth(selectedMonth);
    }
  }, [selectedMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad the start of the month
  const startPadding = getDay(monthStart);
  const paddedDays = [
    ...Array(startPadding).fill(null),
    ...days
  ];

  const getBillsForDay = (date: Date) => {
    return bills.filter(bill => isSameDay(new Date(bill.due_date), date));
  };

  const getDayStatus = (date: Date) => {
    const dayBills = getBillsForDay(date);
    if (dayBills.length === 0) return null;
    
    const hasPaid = dayBills.some(b => b.status === 'paid');
    const hasUnpaid = dayBills.some(b => b.status !== 'paid');
    const isOverdue = date < new Date() && hasUnpaid;

    if (isOverdue) return 'overdue';
    if (hasPaid && !hasUnpaid) return 'paid';
    if (hasUnpaid) return 'pending';
    return null;
  };

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-4">
          {/* Week day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {paddedDays.map((day, index) => {
              if (!day) {
                return <div key={`pad-${index}`} className="aspect-square" />;
              }

              const dayBills = getBillsForDay(day);
              const status = getDayStatus(day);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`aspect-square flex flex-col items-center justify-center rounded-lg text-sm relative
                    ${isToday ? 'bg-primary text-primary-foreground' : ''}
                    ${status === 'overdue' ? 'bg-destructive/20' : ''}
                    ${status === 'paid' ? 'bg-emerald-100 dark:bg-emerald-900/20' : ''}
                    ${status === 'pending' ? 'bg-orange-100 dark:bg-orange-900/20' : ''}
                  `}
                >
                  <span className={isToday ? 'font-bold' : ''}>
                    {format(day, 'd')}
                  </span>
                  {dayBills.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayBills.slice(0, 3).map((bill, i) => (
                        <div
                          key={bill.id}
                          className={`w-1.5 h-1.5 rounded-full
                            ${bill.status === 'paid' ? 'bg-emerald-500' : ''}
                            ${bill.status !== 'paid' && new Date(bill.due_date) < new Date() ? 'bg-destructive' : ''}
                            ${bill.status !== 'paid' && new Date(bill.due_date) >= new Date() ? 'bg-primary' : ''}
                          `}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Paid</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span>Overdue</span>
        </div>
      </div>

      {/* Bills for selected month */}
      <Card>
        <CardContent className="p-4">
          <h4 className="font-semibold mb-3">Bills this month</h4>
          {bills
            .filter(bill => isSameMonth(new Date(bill.due_date), currentMonth))
            .map(bill => (
              <div key={bill.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="font-medium">{bill.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(bill.due_date), 'MMM dd')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${Number(bill.amount).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full
                    ${bill.status === 'paid' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}
                  `}>
                    {bill.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          {bills.filter(bill => isSameMonth(new Date(bill.due_date), currentMonth)).length === 0 && (
            <p className="text-center text-muted-foreground py-4">No bills this month</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillsCalendar;
