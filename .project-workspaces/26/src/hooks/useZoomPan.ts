import { useState, useRef, useCallback, useEffect } from 'react';

interface UseZoomPanOptions {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
}

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

export function useZoomPan(options: UseZoomPanOptions = {}) {
  const { minZoom = 0.5, maxZoom = 2, initialZoom = 1 } = options;
  
  const [state, setState] = useState<ZoomPanState>({
    scale: initialZoom,
    translateX: 0,
    translateY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const isPinching = useRef(false);
  const lastPinchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  const getDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getCenter = (touches: TouchList) => {
    if (touches.length < 2) return { x: touches[0].clientX, y: touches[0].clientY };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Only handle 2-finger pinch gestures - let single-finger swipes pass through for page navigation
    if (e.touches.length === 2) {
      isPinching.current = true;
      lastPinchDistance.current = getDistance(e.touches);
      lastTouchCenter.current = getCenter(e.touches);
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    // Only handle 2-finger pinch - single finger swipes should pass through
    if (!isPinching.current || e.touches.length !== 2) return;
    
    const currentDistance = getDistance(e.touches);
    const currentCenter = getCenter(e.touches);
    
    if (lastPinchDistance.current !== null && lastTouchCenter.current !== null) {
      // Calculate scale change
      const scaleDelta = currentDistance / lastPinchDistance.current;
      
      setState(prev => {
        const newScale = Math.min(maxZoom, Math.max(minZoom, prev.scale * scaleDelta));
        
        // Calculate pan delta
        const panDeltaX = currentCenter.x - lastTouchCenter.current!.x;
        const panDeltaY = currentCenter.y - lastTouchCenter.current!.y;
        
        return {
          scale: newScale,
          translateX: prev.translateX + panDeltaX,
          translateY: prev.translateY + panDeltaY,
        };
      });
    }
    
    lastPinchDistance.current = currentDistance;
    lastTouchCenter.current = currentCenter;
    e.preventDefault();
    e.stopPropagation();
  }, [minZoom, maxZoom]);

  const handleTouchEnd = useCallback(() => {
    isPinching.current = false;
    lastPinchDistance.current = null;
    lastTouchCenter.current = null;
  }, []);

  // Handle wheel zoom (desktop)
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setState(prev => ({
        ...prev,
        scale: Math.min(maxZoom, Math.max(minZoom, prev.scale * delta)),
      }));
    }
  }, [minZoom, maxZoom]);

  const resetZoom = useCallback(() => {
    setState({
      scale: initialZoom,
      translateX: 0,
      translateY: 0,
    });
  }, [initialZoom]);

  const zoomIn = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: Math.min(maxZoom, prev.scale * 1.2),
    }));
  }, [maxZoom]);

  const zoomOut = useCallback(() => {
    setState(prev => ({
      ...prev,
      scale: Math.max(minZoom, prev.scale / 1.2),
    }));
  }, [minZoom]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleWheel]);

  return {
    containerRef,
    scale: state.scale,
    translateX: state.translateX,
    translateY: state.translateY,
    isPinching: isPinching.current,
    resetZoom,
    zoomIn,
    zoomOut,
    transform: `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`,
  };
}
