import { useState, useEffect, useRef, useCallback, ImgHTMLAttributes } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCachedImage, cacheImage } from '@/lib/imageCache';

interface ResilientImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'onError' | 'onLoad'> {
  src: string;
  alt: string;
  /** Wrapper className (controls aspect/size). Image fills the wrapper. */
  wrapperClassName?: string;
  /** Number of automatic retries on load failure. Default 2. */
  maxRetries?: number;
  /** Optional fallback image URL (e.g. avatar) to try after retries fail. */
  fallbackSrc?: string;
  /** Optional callback when load definitively fails. */
  onFinalError?: () => void;
}

/**
 * ResilientImage — drop-in replacement for <img> with:
 *  - Shimmer placeholder while loading
 *  - Automatic retry with cache-buster on failure (handles expired signed URLs)
 *  - Fallback image support
 *  - Graceful broken-icon state instead of the browser's default
 *
 * Designed for slow networks and App Store reviewer conditions.
 */
export default function ResilientImage({
  src,
  alt,
  className,
  wrapperClassName,
  maxRetries = 2,
  fallbackSrc,
  onFinalError,
  loading = 'lazy',
  ...rest
}: ResilientImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const retryCount = useRef(0);
  const triedFallback = useRef(false);

  // Reset when src prop changes — try IndexedDB cache first for instant load
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setFailed(false);
    retryCount.current = 0;
    triedFallback.current = false;

    if (!src) {
      setCurrentSrc(src);
      return;
    }

    // Synchronously start with the network URL so first paint isn't delayed,
    // but if a cached blob exists, swap to it (avoids broken images on reload
    // when signed URLs have expired or the network is offline).
    setCurrentSrc(src);
    getCachedImage(src).then((blobUrl) => {
      if (cancelled || !blobUrl) return;
      setCurrentSrc(blobUrl);
    });

    return () => { cancelled = true; };
  }, [src]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
    setFailed(false);
    // Cache the original network URL (not blob: URLs) for future offline use
    if (src && !currentSrc.startsWith('blob:')) {
      cacheImage(src).catch(() => {});
    }
  }, [src, currentSrc]);

  const handleError = useCallback(() => {
    // If a blob URL failed (rare), fall back to network src once
    if (currentSrc.startsWith('blob:')) {
      setCurrentSrc(src);
      return;
    }
    if (retryCount.current < maxRetries) {
      retryCount.current += 1;
      // Backoff + cache-buster — handles transient network drops & expired signed URLs
      const delay = 400 * retryCount.current;
      setTimeout(() => {
        const sep = src.includes('?') ? '&' : '?';
        setCurrentSrc(`${src}${sep}r=${retryCount.current}-${Date.now()}`);
      }, delay);
      return;
    }
    // Last resort: try IndexedDB cache (e.g. fully offline & first load failed)
    if (!triedFallback.current) {
      getCachedImage(src).then((blobUrl) => {
        if (blobUrl) {
          triedFallback.current = true;
          setCurrentSrc(blobUrl);
          return;
        }
        if (fallbackSrc) {
          triedFallback.current = true;
          retryCount.current = 0;
          setCurrentSrc(fallbackSrc);
          return;
        }
        setFailed(true);
        onFinalError?.();
      });
      return;
    }
    setFailed(true);
    onFinalError?.();
  }, [src, currentSrc, maxRetries, fallbackSrc, onFinalError]);

  return (
    <div className={cn('relative overflow-hidden bg-muted/30', wrapperClassName)}>
      {!loaded && !failed && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(110deg, hsl(var(--muted)) 30%, hsl(var(--muted-foreground) / 0.08) 50%, hsl(var(--muted)) 70%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out infinite',
          }}
          aria-hidden
        />
      )}

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted/40 text-muted-foreground">
          <ImageOff className="h-5 w-5 opacity-60" aria-hidden />
          <span className="text-[10px] opacity-70">Image unavailable</span>
        </div>
      ) : (
        <img
          {...rest}
          src={currentSrc}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'h-full w-full transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
        />
      )}
    </div>
  );
}
