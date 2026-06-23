import React from 'react';
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  colorScheme?: 'brand' | 'gold';
}

const sizeMap = {
  sm: { circle: 32, glow: 70 },
  md: { circle: 56, glow: 120 },
  lg: { circle: 80, glow: 170 },
};

// IntoIQ color schemes - teal/cyan primary and gold accent
const colorSchemes = {
  brand: {
    gradient: 'linear-gradient(135deg, hsl(168, 80%, 36%) 0%, hsl(175, 84%, 32%) 40%, hsl(180, 70%, 35%) 60%, hsl(185, 75%, 40%) 100%)',
    glow: 'rgba(13, 148, 136, 0.4)',
    blur: 'radial-gradient(circle, rgba(13, 148, 136, 0.5) 0%, rgba(20, 184, 166, 0.3) 50%, transparent 70%)',
  },
  gold: {
    gradient: 'linear-gradient(135deg, hsl(43, 96%, 56%) 0%, hsl(38, 92%, 50%) 40%, hsl(33, 90%, 48%) 60%, hsl(28, 85%, 45%) 100%)',
    glow: 'rgba(245, 158, 11, 0.4)',
    blur: 'radial-gradient(circle, rgba(245, 158, 11, 0.5) 0%, rgba(251, 191, 36, 0.3) 50%, transparent 70%)',
  },
};

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(function LoadingSpinner({ size = 'lg', className, text, colorScheme = 'brand' }, ref) {
  const config = sizeMap[size];
  const colors = colorSchemes[colorScheme];
  
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div 
        className="relative flex items-center justify-center"
        style={{ width: config.glow, height: config.glow }}
        role="status"
        aria-label="Loading"
      >
        {/* Background blur rings */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`blur-${i}`}
            className="absolute rounded-full blur-xl"
            style={{ 
              width: config.circle * 0.8, 
              height: config.circle * 0.8, 
              background: colors.blur 
            }}
            animate={{ 
              scale: [0.3, 1.5, 2], 
              opacity: [0, 0.5, 0] 
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              delay: i * 0.3, 
              ease: [0.4, 0, 0.2, 1] 
            }}
          />
        ))}
        
        {/* Main animated circles */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{ 
              width: config.circle, 
              height: config.circle, 
              background: colors.gradient, 
              boxShadow: `0 0 30px ${colors.glow}` 
            }}
            animate={{ 
              scale: [0.2, 0.7, 1, 1, 1.1, 1.3], 
              opacity: [0, 0.7, 1, 1, 0.7, 0], 
              rotate: [0, 90, 180, 270, 320, 360] 
            }}
            transition={{ 
              duration: 2.5, 
              repeat: Infinity, 
              delay: i * 0.3, 
              ease: "easeOut", 
              times: [0, 0.25, 0.35, 0.65, 0.75, 1] 
            }}
          />
        ))}
      </div>
      
      {text && (
        <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
      )}
    </div>
  );
});

export function FullPageLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}

export function CardLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <LoadingSpinner size="sm" />
    </div>
  );
}
