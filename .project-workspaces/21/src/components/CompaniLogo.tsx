import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface CompaniLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  showTagline?: boolean;
  goldenPulse?: boolean;
}

const sizeMap = {
  sm: { text: 'text-lg', heart: 13, top: '-0.18em' },
  md: { text: 'text-xl', heart: 16, top: '-0.2em' },
  lg: { text: 'text-3xl', heart: 22, top: '-0.2em' },
};

export default function CompaniLogo({ className = '', size = 'md', animate = true, showTagline = false, goldenPulse = false }: CompaniLogoProps) {
  const s = sizeMap[size];
  const id = React.useId();
  const hapticFired = useRef(false);

  // Fire a single "sub-bass thump" haptic when golden pulse activates
  useEffect(() => {
    if (goldenPulse && !hapticFired.current) {
      hapticFired.current = true;
      if (navigator.vibrate) navigator.vibrate([30, 60, 20]);
    }
    if (!goldenPulse) hapticFired.current = false;
  }, [goldenPulse]);

  const heartPath =
    'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

  const gradientId = `heart-grad-${id}`;

  return (
    <span className={`inline-flex flex-col ${showTagline ? 'items-start' : 'items-baseline'} select-none ${goldenPulse ? 'compani-logo-pulse' : ''} ${className}`}>
      <span className={`inline-flex items-baseline font-bold tracking-tight ${s.text}`}>
        <span className="text-foreground">Compan</span>
        <span className="relative inline-block" style={{ marginRight: '-0.08em', overflow: 'visible' }}>
          {/* dotless i */}
          <span className="text-foreground">ı</span>
          {/* Gradient heart as the dot */}
          <span
            className="absolute -translate-x-1/2"
            style={{ top: s.top, left: '46%' }}
          >
            <motion.svg
              width={s.heart}
              height={s.heart}
              viewBox="0 0 24 24"
              fill="none"
              initial={{ y: 0 }}
              animate={animate ? { y: [0, -2, 0] } : undefined}
              transition={animate ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
              <defs>
                {animate ? (
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%">
                      <animate
                        attributeName="stop-color"
                        values="#FF6B35;#E8547C;#8B5CF6;#FF6B35"
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    </stop>
                    <stop offset="50%">
                      <animate
                        attributeName="stop-color"
                        values="#E8547C;#8B5CF6;#FF6B35;#E8547C"
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    </stop>
                    <stop offset="100%">
                      <animate
                        attributeName="stop-color"
                        values="#8B5CF6;#FF6B35;#E8547C;#8B5CF6"
                        dur="4s"
                        repeatCount="indefinite"
                      />
                    </stop>
                  </linearGradient>
                ) : (
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6B35" />
                    <stop offset="50%" stopColor="#E8547C" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                )}
              </defs>
              <path d={heartPath} fill={`url(#${gradientId})`} />
            </motion.svg>
          </span>
        </span>
      </span>
      {showTagline && (
        <span
          className="text-[9px] tracking-widest uppercase font-semibold leading-none -mt-0.5 whitespace-nowrap"
          style={{
            color: 'hsl(var(--primary))',
            textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          }}
        >
          Your Space | Your Pace
        </span>
      )}
    </span>
  );
}
