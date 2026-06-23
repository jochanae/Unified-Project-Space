import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Video, EyeOff } from 'lucide-react';
import { revealHaptic, veilHaptic } from '@/lib/sanctuaryHaptics';

interface CompanionMomentCardProps {
  companionName: string;
  companionInitial: string;
  companionColorVar: string;
  message: string;
  videoUrl?: string | null;
  milestoneType?: string;
}

export default function CompanionMomentCard({
  companionName,
  companionInitial,
  companionColorVar,
  message,
  videoUrl,
  milestoneType,
}: CompanionMomentCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [veiling, setVeiling] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const hasVideo = !!videoUrl;

  const handleReveal = () => {
    setRevealed(true);
    revealHaptic();
  };

  const handleVeil = () => {
    if (veiling) return;
    veilHaptic();
    setVeiling(true);
    setTimeout(() => {
      setRevealed(false);
      setVeiling(false);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto my-4 w-full max-w-[85%]"
    >
      <div className="relative overflow-hidden rounded-3xl border border-border/30 shadow-lg glow-soft">
        {/* Warm gradient background */}
        <div className="absolute inset-0 gradient-primary opacity-[0.08]" />
        <div className="absolute inset-0 bg-gradient-to-b from-card/90 to-card/95 backdrop-blur-sm" />

        <div className="relative px-6 py-5">
          {/* Avatar + Name header */}
          <div className="mb-4 flex flex-col items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="flex h-14 w-14 items-center justify-center rounded-full shadow-md"
              style={{ backgroundColor: companionColorVar ? `hsl(var(${companionColorVar}))` : 'hsl(var(--primary))' }}
            >
              {hasVideo && videoPlaying ? null : (
                <span className="text-lg font-bold text-primary-foreground">
                  {companionInitial}
                </span>
              )}
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="font-display text-sm font-semibold text-foreground"
            >
              {companionName}
            </motion.p>

            {milestoneType && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-full bg-primary/10 px-3 py-0.5 text-[11px] font-medium text-primary"
              >
                {getMilestoneLabel(milestoneType)}
              </motion.span>
            )}
          </div>

          {/* Video area */}
          {hasVideo && (
            <div className="mb-4">
              {videoPlaying ? (
                <video
                  src={videoUrl!}
                  className="w-full rounded-2xl"
                  autoPlay
                  controls
                  onEnded={() => setVideoPlaying(false)}
                />
              ) : (
                <button
                  onClick={() => setVideoPlaying(true)}
                  className="group relative flex w-full items-center justify-center rounded-2xl bg-secondary/50 py-10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-md transition-transform group-hover:scale-110">
                    <Video className="h-5 w-5" />
                  </div>
                  <span className="absolute bottom-3 text-xs text-muted-foreground">
                    Tap to watch
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Animated message reveal / veil */}
          {!revealed && !hasVideo ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleReveal}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary/50 py-4 text-sm text-muted-foreground transition-colors hover:bg-secondary/70"
            >
              <Play className="h-4 w-4 fill-current" />
              <span>See what they sent</span>
            </motion.button>
          ) : (
            <AnimatePresence>
              <motion.div
                animate={veiling
                  ? {
                      opacity: 0,
                      filter: 'blur(12px)',
                      scale: 0.98,
                      letterSpacing: '3px',
                    }
                  : {
                      opacity: 1,
                      filter: 'blur(0px)',
                      scale: 1,
                      letterSpacing: '0px',
                    }
                }
                initial={{ opacity: 0, y: 8 }}
                transition={veiling
                  ? { duration: 0.45, ease: [0.4, 0, 0.2, 1] }
                  : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                }
              >
                <p className="text-center text-[15px] leading-relaxed text-foreground">
                  {message}
                </p>

                {/* Veil toggle */}
                {!veiling && !hasVideo && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    onClick={handleVeil}
                    className="mx-auto mt-3 flex items-center gap-1 text-[10px] tracking-[0.06em] uppercase text-primary/40 hover:text-primary/70 transition-colors"
                  >
                    <EyeOff className="h-3 w-3" />
                    Veil
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Auto-reveal for video cards */}
          {hasVideo && !videoPlaying && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-3 text-center text-[15px] leading-relaxed text-foreground"
            >
              {message}
            </motion.p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getMilestoneLabel(type: string): string {
  switch (type) {
    case 'first_message': return '✨ First moment together';
    case '7_day_streak': return '🔥 7 days connected';
    case '30_day_streak': return '💛 30 days of friendship';
    case 'vulnerable_share': return '🤝 You opened up — that means a lot';
    case 'crisis_followup': return '💛 Checking in on you';
    case 'moment_for_you': return '🌿 A moment I left for you';
    default: return '💛 A moment for you';
  }
}
