import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface CinematicHeaderProps {
  scrolled: boolean;
  onBack: () => void;

  /** Expanded state — title + subtitle */
  title: string;
  subtitle?: string;

  /** Compact state — icon + title + optional trailing info */
  compactIcon?: ReactNode;
  compactTitle?: string;
  compactTrailing?: ReactNode;

  /** Optional expanded icon next to the title (shown only when NOT scrolled) */
  expandedIcon?: ReactNode;

  /** Optional action button to the right of the title row */
  headerAction?: ReactNode;

  /** Optional collapsible detail card shown below the title when expanded */
  expandedDetail?: ReactNode;

  /** Optional detail always shown below the title (both expanded and collapsed) */
  persistentDetail?: ReactNode;
}

/**
 * Single performant sticky header — replaces 5 duplicated "Dossier" headers.
 *
 * Perf fixes vs the old pattern:
 *  - ONE backdrop-blur layer (no stacked glassmorphism)
 *  - GPU-promoted with translateZ(0)
 *  - Fixed height snap (px, not %) — no mid-scroll recalc
 *  - Crossfade via simultaneous opacity (no AnimatePresence mode="wait" gap)
 *  - Ambient glow uses CSS only (no framer AnimatePresence for the blob)
 */
export default function CinematicHeader({
  scrolled,
  onBack,
  title,
  subtitle,
  compactIcon,
  compactTitle,
  compactTrailing,
  expandedIcon,
  headerAction,
  expandedDetail,
  persistentDetail,
}: CinematicHeaderProps) {
  return (
    <motion.div
      className="sticky top-0 z-30 shrink-0 md:-mx-[max(2rem,env(safe-area-inset-left,0px))] md:px-[max(2rem,env(safe-area-inset-left,0px))]"
      animate={{ paddingBottom: scrolled ? 12 : 20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        /* Single blur layer — no stacking */
        background: 'linear-gradient(180deg, hsl(var(--background)) 92%, transparent)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        /* GPU acceleration — prevents scroll jitter */
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {/* Ambient glow — CSS opacity transition instead of AnimatePresence */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-200"
        style={{ opacity: scrolled ? 0 : 1 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <div className="relative px-5 pt-4">
        {/* Title row */}
        <div className="flex items-center gap-3 mb-3">
          {/* Back button — no nested backdrop-blur */}
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.1] transition-colors text-muted-foreground border border-white/[0.06]"
            style={{ transform: 'translateZ(0)' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="flex-1 relative">
            {/* ── Expanded title ── */}
            <motion.div
              animate={{
                opacity: scrolled ? 0 : 1,
                y: scrolled ? -4 : 0,
                position: scrolled ? ('absolute' as const) : ('relative' as const),
              }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ pointerEvents: scrolled ? 'none' : 'auto' }}
              className={expandedIcon ? 'flex items-center gap-3' : undefined}
            >
              {expandedIcon}
              <div>
                <h1
                  className="font-serif text-lg font-bold text-foreground"
                  style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}
                >
                  {title}
                </h1>
                {subtitle && (
                  <p
                    className="text-[11px] text-muted-foreground/60"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </motion.div>

            {/* ── Compact title ── */}
            <motion.div
              animate={{ opacity: scrolled ? 1 : 0, y: scrolled ? 0 : 4 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 flex items-center gap-2.5"
              style={{ pointerEvents: scrolled ? 'auto' : 'none' }}
            >
              {compactIcon}
              <h1
                className="font-serif text-sm font-bold text-foreground"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              >
                {compactTitle ?? title}
              </h1>
              {compactTrailing && (
                <span className="text-[10px] text-muted-foreground/40 ml-auto tabular-nums">
                  {compactTrailing}
                </span>
              )}
            </motion.div>
          </div>

          {headerAction}
        </div>

        {/* Expandable detail card */}
        <AnimatePresence>
          {!scrolled && expandedDetail && (
            <motion.div
              initial={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              {expandedDetail}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Always-visible detail (e.g. filter chips) */}
        {persistentDetail}
      </div>
    </motion.div>
  );
}
