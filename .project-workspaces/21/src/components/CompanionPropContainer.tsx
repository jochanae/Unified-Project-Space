import { motion, AnimatePresence } from 'framer-motion';
import { PROP_ANIMATIONS, type ActiveProp } from '@/hooks/useActiveProps';

interface CompanionPropContainerProps {
  currentProp: ActiveProp | null;
  propCount: number;
}

export default function CompanionPropContainer({ currentProp, propCount }: CompanionPropContainerProps) {
  if (!currentProp) return null;

  const config = PROP_ANIMATIONS[currentProp.giftId];
  const animateProps = config?.animation || { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 2 } };

  return (
    <div className="absolute -top-1 -right-1 z-30" style={{ transform: 'translate(40%, -40%)' }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentProp.id}
          initial={{ opacity: 0, scale: 0.3, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', ...animateProps }}
          exit={{ opacity: 0, y: -16, filter: 'blur(10px)', transition: { duration: 0.8 } }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-card/80 backdrop-blur-md border border-white/[0.1] shadow-[0_0_12px_rgba(212,175,55,0.25)]"
        >
          <span className="text-lg leading-none">{currentProp.emoji}</span>
        </motion.div>
      </AnimatePresence>

      {/* Multi-prop indicator */}
      {propCount > 1 && (
        <div className="absolute -bottom-1 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-primary-foreground shadow">
          {propCount}
        </div>
      )}
    </div>
  );
}
