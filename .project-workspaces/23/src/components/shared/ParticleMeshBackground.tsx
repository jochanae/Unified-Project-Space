/**
 * ParticleMeshBackground — CSS-only ambient background.
 *
 * Replaces the previous three.js/@react-three/fiber implementation (~600KB gz).
 * Same exported API: <ParticleMeshBackground theme="cinematic|editorial|minimal" />.
 * Renders a layered radial gradient + subtle drifting noise dots via SVG/CSS
 * so the visual ambience is preserved with zero WebGL cost.
 */

interface ThemeConfig {
  accent: string;        // primary glow color (hsl/hex)
  accentSoft: string;    // softer halo
  dotColor: string;      // rgba for noise dots
  bloom: boolean;
}

const THEME_CONFIGS: Record<string, ThemeConfig> = {
  cinematic: {
    accent: 'rgba(56, 189, 248, 0.18)',
    accentSoft: 'rgba(56, 189, 248, 0.08)',
    dotColor: 'rgba(125, 211, 252, 0.35)',
    bloom: true,
  },
  editorial: {
    accent: 'rgba(212, 164, 76, 0.14)',
    accentSoft: 'rgba(212, 164, 76, 0.06)',
    dotColor: 'rgba(212, 164, 76, 0.25)',
    bloom: false,
  },
  minimal: {
    accent: 'rgba(156, 163, 175, 0.10)',
    accentSoft: 'rgba(156, 163, 175, 0.04)',
    dotColor: 'rgba(156, 163, 175, 0.18)',
    bloom: false,
  },
};

export function ParticleMeshBackground({ theme = 'cinematic' }: { theme?: string }) {
  const config = THEME_CONFIGS[theme] || THEME_CONFIGS.cinematic;

  return (
    <div
      className={`fixed inset-0 z-0 overflow-hidden ${config.bloom ? 'animate-bloom-pulse' : ''}`}
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      {/* Layered ambient glows */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 20% 20%, ${config.accent}, transparent 60%),
            radial-gradient(ellipse 50% 40% at 80% 70%, ${config.accentSoft}, transparent 65%),
            radial-gradient(ellipse 40% 30% at 50% 100%, ${config.accentSoft}, transparent 70%)
          `,
        }}
      />
      {/* Subtle dot texture (SVG, no JS) */}
      <svg className="absolute inset-0 w-full h-full opacity-50" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`pm-dots-${theme}`} x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill={config.dotColor} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#pm-dots-${theme})`} />
      </svg>
    </div>
  );
}
