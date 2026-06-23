import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

interface VisionBoardBackgroundProps {
  isNightMode: boolean;
  height?: string;
}

export function VisionBoardBackground({ isNightMode, height = '300vh' }: VisionBoardBackgroundProps) {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    // Generate random stars
    const newStars: Star[] = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.3,
      delay: Math.random() * 3,
    }));
    setStars(newStars);
  }, []);

  const backgroundGradient = useMemo(() => {
    if (isNightMode) {
      // Night mode - deep dark blue/black with subtle stars
      return 'linear-gradient(180deg, hsl(240 50% 8%) 0%, hsl(250 45% 5%) 50%, hsl(240 40% 3%) 100%)';
    }
    // Day mode - rich purple gradient matching reference exactly
    return 'linear-gradient(180deg, hsl(280 70% 50%) 0%, hsl(270 65% 40%) 25%, hsl(260 60% 32%) 50%, hsl(250 55% 25%) 75%, hsl(245 50% 20%) 100%)';
  }, [isNightMode]);

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ 
        background: backgroundGradient,
        minHeight: height,
      }}
    >
      {/* Stars */}
      {stars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{
            opacity: [star.opacity * 0.3, star.opacity, star.opacity * 0.3],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: star.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Shooting stars occasionally */}
      {isNightMode && (
        <motion.div
          className="absolute w-1 h-1 bg-white rounded-full"
          style={{ 
            boxShadow: '0 0 10px 2px rgba(255,255,255,0.8)',
          }}
          animate={{
            x: ['-10%', '110%'],
            y: ['10%', '30%'],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 8,
            ease: "easeOut",
          }}
        />
      )}

      {/* Subtle gradient overlays */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, hsla(280, 60%, 50%, 0.1) 0%, transparent 50%)',
        }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 70% 80%, hsla(220, 60%, 40%, 0.15) 0%, transparent 50%)',
        }}
      />
    </div>
  );
}
