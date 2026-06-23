import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, ChevronDown, RefreshCw } from 'lucide-react';
import { useFeatureGating } from '@/hooks/useFeatureGating';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationService } from '@/lib/navigationConfig';
import { useDashboardRefresh } from '@/hooks/useDashboardRefresh';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { SwipeOnboardingTooltip } from './SwipeOnboardingTooltip';

interface PageInfo {
  path: string;
  name: string;
  icon?: string;
  requiresFeature?: string;
}

export default function SwipeNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  const [arrowsFaded, setArrowsFaded] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  
  // Vertical swipe states - Pull to refresh only
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [showPullToRefresh, setShowPullToRefresh] = useState(false);
  
  // Draggable arrow states
  const [arrowPosition, setArrowPosition] = useState(() => {
    const saved = localStorage.getItem('swipeArrowPosition');
    return saved ? parseInt(saved) : 96;
  });
  const [isDraggingArrow, setIsDraggingArrow] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPos, setDragStartPos] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const fadeTimeoutRef = useRef<NodeJS.Timeout>();
  
  const touchStartRef = useRef({ x: 0, y: 0, timestamp: 0 });
  const navigationRef = useRef<(direction: 'left' | 'right') => void>();
  const isNavigatingRef = useRef(false);
  const isVerticalSwipeRef = useRef(false);

  const { user } = useAuth();
  const { hasFeature } = useFeatureGating();
  const { refreshAllData } = useDashboardRefresh();
  const { isFeatureEnabled } = useFeatureFlags();

  const [arrowsEnabled, setArrowsEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('coinsbloom_show_nav_arrows');
    return saved !== 'false';
  });

  const [simpleMode, setSimpleMode] = useState(() => NavigationService.isSimpleModeEnabled());

  const { data: userPreferences } = useQuery({
    queryKey: ['user-preferences', user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get user preferences from localStorage (persisted per user)
      const stored = localStorage.getItem(`coinsbloom_prefs_${user?.id}`);
      return stored ? JSON.parse(stored) : null;
    },
  });

  const favoritePages = NavigationService.getFavoritePages(userPreferences);

  // Listen for Simple Mode changes
  useEffect(() => {
    const handleSimpleModeChange = () => {
      setSimpleMode(NavigationService.isSimpleModeEnabled());
    };

    window.addEventListener('coinsbloom_simple_mode_changed', handleSimpleModeChange);
    window.addEventListener('storage', handleSimpleModeChange);

    return () => {
      window.removeEventListener('coinsbloom_simple_mode_changed', handleSimpleModeChange);
      window.removeEventListener('storage', handleSimpleModeChange);
    };
  }, []);

  // Auto-fade functionality for arrows
  const resetFadeTimer = () => {
    setArrowsFaded(false);
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    fadeTimeoutRef.current = setTimeout(() => {
      setArrowsFaded(true);
    }, 8000);
  };

  useEffect(() => {
    resetFadeTimer();
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    resetFadeTimer();
  }, [location.pathname]);

  useEffect(() => {
    const handleArrowsPreferenceChange = () => {
      const saved = localStorage.getItem('coinsbloom_show_nav_arrows');
      setArrowsEnabled(saved !== 'false');
    };

    window.addEventListener('storage', handleArrowsPreferenceChange);
    window.addEventListener('coinsbloom_nav_arrows_changed', handleArrowsPreferenceChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleArrowsPreferenceChange);
      window.removeEventListener('coinsbloom_nav_arrows_changed', handleArrowsPreferenceChange as EventListener);
    };
  }, []);

  // Drag handlers for arrows
  const handleArrowDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDraggingArrow(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStartY(clientY);
    setDragStartPos(arrowPosition);
  };

  const handleArrowDrag = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDraggingArrow) return;
    e.preventDefault();
    
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY - clientY;
    const newPosition = Math.max(50, Math.min(window.innerHeight - 100, dragStartPos + deltaY));
    setArrowPosition(newPosition);
  }, [isDraggingArrow, dragStartY, dragStartPos]);

  const handleArrowDragEnd = useCallback(() => {
    if (isDraggingArrow) {
      setIsDraggingArrow(false);
      localStorage.setItem('swipeArrowPosition', arrowPosition.toString());
    }
  }, [isDraggingArrow, arrowPosition]);

  useEffect(() => {
    if (isDraggingArrow) {
      document.addEventListener('mousemove', handleArrowDrag);
      document.addEventListener('mouseup', handleArrowDragEnd);
      document.addEventListener('touchmove', handleArrowDrag, { passive: false });
      document.addEventListener('touchend', handleArrowDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleArrowDrag);
        document.removeEventListener('mouseup', handleArrowDragEnd);
        document.removeEventListener('touchmove', handleArrowDrag);
        document.removeEventListener('touchend', handleArrowDragEnd);
      };
    }
  }, [isDraggingArrow, handleArrowDrag, handleArrowDragEnd]);

  // Get swipe navigation pages - respects Simple Mode
  const getSwipePages = () => {
    const navigationPages = NavigationService.getPagesForContext('swipe', {
      isAuthenticated: !!user,
      hasFeature,
      favorites: favoritePages,
      useFavoritesOnly: userPreferences?.swipeNavigationFavorites || false,
      simpleMode,
      isFeatureEnabled,
    });

    return navigationPages.map(page => ({
      path: page.path,
      name: page.name,
      icon: page.emoji || '📄',
    }));
  };
  
  const availablePages = getSwipePages();
  
  // Normalize location - handle root and base paths
  const getNormalizedPath = () => {
    const path = location.pathname;
    if (path === '/') return '/dashboard';
    // Handle detail pages - map them to their parent for swipe context
    if (path.startsWith('/goals/')) return '/goals';
    if (path.startsWith('/budgets/')) return '/budgets';
    if (path.startsWith('/professionals/')) return '/professionals';
    return path;
  };
  
  const normalizedLocation = getNormalizedPath();
  const currentIndex = availablePages.findIndex(page => page.path === normalizedLocation);

  const canGoLeft = availablePages.length > 1;
  const canGoRight = availablePages.length > 1;

  const navigateToPage = (direction: 'left' | 'right') => {
    if (isNavigatingRef.current || availablePages.length <= 1) {
      return;
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    isNavigatingRef.current = true;
    
    // Use effectiveIndex for navigation (handles -1 case)
    const effectiveIdx = currentIndex === -1 ? 0 : currentIndex;
    
    let newIndex;
    if (direction === 'left') {
      newIndex = effectiveIdx === 0 ? availablePages.length - 1 : effectiveIdx - 1;
    } else {
      newIndex = effectiveIdx === availablePages.length - 1 ? 0 : effectiveIdx + 1;
    }
    
    
    navigate(availablePages[newIndex].path);
    
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 400); // Reduced from 500ms for snappier navigation
  };

  useEffect(() => {
    navigationRef.current = navigateToPage;
  }, [availablePages, currentIndex, isMobile]);

  useEffect(() => {
    setPullDistance(0);
    setShowPullToRefresh(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [location.pathname]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    await refreshAllData();
    
    setTimeout(() => {
      setIsRefreshing(false);
      setShowPullToRefresh(false);
      setPullDistance(0);
    }, 1000);
  }, [refreshAllData, isRefreshing]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const target = e.target instanceof Element 
      ? e.target 
      : e.composedPath().find(node => node instanceof Element) as Element | undefined;
    
    if (!target) return;
    
    if (target.closest('[role="dialog"], .modal, .popup, [data-radix-dialog-content]')) {
      return;
    }
    
    // data-allow-swipe="true" marks elements that handle their own swipe (like swipe-to-delete)
    // Block page navigation when touching these elements
    if (target.closest('[data-allow-swipe="true"]')) {
      touchStartRef.current = { x: 0, y: 0, timestamp: 0 };
      return;
    }
    
    const initialTouch = e.touches[0];
    const isInBottomNavArea = initialTouch.clientY > window.innerHeight - 80;
    const isInMobileNav = target.closest('[data-mobile-nav="true"]');
    
    if (isInMobileNav || isInBottomNavArea) {
      touchStartRef.current = { x: 0, y: 0, timestamp: 0 };
      return;
    }
    
    const isFormInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
    const isButton = target.tagName === 'BUTTON' || target.closest('button, a, [role="button"]');
    const isInCalendar = target.closest('.rdp-month, .rdp-day, .calendar-container');
    const isDraggableElement = target.closest('[draggable="true"], .draggable, .resizable');
    const isHorizontalScrollable = target.closest('[role="tablist"], .overflow-x-auto, .overflow-x-scroll');
    
    // Only block on elements that are actively draggable vision items
    const isActiveDraggable = target.closest('[data-dragging="true"]');
    
    if (isFormInput || isButton || isInCalendar || isDraggableElement || isHorizontalScrollable || isActiveDraggable) {
      touchStartRef.current = { x: 0, y: 0, timestamp: 0 };
      return;
    }
    
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, timestamp: Date.now() };
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    isVerticalSwipeRef.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const target = e.target instanceof Element 
      ? e.target 
      : e.composedPath().find(node => node instanceof Element) as Element | undefined;
    
    if (!target) return;
    
    if (target.closest('[role="dialog"], .modal, .popup')) {
      return;
    }
    
    const startPos = touchStartRef.current;
    if (!startPos.x || !startPos.y) return;
    
    const currentTouch = e.touches[0];
    const diffX = startPos.x - currentTouch.clientX;
    const diffY = startPos.y - currentTouch.clientY;
    
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);
    const slope = absDiffY / (absDiffX + 0.001);
    
    const hasSignificantVerticalMovement = absDiffY > 30;
    const isVerticalEnough = slope > 3.33 && absDiffY > absDiffX;
    
    if (hasSignificantVerticalMovement && isVerticalEnough && !isVerticalSwipeRef.current) {
      isVerticalSwipeRef.current = true;
    }
    
    if (isVerticalSwipeRef.current) {
      const isAtTop = window.scrollY <= 10;
      const isPullingDown = diffY < 0;
      
      if (isAtTop && isPullingDown && Math.abs(diffY) > 20) {
        e.preventDefault();
        const pullAmount = Math.min(Math.abs(diffY), 120);
        setPullDistance(pullAmount);
        
        if (pullAmount > 60) {
          setShowPullToRefresh(true);
        }
      }
    } else if (absDiffX > 45 && slope < 0.3 && absDiffX > absDiffY) {
      e.preventDefault();
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    const target = e.target instanceof Element 
      ? e.target 
      : e.composedPath().find(node => node instanceof Element) as Element | undefined;
    
    if (!target) return;
    
    if (target.closest('[role="dialog"], .modal, .popup')) {
      return;
    }
    
    const startPos = touchStartRef.current;
    
    if (!startPos.x || !startPos.y) return;
    
    if (isNavigatingRef.current && !isVerticalSwipeRef.current) {
      touchStartRef.current = { x: 0, y: 0, timestamp: 0 };
      setStartX(0);
      setStartY(0);
      setPullDistance(0);
      setShowPullToRefresh(false);
      return;
    }
    
    const endTouch = e.changedTouches[0];
    const diffX = startPos.x - endTouch.clientX;
    const diffY = startPos.y - endTouch.clientY;
    
    const horizontalSwipeThreshold = 45;
    const pullToRefreshThreshold = 100;
    
    if (isVerticalSwipeRef.current) {
      const isAtTop = window.scrollY <= 10;
      const isPullingDown = diffY < 0;
      
      if (isAtTop && isPullingDown && Math.abs(diffY) > pullToRefreshThreshold && !isRefreshing) {
        handleRefresh();
      }
      
      isVerticalSwipeRef.current = false;
    } else {
      const absDiffX = Math.abs(diffX);
      const absDiffY = Math.abs(diffY);
      const slope = absDiffY / (absDiffX + 0.001);
      const isMainlyHorizontal = slope < 0.3 && absDiffX > absDiffY;
      
      if (absDiffX > horizontalSwipeThreshold && isMainlyHorizontal) {
        if (diffX > 0) {
          navigationRef.current?.('right');
        } else if (diffX < 0) {
          navigationRef.current?.('left');
        }
      }
    }
    
    touchStartRef.current = { x: 0, y: 0, timestamp: 0 };
    setStartX(0);
    setStartY(0);
    setPullDistance(0);
    setShowPullToRefresh(false);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, [handleRefresh, isRefreshing]);

  useEffect(() => {
    const checkMobileAndDesktop = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      const hasHover = window.matchMedia('(hover: hover)').matches;
      const isWideScreen = window.innerWidth >= 1024;
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isRealDesktop = hasHover && isWideScreen && (!hasTouch || navigator.maxTouchPoints <= 1);
      setIsDesktop(isRealDesktop);
    };

    checkMobileAndDesktop();
    
    const resizeObserver = new ResizeObserver(checkMobileAndDesktop);
    resizeObserver.observe(document.body);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const disabledRoutes = ['/admin', '/settings', '/kidsbloom', '/signin', '/auth', '/coach'];
  const isLandingPage = location.pathname === '/';
  const isDisabledRoute = isLandingPage || disabledRoutes.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    if (isDesktop || isDisabledRoute || !arrowsEnabled) {
      return;
    }
    
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      
      setPullDistance(0);
      setShowPullToRefresh(false);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [isDesktop, isDisabledRoute, arrowsEnabled, location.pathname, handleTouchStart, handleTouchMove, handleTouchEnd]);
 
  // Keyboard navigation for desktop
  const KEYBOARD_HINT_KEY = 'coinsbloom_keyboard_nav_hint_shown';
  
  useEffect(() => {
    if (!isDesktop || isDisabledRoute || !arrowsEnabled || availablePages.length <= 1) return;
    
    // Show one-time hint for desktop keyboard navigation
    const hintShown = localStorage.getItem(KEYBOARD_HINT_KEY);
    if (!hintShown) {
      const hintTimer = setTimeout(() => {
        toast('💡 Tip: Use ← → arrow keys to switch between pages', {
          duration: 5000,
        });
        localStorage.setItem(KEYBOARD_HINT_KEY, 'true');
      }, 2000);
      return () => clearTimeout(hintTimer);
    }
  }, [isDesktop, isDisabledRoute, arrowsEnabled, availablePages.length]);

  useEffect(() => {
    if (!isDesktop || isDisabledRoute || !arrowsEnabled || availablePages.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navigationRef.current?.('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navigationRef.current?.('right');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktop, isDisabledRoute, arrowsEnabled, availablePages.length]);

  // Only show for authenticated users on app routes, not public pages
  if (!user || isDisabledRoute || !arrowsEnabled) {
    return null;
  }

  // If current page not in list, still show arrows but navigate from first page
  const effectiveIndex = currentIndex === -1 ? 0 : currentIndex;

  const prevPage = availablePages.length > 1 
    ? availablePages[effectiveIndex <= 0 ? availablePages.length - 1 : effectiveIndex - 1] 
    : null;
  const nextPage = availablePages.length > 1 
    ? availablePages[effectiveIndex >= availablePages.length - 1 ? 0 : effectiveIndex + 1] 
    : null;

  return (
    <>
      {/* Swipe onboarding tooltip - shown once */}
      <SwipeOnboardingTooltip arrowPosition={arrowPosition} onVisibilityChange={setOnboardingVisible} />
      {/* Pull-to-refresh indicator */}
      {showPullToRefresh && (
        <div 
          className="fixed top-24 left-0 right-0 z-[60] flex items-center justify-center pointer-events-none"
          style={{ 
            transform: `translateY(${Math.min(pullDistance, 120)}px)`,
            transition: isRefreshing ? 'transform 0.3s ease' : 'none'
          }}
        >
          <div className="bg-transparent px-4 py-3">
            {isRefreshing ? (
              <LoadingSpinner size="lg" />
            ) : (
              <div className="flex items-center gap-2">
                <RefreshCw 
                  className="h-5 w-5 text-primary" 
                  style={{
                    transform: `rotate(${Math.min(pullDistance * 3, 360)}deg)`,
                    transition: 'transform 0.1s ease-out'
                  }}
                />
                <span className="text-sm text-muted-foreground">Pull to refresh</span>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Navigation Arrows */}
      {canGoLeft && createPortal(
        <button
          onClick={() => !isDraggingArrow && navigateToPage('left')}
          onMouseDown={handleArrowDragStart}
          onTouchStart={(e) => {
            handleArrowDragStart(e);
            resetFadeTimer();
          }}
          onMouseEnter={resetFadeTimer}
          style={{ bottom: `${arrowPosition}px` }}
          className={`fixed z-[65] left-3 bg-muted/70 backdrop-blur-sm rounded-full p-2.5 shadow-md hover:shadow-lg motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:scale-105 border border-border/30 hover:border-border/50 active:scale-95 group min-h-[40px] min-w-[40px] ${
            isDraggingArrow ? 'cursor-grabbing scale-110' : 'cursor-grab'
          } ${onboardingVisible ? 'opacity-100 animate-pulse ring-2 ring-primary/50' : arrowsFaded ? 'opacity-20 hover:opacity-90' : 'opacity-70 hover:opacity-100'}`}
          aria-label={`Go to ${prevPage?.name}`}
        >
          <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-foreground motion-safe:transition-colors motion-safe:duration-200" />
        </button>,
        document.body
      )}
      
      {canGoRight && createPortal(
        <button
          onClick={() => !isDraggingArrow && navigateToPage('right')}
          onMouseDown={handleArrowDragStart}
          onTouchStart={(e) => {
            handleArrowDragStart(e);
            resetFadeTimer();
          }}
          onMouseEnter={resetFadeTimer}
          style={{ bottom: `${arrowPosition}px` }}
          className={`fixed z-[65] right-3 bg-muted/70 backdrop-blur-sm rounded-full p-2.5 shadow-md hover:shadow-lg motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:scale-105 border border-border/30 hover:border-border/50 active:scale-95 group min-h-[40px] min-w-[40px] ${
            isDraggingArrow ? 'cursor-grabbing scale-110' : 'cursor-grab'
          } ${onboardingVisible ? 'opacity-100 animate-pulse ring-2 ring-primary/50' : arrowsFaded ? 'opacity-20 hover:opacity-90' : 'opacity-70 hover:opacity-100'}`}
          aria-label={`Go to ${nextPage?.name}`}
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground motion-safe:transition-colors motion-safe:duration-200" />
        </button>,
        document.body
      )}

      {/* Mobile hint - fixed at very bottom of viewport */}
      {isMobile && !isRefreshing && !location.pathname.startsWith('/coach') && createPortal(
        <div className="fixed bottom-2 left-0 right-0 z-30 flex justify-center pointer-events-none pb-safe">
          <div className="flex items-center gap-4 text-xs text-muted-foreground opacity-40">
            <div className="flex items-center gap-1">
              <ChevronLeft className="h-3 w-3" />
              <span>Swipe</span>
              <ChevronRight className="h-3 w-3" />
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <ChevronDown className="h-3 w-3" />
              <span>Pull to Refresh</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
