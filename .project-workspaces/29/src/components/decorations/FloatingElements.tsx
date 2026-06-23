import { cn } from "@/lib/utils";

interface FloatingElementsProps {
  className?: string;
  variant?: "default" | "subtle" | "vibrant";
}

export function FloatingElements({ className, variant = "default" }: FloatingElementsProps) {
  const opacityMap = {
    default: "opacity-20",
    subtle: "opacity-10",
    vibrant: "opacity-30",
  };

  return (
    <div className={cn("pointer-events-none fixed inset-0 overflow-hidden z-0", className)}>
      {/* Top right - Large teal circle */}
      <div
        className={cn(
          "absolute -top-20 -right-20 h-80 w-80 rounded-full bg-gradient-to-br from-primary to-primary/50 blur-3xl",
          opacityMap[variant]
        )}
      />
      
      {/* Top left - Purple accent */}
      <div
        className={cn(
          "absolute -top-10 -left-10 h-60 w-60 rounded-full bg-gradient-to-br from-chart-3 to-chart-3/50 blur-3xl",
          opacityMap[variant]
        )}
      />
      
      {/* Bottom left - Gold accent */}
      <div
        className={cn(
          "absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-gradient-to-tr from-gold/80 to-gold/30 blur-3xl",
          opacityMap[variant]
        )}
      />
      
      {/* Bottom right - Teal secondary */}
      <div
        className={cn(
          "absolute -bottom-10 right-10 h-56 w-56 rounded-full bg-gradient-to-tl from-gain to-primary/50 blur-3xl",
          opacityMap[variant]
        )}
      />
      
      {/* Center floating accent */}
      <div
        className={cn(
          "absolute top-1/3 left-1/4 h-40 w-40 rounded-full bg-gradient-to-r from-chart-5 to-primary blur-3xl animate-float",
          opacityMap[variant]
        )}
      />
      
      {/* Small accent dot */}
      <div
        className={cn(
          "absolute top-1/2 right-1/3 h-24 w-24 rounded-full bg-gradient-to-r from-gold to-chart-4 blur-2xl animate-float",
          opacityMap[variant]
        )}
        style={{ animationDelay: "2s" }}
      />
    </div>
  );
}
