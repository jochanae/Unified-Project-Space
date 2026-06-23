import { motion } from 'framer-motion';
import { useRef } from 'react';

interface MemorySparkProps {
  position: { x: number; y: number };
  amplitude: number;
  containerRef: React.RefObject<HTMLDivElement>;
  onPositionUpdate?: (pos: { x: number; y: number }) => void;
}

export default function MemorySpark({ position, amplitude, containerRef, onPositionUpdate }: MemorySparkProps) {
  const sparkRef = useRef<HTMLDivElement>(null);
  const glowIntensity = 0.4 + amplitude * 0.6;
  const size = 24 + amplitude * 8;

  return (
    <motion.div
      ref={sparkRef}
      className="absolute z-20 cursor-grab active:cursor-grabbing touch-none"
      style={{ left: position.x, top: position.y, x: '-50%', y: '-50%' }}
      drag
      dragConstraints={containerRef}
      dragElastic={0.2}
      dragMomentum
      onDrag={(_, info) => {
        if (sparkRef.current && onPositionUpdate) {
          const rect = sparkRef.current.getBoundingClientRect();
          onPositionUpdate({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <motion.div
        className="rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, hsla(45, 90%, 70%, ${glowIntensity}) 0%, hsla(340, 70%, 60%, ${glowIntensity * 0.6}) 50%, transparent 100%)`,
          boxShadow: `0 0 ${12 + amplitude * 20}px ${6 + amplitude * 10}px hsla(45, 90%, 65%, ${glowIntensity * 0.5}), 0 0 ${20 + amplitude * 30}px ${10 + amplitude * 15}px hsla(340, 70%, 55%, ${glowIntensity * 0.3})`,
        }}
        animate={{
          scale: [1, 1.1 + amplitude * 0.15, 1],
        }}
        transition={{
          repeat: Infinity,
          duration: 2,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
