/**
 * LOADING SPINNER — GRADIENT GLOW WITH RADIATING EFFECT
 * 
 * 5 overlapping circles with staggered bloom animation
 * Colors: Coral → Violet (brand gradient)
 */

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: { circle: 28, glow: 60 },
  md: { circle: 48, glow: 100 },
  lg: { circle: 96, glow: 220 },
};

const GRADIENT = 'linear-gradient(135deg, hsl(18 85% 58%) 0%, hsl(340 65% 55%) 45%, hsl(262 55% 62%) 100%)';
const GLOW_COLOR = 'hsla(262, 55%, 62%, 0.4)';
const BLUR_BG = 'radial-gradient(circle, hsla(18, 85%, 58%, 0.45) 0%, hsla(262, 55%, 62%, 0.25) 50%, transparent 70%)';

export default function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  const config = sizeMap[size];
  const circleCount = 5;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 w-full h-full ${className || ''}`}>
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
              background: BLUR_BG,
            }}
            animate={{
              scale: [0.3, 1.5, 2],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: [0.4, 0, 0.2, 1],
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
              background: GRADIENT,
              boxShadow: `0 0 30px ${GLOW_COLOR}`,
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
              ease: 'easeOut',
              times: [0, 0.25, 0.35, 0.65, 0.75, 1],
            }}
          />
        ))}
      </div>
      {label && <p className="text-sm" style={{ color: 'hsl(220 15% 75%)' }}>{label}</p>}
    </div>
  );
}
