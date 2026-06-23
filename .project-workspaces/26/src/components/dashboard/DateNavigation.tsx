import { useState, useMemo, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardCalendarModal } from "./DashboardCalendarModal";
import { DayDetailsModal } from "./DayDetailsModal";

interface DateNavigationProps {
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

export function DateNavigation({ currentDate: controlledDate, onDateChange }: DateNavigationProps) {
  const [internalDate, setInternalDate] = useState(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayDetailsOpen, setDayDetailsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDelta = useRef(0);

  const currentDate = controlledDate ?? internalDate;
  const setCurrentDate = (date: Date) => {
    if (onDateChange) onDateChange(date);
    else setInternalDate(date);
  };

  const today = new Date();
  const isCurrentMonth = currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();

  const goToPreviousMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const goToNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  // Generate week days based on the current week offset
  const weekDays = useMemo(() => {
    const refDay = isCurrentMonth ? today : new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const baseStart = new Date(refDay);
    baseStart.setDate(refDay.getDate() - refDay.getDay() + weekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(baseStart);
      d.setDate(baseStart.getDate() + i);
      return d;
    });
  }, [currentDate, isCurrentMonth, weekOffset]);

  // Reset week offset when month changes
  const prevMonthRef = useRef(currentDate.getMonth());
  if (currentDate.getMonth() !== prevMonthRef.current) {
    prevMonthRef.current = currentDate.getMonth();
    setWeekOffset(0);
  }

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDelta.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current !== null) {
      touchDelta.current = e.touches[0].clientX - touchStartX.current;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (Math.abs(touchDelta.current) > 50) {
      setWeekOffset(prev => prev + (touchDelta.current < 0 ? 1 : -1));
    }
    touchStartX.current = null;
    touchDelta.current = 0;
  }, []);

  const monthLabel = currentDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCalendarOpen(false);
    setDayDetailsOpen(true);
  };

  const handleDayTap = (date: Date) => {
    setSelectedDate(date);
    setDayDetailsOpen(true);
  };

  return (
    <>
      <div className="rounded-xl bg-white/70 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 px-3 py-2 shadow-sm">
        {/* Top row: arrows + month label + calendar icon */}
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPreviousMonth}
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-xs font-semibold text-foreground tracking-wide uppercase">
            {monthLabel}
          </span>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCalendarOpen(true)}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
              title="Open Calendar"
            >
              <Calendar className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Week timeline strip */}
        <div
          className="flex items-center justify-between gap-0.5 select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {weekDays.map((day) => {
            const isToday = day.toDateString() === today.toDateString();
            const dayNum = day.getDate();
            const dayName = day.toLocaleDateString("en-US", { weekday: "narrow" });
            const isOutsideMonth = day.getMonth() !== currentDate.getMonth();

            return (
              <button
                key={day.toISOString()}
                onClick={() => handleDayTap(day)}
                className={`flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg flex-1 transition-all ${
                  isToday
                    ? "bg-primary/15 ring-1 ring-primary/30"
                    : "hover:bg-muted/50"
                } ${isOutsideMonth ? "opacity-30" : ""}`}
              >
                <span className={`text-[9px] font-medium uppercase ${
                  isToday ? "text-primary" : "text-muted-foreground"
                }`}>
                  {dayName}
                </span>
                <span className={`text-xs font-semibold leading-none ${
                  isToday ? "text-primary" : "text-foreground"
                }`}>
                  {dayNum}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <DashboardCalendarModal
        open={calendarOpen}
        onOpenChange={setCalendarOpen}
        onDateSelect={handleDateSelect}
      />
      <DayDetailsModal
        open={dayDetailsOpen}
        onOpenChange={setDayDetailsOpen}
        selectedDate={selectedDate}
      />
    </>
  );
}