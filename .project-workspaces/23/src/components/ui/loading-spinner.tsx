/**
 * LOADING SPINNER — GRADIENT GLOW WITH RADIATING EFFECT
 * 
 * 5 overlapping circles with staggered bloom animation
 * Adapted from CoinsBloom/Compani signature spinner
 * Colors: Teal → Cyan → Gold (IntoIQ cinematic brand)
 */

import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizeMap = {
  sm: { circle: 28, glow: 60 },
  md: { circle: 48, glow: 100 },
  lg: { circle: 96, glow: 220 },
};

// IntoIQ cinematic palette: Teal primary → Cyan → Gold accent
const GRADIENT = 'linear-gradient(135deg, hsl(174 72% 50%) 0%, hsl(190 70% 50%) 45%, hsl(43 80% 60%) 100%)';
const GLOW_COLOR = 'hsla(174, 72%, 50%, 0.4)';
const BLUR_BG = 'radial-gradient(circle, hsla(174, 72%, 50%, 0.45) 0%, hsla(43, 80%, 60%, 0.25) 50%, transparent 70%)';

export function LoadingSpinner({ size = 'md', className, text }: LoadingSpinnerProps) {
  const config = sizeMap[size];
  const circleCount = 5;

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
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}

export default LoadingSpinner;
