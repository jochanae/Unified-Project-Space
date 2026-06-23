/**
 * ParticleMesh — lightweight CSS/SVG ambient effect for landing/login surfaces.
 *
 * Previously a canvas-2d particle simulation; replaced with a static layered
 * gradient + dot pattern to remove runtime cost. Same export name.
 */
export function ParticleMesh() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 50% at 30% 30%, rgba(56,189,248,0.16), transparent 60%),
            radial-gradient(ellipse 50% 40% at 70% 70%, rgba(56,189,248,0.08), transparent 65%)
          `,
        }}
      />
      <svg className="absolute inset-0 w-full h-full opacity-50" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pm-dots-ui" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(125,211,252,0.3)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pm-dots-ui)" />
      </svg>
    </div>
  );
}
