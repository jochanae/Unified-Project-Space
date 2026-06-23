import { useState, useEffect, useCallback, useRef } from "react";

interface UseIdleTimeoutOptions {
  warningTimeout?: number; // Time before showing warning (ms)
  logoutTimeout?: number;  // Time before auto-logout (ms)
  onWarning?: () => void;
  onLogout?: () => void;
  enabled?: boolean;
}

export function useIdleTimeout({
  warningTimeout = 15 * 60 * 1000, // 15 minutes
  logoutTimeout = 30 * 60 * 1000,  // 30 minutes
  onWarning,
  onLogout,
  enabled = true,
}: UseIdleTimeoutOptions = {}) {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);
  
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const clearAllTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const startCountdown = useCallback(() => {
    const timeUntilLogout = logoutTimeout - warningTimeout;
    setRemainingTime(Math.floor(timeUntilLogout / 1000));
    
    countdownRef.current = setInterval(() => {
      setRemainingTime(prev => {
        if (prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [logoutTimeout, warningTimeout]);

  const resetTimers = useCallback(() => {
    if (!enabled) return;
    
    clearAllTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      onWarning?.();
      startCountdown();
    }, warningTimeout);

    // Set logout timer
    logoutTimerRef.current = setTimeout(() => {
      setShowWarning(false);
      onLogout?.();
    }, logoutTimeout);
  }, [enabled, warningTimeout, logoutTimeout, onWarning, onLogout, clearAllTimers, startCountdown]);

  const stayActive = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      return;
    }

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    
    // Use ref to check showWarning state to avoid stale closure
    const showWarningRef = { current: showWarning };
    showWarningRef.current = showWarning;

    const handleActivity = () => {
      // Only reset if not showing warning (user must click "Stay Logged In")
      if (!showWarningRef.current) {
        resetTimers();
      }
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial timer start - only on mount
    if (!showWarning) {
      resetTimers();
    }

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    showWarning,
    remainingTime,
    stayActive,
    logout: onLogout,
  };
}
