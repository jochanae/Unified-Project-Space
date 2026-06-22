/**
 * composerAura — injects a single CSS rule set that turns any element
 * carrying the class `atlas-composer-live` into an animated border surface.
 *
 * The animation lives entirely on the element's own `::before` pseudo-element.
 * No wrapper divs, no extra DOM nodes, no separate component.
 *
 * The glow color and motion character are driven by CSS custom properties set
 * inline on the element:
 *
 *   --composer-aura-color     the peak node color
 *   --composer-aura-trail     the fading tail color
 *   --composer-aura-duration  animation cycle length
 *   --composer-aura-keyframe  which @keyframes name to use
 */

let injected = false;

export function ensureComposerAuraCSS(): void {
  if (injected || typeof document === "undefined") return;
  injected = true;

  const s = document.createElement("style");
  s.dataset.atlasComposerAura = "1";
  s.textContent = `
    @property --atlas-aura-angle {
      syntax: '<angle>';
      initial-value: 0deg;
      inherits: false;
    }

    @keyframes atlas-aura-travel {
      to { --atlas-aura-angle: 360deg; }
    }

    /* Think / contemplative: eases in-and-out rather than steady linear */
    @keyframes atlas-aura-breathe {
      0%   { --atlas-aura-angle: 0deg; }
      25%  { --atlas-aura-angle: 60deg; }
      50%  { --atlas-aura-angle: 180deg; }
      75%  { --atlas-aura-angle: 300deg; }
      100% { --atlas-aura-angle: 360deg; }
    }

    /* Decide: pauses briefly at each corner before moving on */
    @keyframes atlas-aura-corners {
      0%   { --atlas-aura-angle: 0deg; }
      18%  { --atlas-aura-angle: 90deg; }
      27%  { --atlas-aura-angle: 90deg; }
      45%  { --atlas-aura-angle: 180deg; }
      54%  { --atlas-aura-angle: 180deg; }
      72%  { --atlas-aura-angle: 270deg; }
      81%  { --atlas-aura-angle: 270deg; }
      99%  { --atlas-aura-angle: 360deg; }
      100% { --atlas-aura-angle: 360deg; }
    }

    /*
     * The element itself becomes the animation surface.
     * ::before paints a single-pixel ring via the mask-composite trick:
     *   mask = (full box) XOR (content-box) = padding ring only.
     * The rotating conic-gradient creates the traveling energy node.
     */
    .atlas-composer-live {
      position: relative;
      isolation: isolate;
    }

    .atlas-composer-live::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      padding: 1px;
      background: conic-gradient(
        from var(--atlas-aura-angle, 0deg),
        transparent 0deg,
        transparent 328deg,
        var(--composer-aura-trail, rgba(6,182,212,0.14)) 344deg,
        var(--composer-aura-color, rgba(6,182,212,0.82)) 354deg,
        var(--composer-aura-trail, rgba(6,182,212,0.14)) 360deg
      );
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      mask-composite: exclude;
      animation:
        var(--composer-aura-keyframe, atlas-aura-travel)
        var(--composer-aura-duration, 4.2s)
        linear
        infinite;
      pointer-events: none;
      z-index: 0;
    }
  `;
  document.head.appendChild(s);
}

export type AuraContext = "axiom" | "build" | "think" | "decide";

/** CSS variable values for each context mode, keyed by light/dark theme. */
export function getAuraVars(context: AuraContext, isParchment = false): Record<string, string> {
  if (isParchment) {
    return {
      "--composer-aura-color":   "rgba(161,62,5,0.62)",
      "--composer-aura-trail":   "rgba(161,62,5,0.12)",
      "--composer-aura-duration":"5s",
      "--composer-aura-keyframe":"atlas-aura-travel",
    };
  }
  switch (context) {
    case "build":
      return {
        "--composer-aura-color":   "rgba(96,165,250,0.82)",
        "--composer-aura-trail":   "rgba(96,165,250,0.16)",
        "--composer-aura-duration":"2.8s",
        "--composer-aura-keyframe":"atlas-aura-travel",
      };
    case "think":
      return {
        "--composer-aura-color":   "rgba(167,139,250,0.82)",
        "--composer-aura-trail":   "rgba(139,92,246,0.14)",
        "--composer-aura-duration":"8s",
        "--composer-aura-keyframe":"atlas-aura-breathe",
      };
    case "decide":
      return {
        "--composer-aura-color":   "rgba(212,175,55,0.82)",
        "--composer-aura-trail":   "rgba(212,175,55,0.14)",
        "--composer-aura-duration":"5.2s",
        "--composer-aura-keyframe":"atlas-aura-corners",
      };
    default: // axiom / global
      return {
        "--composer-aura-color":   "rgba(6,182,212,0.82)",
        "--composer-aura-trail":   "rgba(6,182,212,0.14)",
        "--composer-aura-duration":"4.2s",
        "--composer-aura-keyframe":"atlas-aura-travel",
      };
  }
}
