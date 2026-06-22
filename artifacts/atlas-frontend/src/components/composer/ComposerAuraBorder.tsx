import { useEffect } from "react";

export type AuraMode = "axiom" | "build" | "think" | "decide";

interface ComposerAuraBorderProps {
  mode?: AuraMode;
  borderRadius?: number;
}

const PALETTE: Record<AuraMode, { node: string; trail: string }> = {
  axiom:  { node: "rgba(6,182,212,0.90)",   trail: "rgba(6,182,212,0.22)" },
  build:  { node: "rgba(96,165,250,0.90)",  trail: "rgba(96,165,250,0.20)" },
  think:  { node: "rgba(167,139,250,0.90)", trail: "rgba(139,92,246,0.18)" },
  decide: { node: "rgba(212,175,55,0.90)",  trail: "rgba(212,175,55,0.18)" },
};

// Duration (ms) and keyframe name per mode
const MOTION: Record<AuraMode, { duration: number; keyframe: string }> = {
  axiom:  { duration: 4200, keyframe: "atlas-aura-linear" },
  build:  { duration: 2800, keyframe: "atlas-aura-linear" },
  think:  { duration: 8000, keyframe: "atlas-aura-breathe" },
  decide: { duration: 5200, keyframe: "atlas-aura-corners" },
};

const CSS = `
@keyframes atlas-aura-linear {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes atlas-aura-breathe {
  0%   { transform: rotate(0deg);   }
  40%  { transform: rotate(140deg); }
  60%  { transform: rotate(200deg); }
  100% { transform: rotate(360deg); }
}
@keyframes atlas-aura-corners {
  0%   { transform: rotate(0deg);   }
  18%  { transform: rotate(90deg);  }
  27%  { transform: rotate(90deg);  }
  45%  { transform: rotate(180deg); }
  54%  { transform: rotate(180deg); }
  72%  { transform: rotate(270deg); }
  81%  { transform: rotate(270deg); }
  99%  { transform: rotate(360deg); }
  100% { transform: rotate(360deg); }
}
`;

let injected = false;
function ensureCSS() {
  if (injected || typeof document === "undefined") return;
  const s = document.createElement("style");
  s.dataset.atlasAura = "1";
  s.textContent = CSS;
  document.head.appendChild(s);
  injected = true;
}

/**
 * Animated border aura for the composer.
 *
 * Place this as the FIRST child inside a `position: relative` wrapper div that
 * has the same `borderRadius` as the composer box sitting after it. The wrapper
 * naturally acts as the mask — the composer box covers the interior, leaving
 * only the 1–2 px ring visible where the rotating energy node travels.
 *
 * Usage:
 *   <div style={{ position: "relative", borderRadius: 16 }}>
 *     <ComposerAuraBorder mode="axiom" />
 *     <div style={{ position: "relative", borderRadius: 16, background: "...", ... }}>
 *       ...composer content...
 *     </div>
 *   </div>
 */
export function ComposerAuraBorder({ mode = "axiom", borderRadius = 16 }: ComposerAuraBorderProps) {
  useEffect(() => { ensureCSS(); }, []);

  const { node, trail } = PALETTE[mode];
  const { duration, keyframe } = MOTION[mode];

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: -1.5,
        borderRadius: borderRadius + 1.5,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "-70%",
          background: `conic-gradient(
            from 0deg,
            transparent 0deg,
            transparent 330deg,
            ${trail}  345deg,
            ${node}   356deg,
            ${trail}  362deg,
            transparent 368deg,
            transparent 360deg
          )`,
          animation: `${keyframe} ${duration}ms linear infinite`,
          willChange: "transform",
        }}
      />
    </div>
  );
}
