import { motion } from 'framer-motion';
import { useState } from 'react';

interface BentoImageGridProps {
  images: string[];
  matureMode?: boolean;
  onImageClick?: (url: string, index: number) => void;
}

/**
 * Cinematic Bento Grid for multi-image chat messages.
 * - 12-column grid with hero + footer span logic (Adaptive Masonry)
 * - Tight 8px gap, 24px outer radius, gold hairline encapsulation
 * - Aura bleed (soft gold outer shadow) + obsidian rim per cell
 * - "+N" overlay on the last visible tile when count > visible cap
 *
 * Phase 1: visual only. No vault save loop. No interaction beyond optional onImageClick.
 */
export default function BentoImageGrid({ images, matureMode, onImageClick }: BentoImageGridProps) {
  if (!images || images.length === 0) return null;
  if (images.length === 1) {
    // Single image — render the legacy treatment so we don't change that look
    return (
      <div className="relative mt-2">
        <motion.img
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          src={images[0]}
          alt="Shared moment"
          className="w-full rounded-2xl object-cover max-h-64"
          loading="lazy"
          onClick={() => onImageClick?.(images[0], 0)}
        />
        {matureMode && (
          <span className="absolute bottom-2 right-2 text-[9px] text-white/40 font-medium select-none pointer-events-none drop-shadow-sm">
            © Compani · Personal Use Only
          </span>
        )}
      </div>
    );
  }

  // Cap visible tiles at 5 to keep the grid balanced; show +N on the final tile
  const VISIBLE_CAP = 5;
  const visible = images.slice(0, VISIBLE_CAP);
  const overflow = images.length - VISIBLE_CAP;

  // Span logic — produces a balanced cinematic bento at common counts
  // 2 → side by side; 3 → hero + 2 stacked; 4 → hero + 3 footer; 5+ → hero + 2 stacked + 2 footer
  const getSpan = (i: number, total: number): string => {
    if (total === 2) return 'col-span-6 row-span-2';
    if (total === 3) {
      if (i === 0) return 'col-span-8 row-span-2';
      return 'col-span-4 row-span-1';
    }
    if (total === 4) {
      if (i === 0) return 'col-span-12 row-span-2';
      return 'col-span-4 row-span-1';
    }
    // total === 5 (capped)
    if (i === 0) return 'col-span-8 row-span-2';
    if (i === 1 || i === 2) return 'col-span-4 row-span-1';
    return 'col-span-6 row-span-1';
  };

  // Row count for the grid container (auto-rows of fixed height)
  const rowCount = visible.length === 2 ? 2 : visible.length === 3 ? 2 : visible.length === 4 ? 3 : 3;
  const ROW_PX = 88;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="relative mt-2 rounded-3xl p-1.5 overflow-hidden"
      style={{
        // Gold hairline "vault" container
        border: '1px solid rgba(212,175,55,0.28)',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.04) 0%, rgba(10,11,30,0.35) 100%)',
        boxShadow:
          '0 0 30px rgba(212,175,55,0.10), inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="grid grid-cols-12 gap-2"
        style={{ gridAutoRows: `${ROW_PX}px`, gridTemplateRows: `repeat(${rowCount}, ${ROW_PX}px)` }}
      >
        {visible.map((src, i) => {
          const isLast = i === visible.length - 1 && overflow > 0;
          return (
            <BentoCell
              key={`bento-${i}-${src}`}
              src={src}
              span={getSpan(i, visible.length)}
              overlayCount={isLast ? overflow + 1 : 0}
              onClick={() => onImageClick?.(src, i)}
              index={i}
            />
          );
        })}
      </div>
      {matureMode && (
        <span className="absolute bottom-2 right-3 text-[9px] text-white/40 font-medium select-none pointer-events-none drop-shadow-sm">
          © Compani · Personal Use Only
        </span>
      )}
    </motion.div>
  );
}

interface BentoCellProps {
  src: string;
  span: string;
  overlayCount: number;
  index: number;
  onClick?: () => void;
}

function BentoCell({ src, span, overlayCount, index, onClick }: BentoCellProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.04, duration: 0.35 }}
      className={`${span} relative overflow-hidden rounded-2xl group cursor-pointer`}
      style={{
        // Obsidian rim (etched gold edge)
        border: '1px solid rgba(212,175,55,0.22)',
        // Aura bleed (soft outer gold glow)
        boxShadow:
          '0 0 16px rgba(212,175,55,0.10), inset 0 0 0 1px rgba(0,0,0,0.4)',
        background: 'rgba(10,11,30,0.6)',
      }}
      onClick={onClick}
    >
      <img
        src={src}
        alt={`Photo ${index + 1}`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.04] ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
      {/* Inner depth — darken edges so gold rim pops */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)',
        }}
      />
      {/* +N overlay on the final tile when overflow */}
      {overlayCount > 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            background: 'rgba(10,11,30,0.62)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <span
            className="text-2xl font-light tracking-wide"
            style={{ color: 'rgba(212,175,55,0.95)', textShadow: '0 0 12px rgba(212,175,55,0.35)' }}
          >
            +{overlayCount}
          </span>
        </div>
      )}
    </motion.div>
  );
}
