/**
 * FoundingBadgeReveal — One-time ghost notification that reveals
 * the user's founding member serial number with a luminous flare.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import type { FoundingTier } from '@/hooks/useFoundingMemberStatus';

interface Props {
  serialNumber: number;
  tier: FoundingTier;
  onDismiss: () => void;
}

export default function FoundingBadgeReveal({ serialNumber, tier, onDismiss }: Props) {
  const [dismissing, setDismissing] = useState(false);
  const formatted = `#${String(serialNumber).padStart(3, '0')}`;
  const isGenesis = tier === 'genesis';

  const handleDismiss = () => {
    setDismissing(true);
    // Let flare + exit animation play
    setTimeout(onDismiss, 1200);
  };

  return (
    <AnimatePresence>
      {!dismissing ? (
        <motion.div
          key="reveal"
          initial={{ opacity: 0, x: 20, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed top-[72px] right-4 z-[80] w-[260px] rounded-2xl backdrop-blur-xl overflow-hidden"
          style={{
            background: 'rgba(19,20,36,0.80)',
            border: '1px solid rgba(212,175,55,0.20)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.08)',
          }}
        >
          <div className="p-4 space-y-2">
            {/* Crown */}
            <Crown
              className="h-4 w-4"
              style={{
                color: isGenesis ? 'rgb(212,175,55)' : 'rgb(148,163,184)',
                filter: isGenesis
                  ? 'drop-shadow(0 0 6px rgba(212,175,55,0.5))'
                  : 'drop-shadow(0 0 4px rgba(148,163,184,0.3))',
              }}
            />

            {/* Primary */}
            <p
              className="text-sm font-semibold tracking-wide"
              style={{
                color: isGenesis ? 'rgb(212,175,55)' : 'rgb(203,213,225)',
                textShadow: isGenesis
                  ? '0 0 12px rgba(212,175,55,0.3)'
                  : '0 0 8px rgba(148,163,184,0.2)',
              }}
            >
              {formatted} · Claimed.
            </p>

            {/* Secondary */}
            <p className="text-xs text-white/60 leading-relaxed">
              {isGenesis
                ? 'Your mark as a Genesis Architect. Present at origin.'
                : 'Part of what made this real. Early, and essential.'}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      ) : (
        /* Luminous Flare on dismiss */
        <motion.div
          key="flare"
          initial={{ opacity: 1, x: 0 }}
          animate={{ opacity: 0, x: 40 }}
          transition={{ duration: 1, ease: 'easeIn' }}
          className="fixed top-[72px] right-4 z-[80] w-[260px] rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(19,20,36,0.80)',
            border: '1px solid rgba(212,175,55,0.20)',
          }}
        >
          {/* Gold pulse border flare */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0] }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: 'inset 0 0 20px rgba(212,175,55,0.4), 0 0 30px rgba(212,175,55,0.3)',
            }}
          />
          <div className="p-4 space-y-2">
            <Crown className="h-4 w-4" style={{ color: 'rgb(212,175,55)' }} />
            <p className="text-sm font-semibold tracking-wide" style={{ color: 'rgb(212,175,55)' }}>
              {formatted} · Claimed.
            </p>
            <p className="text-xs text-white/60">
              {isGenesis
                ? 'Your mark as a Genesis Architect. Present at origin.'
                : 'Part of what made this real. Early, and essential.'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
