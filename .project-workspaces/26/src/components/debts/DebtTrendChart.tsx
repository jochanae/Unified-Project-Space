import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";

interface Debt {
  id: string;
  name: string;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  status: string;
  created_at: string;
}

interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
}

interface DebtTrendChartProps {
  debts: Debt[];
  payments: DebtPayment[];
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

const DebtTrendChart = ({ debts, payments }: DebtTrendChartProps) => {
  const chartData = useMemo(() => {
    const months = 6;
    const today = new Date();

    return Array.from({ length: months }, (_, i) => {
      const monthDate = subMonths(startOfMonth(today), months - 1 - i);
      const monthStr = format(monthDate, 'yyyy-MM');

      // Payments in this month
      const monthPayments = payments.filter(p => p.payment_date.startsWith(monthStr));
      const totalPaid = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      // Estimate interest portion (simplified: avg rate * avg balance / 12)
      const activeDebts = debts.filter(d => d.status === 'active');
      const totalBalance = activeDebts.reduce((sum, d) => sum + Number(d.current_balance), 0);
      const avgRate = activeDebts.length > 0
        ? activeDebts.reduce((sum, d) => sum + Number(d.interest_rate), 0) / activeDebts.length
        : 0;
      const interestPortion = totalPaid > 0 ? Math.min((avgRate / 100 / 12) * totalBalance, totalPaid * 0.8) : 0;
      const principalPortion = Math.max(totalPaid - interestPortion, 0);

      return {
        date: format(monthDate, 'MMM'),
        principal: Math.round(principalPortion * 100) / 100,
        interest: Math.round(interestPortion * 100) / 100,
      };
    });
  }, [debts, payments]);

  const hasData = chartData.some(d => d.principal > 0 || d.interest > 0);
  if (!hasData) return null;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 overflow-hidden">
      <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
      <div className="px-4 pt-4 pb-1 flex items-center justify-between">
        <p className="text-sm font-semibold text-foreground">Payment Breakdown — Last 6 Months</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary))' }} /> Principal
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Interest
          </span>
        </div>
      </div>
      <div className="h-[130px] px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id="debtPrincipalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.01} />
              </linearGradient>
              <linearGradient id="debtInterestGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              dy={4}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Area
              type="monotone"
              dataKey="principal"
              name="Principal"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#debtPrincipalGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              stackId="1"
            />
            <Area
              type="monotone"
              dataKey="interest"
              name="Interest"
              stroke="hsl(0, 84%, 60%)"
              strokeWidth={2}
              fill="url(#debtInterestGradient)"
              dot={false}
              activeDot={{ r: 4, fill: 'hsl(0, 84%, 60%)' }}
              stackId="1"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
};

export default DebtTrendChart;
