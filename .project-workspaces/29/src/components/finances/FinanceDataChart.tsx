import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { BudgetEntry } from '@/hooks/useFinances';

interface FinanceDataChartProps {
  entries: BudgetEntry[];
  slideId: string;
  fillColor: string;
  value: number;
  maxValue: number;
}

/* ─── Chart data point with per-day breakdown ─── */
interface ChartPoint {
  name: string;
  label: string;
  value: number;
  income: number;
  spending: number;
  hasActivity: boolean;
}

/* ─── Custom Tooltip — CoinsBloom style ─── */
function FinanceChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload as ChartPoint | undefined;
  if (!data) return null;

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm min-w-[120px]">
      <p className="font-semibold mb-1 text-foreground">{data.label}</p>
      {data.hasActivity ? (
        <>
          {data.income > 0 && (
            <p className="text-emerald-500">Income: ${data.income.toLocaleString()}</p>
          )}
          {data.spending > 0 && (
            <p className="text-rose-500">Spending: ${data.spending.toLocaleString()}</p>
          )}
          {data.income === 0 && data.spending === 0 && (
            <p className="text-muted-foreground">No transactions</p>
          )}
        </>
      ) : (
        <p className="text-muted-foreground">No activity</p>
      )}
    </div>
  );
}

/* ─── Build daily chart data with income/spending per day ─── */
function buildChartData(
  entries: BudgetEntry[],
  slideId: string,
): ChartPoint[] {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const month = now.toLocaleString('default', { month: 'short' });

  if (!entries.length) return [];

  // Pre-compute daily income & spending
  const dailyIncome: number[] = new Array(daysInMonth).fill(0);
  const dailySpending: number[] = new Array(daysInMonth).fill(0);

  for (const entry of entries) {
    const d = new Date(entry.entry_date).getDate() - 1;
    if (d < 0 || d >= daysInMonth) continue;
    if (entry.type === 'income') {
      dailyIncome[d] += Number(entry.amount);
    } else {
      dailySpending[d] += Number(entry.amount);
    }
  }

  // Build the chart value series based on slide type
  const dailyValues: number[] = new Array(daysInMonth).fill(0);

  if (slideId === 'budget-health') {
    const totalIncome = entries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + Number(e.amount), 0);
    let remaining = totalIncome;
    for (let d = 0; d < daysInMonth; d++) {
      remaining -= dailySpending[d];
      dailyValues[d] = Math.max(0, remaining);
    }
  } else if (slideId === 'bills') {
    let cumulative = 0;
    for (let d = 0; d < daysInMonth; d++) {
      cumulative += dailySpending[d];
      dailyValues[d] = cumulative;
    }
  } else {
    // total-balance, cash-flow, net-worth — cumulative net
    let running = 0;
    for (let d = 0; d < daysInMonth; d++) {
      running += dailyIncome[d] - dailySpending[d];
      dailyValues[d] = running;
    }
  }

  // Only show up to current day
  const visibleDays = Math.min(currentDay, daysInMonth);
  const visibleData = dailyValues.slice(0, visibleDays);
  const hasMovement = visibleData.some(v => v !== 0);
  if (!hasMovement || visibleDays < 2) return [];

  // Build one point per day (like CoinsBloom — each day is tappable)
  const points: ChartPoint[] = [];
  for (let d = 0; d < visibleDays; d++) {
    const day = d + 1;
    const income = dailyIncome[d];
    const spending = dailySpending[d];
    points.push({
      name: `${day}`,
      label: `${month} ${day}`,
      value: Math.round(visibleData[d] * 100) / 100,
      income: Math.round(income * 100) / 100,
      spending: Math.round(spending * 100) / 100,
      hasActivity: income > 0 || spending > 0,
    });
  }

  return points;
}

/* ─── Fallback data when no real entries ─── */
function getFallbackData(slideId: string, value: number, maxValue: number): ChartPoint[] {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'short' });
  const s = maxValue > 0 ? Math.max(0.1, Math.min(value / maxValue, 1)) : 0.5;

  const curves: Record<string, number[]> = {
    'total-balance': [0.05, 0.35, 0.55, 0.42, 0.65, 0.78, 0.88],
    'cash-flow': [0.15, 0.6, 0.35, 0.72, 0.45, 0.8, 0.55],
    'budget-health': [0.92, 0.85, 0.72, 0.58, 0.45, 0.35, 0.28],
    'net-worth': [0.02, 0.08, 0.18, 0.35, 0.55, 0.75, 0.92],
    'bills': [0.05, 0.12, 0.28, 0.42, 0.58, 0.75, 0.88],
  };

  const curve = curves[slideId] ?? [0.1, 0.4, 0.55, 0.38, 0.65, 0.5, 0.7];
  const scaleMax = Math.max(value, 100);

  return curve.map((e, i) => ({
    name: `W${i + 1}`,
    label: `${month} ${(i + 1) * 4}`,
    value: Math.round(e * s * scaleMax * 100) / 100,
    income: 0,
    spending: 0,
    hasActivity: false,
  }));
}

/* ─── Gradient ID helper ─── */
function getGradientId(slideId: string) {
  return `finance-gradient-${slideId}`;
}

/* ─── Stroke color per slide ─── */
function getStrokeColor(slideId: string): string {
  switch (slideId) {
    case 'total-balance': return 'hsl(280, 60%, 75%)';
    case 'cash-flow': return 'hsl(210, 85%, 70%)';
    case 'budget-health': return 'hsl(45, 80%, 65%)';
    case 'net-worth': return 'hsl(165, 65%, 60%)';
    case 'bills': return 'hsl(345, 70%, 70%)';
    default: return 'hsl(200, 80%, 70%)';
  }
}

/**
 * Recharts area chart for finance carousel slides.
 * Shows per-day income/spending in tooltip (CoinsBloom style).
 * Dot appears on tap with dashed cursor line.
 */
export function FinanceDataChart({ entries, slideId, fillColor, value, maxValue }: FinanceDataChartProps) {
  const chartData = useMemo(() => {
    const realData = buildChartData(entries, slideId);
    if (realData.length >= 2) return realData;
    if (value > 0) return getFallbackData(slideId, value, maxValue);
    return getFallbackData(slideId, 10, 100);
  }, [entries, slideId, value, maxValue]);

  const strokeColor = getStrokeColor(slideId);
  const gradientId = getGradientId(slideId);

  return (
    <div style={{ height: '130px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.7} />
              <stop offset="50%" stopColor={strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />

          <XAxis dataKey="name" hide />
          <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />

          <Tooltip
            content={<FinanceChartTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.3)', strokeDasharray: '4 4', strokeWidth: 1 }}
          />

          <Area
            type="natural"
            dataKey="value"
            name="Amount"
            stroke={strokeColor}
            strokeWidth={3}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 6,
              fill: strokeColor,
              stroke: '#fff',
              strokeWidth: 2,
            }}
            animationDuration={1500}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
