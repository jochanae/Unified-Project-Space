import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/contexts/AppContext';

const DISMISSED_KEY = 'compani-cart-dismissed';

export default function OnboardingPreferenceCart() {
  const { profile, connections } = useAppContext();
  const [dismissed, setDismissed] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored === 'true') setDismissed(true);
    } catch {
      // ignore
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissing(true);
  }, []);

  const handleExitComplete = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // ignore
    }
    setDismissed(true);
    setDismissing(false);
  }, []);

  // Visibility: onboarding done, no connections, not dismissed, has at least one preference
  const vibePrefs = (profile as { vibePreferences?: string[] })?.vibePreferences ?? [];
  const presence = (profile as { presencePreference?: string })?.presencePreference;
  const preferredName = (profile as { preferredCompanionName?: string | null })?.preferredCompanionName;
  const visualStyle = (profile as { visualStyle?: string })?.visualStyle;

  const hasPreferences = vibePrefs.length > 0 || presence || (preferredName && preferredName.trim()) || visualStyle;
  const shouldShow =
    profile?.onboardingCompleted === true &&
    connections.length === 0 &&
    !dismissed &&
    hasPreferences;

  // Don't render at all if we shouldn't show and aren't mid-dismiss
  if (!shouldShow && !dismissing) return null;

  const chips: string[] = [];
  if (vibePrefs.length > 0) chips.push(...vibePrefs);
  if (presence) chips.push(presence);
  if (preferredName?.trim()) chips.push(preferredName.trim());
  if (visualStyle) chips.push(visualStyle);

  if (chips.length === 0 && !dismissing) return null;

  const label = chips.join(' · ');

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {!dismissing && (
      <motion.div
        key="cart"
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: [0.96, 1.04, 1],
        }}
        exit={{ opacity: 0, y: -8 }}
        transition={{
          duration: 0.4,
          scale: {
            times: [0, 0.5, 1],
            duration: 0.6,
          },
        }}
        className="relative z-20 mx-4 mt-2 mb-1"
      >
        <div
          className="relative overflow-hidden rounded-full px-4 py-2.5 flex items-center justify-between gap-3"
          style={{
            background: 'rgba(15, 18, 33, 0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Shimmer sweep */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255, 220, 150, 0.08) 50%, transparent 100%)',
              backgroundSize: '200% 100%',
              animation: 'onboarding-cart-shimmer 4s ease-in-out infinite',
            }}
          />
          <span className="relative z-10 text-[11px] font-semibold text-white/90 truncate flex-1 min-w-0">
            <span className="text-amber-300/90 mr-1">✦</span>
            {label}
          </span>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="relative z-10 shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-white/50 hover:text-white/90 hover:bg-white/10 transition-colors"
          >
            ×
          </button>
        </div>
      </motion.div>
      )}
      <style>{`
        @keyframes onboarding-cart-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </AnimatePresence>
  );
}
