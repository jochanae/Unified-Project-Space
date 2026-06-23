import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import AbstractAvatar from './AbstractAvatar';

type VibeMode = 'neutral' | 'decompress' | 'focus';

interface CompanionVibeCardProps {
  companionName: string;
  avatarUrl?: string | null;
  memberId: string;
  visualMode?: string;
  onModeChange?: (mode: VibeMode) => void;
}

export default function CompanionVibeCard({
  companionName,
  avatarUrl,
  memberId,
  visualMode,
  onModeChange,
}: CompanionVibeCardProps) {
  const [activeMode, setActiveMode] = useState<VibeMode>('neutral');
  const x = useMotionValue(0);

  // Interpolated visuals
  const background = useTransform(
    x,
    [-150, 0, 150],
    ['rgba(26, 27, 46, 0.85)', 'rgba(19, 20, 36, 0.5)', 'rgba(212, 175, 55, 0.2)']
  );
  const borderColor = useTransform(
    x,
    [-150, 0, 150],
    ['rgba(99, 102, 241, 0.4)', 'rgba(255,255,255,0.08)', 'rgba(212, 175, 55, 0.5)']
  );
  const decompressOpacity = useTransform(x, [-120, -50], [1, 0]);
  const focusOpacity = useTransform(x, [50, 120], [0, 1]);

  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    let newMode: VibeMode = 'neutral';
    if (info.offset.x < -80) {
      newMode = 'decompress';
      if (navigator.vibrate) navigator.vibrate([40, 10, 20]); // low whoosh haptic
    } else if (info.offset.x > 80) {
      newMode = 'focus';
      if (navigator.vibrate) navigator.vibrate(10); // sharp click
    }
    setActiveMode(newMode);
    onModeChange?.(newMode);
  }, [onModeChange]);

  return (
    <div className="relative w-full max-w-sm mx-auto overflow-hidden rounded-[32px]">
      {/* Mode labels */}
      <motion.div
        style={{ opacity: decompressOpacity }}
        className="absolute left-5 top-1/2 -translate-y-1/2 z-0 pointer-events-none"
      >
        <span className="text-[10px] uppercase font-semibold" style={{ letterSpacing: '0.4em', color: 'rgba(129,140,248,0.8)' }}>
          Decompress
        </span>
      </motion.div>
      <motion.div
        style={{ opacity: focusOpacity }}
        className="absolute right-5 top-1/2 -translate-y-1/2 z-0 pointer-events-none"
      >
        <span className="text-[10px] uppercase font-semibold" style={{ letterSpacing: '0.4em', color: 'rgba(212,175,55,0.9)' }}>
          Focus
        </span>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -150, right: 150 }}
        dragElastic={0.15}
        dragSnapToOrigin
        style={{ x, background, borderColor }}
        onDragEnd={handleDragEnd}
        className="relative z-10 flex flex-col items-center p-6 backdrop-blur-2xl rounded-[32px] cursor-grab active:cursor-grabbing border"
      >
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full overflow-hidden mb-3"
          style={{
            border: '2px solid rgba(212,175,55,0.2)',
            boxShadow: activeMode === 'focus'
              ? '0 0 25px rgba(212,175,55,0.3)'
              : activeMode === 'decompress'
                ? '0 0 25px rgba(99,102,241,0.3)'
                : '0 0 15px rgba(0,0,0,0.3)',
            transition: 'box-shadow 0.5s ease',
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={companionName} className="h-full w-full object-cover object-top" style={{ objectPosition: 'center 15%' }} />
          ) : visualMode === 'abstract' ? (
            <AbstractAvatar memberId={memberId} size="lg" />
          ) : (
            <div className="h-full w-full bg-gradient-to-b from-secondary to-muted flex items-center justify-center">
              <span className="text-xl font-bold text-foreground/50">{companionName[0]}</span>
            </div>
          )}
        </div>

        {/* Name + status */}
        <h3 className="text-lg font-extralight text-white" style={{ letterSpacing: '0.15em' }}>
          {companionName}
        </h3>
        <p className="text-[9px] uppercase mt-0.5" style={{ letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)' }}>
          {activeMode === 'neutral' ? 'Calibrated' : activeMode === 'focus' ? '⚡ Focus Mode' : '🌙 Decompressing'}
        </p>

        {/* Swipe hint dots */}
        <div className="flex gap-1 mt-4">
          <div className="w-1 h-1 rounded-full" style={{ background: activeMode === 'decompress' ? 'rgba(129,140,248,0.7)' : 'rgba(255,255,255,0.1)' }} />
          <div className="w-4 h-1 rounded-full" style={{ background: activeMode === 'neutral' ? 'rgba(212,175,55,0.4)' : 'rgba(255,255,255,0.1)' }} />
          <div className="w-1 h-1 rounded-full" style={{ background: activeMode === 'focus' ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.1)' }} />
        </div>
      </motion.div>
    </div>
  );
}
