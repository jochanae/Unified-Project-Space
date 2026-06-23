import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface TradeSparklineProps {
  symbol: string;
  entryPrice: number;
  exitPrice?: number | null;
  status: 'open' | 'closed';
  className?: string;
}

// Generate mock mini price data for sparkline visualization
function generateSparklineData(entryPrice: number, exitPrice?: number | null): number[] {
  const points: number[] = [];
  const numPoints = 20;
  const volatility = entryPrice * 0.02; // 2% volatility
  
  let currentPrice = entryPrice;
  const targetPrice = exitPrice || entryPrice * (1 + (Math.random() * 0.1 - 0.05));
  const priceChange = (targetPrice - entryPrice) / numPoints;
  
  for (let i = 0; i < numPoints; i++) {
    const noise = (Math.random() - 0.5) * volatility;
    currentPrice = entryPrice + priceChange * i + noise;
    points.push(currentPrice);
  }
  
  // Ensure last point is the exit price if provided
  if (exitPrice) {
    points[numPoints - 1] = exitPrice;
  }
  
  return points;
}

export function TradeSparkline({ symbol, entryPrice, exitPrice, status, className }: TradeSparklineProps) {
  const data = useMemo(() => generateSparklineData(entryPrice, exitPrice), [entryPrice, exitPrice]);
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const width = 60;
  const height = 20;
  const padding = 1;
  
  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  const isProfit = exitPrice ? exitPrice > entryPrice : data[data.length - 1] > data[0];
  const strokeColor = isProfit ? 'hsl(var(--gain))' : 'hsl(var(--loss))';
  
  // Create gradient fill
  const gradientId = `sparkline-${symbol}-${Date.now()}`;
  
  return (
    <div className={cn('inline-flex items-center', className)}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Fill area */}
        <polygon
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          fill={`url(#${gradientId})`}
        />
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* End dot */}
        {status === 'open' && (
          <circle
            cx={width - padding}
            cy={height - padding - ((data[data.length - 1] - min) / range) * (height - padding * 2)}
            r="2"
            fill={strokeColor}
            className="animate-pulse"
          />
        )}
      </svg>
    </div>
  );
}
