import { useRef, useCallback, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform, PanInfo } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { useQueryClient } from '@tanstack/react-query';

export type PillarIndex = 0 | 1 | 2;

/** Minimum drag distance to commit a swipe (px) */
const SWIPE_COMMIT = 60;
/** Velocity threshold for quick flicks (px/s) */
const VELOCITY_COMMIT = 300;
/** Angle lock — horizontal must be this much stronger than vertical */
const ANGLE_LOCK_DEG = 25; // degrees from horizontal

export function getPillarIndex(pathname: string): PillarIndex | null {
  if (pathname === '/' || pathname === '/my-world') return 0;
  if (pathname.startsWith('/chat/')) return 1;
  return null;
}

interface SwipePillarWrapperProps {
  children: React.ReactNode;
}

/**
 * Wraps the main content scroller and adds horizontal swipe gestures
 * to navigate between the three pillars:
 *   0 = Think Freely | 1 = Dashboard | 2 = Companion Chat
 *
 * Only active on pillar routes. Non-pillar routes render children normally.
 * Uses framer-motion's pan gestures which integrate well with touch events.
 */
export default function SwipePillarWrapper({ children }: SwipePillarWrapperProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeConnection } = useAppContext();
  const queryClient = useQueryClient();

  const currentPillar = getPillarIndex(location.pathname);
  const isOnPillar = currentPillar !== null;

  // Keep fresh values in refs so pan callbacks never use stale closures
  const currentPillarRef = useRef(currentPillar);
  currentPillarRef.current = currentPillar;

  const maxPillar = activeConnection ? 1 : 0;
  const maxPillarRef = useRef(maxPillar);
  maxPillarRef.current = maxPillar;

  const isOnPillarRef = useRef(isOnPillar);
  isOnPillarRef.current = isOnPillar;

  // Track swipe direction for page transition animation
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // Motion values for drag feedback
  const dragX = useMotionValue(0);
  const springX = useSpring(dragX, { stiffness: 400, damping: 40 });

  // Whether we've locked into horizontal swiping for this gesture
  const directionLocked = useRef<'horizontal' | 'vertical' | null>(null);
  const gestureStarted = useRef(false);
  // Prevent double-navigation from a single gesture
  const navigatedThisGesture = useRef(false);

  const getRouteForPillar = useCallback((index: PillarIndex): string | null => {
    switch (index) {
      case 0: return '/my-world';
      case 1: return activeConnection ? `/chat/${activeConnection.memberId}` : null;
      default: return null;
    }
  }, [activeConnection]);

  const getRouteForPillarRef = useRef(getRouteForPillar);
  getRouteForPillarRef.current = getRouteForPillar;

  // Invalidate dashboard queries when swiping back to /my-world
  const prevPathRef = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname === '/my-world' && prevPathRef.current !== '/my-world') {
      // Arriving at dashboard from another pillar — refetch stale queries
      queryClient.invalidateQueries({ queryKey: ['today-checkin'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    }
    prevPathRef.current = location.pathname;
  }, [location.pathname, queryClient]);

  // Reset direction lock on route change
  useEffect(() => {
    directionLocked.current = null;
    gestureStarted.current = false;
    navigatedThisGesture.current = false;
    dragX.set(0);
  }, [location.pathname, dragX]);

  const handleDragStart = useCallback(() => {
    directionLocked.current = null;
    gestureStarted.current = true;
    navigatedThisGesture.current = false;
  }, []);

  const handleDrag = useCallback((_: unknown, info: PanInfo) => {
    if (!isOnPillarRef.current || currentPillarRef.current === null) return;

    // Lock direction on first significant movement
    if (directionLocked.current === null) {
      const absDx = Math.abs(info.offset.x);
      const absDy = Math.abs(info.offset.y);
      if (absDx > 10 || absDy > 10) {
        const angle = Math.atan2(absDy, absDx) * (180 / Math.PI);
        directionLocked.current = angle < ANGLE_LOCK_DEG ? 'horizontal' : 'vertical';
      }
    }

    if (directionLocked.current !== 'horizontal') {
      dragX.set(0);
      return;
    }

    let dx = info.offset.x;
    const pillar = currentPillarRef.current;
    const max = maxPillarRef.current;

    // Rubber-band at edges
    const atLeftEdge = pillar === 0 && dx > 0;
    const atRightEdge = pillar >= max && dx < 0;

    if (atLeftEdge || atRightEdge) {
      dx = dx * 0.2; // Strong rubber-band resistance
    }

    dragX.set(dx);
  }, [dragX]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const pillar = currentPillarRef.current;
    const max = maxPillarRef.current;

    if (!isOnPillarRef.current || pillar === null || directionLocked.current !== 'horizontal' || navigatedThisGesture.current) {
      dragX.set(0);
      directionLocked.current = null;
      gestureStarted.current = false;
      return;
    }

    const dx = info.offset.x;
    const velocity = Math.abs(info.velocity.x);
    const shouldCommit = Math.abs(dx) > SWIPE_COMMIT || velocity > VELOCITY_COMMIT;

    if (shouldCommit) {
      if (dx > 0 && pillar > 0) {
        // Swipe right → go to previous pillar
        const target = (pillar - 1) as PillarIndex;
        setSlideDirection('right');
        const route = getRouteForPillarRef.current(target);
        if (route) {
          navigatedThisGesture.current = true;
          navigate(route);
        }
      } else if (dx < 0 && pillar < max) {
        // Swipe left → go to next pillar
        const target = (pillar + 1) as PillarIndex;
        setSlideDirection('left');
        const route = getRouteForPillarRef.current(target);
        if (route) {
          navigatedThisGesture.current = true;
          navigate(route);
        }
      }
    }

    // Spring back
    dragX.set(0);
    directionLocked.current = null;
    gestureStarted.current = false;
  }, [dragX, navigate]);

  // Compute subtle parallax/opacity from drag for visual feedback
  const opacity = useTransform(springX, [-200, 0, 200], [0.6, 1, 0.6]);

  if (!isOnPillar) {
    // Non-pillar route — render normally without swipe
    return <>{children}</>;
  }

  return (
    <motion.div
      style={{
        x: springX,
        opacity,
        touchAction: 'pan-y',
      }}
      onPanStart={handleDragStart}
      onPan={handleDrag}
      onPanEnd={handleDragEnd}
      className="h-full will-change-transform"
    >
      {children}
    </motion.div>
  );
}

/**
 * Get slide animation variants based on navigation direction between pillars.
 * Used by the AnimatePresence wrapper around <Outlet />.
 */
export function getPillarTransitionVariants(pathname: string, prevPathname: string | null) {
  const curr = getPillarIndex(pathname);
  const prev = prevPathname ? getPillarIndex(prevPathname) : null;

  // Both are pillars — use slide transition
  if (curr !== null && prev !== null && curr !== prev) {
    const direction = curr > prev ? 1 : -1; // 1 = slide from right, -1 = slide from left
    return {
      initial: { x: `${direction * 30}%`, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: `${-direction * 30}%`, opacity: 0 },
      transition: { type: 'spring' as const, stiffness: 300, damping: 30 },
    };
  }

  // Default fade transition for non-pillar routes
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.18, ease: 'easeInOut' as const },
  };
}
