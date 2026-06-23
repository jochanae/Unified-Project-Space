import { forwardRef } from 'react';
import type { AssetConfig } from '../../types';
import { VIBES } from '../../types';

interface Props {
  config: AssetConfig;
  qrDataUrl?: string;
}

/**
 * 1080x1080 social tile — Master Canvas.
 * Renders optional uploaded media as full-bleed background, then layers a
 * vibe-driven glassmorphism panel for headline + CTA.
 */
export const ObsidianTile = forwardRef<HTMLDivElement, Props>(({ config, qrDataUrl }, ref) => {
  const vibe = VIBES[config.vibe ?? 'obsidian'];
  const accent = config.brand.accent_hex || vibe.accent;
  const hasMedia = !!config.media_url;

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1080,
        position: 'relative',
        background: vibe.background,
        color: vibe.text,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Master Canvas: uploaded media (image or video frame) */}
      {hasMedia && config.media_type === 'video' ? (
        <video
          src={config.media_url}
          autoPlay
          loop
          muted
          playsInline
          crossOrigin="anonymous"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : hasMedia ? (
        <img
          src={config.media_url}
          alt=""
          crossOrigin="anonymous"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : null}

      {/* Vibe color wash on top of media for legibility */}
      {hasMedia && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, ${vibe.glass} 0%, ${vibe.glass} 60%, rgba(0,0,0,0.55) 100%)`,
          }}
        />
      )}

      {/* Accent radial glow (no-media only, to keep texture) */}
      {!hasMedia && (
        <>
          <div
            style={{
              position: 'absolute',
              top: -200,
              right: -200,
              width: 600,
              height: 600,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
              filter: 'blur(40px)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </>
      )}

      {/* Content layer with padding */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: 88,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 24px ${accent}`,
            }}
          />
          <span
            style={{
              fontSize: 22,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: vibe.eyebrow,
              fontWeight: 600,
            }}
          >
            {config.brand.brand_name || 'IntoIQ'}
          </span>
        </div>

        {/* Glass panel for headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
            padding: hasMedia ? '40px 44px' : 0,
            borderRadius: hasMedia ? 32 : 0,
            background: hasMedia ? vibe.glass : 'transparent',
            border: hasMedia ? `1px solid ${vibe.glassBorder}` : 'none',
            backdropFilter: hasMedia ? 'blur(20px)' : undefined,
          }}
        >
          <h1
            style={{
              fontSize: 96,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              margin: 0,
              color: vibe.text,
            }}
          >
            {config.headline}
          </h1>
          {config.subhead && (
            <p
              style={{
                fontSize: 32,
                lineHeight: 1.4,
                color: vibe.textMuted,
                margin: 0,
                maxWidth: 800,
              }}
            >
              {config.subhead}
            </p>
          )}
        </div>

        {/* Footer: CTA + QR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 32,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {config.cta && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '20px 36px',
                  borderRadius: 999,
                  background: accent,
                  color: vibe.ctaText,
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: '0.02em',
                  width: 'fit-content',
                  boxShadow: `0 12px 40px -8px ${accent}80`,
                }}
              >
                {config.cta}
              </div>
            )}
            {config.brand.tagline && (
              <span style={{ fontSize: 20, color: vibe.textMuted }}>{config.brand.tagline}</span>
            )}
          </div>
          {qrDataUrl && (
            <div
              style={{
                padding: 16,
                background: '#ffffff',
                borderRadius: 20,
                boxShadow: `0 0 40px ${accent}55`,
              }}
            >
              <img src={qrDataUrl} alt="QR" width={160} height={160} style={{ display: 'block' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
ObsidianTile.displayName = 'ObsidianTile';
