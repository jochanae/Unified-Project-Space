/**
 * ContextStatusBar — A subtle 2px gradient bar at the top of the viewport
 * that shifts color based on the user's active location context.
 *
 * Silver/muted → at Home
 * Gold/primary → at Base (work-rules prioritized)
 * Transparent  → neutral / unknown
 */
import { motion, AnimatePresence } from 'framer-motion';

interface ContextStatusBarProps {
  locationMode: 'home' | 'base' | 'travel' | null;
}

export default function ContextStatusBar({ locationMode }: ContextStatusBarProps) {
  if (!locationMode) return null;

  const gradients: Record<string, string> = {
    home: 'linear-gradient(90deg, hsl(var(--muted-foreground) / 0.2) 0%, hsl(var(--muted-foreground) / 0.5) 50%, hsl(var(--muted-foreground) / 0.2) 100%)',
    base: 'linear-gradient(90deg, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.8) 50%, hsl(var(--primary) / 0.3) 100%)',
    travel: 'linear-gradient(90deg, hsl(var(--accent) / 0.2) 0%, hsl(var(--accent) / 0.5) 50%, hsl(var(--accent) / 0.2) 100%)',
  };

  return (
    <AnimatePresence>
      <motion.div
        key={locationMode}
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{ opacity: 1, scaleX: 1 }}
        exit={{ opacity: 0, scaleX: 0.4 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="fixed top-0 left-0 right-0 z-[60] pointer-events-none"
        style={{
          height: '2px',
          background: gradients[locationMode] || gradients.travel,
          transformOrigin: 'center',
        }}
      />
    </AnimatePresence>
  );
}
