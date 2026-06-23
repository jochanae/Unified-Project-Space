import { motion, AnimatePresence } from 'framer-motion';
import AbstractAvatar from '@/components/AbstractAvatar';
import GlowingOrb from '@/components/studio/GlowingOrb';

interface StudioPreviewProps {
  avatarUrl?: string | null;
  companionName?: string;
  memberId?: string;
  connectionMode: string;
  generating: boolean;
  completionProgress?: number;
  isCreationMode?: boolean;
  revealState?: 'idle' | 'generating' | 'revealing' | 'done';
}

export default function StudioPreview({
  avatarUrl,
  companionName,
  memberId,
  connectionMode,
  generating,
  completionProgress = 0,
  isCreationMode = false,
  revealState = 'idle',
}: StudioPreviewProps) {
  const hasPersonalAvatar = connectionMode === 'personal' && avatarUrl;
  const isShimmering = generating || revealState === 'generating';
  const isRevealing = revealState === 'revealing';

  return (
    <div className="relative flex flex-col items-center py-6">
      {/* Ambient cinematic backdrop */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.div
          animate={{
            opacity: [0.35, 0.55, 0.35],
            scale: [0.88, 1.06, 0.88],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-full"
          style={{
            width: '360px',
            height: '360px',
            background: `radial-gradient(circle, hsl(18 85% 58% / 0.1) 0%, hsl(262 55% 62% / 0.06) 40%, transparent 70%)`,
            filter: 'blur(55px)',
          }}
        />
      </div>

      <motion.div
        layout
        className="relative z-10"
        animate={isShimmering ? { scale: [1, 1.02, 1] } : {}}
        transition={{ repeat: isShimmering ? Infinity : 0, duration: 1.5 }}
      >
        {/* Show generated avatar with reveal animation */}
        <AnimatePresence mode="wait">
          {isRevealing && hasPersonalAvatar ? (
            <motion.div
              key="reveal"
              initial={{ scale: 0.6, opacity: 0, filter: 'blur(20px) brightness(2)' }}
              animate={{ scale: 1, opacity: 1, filter: 'blur(0px) brightness(1)' }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <img
                src={avatarUrl!}
                alt={companionName || 'Your Friend'}
                className="max-h-64 rounded-3xl object-contain shadow-2xl"
                style={{
                  boxShadow: '0 0 60px 15px hsl(18 85% 58% / 0.3), 0 0 120px 30px hsl(262 55% 62% / 0.15)',
                }}
              />
              <div className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent 60%, hsl(225 25% 8% / 0.6) 100%)' }}
              />
              {/* Flash overlay that fades out */}
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="absolute inset-0 rounded-3xl bg-white pointer-events-none"
              />
            </motion.div>
          ) : hasPersonalAvatar && !isShimmering ? (
            <motion.div key="avatar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
              <img
                src={avatarUrl!}
                alt={companionName || 'Your Friend'}
                className="max-h-64 rounded-3xl object-contain shadow-2xl"
                style={{
                  boxShadow: '0 0 40px 8px hsl(18 85% 58% / 0.15), 0 0 80px 20px hsl(262 55% 62% / 0.1)',
                }}
              />
              <div className="absolute inset-0 rounded-3xl pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, transparent 60%, hsl(225 25% 8% / 0.6) 100%)' }}
              />
            </motion.div>
          ) : memberId && !isCreationMode ? (
            <motion.div key="abstract"
              className="h-48 w-48 rounded-3xl shadow-2xl overflow-hidden flex items-center justify-center bg-secondary"
              style={{
                boxShadow: '0 0 40px 8px hsl(18 85% 58% / 0.15), 0 0 80px 20px hsl(262 55% 62% / 0.1)',
              }}
            >
              <AbstractAvatar memberId={memberId} size="lg" />
            </motion.div>
          ) : (
            /* ── Glowing Orb empty state ── */
            <motion.div key="orb">
              <GlowingOrb companionName={companionName} isCreationMode={isCreationMode} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Professional shimmer overlay during generation ── */}
        {isShimmering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-background/40 backdrop-blur-sm" />
            <div className="absolute inset-0 shimmer-sweep" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="flex gap-1.5">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                    className="h-2 w-2 rounded-full bg-primary"
                  />
                ))}
              </div>
              <p className="text-xs font-semibold text-primary animate-pulse">Generating…</p>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Name label */}
      {(hasPersonalAvatar || (memberId && !isCreationMode)) && companionName && !isShimmering && (
        <motion.p layout className="mt-3 font-display text-sm font-bold text-foreground">
          {companionName}
        </motion.p>
      )}

      <p className="text-[11px] text-muted-foreground mt-0.5">
        {isShimmering ? 'Creating your companion\u2019s look\u2026'
          : isRevealing ? `Meet ${companionName || 'your companion'} ✨`
          : 'Tap options below to customize'}
      </p>

      <style>{`
        .shimmer-sweep {
          background: linear-gradient(
            90deg,
            transparent 0%,
            hsl(var(--primary) / 0.08) 20%,
            hsl(var(--primary) / 0.15) 50%,
            hsl(var(--primary) / 0.08) 80%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: shimmer-slide 1.8s ease-in-out infinite;
        }
        @keyframes shimmer-slide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
