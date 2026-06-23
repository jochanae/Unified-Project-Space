/**
 * LOADING SPINNER - GRADIENT GLOW WITH RADIATING EFFECT
 * 
 * 5 overlapping circles with staggered bloom animation
 * Colors: Blue -> Purple -> Pink (brand) OR Blue -> Emerald -> Teal (vision)
 * Animation: Scale up + rotate + fade out in sequence
 */

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  colorScheme?: 'brand' | 'emerald';
}

const sizeMap = {
  sm: { circle: 32, glow: 70 },
  md: { circle: 56, glow: 120 },
  lg: { circle: 80, glow: 170 },
};

const colorSchemes = {
  brand: {
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 40%, #a855f7 60%, #ec4899 100%)',
    glow: 'rgba(147,51,234,0.4)',
    blur: 'radial-gradient(circle, rgba(147,51,234,0.5) 0%, rgba(236,72,153,0.3) 50%, transparent 70%)',
  },
  emerald: {
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #10b981 40%, #14b8a6 60%, #06b6d4 100%)',
    glow: 'rgba(16,185,129,0.4)',
    blur: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(20,184,166,0.3) 50%, transparent 70%)',
  },
};

export function LoadingSpinner({ size = 'lg', className, text, colorScheme = 'brand' }: LoadingSpinnerProps) {
  const config = sizeMap[size];
  const colors = colorSchemes[colorScheme];
  const circleCount = 5;
  const animationDuration = 2.5;
  const staggerDelay = 0.3;
  
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className || ''}`}>
      <div 
        className="relative flex items-center justify-center"
        style={{ width: config.glow, height: config.glow }}
        role="status"
        aria-label="Loading"
      >
        {/* Blurred background orbs for smooth glow */}
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={`blur-${i}`}
            className="absolute rounded-full blur-xl"
            style={{
              width: config.circle * 0.8,
              height: config.circle * 0.8,
              background: colors.blur,
            }}
            animate={{
              scale: [0.3, 1.5, 2],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: animationDuration,
              repeat: Infinity,
              delay: i * staggerDelay,
              ease: [0.4, 0, 0.2, 1], // smooth easeInOut
            }}
          />
        ))}
        
        {/* 5 overlapping circles with staggered animations */}
        {Array.from({ length: circleCount }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: config.circle,
              height: config.circle,
              background: colors.gradient,
              boxShadow: `0 0 30px ${colors.glow}`,
            }}
            animate={{
              scale: [0.2, 0.7, 1, 1, 1.1, 1.3],
              opacity: [0, 0.7, 1, 1, 0.7, 0],
              rotate: [0, 90, 180, 270, 320, 360],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeOut",
              times: [0, 0.25, 0.35, 0.65, 0.75, 1],
            }}
          />
        ))}
      </div>
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;
