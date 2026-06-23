import { useMemo } from "react";
import { format, subDays, startOfWeek, addDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityData {
  date: string;
  count: number;
}

interface ActivityHeatMapProps {
  data: ActivityData[];
  title?: string;
  weeks?: number;
}

export function ActivityHeatMap({ 
  data, 
  title = "Activity", 
  weeks = 12 
}: ActivityHeatMapProps) {
  const heatMapData = useMemo(() => {
    const today = new Date();
    const startDate = startOfWeek(subDays(today, weeks * 7), { weekStartsOn: 0 });
    
    // Create a map of date -> count
    const activityMap = new Map<string, number>();
    data.forEach((item) => {
      activityMap.set(item.date, item.count);
    });

    // Generate grid data
    const grid: { date: Date; count: number }[][] = [];
    let currentDate = startDate;
    
    for (let week = 0; week < weeks; week++) {
      const weekData: { date: Date; count: number }[] = [];
      for (let day = 0; day < 7; day++) {
        const dateStr = format(currentDate, "yyyy-MM-dd");
        weekData.push({
          date: currentDate,
          count: activityMap.get(dateStr) || 0,
        });
        currentDate = addDays(currentDate, 1);
      }
      grid.push(weekData);
    }

    return grid;
  }, [data, weeks]);

  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-white/5";
    if (count <= 2) return "bg-emerald-900/50";
    if (count <= 5) return "bg-emerald-700/60";
    if (count <= 10) return "bg-emerald-500/70";
    return "bg-emerald-400";
  };

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-white/80">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-1">
          {/* Day labels */}
          <div className="flex flex-col gap-[3px] mr-1">
            {dayLabels.map((day, i) => (
              <div key={i} className="text-[9px] text-white/40 h-[10px] flex items-center">
                {i % 2 === 1 ? day : ""}
              </div>
            ))}
          </div>
          
          {/* Heat map grid */}
          <TooltipProvider>
            <div className="flex gap-[3px] overflow-x-auto">
              {heatMapData.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day, dayIndex) => (
                    <Tooltip key={dayIndex}>
                      <TooltipTrigger asChild>
                        <div
                          className={`w-[10px] h-[10px] rounded-sm ${getIntensityClass(day.count)} cursor-pointer hover:ring-1 hover:ring-white/30 transition-all`}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="bg-slate-800 border-slate-700">
                        <p className="text-xs">
                          <span className="font-medium">{day.count} activities</span>
                          <br />
                          <span className="text-white/60">
                            {format(day.date, "MMM d, yyyy")}
                          </span>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-2 mt-3 text-[10px] text-white/50">
          <span>Less</span>
          <div className="flex gap-[2px]">
            <div className="w-[10px] h-[10px] rounded-sm bg-white/5" />
            <div className="w-[10px] h-[10px] rounded-sm bg-emerald-900/50" />
            <div className="w-[10px] h-[10px] rounded-sm bg-emerald-700/60" />
            <div className="w-[10px] h-[10px] rounded-sm bg-emerald-500/70" />
            <div className="w-[10px] h-[10px] rounded-sm bg-emerald-400" />
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
