/**
 * PassportStamp — Gold-ink "Sanctuary Entry" stamp that appears when the user
 * opens the app in a new city. Renders as a chat-embedded animation with
 * spring physics and fades into a translucent watermark.
 */
import { motion } from 'framer-motion';
import { Home, Briefcase } from 'lucide-react';

interface PassportStampProps {
  cityName: string;
  date: string;
  companionName?: string;
  locationType?: 'home' | 'work' | null;
}

export default function PassportStamp({ cityName, date, companionName, locationType }: PassportStampProps) {
  // Haptic: heavy muffled stamp
  const triggerStampHaptic = () => {
    try {
      navigator.vibrate?.([20, 20, 20, 20, 20, 60, 40]);
    } catch { /* */ }
  };

  const topLabel = locationType === 'home' ? 'Home'
    : locationType === 'work' ? 'Work'
    : 'Inscribed Entry';

  return (
    <div className="flex justify-center my-8 pointer-events-none select-none">
      <motion.div
        initial={{ scale: 2.2, opacity: 0, rotate: -24 }}
        animate={{ scale: 1, opacity: 0.55, rotate: -12 }}
        transition={{
          type: 'spring',
          stiffness: 220,
          damping: 16,
          duration: 0.8,
        }}
        onAnimationComplete={triggerStampHaptic}
        className="relative flex flex-col items-center justify-center w-36 h-36 rounded-full border-4 border-double border-primary/40"
      >
        {/* Inner ring */}
        <div className="absolute inset-2 rounded-full border border-primary/20" />

        {/* Location type icon */}
        {locationType && (
          <div className="mb-0.5">
            {locationType === 'home' ? (
              <Home className="h-3 w-3 text-primary/50" />
            ) : (
              <Briefcase className="h-3 w-3 text-primary/50" />
            )}
          </div>
        )}

        {/* Top label */}
        <span className="text-[7px] uppercase tracking-[0.35em] text-primary/60 font-medium mb-0.5">
          {topLabel}
        </span>

        {/* City name */}
        <span className="text-sm font-light text-foreground tracking-[0.2em] uppercase leading-tight text-center px-2">
          {cityName}
        </span>

        {/* Date */}
        <span className="text-[7px] text-primary/40 mt-2 font-mono tabular-nums">
          {date}
        </span>

        {/* Companion witness */}
        {companionName && (
          <span className="text-[6px] text-muted-foreground/30 mt-1 tracking-widest uppercase">
            Witnessed by {companionName}
          </span>
        )}

        {/* Holographic shine overlay */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent" />
      </motion.div>
    </div>
  );
}
