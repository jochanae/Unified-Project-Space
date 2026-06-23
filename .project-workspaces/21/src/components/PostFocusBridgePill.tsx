import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { usePostFocusBridge, hidePostFocusBridge } from '@/hooks/usePostFocusBridge';
import { hasPendingInsight } from '@/components/PrivateInsightCard';

interface PostFocusBridgePillProps {
  primaryMemberId?: string;
}

/**
 * Gold-pulsing pill surfaced after Focus Mode exit ceremony, only when a
 * pending Private Insight exists. Tapping routes to chat with auto Think
 * Freely activation. Mirrors the Golden Heartbeat language used across the
 * app (silent, gentle, reverent — never a system alert).
 */
export default function PostFocusBridgePill({ primaryMemberId }: PostFocusBridgePillProps) {
  const visible = usePostFocusBridge();
  const navigate = useNavigate();

  // Defensive: only render if there is actually a pending insight
  const shouldRender = visible && hasPendingInsight();

  const handleTap = () => {
    hidePostFocusBridge();
    sessionStorage.setItem('compani-auto-privacy', 'true');
    sessionStorage.setItem('compani-private-auto-session', 'true');
    const route = primaryMemberId ? `/chat/${primaryMemberId}` : '/messages';
    navigate(route);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    hidePostFocusBridge();
  };

  return (
    <AnimatePresence>
      {shouldRender && (
        <motion.div
          key="post-focus-bridge-pill"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="px-4 mt-3 mb-1"
        >
          <button
            onClick={handleTap}
            className="group relative w-full overflow-hidden rounded-full px-5 py-3 text-left transition-all duration-500 active:scale-[0.99]"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 18, 33, 0.92), rgba(10, 12, 24, 0.96))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid hsl(38 70% 50% / 0.28)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Slow gold heartbeat pulse */}
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full"
              animate={{ opacity: [0.0, 0.35, 0.0] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background:
                  'radial-gradient(circle at 50% 50%, hsl(38 70% 55% / 0.22) 0%, transparent 70%)',
              }}
            />

            <div className="relative z-10 flex items-center gap-3">
              {/* Glyph — gentle pulsing dot, not an icon button */}
              <motion.span
                className="relative flex h-2 w-2 items-center justify-center"
                animate={{ scale: [1, 1.25, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: 'hsl(38 70% 60%)',
                    boxShadow: '0 0 12px hsl(38 70% 55% / 0.7)',
                  }}
                />
              </motion.span>

              <div className="flex-1 min-w-0">
                <p
                  className="text-[13px] font-medium tracking-[0.01em] truncate"
                  style={{
                    color: 'hsl(38 70% 78%)',
                    fontFamily: 'Georgia, serif',
                    fontStyle: 'italic',
                  }}
                >
                  Return to your thoughts
                </p>
                <p className="text-[10px] tracking-[0.08em] uppercase text-[hsl(38_70%_50%/0.55)] mt-0.5">
                  A reflection awaits
                </p>
              </div>

              <button
                onClick={handleDismiss}
                aria-label="Dismiss"
                className="ml-2 -mr-1 flex h-7 w-7 items-center justify-center rounded-full text-[hsl(38_70%_60%/0.5)] hover:text-[hsl(38_70%_70%/0.9)] hover:bg-white/[0.04] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
