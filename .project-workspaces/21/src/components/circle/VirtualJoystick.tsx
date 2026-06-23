import { useRef, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VirtualJoystickProps {
  /** Called continuously with dx, dy in range -1..1 */
  onMove: (dx: number, dy: number) => void;
  /** Called when user releases */
  onRelease?: () => void;
}

const OUTER_R = 56;
const INNER_R = 22;
const MAX_DIST = OUTER_R - INNER_R;

export default function VirtualJoystick({ onMove, onRelease }: VirtualJoystickProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);
  const rafRef = useRef<number>(0);
  const moveRef = useRef({ dx: 0, dy: 0 });
  const atBoundaryRef = useRef(false);
  const boundaryVibeRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearBoundaryVibe = useCallback(() => {
    if (boundaryVibeRef.current) {
      clearInterval(boundaryVibeRef.current);
      boundaryVibeRef.current = null;
    }
  }, []);

  const handlePointer = useCallback(
    (clientX: number, clientY: number) => {
      if (!outerRef.current) return;
      const rect = outerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitBoundary = dist >= MAX_DIST;
      if (hitBoundary) {
        dx = (dx / dist) * MAX_DIST;
        dy = (dy / dist) * MAX_DIST;
        if (!atBoundaryRef.current) {
          if (navigator.vibrate) navigator.vibrate(8);
          boundaryVibeRef.current = setInterval(() => {
            if (navigator.vibrate) navigator.vibrate(4);
          }, 120);
        }
      } else {
        clearBoundaryVibe();
      }
      atBoundaryRef.current = hitBoundary;
      setKnobPos({ x: dx, y: dy });
      moveRef.current = { dx: dx / MAX_DIST, dy: dy / MAX_DIST };
    },
    [clearBoundaryVibe]
  );

  // Continuous movement loop
  useEffect(() => {
    if (!active) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      onMove(moveRef.current.dx, moveRef.current.dy);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
      clearBoundaryVibe();
    };
  }, [active, onMove, clearBoundaryVibe]);

  const handleStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setActive(true);
      handlePointer(e.clientX, e.clientY);
      // Haptic pulse on grab
      if (navigator.vibrate) navigator.vibrate(15);
    },
    [handlePointer]
  );

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      if (!active) return;
      e.preventDefault();
      handlePointer(e.clientX, e.clientY);
    },
    [active, handlePointer]
  );

  const handleEnd = useCallback(() => {
    setActive(false);
    setKnobPos({ x: 0, y: 0 });
    moveRef.current = { dx: 0, dy: 0 };
    if (navigator.vibrate) navigator.vibrate(10);
    onRelease?.();
  }, [onRelease]);

  return (
    <div
      ref={outerRef}
      className="fixed bottom-36 left-4 z-[50] touch-none pointer-events-auto"
      style={{
        width: OUTER_R * 2,
        height: OUTER_R * 2,
      }}
      onPointerDown={handleStart}
      onPointerMove={handleMove}
      onPointerUp={handleEnd}
      onPointerCancel={handleEnd}
    >
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full border border-foreground/15"
        style={{
          background: 'hsl(var(--card) / 0.2)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />

      {/* Knob */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: INNER_R * 2,
          height: INNER_R * 2,
          left: OUTER_R - INNER_R + knobPos.x,
          top: OUTER_R - INNER_R + knobPos.y,
          background: active
            ? 'hsl(var(--primary) / 0.5)'
            : 'hsl(var(--foreground) / 0.15)',
          border: '2px solid hsl(var(--foreground) / 0.2)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          boxShadow: active
            ? '0 0 12px 4px hsl(var(--primary) / 0.3)'
            : 'none',
        }}
        animate={{ scale: active ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      />
    </div>
  );
}
