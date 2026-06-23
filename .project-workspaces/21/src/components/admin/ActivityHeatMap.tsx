import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DayData {
  date: string; // YYYY-MM-DD
  count: number;
}

interface Props {
  data: DayData[];
  title: string;
  icon?: React.ReactNode;
  weeks?: number;
}

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

function getIntensityClass(count: number, max: number): string {
  if (count === 0 || max === 0) return 'bg-muted/30';
  const ratio = count / max;
  if (ratio <= 0.25) return 'bg-primary/20';
  if (ratio <= 0.5) return 'bg-primary/40';
  if (ratio <= 0.75) return 'bg-primary/65';
  return 'bg-primary';
}

export default function ActivityHeatMap({ data, title, icon, weeks = 12 }: Props) {
  const { grid, maxCount, totalCount, monthLabels } = useMemo(() => {
    const map = new Map(data.map(d => [d.date, d.count]));

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (weeks * 7) - dayOfWeek);

    const columns: { date: string; count: number }[][] = [];
    const months: { label: string; col: number }[] = [];
    let currentMonth = -1;
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const col: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        if (cursor > endDate) {
          col.push({ date: '', count: 0 });
        } else {
          const key = cursor.toISOString().slice(0, 10);
          col.push({ date: key, count: map.get(key) || 0 });

          if (cursor.getMonth() !== currentMonth && d === 0) {
            currentMonth = cursor.getMonth();
            months.push({
              label: cursor.toLocaleString('default', { month: 'short' }),
              col: columns.length,
            });
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      columns.push(col);
    }

    let max = 0;
    let total = 0;
    for (const d of data) {
      if (d.count > max) max = d.count;
      total += d.count;
    }

    return { grid: columns, maxCount: max, totalCount: total, monthLabels: months };
  }, [data, weeks]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {totalCount.toLocaleString()} total
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          {/* Month labels */}
          <div className="flex ml-8 mb-1 text-[10px] text-muted-foreground">
            {monthLabels.map((m, i) => (
              <span
                key={i}
                className="absolute"
                style={{ marginLeft: `${m.col * 14}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-0.5 mt-4">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 pr-1">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="h-[12px] w-6 text-[9px] text-muted-foreground leading-[12px] text-right">
                  {label}
                </div>
              ))}
            </div>

            {/* Grid */}
            {grid.map((col, ci) => (
              <div key={ci} className="flex flex-col gap-0.5">
                {col.map((cell, ri) => (
                  <div
                    key={ri}
                    className={`h-[12px] w-[12px] rounded-[2px] ${cell.date ? getIntensityClass(cell.count, maxCount) : 'bg-transparent'}`}
                    title={cell.date ? `${cell.date}: ${cell.count}` : ''}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground justify-end">
            <span>Less</span>
            <div className="h-[10px] w-[10px] rounded-[2px] bg-muted/30" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-primary/20" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-primary/40" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-primary/65" />
            <div className="h-[10px] w-[10px] rounded-[2px] bg-primary" />
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
