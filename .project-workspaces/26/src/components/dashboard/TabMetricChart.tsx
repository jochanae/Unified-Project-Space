import { useMemo } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip, Area, AreaChart } from "recharts";

interface DataPoint {
  label: string;
  value: number;
}

interface TabMetricChartProps {
  data: DataPoint[];
  color: string;
  metricLabel: string;
  explanation: string;
  formatValue?: (value: number) => string;
}

export function TabMetricChart({ 
  data, 
  color, 
  metricLabel, 
  explanation,
  formatValue = (v) => `$${v.toLocaleString()}`
}: TabMetricChartProps) {
  const trend = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data[0].value;
    const last = data[data.length - 1].value;
    return first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  }, [data]);

  const isPositive = trend >= 0;

  return (
    <div className="w-full px-2">
      {/* Chart */}
      <div className="h-24 w-full mb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <defs>
              <linearGradient id={`gradient-${metricLabel}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(0, 0%, 5%)" stopOpacity={0.9} />
              </linearGradient>
              <filter id={`shadow-${metricLabel}`} x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="black" floodOpacity="0.5" />
              </filter>
            </defs>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: 'none', 
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px'
              }}
              formatter={(value: number) => [formatValue(value), metricLabel]}
              labelFormatter={(label) => label}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="white"
              strokeWidth={3}
              fill={`url(#gradient-${metricLabel})`}
              dot={false}
              activeDot={{ r: 4, fill: 'white', stroke: color, strokeWidth: 2 }}
              style={{ filter: `url(#shadow-${metricLabel})` }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trend indicator */}
      <div className="flex items-center justify-center gap-2 mb-2">
        <span className={`text-sm font-medium ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
          {isPositive ? '↑' : '↓'} {Math.abs(trend)}% trend
        </span>
        <span className="text-white/60 text-xs">over 6 months</span>
      </div>

      {/* Explanation */}
      <p className="text-white/70 text-xs text-center leading-relaxed px-4">
        {explanation}
      </p>
    </div>
  );
}
