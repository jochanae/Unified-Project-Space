import { useState, useEffect } from "react";

interface GreetingBannerProps {
  userName: string;
}

const getGreetingData = (hour: number) => {
  if (hour >= 5 && hour < 12) {
    return { greeting: "Good Morning", emoji: "☀️" };
  } else if (hour >= 12 && hour < 17) {
    return { greeting: "Good Afternoon", emoji: "🌤️" };
  } else if (hour >= 17 && hour < 21) {
    return { greeting: "Good Evening", emoji: "🌆" };
  } else {
    return { greeting: "Night Owl Mode", emoji: "🌟" };
  }
};

export function GreetingBanner({ userName }: GreetingBannerProps) {
  const [greetingData, setGreetingData] = useState(getGreetingData(new Date().getHours()));

  // Update greeting based on time
  useEffect(() => {
    const timer = setInterval(() => {
      setGreetingData(getGreetingData(new Date().getHours()));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mt-2 px-4 pt-2 pb-1 overflow-hidden">
      {/* Header Row */}
      <div className="relative z-10 flex items-center gap-2">
        <span className="text-3xl">{greetingData.emoji}</span>
        <h2 className="text-xl font-semibold text-foreground dark:text-white">
          {greetingData.greeting},{" "}
          <span 
            className="text-2xl font-bold bg-gradient-to-r from-[hsl(280,70%,50%)] via-[hsl(320,75%,55%)] to-[hsl(350,80%,55%)] bg-clip-text text-transparent dark:from-[hsl(45,90%,65%)] dark:via-[hsl(35,85%,60%)] dark:to-[hsl(25,80%,55%)]"
            style={{ 
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
            }}
          >
            {userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase()}
          </span>!
        </h2>
      </div>
    </div>
  );
}
