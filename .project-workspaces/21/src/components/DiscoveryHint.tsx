import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { useFeatureDiscovery } from '@/hooks/useFeatureDiscovery';

interface DiscoveryHintProps {
  featureKey: string;
  userId: string | undefined;
  title: string;
  body: string;
  icon?: string;
}

export default function DiscoveryHint({ featureKey, userId, title, body, icon }: DiscoveryHintProps) {
  const { hasDiscovered, markDiscovered } = useFeatureDiscovery(userId);
  const [dismissed, setDismissed] = useState(false);

  if (!userId || hasDiscovered(featureKey) || dismissed) return null;

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg backdrop-blur-md bg-black/25"
        >
          {icon && <span className="text-xs shrink-0">{icon}</span>}
          <p className="text-xs italic text-white/80 leading-snug" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{body}</p>
          <button
            onClick={() => {
              setDismissed(true);
              markDiscovered(featureKey);
            }}
            className="shrink-0 ml-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors italic"
          >
            dismiss
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
