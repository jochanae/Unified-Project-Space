import { forwardRef } from 'react';
import type { AssetConfig } from '../../types';
import { VIBES } from '../../types';

interface Props {
  config: AssetConfig;
  qrDataUrl?: string;
}

/**
 * 1240x1754 (8.5x11 @ ~150dpi) Master Canvas flyer.
 * Uploaded media renders as a top-half hero band; copy + CTA live in a glass panel below.
 */
export const GoldFlyer = forwardRef<HTMLDivElement, Props>(({ config, qrDataUrl }, ref) => {
  const vibe = VIBES[config.vibe ?? 'obsidian'];
  const accent = config.brand.accent_hex || vibe.accent;
  const hasMedia = !!config.media_url;

  return (
    <div
      ref={ref}
      style={{
        width: 1240,
        height: 1754,
        position: 'relative',
        background: vibe.background,
        color: vibe.text,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Hero media band (top 55%) */}
      {hasMedia && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', overflow: 'hidden' }}>
          {config.media_type === 'video' ? (
            <video
              src={config.media_url}
              autoPlay
              loop
              muted
              playsInline
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <img
              src={config.media_url}
              alt=""
              crossOrigin="anonymous"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, transparent 50%, ${vibe.background} 100%)`,
            }}
          />
        </div>
      )}

      {/* Decorative frame (no-media only) */}
      {!hasMedia && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 40,
              border: `1.5px solid ${accent}55`,
              borderRadius: 8,
              pointerEvents: 'none',
            }}
          />
          {[
            { top: 30, left: 30 },
            { top: 30, right: 30 },
            { bottom: 30, left: 30 },
            { bottom: 30, right: 30 },
          ].map((pos, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                ...pos,
                width: 32,
                height: 32,
                background: accent,
                borderRadius: 4,
                opacity: 0.85,
              }}
            />
          ))}
        </>
      )}

      {/* Content */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: 100,
          paddingTop: hasMedia ? 880 : 100,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* Eyebrow */}
        <div
          style={{
            fontSize: 24,
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            color: vibe.eyebrow,
            fontWeight: 700,
            marginBottom: 36,
          }}
        >
          {config.brand.brand_name || 'IntoIQ'}
        </div>

        {/* Glass panel wrapping headline + subhead when media is present */}
        <div
          style={{
            padding: hasMedia ? '40px 44px' : 0,
            borderRadius: hasMedia ? 28 : 0,
            background: hasMedia ? vibe.glass : 'transparent',
            border: hasMedia ? `1px solid ${vibe.glassBorder}` : 'none',
            backdropFilter: hasMedia ? 'blur(18px)' : undefined,
            marginBottom: 40,
          }}
        >
          <h1
            style={{
              fontSize: 112,
              lineHeight: 1.02,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              margin: 0,
              color: vibe.text,
              marginBottom: 32,
            }}
          >
            {config.headline}
          </h1>
          <div style={{ width: 120, height: 4, background: accent, marginBottom: 32 }} />
          {config.subhead && (
            <p
              style={{
                fontSize: 34,
                lineHeight: 1.5,
                color: vibe.textMuted,
                margin: 0,
                maxWidth: 900,
              }}
            >
              {config.subhead}
            </p>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Footer band */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 48,
            paddingTop: 40,
            borderTop: `1px solid ${accent}33`,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
            {config.cta && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '24px 44px',
                  borderRadius: 999,
                  background: accent,
                  color: vibe.ctaText,
                  fontWeight: 800,
                  fontSize: 32,
                  letterSpacing: '0.02em',
                  width: 'fit-content',
                  boxShadow: `0 14px 40px -10px ${accent}80`,
                }}
              >
                {config.cta}
              </div>
            )}
            {config.url && (
              <span style={{ fontSize: 22, color: vibe.textMuted, wordBreak: 'break-all' }}>
                {config.url}
              </span>
            )}
            {config.brand.tagline && (
              <span style={{ fontSize: 22, color: vibe.textMuted, opacity: 0.8 }}>
                {config.brand.tagline}
              </span>
            )}
          </div>
          {qrDataUrl && (
            <div
              style={{
                padding: 20,
                background: '#ffffff',
                borderRadius: 24,
                boxShadow: `0 0 50px ${accent}55`,
              }}
            >
              <img src={qrDataUrl} alt="QR" width={220} height={220} style={{ display: 'block' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
GoldFlyer.displayName = 'GoldFlyer';
