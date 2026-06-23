import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getCategoryConfig, type VisionCategory } from '@/lib/visionCategories';
import { Trophy, Pin } from 'lucide-react';
import type { VisionBoardItem } from './AddVisionSheet';

interface DriftingVisionCardProps {
  item: VisionBoardItem;
  isHovered: boolean;
  isPaused: boolean;
  onHover: (id: string | null) => void;
  onClick: () => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  canvasWidth: number;
  canvasHeight: number;
  targetPosition?: { x: number; y: number };
  isFiltered?: boolean;
  dimmed?: boolean;
}

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  small: { width: 130, height: 130 },
  medium: { width: 170, height: 170 },
  large: { width: 210, height: 210 },
};

export function DriftingVisionCard({
  item,
  isHovered,
  isPaused,
  onHover,
  onClick,
  onPositionChange,
  canvasWidth,
  canvasHeight,
  targetPosition,
  isFiltered = true,
  dimmed = false,
}: DriftingVisionCardProps) {
  const controls = useAnimationControls();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  // Random drift velocity
  const driftRef = useRef<{ vx: number; vy: number }>({
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
  });
  
  const positionRef = useRef({ 
    x: targetPosition?.x ?? item.positionX, 
    y: targetPosition?.y ?? item.positionY 
  });
  const animationFrameRef = useRef<number>();

  const size = SIZE_MAP[item.size] || SIZE_MAP.medium;
  const categoryConfig = getCategoryConfig((item.category as VisionCategory) || 'other');
  const CategoryIcon = categoryConfig.icon;
  const progress = item.targetAmount ? (Number(item.currentAmount || 0) / Number(item.targetAmount)) * 100 : 0;
  const isCompleted = item.isCompleted || item.status === 'achieved' || progress >= 100;

  // Set initial position immediately on mount
  useEffect(() => {
    controls.set({ x: positionRef.current.x, y: positionRef.current.y, opacity: 1, scale: 1 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate to target position when filtering
  useEffect(() => {
    if (targetPosition) {
      controls.start({
        x: targetPosition.x,
        y: targetPosition.y,
        transition: { type: 'spring', damping: 25, stiffness: 120 }
      });
      positionRef.current = targetPosition;
    }
  }, [targetPosition, controls]);

  // Gentle drifting animation - continuous floating
  useEffect(() => {
    if (isPaused || isHovered || item.isPinned || dimmed) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const drift = () => {
      const { vx, vy } = driftRef.current;
      let { x, y } = positionRef.current;

      // Update position
      x += vx;
      y += vy;

      // Bounce off edges with padding
      const padding = 30;
      const maxX = canvasWidth - size.width - padding;
      const maxY = canvasHeight - size.height - padding;

      if (x <= padding || x >= maxX) {
        driftRef.current.vx *= -1;
        x = Math.max(padding, Math.min(x, maxX));
      }
      if (y <= padding || y >= maxY) {
        driftRef.current.vy *= -1;
        y = Math.max(padding, Math.min(y, maxY));
      }

      // Occasionally change direction for organic movement
      if (Math.random() < 0.003) {
        driftRef.current.vx += (Math.random() - 0.5) * 0.15;
        driftRef.current.vy += (Math.random() - 0.5) * 0.15;
        // Clamp velocity
        driftRef.current.vx = Math.max(-0.6, Math.min(0.6, driftRef.current.vx));
        driftRef.current.vy = Math.max(-0.6, Math.min(0.6, driftRef.current.vy));
      }

      positionRef.current = { x, y };
      controls.set({ x, y });

      animationFrameRef.current = requestAnimationFrame(drift);
    };

    animationFrameRef.current = requestAnimationFrame(drift);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPaused, isHovered, item.isPinned, dimmed, canvasWidth, canvasHeight, size.width, size.height, controls]);

  // Sync position when item position changes externally
  useEffect(() => {
    if (!targetPosition) {
      positionRef.current = { x: item.positionX, y: item.positionY };
      controls.set({ x: item.positionX, y: item.positionY });
    }
  }, [item.positionX, item.positionY, targetPosition, controls]);

  const handleDragEnd = (_: any, info: { point: { x: number; y: number } }) => {
    const newX = Math.max(0, Math.min(info.point.x, canvasWidth - size.width));
    const newY = Math.max(0, Math.min(info.point.y, canvasHeight - size.height));
    positionRef.current = { x: newX, y: newY };
    onPositionChange(item.id, newX, newY);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, x: positionRef.current.x, y: positionRef.current.y }}
      animate={controls}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      drag={!dimmed}
      dragMomentum={false}
      dragElastic={0.1}
      onDragEnd={handleDragEnd}
      onHoverStart={() => !dimmed && onHover(item.id)}
      onHoverEnd={() => onHover(null)}
      onClick={() => !dimmed && onClick()}
      className={cn(
        "absolute select-none transition-all duration-300",
        dimmed ? "cursor-default pointer-events-none" : "cursor-grab active:cursor-grabbing",
        isHovered && "z-50"
      )}
      style={{
        width: size.width,
        height: size.height,
        opacity: dimmed ? 0.3 : 1,
        filter: dimmed ? 'grayscale(0.5)' : 'none',
      }}
      whileHover={!dimmed ? { scale: 1.1, zIndex: 50 } : {}}
      whileTap={!dimmed ? { scale: 0.95 } : {}}
    >
      {/* Card Container */}
      <div
        className={cn(
          "relative w-full h-full rounded-2xl overflow-hidden",
          "bg-card/90 backdrop-blur-sm",
          "border-2 transition-all duration-300",
          isHovered ? "border-white shadow-2xl shadow-white/20" : "border-white/30 shadow-xl"
        )}
        style={{
          boxShadow: isHovered 
            ? `0 20px 50px -15px ${categoryConfig.color}60`
            : `0 10px 30px -10px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Image or Placeholder */}
        {item.imageUrl && !imageError ? (
          <>
            {!imageLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse" />
            )}
            <img
              src={item.imageUrl}
              alt={item.imageAlt || item.title}
              className={cn(
                "w-full h-full object-cover transition-all duration-300",
                imageLoaded ? "opacity-100" : "opacity-0",
                isHovered && "scale-110"
              )}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          </>
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center"
            style={{ background: categoryConfig.gradient }}
          >
            <div className="text-center p-4">
              <CategoryIcon className="h-10 w-10 text-white/80 mx-auto mb-2" />
              <span className="text-white/90 text-sm font-medium line-clamp-2">
                {item.title}
              </span>
            </div>
          </div>
        )}

        {/* Hover Overlay with Title - Hidden if hideDetails is true unless hovered */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent",
          "flex items-end transition-opacity duration-200",
          // If hideDetails is true, only show on hover. Otherwise always visible.
          item.hideDetails 
            ? (isHovered ? "opacity-100" : "opacity-0")
            : (isHovered ? "opacity-100" : (item.imageUrl ? "opacity-0" : "opacity-100"))
        )}>
          <div className="p-3 w-full">
            <p className="text-white text-sm font-semibold line-clamp-2 drop-shadow-lg">
              {item.title}
            </p>
            {item.targetAmount && !item.hideDetails && (
              <div className="mt-1.5">
                <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-emerald-400 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(progress, 100)}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-white/70 text-xs mt-1">
                  ${item.currentAmount?.toLocaleString() || 0} / ${item.targetAmount.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Status Badges */}
        {isCompleted && (
          <div className="absolute top-2 right-2 z-10">
            <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg ring-2 ring-white/30">
              <Trophy className="w-4 h-4 text-white" />
            </div>
          </div>
        )}

        {item.isPinned && !isCompleted && (
          <div className="absolute top-2 right-2 z-10">
            <div className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
              <Pin className="w-4 h-4 text-primary" />
            </div>
          </div>
        )}

        {/* Category Pin Badge */}
        <div className="absolute -top-1 left-3 z-10">
          <div 
            className="w-5 h-5 rounded-full shadow-lg ring-2 ring-white/50 flex items-center justify-center"
            style={{ backgroundColor: categoryConfig.color }}
          >
            <div className="w-2 h-2 rounded-full bg-white/80" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
