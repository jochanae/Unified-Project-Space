import { motion, AnimatePresence } from 'framer-motion';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Map, X } from 'lucide-react';

export interface MinimapParticipant {
  id: string;
  x: number; // 0-1 fraction of WORLD space
  y: number;
  hue: number;
  isPresenter?: boolean;
  isSpeaking?: boolean;
}

interface SpatialMinimapProps {
  participants: MinimapParticipant[];
  isPresenting: boolean;
  presentationRect?: { x: number; y: number; w: number; h: number };
  /** Viewport position as fraction of world (0-1) */
  viewportPos?: { x: number; y: number };
  /** Viewport size as fraction of world (0-1) */
  viewportSize?: { w: number; h: number };
  /** Called when user taps a location on the minimap */
  onNavigateTo?: (worldX: number, worldY: number) => void;
}

const MAP_W = 150;
const MAP_H = 110;
const PILL_H = 44;
const PILL_W_BASE = 52;
const DOT_SIZE = 8;
const MAX_PILL_DOTS = 5;

export default function SpatialMinimap({
  participants,
  isPresenting,
  presentationRect,
  viewportPos = { x: 0.5, y: 0.5 },
  viewportSize = { w: 0.33, h: 0.33 },
  onNavigateTo,
}: SpatialMinimapProps) {
  const [expanded, setExpanded] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Show hint briefly when first expanded
  useEffect(() => {
    if (expanded) {
      setShowHint(true);
      const t = setTimeout(() => setShowHint(false), 2000);
      return () => clearTimeout(t);
    }
    setShowHint(false);
  }, [expanded]);

  const handleMapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onNavigateTo) return;
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      onNavigateTo(fx, fy);
    },
    [onNavigateTo]
  );

  // Viewport rectangle in map coords
  const vp = useMemo(() => {
    const w = viewportSize.w * MAP_W;
    const h = viewportSize.h * MAP_H;
    const left = viewportPos.x * MAP_W - w / 2;
    const top = viewportPos.y * MAP_H - h / 2;
    return { left, top, width: w, height: h };
  }, [viewportPos, viewportSize]);

  // Pill dots — show up to MAX_PILL_DOTS participants
  const pillDots = useMemo(
    () => participants.slice(0, MAX_PILL_DOTS),
    [participants]
  );

  const pillWidth = PILL_W_BASE + pillDots.length * (DOT_SIZE + 4);

  // ── Collapsed pill ──
  if (!expanded) {
    return (
      <motion.button
        className="absolute top-14 left-3 z-10 flex items-center gap-1 rounded-full border border-border/40 px-2"
        style={{
          height: PILL_H,
          minWidth: pillWidth,
          background: 'hsl(var(--card) / 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => setExpanded(true)}
        aria-label="Open minimap"
      >
        {/* Participant dots */}
        <span className="flex items-center gap-1 mr-1">
          {pillDots.map((p) => (
            <motion.span
              key={p.id}
              className="rounded-full inline-block"
              style={{
                width: DOT_SIZE,
                height: DOT_SIZE,
                background: `hsl(${p.hue} 60% 55%)`,
                boxShadow: p.isSpeaking
                  ? `0 0 6px 2px hsl(${p.hue} 60% 55% / 0.6)`
                  : undefined,
              }}
              animate={
                p.isSpeaking
                  ? { scale: [1, 1.6, 1], opacity: [1, 0.7, 1] }
                  : { scale: 1, opacity: 0.85 }
              }
              transition={
                p.isSpeaking
                  ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
            />
          ))}
          {participants.length > MAX_PILL_DOTS && (
            <span className="text-[9px] text-muted-foreground ml-0.5">
              +{participants.length - MAX_PILL_DOTS}
            </span>
          )}
        </span>
        <Map className="w-3.5 h-3.5 text-muted-foreground" />
      </motion.button>
    );
  }

  // ── Expanded map ──
  return (
    <AnimatePresence>
      <motion.div
        className="absolute top-14 left-3 z-10 rounded-xl overflow-hidden border border-border/40 flex flex-col"
        style={{
          width: MAP_W + 24,
          background: 'hsl(var(--card) / 0.45)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
        initial={{ opacity: 0, scale: 0.8, height: PILL_H }}
        animate={{ opacity: 1, scale: 1, height: 'auto' }}
        exit={{ opacity: 0, scale: 0.8, height: PILL_H }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">
            {participants.length} in room
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
            className="p-0.5 rounded-full hover:bg-accent/30 transition-colors"
            aria-label="Close minimap"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        {/* Map body */}
        <div
          className="relative cursor-pointer mx-auto mb-2"
          style={{
            width: MAP_W,
            height: MAP_H,
            borderRadius: 8,
            background: 'hsl(var(--foreground) / 0.04)',
          }}
          onClick={handleMapClick}
        >
          {/* Viewport rectangle */}
          <div
            className="absolute rounded-sm border-2 border-primary/50"
            style={{
              left: Math.max(0, vp.left),
              top: Math.max(0, vp.top),
              width: Math.min(vp.width, MAP_W),
              height: Math.min(vp.height, MAP_H),
              background: 'hsl(var(--primary) / 0.08)',
            }}
          />

          {/* Presentation rectangle */}
          {isPresenting && presentationRect && (
            <div
              className="absolute rounded-sm border border-primary/50"
              style={{
                left: presentationRect.x * MAP_W - (presentationRect.w * MAP_W) / 2,
                top: presentationRect.y * MAP_H - (presentationRect.h * MAP_H) / 2,
                width: presentationRect.w * MAP_W,
                height: presentationRect.h * MAP_H,
                boxShadow: '0 0 6px 1px hsl(var(--primary) / 0.4)',
                background: 'hsl(var(--primary) / 0.08)',
              }}
            />
          )}

          {/* Participant blips */}
          {participants.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full"
              style={{
                width: p.isPresenter ? 9 : 7,
                height: p.isPresenter ? 9 : 7,
                left: p.x * MAP_W - (p.isPresenter ? 4.5 : 3.5),
                top: p.y * MAP_H - (p.isPresenter ? 4.5 : 3.5),
                background: `hsl(${p.hue} 60% 55%)`,
                boxShadow: p.isPresenter
                  ? `0 0 6px 2px hsl(${p.hue} 60% 55% / 0.6)`
                  : p.isSpeaking
                    ? `0 0 4px 1px hsl(${p.hue} 60% 55% / 0.5)`
                    : undefined,
              }}
              animate={
                p.isSpeaking
                  ? { scale: [1, 1.5, 1], opacity: [1, 0.7, 1] }
                  : { scale: 1, opacity: 1 }
              }
              transition={
                p.isSpeaking
                  ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
                  : { duration: 0.3 }
              }
            />
          ))}

          {/* Tap hint */}
          <AnimatePresence>
            {showHint && (
              <motion.span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] text-muted-foreground whitespace-nowrap pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                exit={{ opacity: 0 }}
              >
                tap to go there
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
