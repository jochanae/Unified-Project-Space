import { useEffect, useCallback, RefObject } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Maximize2 } from 'lucide-react';
import PresenterPiP from './PresenterPiP';

interface PresentationSurfaceProps {
  isSpeaker: boolean;
  slides: string[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  onStopPresenting?: () => void;
  containerRef: RefObject<HTMLDivElement>;
  /** 'iframe' for URLs, 'image' for uploaded slide images */
  mode: 'iframe' | 'image';
  /** Called when user taps the Focus/Cinema button */
  onEnterCinema?: () => void;
}

export default function PresentationSurface({
  isSpeaker,
  slides,
  currentSlide,
  onSlideChange,
  onStopPresenting,
  containerRef,
  mode,
  onEnterCinema,
}: PresentationSurfaceProps) {
  const total = slides.length;

  const goPrev = useCallback(() => {
    if (currentSlide > 0) onSlideChange(currentSlide - 1);
  }, [currentSlide, onSlideChange]);

  const goNext = useCallback(() => {
    if (currentSlide < total - 1) onSlideChange(currentSlide + 1);
  }, [currentSlide, total, onSlideChange]);

  // Keyboard navigation — speaker only
  useEffect(() => {
    if (!isSpeaker) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSpeaker, goPrev, goNext]);

  const currentUrl = slides[currentSlide] || '';

  return (
    <motion.div
      className="absolute z-[8] pointer-events-auto"
      style={{ left: '50%', top: '30%', x: '-50%', y: '-50%' }}
      drag={isSpeaker}
      dragConstraints={containerRef}
      dragElastic={0.1}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', damping: 28, stiffness: 220 }}
    >
      {/* Glass frame */}
      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
        style={{
          width: 'min(60vw, 480px)',
          aspectRatio: '16 / 9',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: 'hsl(var(--card) / 0.35)',
          boxShadow: '0 0 40px 8px hsl(var(--primary) / 0.08), 0 8px 32px -8px hsl(0 0% 0% / 0.4)',
        }}
      >
        {/* Content */}
        {mode === 'iframe' ? (
          <iframe
            src={currentUrl}
            title="Presentation"
            className="absolute inset-0 w-full h-full border-0 rounded-2xl"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation allow-popups-to-escape-sandbox"
            allow="fullscreen; autoplay; clipboard-write"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <img
            src={currentUrl}
            alt={`Slide ${currentSlide + 1}`}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        )}

        {/* Focus / Cinema button */}
        {onEnterCinema && (
          <button
            onClick={onEnterCinema}
            className="absolute top-2 left-2 flex h-7 w-7 items-center justify-center rounded-full bg-card/60 border border-border/30 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors z-10"
            title="Focus mode"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Stop presenting button — speaker only */}
        {isSpeaker && onStopPresenting && (
          <button
            onClick={onStopPresenting}
            className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-card/60 border border-border/30 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-card/80 transition-colors z-10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Presenter PiP webcam */}
        <PresenterPiP isSpeaker={isSpeaker} size="sm" />

        {/* Slide controls — speaker only */}
        {isSpeaker && total > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 rounded-full px-3 py-1.5 bg-card/60 border border-border/30 backdrop-blur-sm z-10">
            <button
              onClick={goPrev}
              disabled={currentSlide === 0}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted/50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <span className="text-[11px] font-semibold text-foreground/80 tabular-nums min-w-[36px] text-center">
              {currentSlide + 1} / {total}
            </span>
            <button
              onClick={goNext}
              disabled={currentSlide === total - 1}
              className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-muted/50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
