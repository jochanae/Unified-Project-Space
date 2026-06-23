import { Heart } from "lucide-react";

interface SubscriptionBadgeProps {
  planName?: string;
  message?: string;
  variant?: "default" | "compact";
}

export const SubscriptionBadge = ({ 
  planName = "Admin Plan", 
  message = "Unlock your full financial potential",
  variant = "default"
}: SubscriptionBadgeProps) => {
  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full bg-gradient-to-r from-[hsl(270,60%,55%)] via-[hsl(290,55%,50%)] to-[hsl(330,65%,55%)] px-2 sm:px-3 py-0.5 sm:py-1 shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-200">
        <Heart className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-white text-white flex-shrink-0" />
        <span className="font-semibold text-[10px] sm:text-xs text-white whitespace-nowrap">
          {planName}
        </span>
        <span className="text-white/70 text-[10px] sm:text-xs hidden md:inline">—</span>
        <span className="text-white/80 text-[10px] sm:text-xs hidden md:inline whitespace-nowrap">
          {message}
        </span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 p-3 shadow-lg">
      {/* Floating hearts decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Heart className="absolute top-1 left-4 w-3 h-3 text-white/30 fill-white/20" />
        <Heart className="absolute top-2 left-10 w-2 h-2 text-white/25 fill-white/15" />
        <Heart className="absolute bottom-1 left-6 w-4 h-4 text-white/20 fill-white/10" />
        <Heart className="absolute top-0 right-14 w-3 h-3 text-white/30 fill-white/20" />
        <Heart className="absolute top-2 right-6 w-2 h-2 text-white/25 fill-white/15" />
        <Heart className="absolute bottom-2 right-10 w-3 h-3 text-white/20 fill-white/10" />
        <Heart className="absolute top-1 left-1/3 w-2 h-2 text-white/20 fill-white/10" />
        <Heart className="absolute bottom-0 right-1/3 w-3 h-3 text-white/25 fill-white/15" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center gap-2 text-white flex-wrap">
        <Heart className="w-4 h-4 fill-white text-white flex-shrink-0" />
        <span className="font-semibold text-xs sm:text-sm">
          {planName} Active
        </span>
        <span className="text-white/80 text-xs sm:text-sm hidden sm:inline">—</span>
        <span className="text-white/90 text-xs sm:text-sm text-center">
          {message}
        </span>
      </div>
    </div>
  );
};