import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Sparkles, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { revealHaptic, veilHaptic } from '@/lib/sanctuaryHaptics';

const INSIGHT_STORAGE_KEY = 'compani-private-insight';
const INSIGHT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const LONG_PRESS_MS = 400;

export interface PrivateInsight {
  text: string;
  companionName: string;
  timestamp: number;
  vaultSourced?: boolean;
}

/** Save a private insight from Think Freely for the dashboard (persisted across sessions) */
export function savePrivateInsight(insight: PrivateInsight) {
  try {
    localStorage.setItem(INSIGHT_STORAGE_KEY, JSON.stringify(insight));
  } catch { /* noop */ }
}

/** Clear the insight after it's been seen or acted upon */
export function clearPrivateInsight() {
  localStorage.removeItem(INSIGHT_STORAGE_KEY);
}

/** Check if there's a pending insight (for golden pulse trigger) */
export function hasPendingInsight(): boolean {
  try {
    return !!loadInsight();
  } catch { return false; }
}

function loadInsight(): PrivateInsight | null {
  try {
    const raw = localStorage.getItem(INSIGHT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: PrivateInsight = JSON.parse(raw);
    // Auto-expiry: clear after 24 hours
    if (Date.now() - parsed.timestamp > INSIGHT_EXPIRY_MS) {
      localStorage.removeItem(INSIGHT_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

interface PrivateInsightCardProps {
  companionName?: string;
  isPremium?: boolean;
  embedded?: boolean;
  primaryMemberId?: string;
}

export default function PrivateInsightCard({ companionName, isPremium = false, embedded = false, primaryMemberId }: PrivateInsightCardProps) {
  const [insight, setInsight] = useState<PrivateInsight | null>(loadInsight);
  const [unlocked, setUnlocked] = useState(false);
  const [veiling, setVeiling] = useState(false);
  const [rippleOrigin, setRippleOrigin] = useState({ x: 50, y: 50 });
  const [showRipple, setShowRipple] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Re-check on mount / focus
  useEffect(() => {
    const check = () => setInsight(loadInsight());
    check();
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (unlocked || !isPremium) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setRippleOrigin({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
    longPressTimer.current = setTimeout(() => {
      setUnlocked(true);
      setShowRipple(true);
      revealHaptic();
      clearPrivateInsight();
      setTimeout(() => setShowRipple(false), 1200);
    }, LONG_PRESS_MS);
  }, [unlocked, isPremium]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleVeil = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!unlocked || veiling) return;
    veilHaptic();
    setVeiling(true);
    setTimeout(() => {
      setUnlocked(false);
      setVeiling(false);
    }, 500);
  }, [unlocked, veiling]);

  const chatRoute = primaryMemberId ? `/chat/${primaryMemberId}` : '/messages';

  const handleTapFree = () => {
    if (!isPremium) {
      navigate('/settings');
    } else {
      sessionStorage.setItem('compani-auto-privacy', 'true');
      navigate(chatRoute);
    }
  };

  const displayName = companionName || insight?.companionName || 'Your friend';

  /* ── Deep obsidian frosted-glass styles ── */
  const obsidianFrost = {
    background: 'linear-gradient(135deg, rgba(12, 14, 28, 0.92), rgba(8, 10, 22, 0.96))',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  };

  const obsidianRevealed = {
    background: 'linear-gradient(135deg, rgba(15, 18, 33, 0.88), rgba(10, 12, 24, 0.94))',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)',
  };

  /* ── Empty state: no insight yet ── */
  if (!insight) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        onClick={() => {
          sessionStorage.setItem('compani-auto-privacy', 'true');
          navigate(chatRoute);
        }}
        className={cn(
          'relative overflow-hidden px-5 py-4 cursor-pointer select-none',
          !embedded && 'rounded-2xl border border-white/[0.06]'
        )}
        style={embedded ? undefined : obsidianFrost}
      >
        <div className="flex items-center gap-2 mb-3">
          <Lock className="h-4 w-4 text-[hsl(38_70%_50%/0.4)]" />
          <span className="text-[11px] tracking-[0.08em] uppercase font-medium text-[hsl(38_70%_50%/0.5)]">
            Private Insight
          </span>
        </div>
        <div className="space-y-3 text-center py-2">
          <Eye className="h-5 w-5 mx-auto text-[hsl(38_70%_50%/0.3)]" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              sessionStorage.setItem('compani-auto-privacy', 'true');
              navigate(chatRoute);
            }}
            className="px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-[0.04em] bg-[hsl(38_70%_50%/0.15)] text-[hsl(38_70%_60%)] border border-[hsl(38_70%_50%/0.25)] hover:bg-[hsl(38_70%_50%/0.25)] transition-colors"
          >
            Use 🔒 in Chat
          </button>
          <p className="text-[10px] text-foreground/30 italic">
            Insights are only created if you choose
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      onPointerDown={isPremium ? handlePointerDown : undefined}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={!isPremium ? handleTapFree : undefined}
      className={cn(
        'relative overflow-hidden px-5 py-4 transition-all duration-700 cursor-pointer select-none',
        !embedded && 'rounded-2xl border',
        !embedded && !unlocked && 'border-white/[0.06]',
        !embedded && unlocked && 'border-[hsl(38_70%_50%/0.25)]',
        embedded && unlocked && 'bg-black/30'
      )}
      style={!embedded ? (unlocked ? obsidianRevealed : obsidianFrost) : undefined}
    >
      {/* Gold ripple on unlock */}
      <AnimatePresence>
        {showRipple && (
          <motion.div
            key="ripple"
            initial={{ scale: 0, opacity: 0.6 }}
            animate={{ scale: 5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute rounded-full border-2 border-[hsl(38_70%_50%/0.4)] pointer-events-none"
            style={{
              width: 60,
              height: 60,
              left: `${rippleOrigin.x}%`,
              top: `${rippleOrigin.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          animate={unlocked ? { rotate: 15 } : { rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        >
          {unlocked ? (
            <Unlock className="h-4 w-4 text-[hsl(38_70%_50%)]" />
          ) : (
            <Lock className="h-4 w-4 text-[hsl(38_70%_50%/0.7)]" />
          )}
        </motion.div>
        <span className="text-[11px] tracking-[0.08em] uppercase font-medium text-[hsl(38_70%_50%/0.8)]">
          Private Insight
        </span>
        {!isPremium && (
          <span className="ml-auto text-[10px] text-primary/50 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> Premium
          </span>
        )}

        {/* Veil toggle — appears when unlocked */}
        {unlocked && !veiling && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleVeil}
            className="ml-auto flex items-center gap-1 text-[10px] tracking-[0.06em] uppercase text-[hsl(38_70%_50%/0.5)] hover:text-[hsl(38_70%_50%/0.8)] transition-colors"
          >
            <EyeOff className="h-3 w-3" />
            Veil
          </motion.button>
        )}
      </div>

      {/* Frosted / revealed / veiling content */}
      <AnimatePresence mode="wait">
        {!unlocked && !veiling ? (
          <motion.div
            key="frosted"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: 'blur(8px)' }}
            transition={{ duration: 0.6 }}
            className="space-y-2"
          >
            <p className="text-sm text-foreground/40 italic">
              From your thoughts today...
            </p>
            {/* Frosted text lines */}
            <div className="space-y-1.5 flex flex-col items-center">
              <div className="h-3 w-3/4 rounded-full bg-foreground/8" />
              <div className="h-3 w-1/2 rounded-full bg-foreground/6" />
              <div className="h-3 w-2/3 rounded-full bg-foreground/5" />
            </div>
            <p className="text-[10px] tracking-[0.06em] uppercase text-[hsl(38_70%_50%/0.5)] text-center pt-2">
              {isPremium ? 'Hold to reveal' : 'Upgrade to unlock insights'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="revealed"
            initial={veiling ? false : { opacity: 0, y: 6 }}
            animate={veiling
              ? {
                  opacity: 0,
                  filter: 'blur(12px)',
                  scale: 0.98,
                  letterSpacing: '4px',
                }
              : {
                  opacity: 1,
                  y: 0,
                  filter: 'blur(0px)',
                  scale: 1,
                  letterSpacing: '0px',
                }
            }
            transition={veiling
              ? { duration: 0.45, ease: [0.4, 0, 0.2, 1] }
              : { duration: 0.6, delay: 0.2 }
            }
            className="space-y-3"
          >
            <p className="text-sm text-foreground/85 leading-relaxed italic"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              "{insight.text}"
            </p>
            <div className="flex items-center gap-2">
              <p className="text-[11px] text-foreground/40">
                — {displayName}, just now
              </p>
              {insight.vaultSourced && (
                <span className="inline-flex items-center gap-0.5 text-[9px] tracking-wide uppercase text-primary/50" title="Informed by Your Vault">
                  🔗 Vault
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
