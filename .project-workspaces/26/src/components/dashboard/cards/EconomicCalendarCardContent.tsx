import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, RefreshCw, Landmark, BarChart3, LineChart, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

type Impact = "high" | "medium" | "low";
type Category = "fed" | "earnings" | "economic" | "market";

interface EconomicEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  impact: Impact;
  category: Category;
  description?: string;
}

const getUpcomingEvents = (): EconomicEvent[] => {
  const now = new Date();
  const events: EconomicEvent[] = [
    { id: "1", title: "FOMC Meeting Minutes", date: new Date(now.getTime() + 2 * 86400000), time: "2:00 PM ET", impact: "high", category: "fed", description: "Federal Reserve policy decision" },
    { id: "2", title: "CPI Data Release", date: new Date(now.getTime() + 4 * 86400000), time: "8:30 AM ET", impact: "high", category: "economic", description: "Consumer Price Index monthly report" },
    { id: "3", title: "Jobless Claims", date: new Date(now.getTime() + 3 * 86400000), time: "8:30 AM ET", impact: "medium", category: "economic", description: "Weekly unemployment claims" },
    { id: "4", title: "PPI Data", date: new Date(now.getTime() + 6 * 86400000), time: "8:30 AM ET", impact: "medium", category: "economic", description: "Producer Price Index" },
    { id: "5", title: "Retail Sales", date: new Date(now.getTime() + 8 * 86400000), time: "8:30 AM ET", impact: "medium", category: "economic", description: "Monthly retail sales" },
  ];
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const getCountdown = (date: Date): string => {
  const diff = date.getTime() - Date.now();
  if (diff < 0) return "Past";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return "Soon";
};

const impactClasses: Record<Impact, string> = {
  high: "bg-rose-500/10 text-rose-500 border-rose-500/30",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

const categoryIcon: Record<Category, typeof Landmark> = {
  fed: Landmark,
  earnings: BarChart3,
  economic: LineChart,
  market: Bell,
};

export const EconomicCalendarCardContent = () => {
  const [events] = useState<EconomicEvent[]>(getUpcomingEvents());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Upcoming market-moving events</p>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="h-7 w-7"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
        {events.slice(0, 6).map((event) => {
          const Icon = categoryIcon[event.category];
          return (
            <div
              key={event.id}
              className="flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs truncate">{event.title}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{event.time}</span>
                    <span>•</span>
                    <span>
                      {event.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <Badge variant="outline" className={cn("text-[10px] shrink-0", impactClasses[event.impact])}>
                  {getCountdown(event.date)}
                </Badge>
                {event.impact === "high" && (
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-rose-500" />High</span>
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />Med</span>
        </div>
        <span>{events.length} events</span>
      </div>
    </div>
  );
};
