import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isBefore, startOfDay, isAfter
} from "date-fns";

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  status: string;
  last_paid_date?: string | null;
}

interface BillPaymentTrendChartProps {
  bills: Bill[];
  selectedMonth: Date;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const hasValues = payload.some((p: any) => p.value > 0);
  if (!hasValues) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="font-semibold text-sm text-foreground">{label}</p>
      {payload.map((entry: any) => (
        entry.value > 0 && (
          <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        )
      ))}
    </div>
  );
};

const parseLocalDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const BillPaymentTrendChart = ({ bills, selectedMonth }: BillPaymentTrendChartProps) => {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const isCurrentMonth = monthStart.getTime() === startOfMonth(today).getTime();
  const isPastMonth = isBefore(monthEnd, today);
  const isFutureMonth = isAfter(monthStart, today);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(date => {
      const dueBills = bills.filter(bill => {
        const dueDate = parseLocalDate(bill.due_date);
        return isSameDay(dueDate, date);
      });

      const paidBills = bills.filter(bill => {
        if (!bill.last_paid_date) return false;
        const paidDate = parseLocalDate(bill.last_paid_date);
        return isSameDay(paidDate, date);
      });

      const isFutureDay = isAfter(date, today);

      return {
        date: format(date, 'MMM d'),
        bills: dueBills.reduce((sum, b) => sum + Number(b.amount), 0),
        payments: isFutureDay ? 0 : paidBills.reduce((sum, b) => sum + Number(b.amount), 0),
        projected: isFutureDay ? dueBills.reduce((sum, b) => sum + Number(b.amount), 0) : 0,
      };
    });
  }, [bills, monthStart, monthEnd, today]);

  const hasData = chartData.some(d => d.bills > 0 || d.payments > 0 || d.projected > 0);
  if (!hasData && isFutureMonth) return null;

  const label = isPastMonth
    ? format(monthStart, 'MMMM yyyy')
    : isCurrentMonth
      ? `${format(monthStart, 'MMMM')} — So Far + Upcoming`
      : `${format(monthStart, 'MMMM yyyy')} — Forecast`;

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm" data-allow-swipe="true" onTouchStart={(e) => e.stopPropagation()} onTouchMove={(e) => e.stopPropagation()}>
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Bills Due
          </span>
          {!isFutureMonth && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary))' }} /> Payments
            </span>
          )}
          {(isCurrentMonth || isFutureMonth) && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400/60" /> Projected
            </span>
          )}
        </div>
      </div>
      <div className="h-[130px] px-2 relative">
        {!hasData && isPastMonth && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <p className="text-xs text-muted-foreground italic">No activity for this period</p>
          </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="billsDueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="billsPaidGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              dy={4}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis hide />
            {hasData && <Tooltip content={<CustomTooltip />} cursor={false} />}
            <Area
              type="monotone"
              dataKey="bills"
              name="Bills Due"
              stroke={hasData ? "hsl(25, 95%, 53%)" : "hsl(var(--border))"}
              strokeWidth={hasData ? 2 : 1}
              fill={hasData ? "url(#billsDueGradient)" : "none"}
              dot={false}
              activeDot={hasData ? { r: 4, fill: 'hsl(25, 95%, 53%)' } : false}
            />
            {hasData && !isFutureMonth && (
              <Area
                type="monotone"
                dataKey="payments"
                name="Payments"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#billsPaidGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            )}
            {hasData && (isCurrentMonth || isFutureMonth) && (
              <Area
                type="monotone"
                dataKey="projected"
                name="Projected"
                stroke="hsl(45, 93%, 47%)"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#projectedGradient)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(45, 93%, 47%)' }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BillPaymentTrendChart;
