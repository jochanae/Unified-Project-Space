import { Sun, Moon, Sunrise, Sunset, Coffee, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface TimeGreetingProps {
  firstName?: string | null;
  className?: string;
}

export function TimeGreeting({ firstName, className }: TimeGreetingProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);
  
  const hour = currentTime.getHours();
  
  // Pick a consistent daily tagline from a pool (seeded by date)
  const pickDaily = (pool: string[]) => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(currentTime.getFullYear(), 0, 0).getTime()) / 86400000
    );
    return pool[dayOfYear % pool.length];
  };

  const getGreeting = () => {
    if (hour >= 5 && hour < 9) {
      return { 
        text: "Early Bird Mode", 
        emoji: "🌅",
        Icon: Sunrise, 
        gradient: "from-gold via-chart-4 to-primary",
        tagline: pickDaily([
          "The market waits for no one",
          "A great day to check your budget",
          "Small savings, big future",
          "Start strong — review your goals",
        ]),
      };
    } else if (hour >= 9 && hour < 12) {
      return { 
        text: "Morning Momentum", 
        emoji: "🌞",
        Icon: Sun, 
        gradient: "from-amber-400 to-orange-500",
        tagline: pickDaily([
          "Prime trading hours",
          "Review a financial goal today",
          "Knowledge compounds like interest",
          "Build one good habit today",
        ]),
      };
    } else if (hour >= 12 && hour < 14) {
      return { 
        text: "Midday Focus", 
        emoji: "🎯",
        Icon: Coffee, 
        gradient: "from-chart-4 to-primary",
        tagline: pickDaily([
          "Stay sharp, stay profitable",
          "Stay sharp, stay financially fit",
          "A good plan beats a perfect trade",
          "Check in on your spending today",
        ]),
      };
    } else if (hour >= 14 && hour < 17) {
      return { 
        text: "Afternoon Session", 
        emoji: "🌞",
        Icon: Sun, 
        gradient: "from-orange-400 via-amber-500 to-yellow-400",
        tagline: pickDaily([
          "Power through the close",
          "Progress over perfection",
          "Every dollar has a job",
          "Consistency builds wealth",
        ]),
      };
    } else if (hour >= 17 && hour < 20) {
      return { 
        text: "Golden Hour", 
        emoji: "🌇",
        Icon: Sunset, 
        gradient: "from-gold via-chart-3 to-primary",
        tagline: pickDaily([
          "Review your day's trades",
          "Reflect on today's money moves",
          "How's your emergency fund doing?",
          "Great day to track your net worth",
        ]),
      };
    } else if (hour >= 20 && hour < 23) {
      return { 
        text: "Night Owl Mode", 
        emoji: "🦉",
        Icon: Moon, 
        gradient: "from-chart-3 via-primary to-chart-5",
        tagline: pickDaily([
          "Planning tomorrow's moves",
          "Set a savings goal for tomorrow",
          "Rest well — your plan is working",
          "Review your week's progress",
        ]),
      };
    } else {
      return { 
        text: "Late Night Grind", 
        emoji: "✨",
        Icon: Star, 
        gradient: "from-chart-5 via-chart-3 to-primary",
        tagline: pickDaily([
          "The quiet hours of strategy",
          "The quiet hours build discipline",
          "Wealth is built while others sleep",
          "Dream big, plan bigger",
        ]),
      };
    }
  };

  const { text, emoji, Icon, gradient, tagline } = getGreeting();

  // Format time with seconds
  const formattedTime = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Format date
  const formattedDate = currentTime.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className={cn(
        "relative p-3 rounded-2xl bg-gradient-to-br shadow-lg",
        gradient
      )}>
        <span className="text-2xl md:text-3xl">{emoji}</span>
        <div className="absolute -bottom-1 -right-1 p-1.5 bg-card rounded-full shadow-md border-2 border-primary/50 ring-1 ring-primary/20">
          <Icon className="h-4 w-4 text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]" />
        </div>
      </div>
      <div className="space-y-0.5">
        <h1 className="text-xl md:text-2xl lg:text-3xl font-bold leading-tight">
          <span className="text-foreground">{text},</span>{" "}
          <span className="bg-gradient-to-r from-primary via-chart-2 to-gold bg-clip-text text-transparent">
            {firstName || 'there'}
          </span>
          <span className="text-foreground">!</span>
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground italic">
          {tagline}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {formattedDate} • <span className="font-mono">{formattedTime}</span>
        </p>
      </div>
    </div>
  );
}
