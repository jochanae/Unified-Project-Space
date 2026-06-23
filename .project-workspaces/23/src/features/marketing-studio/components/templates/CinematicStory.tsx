import { forwardRef } from 'react';
import type { AssetConfig } from '../../types';
import { VIBES } from '../../types';

interface Props {
  config: AssetConfig;
  qrDataUrl?: string;
}

/** 1080x1920 vertical IG/TikTok story — Master Canvas. */
export const CinematicStory = forwardRef<HTMLDivElement, Props>(({ config, qrDataUrl }, ref) => {
  const vibe = VIBES[config.vibe ?? 'obsidian'];
  const accent = config.brand.accent_hex || vibe.accent;
  const hasMedia = !!config.media_url;

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        height: 1920,
        position: 'relative',
        background: vibe.background,
        color: vibe.text,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
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

      {hasMedia && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, ${vibe.glass} 50%, rgba(0,0,0,0.7) 100%)`,
          }}
        />
      )}

      {!hasMedia && (
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '-30%',
            width: 800,
            height: 800,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${accent}26 0%, transparent 70%)`,
            filter: 'blur(60px)',
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          padding: 100,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: accent,
              boxShadow: `0 0 28px ${accent}`,
            }}
          />
          <span
            style={{
              fontSize: 28,
              letterSpacing: '0.36em',
              textTransform: 'uppercase',
              color: vibe.eyebrow,
              fontWeight: 700,
            }}
          >
            {config.brand.brand_name || 'IntoIQ'}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 36,
            padding: hasMedia ? '44px 48px' : 0,
            borderRadius: hasMedia ? 36 : 0,
            background: hasMedia ? vibe.glass : 'transparent',
            border: hasMedia ? `1px solid ${vibe.glassBorder}` : 'none',
            backdropFilter: hasMedia ? 'blur(22px)' : undefined,
          }}
        >
          <h1
            style={{
              fontSize: 132,
              lineHeight: 1,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              margin: 0,
              color: vibe.text,
            }}
          >
            {config.headline}
          </h1>
          {config.subhead && (
            <p style={{ fontSize: 38, lineHeight: 1.4, color: vibe.textMuted, margin: 0 }}>
              {config.subhead}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {config.cta && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '22px 40px',
                  borderRadius: 999,
                  background: accent,
                  color: vibe.ctaText,
                  fontWeight: 800,
                  fontSize: 30,
                  width: 'fit-content',
                  boxShadow: `0 14px 40px -10px ${accent}80`,
                }}
              >
                {config.cta}
              </div>
            )}
            {config.brand.tagline && (
              <span style={{ fontSize: 22, color: vibe.textMuted }}>{config.brand.tagline}</span>
            )}
          </div>
          {qrDataUrl && (
            <div style={{ padding: 18, background: '#ffffff', borderRadius: 22 }}>
              <img src={qrDataUrl} alt="QR" width={180} height={180} style={{ display: 'block' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
CinematicStory.displayName = 'CinematicStory';
