import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

interface CreditScore {
  id: string;
  score: number;
  bureau: string;
  score_date: string;
}

interface CreditScoreChartProps {
  creditScores: CreditScore[];
  isLoading: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm text-muted-foreground mb-1">
          {format(parseISO(label), 'MMM d, yyyy')}
        </p>
        <p className="text-lg font-bold text-foreground">
          Score: {payload[0].value}
        </p>
        <p className="text-xs text-muted-foreground">
          {payload[0].payload.bureau}
        </p>
      </div>
    );
  }
  return null;
};

const CreditScoreChart = ({ creditScores, isLoading }: CreditScoreChartProps) => {
  if (isLoading) {
    return (
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 overflow-hidden">
        <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm p-4">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-[130px] w-full" />
        </div>
      </div>
    );
  }

  if (creditScores.length < 2) {
    return (
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 overflow-hidden">
        <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm p-4">
          <p className="text-sm font-semibold text-foreground mb-2">Credit Score Trend</p>
          <div className="h-[130px] flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Add at least 2 credit scores to see your trend over time.</p>
          </div>
        </div>
      </div>
    );
  }

  // Sort by date ascending for chart
  const chartData = [...creditScores]
    .sort((a, b) => new Date(a.score_date).getTime() - new Date(b.score_date).getTime())
    .map(score => ({
      ...score,
      date: score.score_date,
    }));

  const minScore = Math.min(...creditScores.map(s => s.score));
  const maxScore = Math.max(...creditScores.map(s => s.score));
  const yMin = Math.max(300, minScore - 50);
  const yMax = Math.min(850, maxScore + 50);

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 overflow-hidden">
      <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm">
        <div className="px-4 pt-4 pb-1 flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">Credit Score Trend</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--primary))' }} /> Score
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: 'hsl(82 85% 45%)' }} /> Good (670)
            </span>
          </div>
        </div>
        <div className="h-[130px] px-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => format(parseISO(value), 'MMM')}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                dy={4}
              />
              <YAxis hide domain={[yMin, yMax]} />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <ReferenceLine 
                y={670} 
                stroke="hsl(82 85% 45%)" 
                strokeDasharray="5 5" 
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CreditScoreChart;
