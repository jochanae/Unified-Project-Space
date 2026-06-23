import { useMemo, useEffect, useRef, useCallback, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/utils/logger';
import { getAmbientStyles } from '@/lib/ambientBackgrounds';
import { treatAsMinor } from '@/lib/ageUtils';
import AnimatedGradientHeart from './AnimatedGradientHeart';
import { supabase } from '@/integrations/supabase/client';
import { avatarImages } from '@/lib/avatarImages';

// Module-level cache so backdrop survives remounts across route changes
let _cachedImage: string | undefined;
let _cachedMemberId: string | undefined;
// Module-level "last known good" — survives remounts unlike useRef
let _lastKnownHero: string | undefined;
let _lastKnownMemberId: string | undefined;

/**
 * GlobalBackdrop — single source of truth for the app's cinematic background.
 *
 * Renders:
 *  1. Ambient light-leak radial gradients as fallback
 *  2. Companion's avatar as a CLEAR full-bleed image (unblurred, cinematic)
 *  3. Gradient overlay for card readability
 *  4. Obsidian glass overlay: dark vignette
 *  5. Subtle parallax scroll on the companion image
 *  6. AnimatedGradientHeart mascot when no companion exists (empty state)
 */
export default function GlobalBackdrop() {
  const { activeConnection, profile, updateConnection, user } = useAppContext();

  const activeMemberId = activeConnection?.memberId;
  const avatarUrl = activeConnection?.avatarUrl;
  const backdropUrl = activeConnection?.backgroundUrl;
  const heroImage = backdropUrl || avatarUrl;
  const isCustomBackdrop = !!backdropUrl;
  const hasCompanion = !!activeMemberId;
  const minor = treatAsMinor(profile?.dateOfBirth);
  const ambient = useMemo(() => getAmbientStyles(minor), [minor]);

  // Update module-level last-known-good whenever we have real data
  if (heroImage) {
    _lastKnownHero = heroImage;
    _lastKnownMemberId = activeMemberId;
  }

  // Effective image: use current if available, else keep the last known good one (module-level)
  const effectiveHero = heroImage || _lastKnownHero;
  const effectiveMemberId = activeMemberId || _lastKnownMemberId;

  // Use module-level cache to survive remounts; fall back to effectiveHero
  const initialImage = (_cachedMemberId === effectiveMemberId && _cachedImage) ? _cachedImage : effectiveHero;
  const [displayedImage, setDisplayedImage] = useState<string | undefined>(initialImage);
  // If we have a cached image for this companion, start as loaded immediately
  const [imageLoaded, setImageLoaded] = useState(
    !!initialImage && ((_cachedMemberId === effectiveMemberId && !!_cachedImage) || !!effectiveHero)
  );
  const recoveryAttempted = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  // Update module-level cache whenever we successfully display an image
  useEffect(() => {
    if (displayedImage && imageLoaded && effectiveMemberId) {
      _cachedImage = displayedImage;
      _cachedMemberId = effectiveMemberId;
    }
  }, [displayedImage, imageLoaded, effectiveMemberId]);

  // Try to recover backdrop — NEVER clears the DB URL on failure
  const attemptVaultRecovery = useCallback(async () => {
    if (recoveryAttempted.current || !activeConnection?.memberId || !user?.id) return;
    recoveryAttempted.current = true;
    logger.log('[GlobalBackdrop] Starting vault recovery for', activeConnection.memberId);

    try {
      // First: retry the original URL with a fresh cache-buster (transient failure)
      const originalUrl = activeConnection.backgroundUrl || activeConnection.avatarUrl;
      if (originalUrl && retryCount.current < maxRetries) {
        retryCount.current++;
        const freshUrl = originalUrl.replace(/[?&]t=\d+/, '') + `?t=${Date.now()}`;
        logger.log('[GlobalBackdrop] Retry attempt', retryCount.current, 'with fresh URL:', freshUrl.slice(0, 80));
        const works = await new Promise<boolean>((resolve) => {
          const testImg = new Image();
          testImg.crossOrigin = 'anonymous';
          testImg.onload = () => resolve(testImg.naturalWidth > 0);
          testImg.onerror = () => resolve(false);
          testImg.src = freshUrl;
          setTimeout(() => resolve(false), 8000);
        });
        if (works) {
          logger.log('[GlobalBackdrop] ✅ Fresh URL loaded successfully');
          setDisplayedImage(freshUrl);
          setImageLoaded(true);
          return;
        }
      }

      // Check companion_media vault for alternate images
      const mediaTypes = ['backdrop', 'likeness', 'selfie', 'avatar'];
      for (const mediaType of mediaTypes) {
        const { data } = await supabase
          .from('companion_media')
          .select('image_url')
          .eq('user_id', user.id)
          .eq('member_id', activeConnection.memberId)
          .eq('media_type', mediaType)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data?.image_url) {
          const works = await new Promise<boolean>((resolve) => {
            const testImg = new Image();
            testImg.crossOrigin = 'anonymous';
            testImg.onload = () => resolve(testImg.naturalWidth > 0);
            testImg.onerror = () => resolve(false);
            testImg.src = data.image_url;
            setTimeout(() => resolve(false), 5000);
          });
          if (works) {
            logger.log('[GlobalBackdrop] ✅ Vault recovery from', mediaType);
            setDisplayedImage(data.image_url);
            setImageLoaded(true);
            // Update DB to working URL so it's fixed permanently
            updateConnection(activeConnection.memberId, { backgroundUrl: data.image_url });
            return;
          }
        }
      }

      // Final fallback: bundled asset from Browse companions (display only, don't wipe DB)
      const baseName = activeConnection.memberId.replace(/^created-/, '').replace(/-\d+$/, '').toLowerCase();
      const bundledSrc = avatarImages[baseName];
      if (bundledSrc) {
        setDisplayedImage(bundledSrc);
        setImageLoaded(true);
        return;
      }

      // Nothing worked — show avatar as visual fallback, but NEVER clear the DB URL.
      // The original URL stays in the database so it can be retried on next page load.
      if (avatarUrl) {
        logger.log('[GlobalBackdrop] ⚠️ All recovery failed, using avatarUrl as fallback');
        setDisplayedImage(avatarUrl);
        setImageLoaded(true);
      }
    } catch {
      // Silent fail — keep whatever is currently displayed
    }
  }, [activeConnection?.memberId, activeConnection?.backgroundUrl, activeConnection?.avatarUrl, user?.id, avatarUrl, updateConnection]);

  // Reset displayed image when active companion changes (even if URLs are the same)
  const prevMemberId = useRef(effectiveMemberId);
  useEffect(() => {
    // Skip transient undefined states (route transitions, context re-renders)
    if (!effectiveHero && displayedImage && imageLoaded) {
      // Keep showing what we have — don't blank out during context flickers
      return;
    }

    if (prevMemberId.current !== effectiveMemberId) {
      prevMemberId.current = effectiveMemberId;
      recoveryAttempted.current = false;
      retryCount.current = 0;

      // Check module cache first — instant display if we have it
      if (_cachedMemberId === effectiveMemberId && _cachedImage) {
        setDisplayedImage(_cachedImage);
        setImageLoaded(true);
        // Still verify the image loads, but don't block display
        if (effectiveHero && effectiveHero !== _cachedImage) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            if (img.naturalWidth > 0) {
              setDisplayedImage(effectiveHero);
              setImageLoaded(true);
            }
          };
          img.src = effectiveHero;
        }
        return;
      }

      setImageLoaded(false);
      if (!effectiveHero) {
        setDisplayedImage(undefined);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        if (img.naturalWidth > 0) {
          setDisplayedImage(effectiveHero);
          setImageLoaded(true);
        } else if (effectiveHero === backdropUrl) {
          attemptVaultRecovery();
        }
      };
      img.onerror = () => {
        logger.log('[GlobalBackdrop] ❌ Image load failed for:', effectiveHero?.slice(0, 80));
        if (effectiveHero === backdropUrl) {
          attemptVaultRecovery();
          if (avatarUrl) { setDisplayedImage(avatarUrl); setImageLoaded(true); }
        } else {
          setDisplayedImage(effectiveHero);
          setImageLoaded(true);
        }
      };
      img.src = effectiveHero;
      if (img.complete && img.naturalWidth > 0) {
        setDisplayedImage(effectiveHero);
        setImageLoaded(true);
      }
      return;
    }

    // Same companion, but image URL changed (e.g. new backdrop uploaded)
    if (!effectiveHero) {
      // Don't clear if we have a displayed image — this is likely a transient state
      if (displayedImage) return;
      setDisplayedImage(undefined);
      setImageLoaded(false);
      recoveryAttempted.current = false;
      retryCount.current = 0;
      return;
    }
    recoveryAttempted.current = false;
    retryCount.current = 0;
    if (effectiveHero === displayedImage) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth > 0) {
        setDisplayedImage(effectiveHero);
        setImageLoaded(true);
      } else {
        if (effectiveHero === backdropUrl) attemptVaultRecovery();
        else { setDisplayedImage(effectiveHero); setImageLoaded(true); }
      }
    };
    img.onerror = () => {
      logger.log('[GlobalBackdrop] ❌ Image update failed for:', effectiveHero?.slice(0, 80));
      if (effectiveHero === backdropUrl) {
        attemptVaultRecovery();
        if (avatarUrl) { setDisplayedImage(avatarUrl); setImageLoaded(true); }
      } else {
        setDisplayedImage(effectiveHero);
        setImageLoaded(true);
      }
    };
    img.src = effectiveHero;
    if (img.complete && img.naturalWidth > 0) {
      setDisplayedImage(effectiveHero);
      setImageLoaded(true);
    }
  }, [effectiveHero, effectiveMemberId]); // intentionally exclude displayedImage to avoid loops

  const lightRef = useRef<HTMLDivElement>(null);
  const darkRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    const y = window.scrollY * 0.15;
    const val = `translateY(${y}px) scale(1.08)`;
    if (lightRef.current) lightRef.current.style.transform = val;
    if (darkRef.current) darkRef.current.style.transform = val;
  }, []);

  useEffect(() => {
    if (!displayedImage) return;
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [displayedImage, handleScroll]);

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    >
      {/* Layer 1: Mesh gradient base */}
      <div className="absolute inset-0 bg-background" />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: `radial-gradient(ellipse at 20% 0%, hsl(243 47% 20% / 0.6) 0%, transparent 50%),
                       radial-gradient(ellipse at 80% 100%, hsl(243 47% 15% / 0.4) 0%, transparent 50%),
                       linear-gradient(180deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)`,
        }}
      />

      {/* Layer 2: Companion image — CLEAR, unblurred, cinematic */}
      {displayedImage && (
        <>
          <div
            ref={lightRef}
            className="absolute inset-0 dark:hidden will-change-transform"
            style={{
              backgroundImage: `url(${displayedImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 25%',
              backgroundRepeat: 'no-repeat',
              opacity: imageLoaded ? 0.18 : 0,
              transition: 'opacity 600ms ease-out',
              transform: 'translateY(0) scale(1.08)',
            }}
          />
          <div
            ref={darkRef}
            className="absolute inset-0 hidden dark:block will-change-transform"
            style={{
              backgroundImage: `url(${displayedImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center 25%',
              backgroundRepeat: 'no-repeat',
              opacity: imageLoaded ? (isCustomBackdrop ? 0.92 : 0.7) : 0,
              transition: 'opacity 600ms ease-out',
              transform: 'translateY(0) scale(1.08)',
            }}
          />
        </>
      )}

      {/* Layer 2b: Empty-state heart mascot — warm branded visual when no companion */}
      {!hasCompanion && !displayedImage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="animate-[breathe_10s_ease-in-out_infinite]"
            style={{ opacity: 0.12 }}
          >
            <AnimatedGradientHeart size={320} id="backdrop-empty-heart" pulse />
          </div>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full blur-[120px] animate-[breathe_10s_ease-in-out_infinite]"
            style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)' }}
          />
          {/* Subtle film grain overlay */}
          <div
            className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
            }}
          />
        </div>
      )}

      {/* Layer 3: Gradient overlay for card readability */}
      {displayedImage && (
        <>
          <div
            className="absolute inset-0 dark:hidden"
            style={{
              background: 'linear-gradient(to bottom, rgba(247,242,237,0.55) 0%, rgba(247,242,237,0.25) 40%, rgba(247,242,237,0.25) 60%, rgba(247,242,237,0.65) 100%)',
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 600ms ease-out',
            }}
          />
          <div
            className="absolute inset-0 hidden dark:block"
            style={{
              background: isCustomBackdrop
                ? `linear-gradient(
                    to bottom,
                    rgba(0,0,0,0.65) 0%,
                    rgba(0,0,0,0.40) 30%,
                    rgba(0,0,0,0.35) 60%,
                    rgba(0,0,0,0.75) 100%
                  )`
                : `linear-gradient(
                    to bottom,
                    rgba(15, 18, 33, 0.55) 0%,
                    rgba(15, 18, 33, 0.30) 30%,
                    rgba(15, 18, 33, 0.25) 60%,
                    rgba(15, 18, 33, 0.65) 100%
                  )`,
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 600ms ease-out',
            }}
          />
        </>
      )}

      {/* Layer 4: Light-leak overlays */}
      <div
        className="absolute inset-0"
        style={{ background: ambient.leaks, opacity: displayedImage ? 0.1 : 0.22 }}
      />

      {/* Layer 5: Obsidian glass overlay */}
      <div className="absolute inset-0 dark-backdrop-overlay" />
    </div>
  );
}
