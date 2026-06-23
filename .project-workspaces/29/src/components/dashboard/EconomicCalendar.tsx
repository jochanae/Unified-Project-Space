import { useState } from "react";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, TrendingUp, AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface EconomicEvent {
  id: string;
  title: string;
  date: Date;
  time: string;
  impact: "high" | "medium" | "low";
  category: "fed" | "earnings" | "economic" | "market";
  description?: string;
}

// Sample economic events - in production, these would come from an API
const getUpcomingEvents = (): EconomicEvent[] => {
  const now = new Date();
  const events: EconomicEvent[] = [
    {
      id: "1",
      title: "FOMC Meeting Minutes",
      date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
      time: "2:00 PM ET",
      impact: "high",
      category: "fed",
      description: "Federal Reserve policy decision",
    },
    {
      id: "2",
      title: "CPI Data Release",
      date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
      time: "8:30 AM ET",
      impact: "high",
      category: "economic",
      description: "Consumer Price Index monthly report",
    },
    {
      id: "3",
      title: "NVDA Earnings",
      date: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      time: "4:00 PM ET",
      impact: "high",
      category: "earnings",
      description: "Q4 earnings report",
    },
    {
      id: "4",
      title: "Jobless Claims",
      date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      time: "8:30 AM ET",
      impact: "medium",
      category: "economic",
      description: "Weekly unemployment claims",
    },
    {
      id: "5",
      title: "AAPL Earnings",
      date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      time: "4:30 PM ET",
      impact: "high",
      category: "earnings",
      description: "Q1 earnings report",
    },
    {
      id: "6",
      title: "PPI Data",
      date: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000),
      time: "8:30 AM ET",
      impact: "medium",
      category: "economic",
      description: "Producer Price Index",
    },
  ];
  
  return events.sort((a, b) => a.date.getTime() - b.date.getTime());
};

const getCountdown = (date: Date): string => {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff < 0) return "Past";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return "Soon";
};

const impactColors = {
  high: "bg-loss/20 text-loss border-loss/30",
  medium: "bg-gold/20 text-gold border-gold/30",
  low: "bg-muted text-muted-foreground border-border",
};

const categoryIcons = {
  fed: "🏛️",
  earnings: "📊",
  economic: "📈",
  market: "🔔",
};

export function EconomicCalendar() {
  const [events] = useState<EconomicEvent[]>(getUpcomingEvents());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const headerActions = (
    <div onClick={(e) => e.stopPropagation()}>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="h-8 w-8"
      >
        <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
      </Button>
    </div>
  );

  return (
    <CollapsibleCard
      title={
        <div className="flex items-center justify-between w-full">
          <span>Economic Calendar</span>
          {headerActions}
        </div>
      }
      description="Upcoming market-moving events"
      icon={<Calendar className="h-5 w-5 text-primary" />}
      storageKey="dashboard-economic-calendar"
    >
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {events.slice(0, 5).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl">{categoryIcons[event.category]}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{event.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{event.time}</span>
                    <span>•</span>
                    <span>
                      {event.date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Badge
                  variant="outline"
                  className={cn("text-xs shrink-0", impactColors[event.impact])}
                >
                  {getCountdown(event.date)}
                </Badge>
                {event.impact === "high" && (
                  <AlertTriangle className="h-4 w-4 text-loss shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-loss" /> High
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-gold" /> Med
              </span>
            </div>
            <span>{events.length} upcoming events</span>
          </div>
        </div>
    </CollapsibleCard>
  );
}
