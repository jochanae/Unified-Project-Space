/**
 * CSS-only glowing orb for Studio empty state.
 * Replaces the old 3D silhouette figure.
 */

interface GlowingOrbProps {
  companionName?: string;
  isCreationMode?: boolean;
}

export default function GlowingOrb({ companionName, isCreationMode }: GlowingOrbProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Orb container */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
        {/* Outer glow */}
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(18 85% 58% / 0.15), hsl(262 55% 62% / 0.08), transparent 70%)',
            filter: 'blur(30px)',
            animation: 'orb-pulse 3s ease-in-out infinite',
          }}
        />
        {/* Main orb */}
        <div
          className="relative h-[200px] w-[200px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 40% 35%, hsl(18 85% 58%), hsl(350 60% 55%) 50%, hsl(262 55% 62%) 100%)',
            boxShadow: `
              0 0 40px 10px hsl(18 85% 58% / 0.25),
              0 0 80px 20px hsl(262 55% 62% / 0.15),
              0 0 120px 40px hsl(18 85% 58% / 0.08),
              inset 0 -20px 40px -10px hsl(262 55% 62% / 0.3)
            `,
            animation: 'orb-pulse 3s ease-in-out infinite, orb-hue 8s linear infinite',
          }}
        >
          {/* Inner highlight */}
          <div
            className="absolute rounded-full"
            style={{
              top: '15%',
              left: '25%',
              width: '40%',
              height: '30%',
              background: 'radial-gradient(ellipse, hsl(0 0% 100% / 0.2), transparent)',
              filter: 'blur(8px)',
            }}
          />
        </div>
      </div>

      {/* Name or placeholder text */}
      {companionName ? (
        <p className="font-display text-sm font-bold text-foreground">{companionName}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground/60 italic">Your companion is taking shape…</p>
      )}
      {isCreationMode && (
        <p className="text-[10px] text-muted-foreground/50">Complete the options below to bring them to life ✨</p>
      )}

      {/* CSS keyframes injected via style tag */}
      <style>{`
        @keyframes orb-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes orb-hue {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
