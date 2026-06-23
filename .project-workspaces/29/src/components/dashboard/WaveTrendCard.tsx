import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface WaveTrendCardProps {
  label: string;
  value: string;
  change?: string | null;
  isPositive?: boolean | null;
  gradient: string;
  waveColor: string;
  className?: string;
}

// SVG wave pattern
function WavePattern({ color }: { color: string }) {
  return (
    <svg
      className="absolute bottom-0 left-0 right-0 h-16 w-full"
      viewBox="0 0 400 80"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`waveGrad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        className={color}
        fill={`url(#waveGrad-${color})`}
        d="M0,40 C50,70 100,10 150,40 C200,70 250,20 300,45 C350,70 380,30 400,50 L400,80 L0,80 Z"
      >
        <animate
          attributeName="d"
          dur="8s"
          repeatCount="indefinite"
          values="
            M0,40 C50,70 100,10 150,40 C200,70 250,20 300,45 C350,70 380,30 400,50 L400,80 L0,80 Z;
            M0,50 C50,20 100,60 150,35 C200,10 250,50 300,30 C350,10 380,60 400,40 L400,80 L0,80 Z;
            M0,40 C50,70 100,10 150,40 C200,70 250,20 300,45 C350,70 380,30 400,50 L400,80 L0,80 Z
          "
        />
      </path>
      {/* Second wave layer */}
      <path
        className={color}
        fill="currentColor"
        opacity="0.15"
        d="M0,55 C60,35 120,65 180,45 C240,25 300,55 360,40 C390,32 400,45 400,55 L400,80 L0,80 Z"
      >
        <animate
          attributeName="d"
          dur="6s"
          repeatCount="indefinite"
          values="
            M0,55 C60,35 120,65 180,45 C240,25 300,55 360,40 C390,32 400,45 400,55 L400,80 L0,80 Z;
            M0,45 C60,65 120,35 180,55 C240,75 300,45 360,60 C390,68 400,55 400,45 L400,80 L0,80 Z;
            M0,55 C60,35 120,65 180,45 C240,25 300,55 360,40 C390,32 400,45 400,55 L400,80 L0,80 Z
          "
        />
      </path>
    </svg>
  );
}

export function WaveTrendCard({
  label,
  value,
  change,
  isPositive,
  gradient,
  waveColor,
  className,
}: WaveTrendCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl p-4 min-h-[120px] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        "bg-gradient-to-br",
        gradient,
        className
      )}
    >
      {/* Content */}
      <div className="relative z-10">
        <p className="text-sm text-white/80 mb-1 font-medium">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold text-white">
            {value}
          </span>
          {change && (
            <span className="flex items-center text-xs font-medium text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
              {isPositive ? (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {change}
            </span>
          )}
        </div>
      </div>

      {/* Wave decoration */}
      <WavePattern color={waveColor} />
    </div>
  );
}
