import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isBefore, isAfter, startOfDay } from 'date-fns';
import { Bill } from '@/hooks/useFinances';

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
      {payload.map((entry: any) =>
        entry.value > 0 ? (
          <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        ) : null
      )}
    </div>
  );
};

export function BillPaymentTrendChart({ bills, selectedMonth }: BillPaymentTrendChartProps) {
  const today = startOfDay(new Date());
  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const isCurrentMonth = monthStart.getTime() === startOfMonth(today).getTime();
  const isPastMonth = isBefore(monthEnd, today);
  const isFutureMonth = isAfter(monthStart, today);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return days.map(date => {
      const dayOfMonth = date.getDate();
      const isFutureDay = isAfter(date, today);

      // Bills due on this day
      const dueBills = bills.filter(b => b.due_day === dayOfMonth);
      const dueAmount = dueBills.reduce((sum, b) => sum + Number(b.amount), 0);

      // Paid bills on this day (paid bills whose due_day matches)
      const paidAmount = isFutureDay
        ? 0
        : dueBills.filter(b => b.is_paid_this_month).reduce((sum, b) => sum + Number(b.amount), 0);

      // Projected (future unpaid)
      const projectedAmount = isFutureDay
        ? dueBills.filter(b => !b.is_paid_this_month).reduce((sum, b) => sum + Number(b.amount), 0)
        : 0;

      return {
        date: format(date, 'MMM d'),
        bills: dueAmount,
        payments: paidAmount,
        projected: projectedAmount,
      };
    });
  }, [bills, monthStart, monthEnd, today]);

  const hasData = chartData.some(d => d.bills > 0 || d.payments > 0 || d.projected > 0);
  if (!hasData) return null;

  const label = isPastMonth
    ? format(monthStart, 'MMMM yyyy')
    : isCurrentMonth
      ? `${format(monthStart, 'MMMM')} — So Far + Upcoming`
      : `${format(monthStart, 'MMMM yyyy')} — Forecast`;

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Bills Due
          </span>
          {!isFutureMonth && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-primary" /> Paid
            </span>
          )}
          {(isCurrentMonth || isFutureMonth) && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400/60" /> Projected
            </span>
          )}
        </div>
      </div>
      <div className="h-[130px] px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="billsDueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.7} />
                <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="billsPaidGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.7} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.5} />
                <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.05} />
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
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Area
              type="natural"
              dataKey="bills"
              name="Bills Due"
              stroke="hsl(25, 95%, 53%)"
              strokeWidth={2}
              fill="url(#billsDueGrad)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(25, 95%, 53%)' }}
            />
            {!isFutureMonth && (
              <Area
                type="natural"
                dataKey="payments"
                name="Paid"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#billsPaidGrad)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            )}
            {(isCurrentMonth || isFutureMonth) && (
              <Area
                type="natural"
                dataKey="projected"
                name="Projected"
                stroke="hsl(45, 93%, 47%)"
                strokeWidth={2}
                strokeDasharray="6 3"
                fill="url(#projectedGrad)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(45, 93%, 47%)' }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
