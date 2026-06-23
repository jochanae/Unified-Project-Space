/**
 * FounderSecretGesture — Hidden 3-second long-press on the greeting text
 * that navigates admins to /admin. Shows an expanding gold ripple during press.
 * Non-admins see nothing special.
 */
import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Crown } from 'lucide-react';

const HOLD_DURATION = 3000; // ms

interface FounderSecretGestureProps {
  children: React.ReactNode;
  userId?: string;
}

export default function FounderSecretGesture({ children, userId }: FounderSecretGestureProps) {
  const navigate = useNavigate();
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [unlocked, setUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);
  const rafRef = useRef<number>(0);

  // Check admin status once
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  const updateProgress = useCallback(() => {
    const elapsed = Date.now() - startRef.current;
    const pct = Math.min(elapsed / HOLD_DURATION, 1);
    setProgress(pct);
    if (pct < 1) {
      rafRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const handlePressStart = useCallback(() => {
    if (!isAdmin) return;
    setPressing(true);
    startRef.current = Date.now();
    setProgress(0);
    rafRef.current = requestAnimationFrame(updateProgress);

    timerRef.current = setTimeout(() => {
      setPressing(false);
      setUnlocked(true);
      // Haptic
      try { navigator.vibrate?.([30, 50, 30]); } catch {}
      // Navigate after the unlock flash
      setTimeout(() => navigate('/admin'), 600);
    }, HOLD_DURATION);
  }, [isAdmin, navigate, updateProgress]);

  const handlePressEnd = useCallback(() => {
    setPressing(false);
    setProgress(0);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Non-admins just render children normally
  if (!isAdmin) return <>{children}</>;

  return (
    <div
      className="relative select-none"
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerLeave={handlePressEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}

      {/* Gold ripple expanding during press */}
      <AnimatePresence>
        {pressing && (
          <motion.div
            key="ripple"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{
              scale: 1 + progress * 3,
              opacity: [0, 0.25 * progress, 0.15 * progress],
            }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(212,175,80,0.4) 0%, rgba(212,175,80,0) 70%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Progress ring — thin gold arc around the greeting area */}
      {pressing && (
        <svg
          className="absolute -inset-1 pointer-events-none"
          viewBox="0 0 100 100"
          style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,80,0.4))' }}
        >
          <circle
            cx="50" cy="50" r="48"
            fill="none"
            stroke="rgba(212,175,80,0.15)"
            strokeWidth="1"
          />
          <circle
            cx="50" cy="50" r="48"
            fill="none"
            stroke="rgba(212,175,80,0.7)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray={`${progress * 301.6} 301.6`}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dasharray 0.1s linear' }}
          />
        </svg>
      )}

      {/* Crown flash on unlock */}
      <AnimatePresence>
        {unlocked && (
          <motion.div
            key="crown"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="flex items-center gap-2 rounded-full bg-[rgba(19,20,36,0.95)] backdrop-blur-xl border border-primary/30 px-4 py-2 shadow-[0_0_30px_rgba(212,175,80,0.3)]">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold tracking-wider uppercase text-primary">
                Founder Access
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
