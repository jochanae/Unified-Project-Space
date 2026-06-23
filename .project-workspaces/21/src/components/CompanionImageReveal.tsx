import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CompanionImageRevealProps {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  /** Kept for API compat — no longer changes behavior (always fades) */
  simpleFade?: boolean;
  /** Delay in seconds before the reveal animation starts */
  delay?: number;
  /** Called once the image has loaded and reveal begins */
  onLoad?: () => void;
}

/**
 * Image component with a smooth opacity fade reveal.
 * Shows a shimmer placeholder while loading, then fades the image in.
 */
export default function CompanionImageReveal({
  src,
  alt,
  className = '',
  style,
  simpleFade: _simpleFade,
  delay = 0,
  onLoad,
}: CompanionImageRevealProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  if (error) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center justify-center',
          className,
        )}
      >
        <span className="text-muted-foreground text-xs">?</span>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Shimmer placeholder — visible while loading */}
      {!loaded && (
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              'linear-gradient(110deg, hsl(var(--muted)) 30%, hsl(var(--muted-foreground) / 0.08) 50%, hsl(var(--muted)) 70%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
        />
      )}

      {/* Hidden loader — triggers onLoad without displaying */}
      {!loaded && (
        <img
          src={src}
          alt=""
          aria-hidden
          onLoad={handleLoad}
          onError={handleError}
          className="sr-only"
        />
      )}

      {/* Revealed image — always a clean opacity fade */}
      {loaded && (
        <motion.img
          src={src}
          alt={alt}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay, ease: 'easeOut' }}
          style={style}
          className={cn('h-full w-full object-cover object-top', className)}
        />
      )}
    </div>
  );
}
