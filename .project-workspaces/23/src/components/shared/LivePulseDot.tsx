/**
 * LivePulseDot
 * A small animated pulsing dot indicating an in-progress / live state.
 * Uses gold accent by default — matches the Studio brand accent.
 */
interface LivePulseDotProps {
  className?: string;
  color?: "gold" | "primary";
}

export function LivePulseDot({ className = "", color = "gold" }: LivePulseDotProps) {
  const ring = color === "gold" ? "bg-gold/40" : "bg-primary/40";
  const core = color === "gold" ? "bg-gold" : "bg-primary";
  return (
    <span className={`relative inline-flex h-2 w-2 shrink-0 ${className}`} aria-label="Live">
      <span className={`absolute inset-0 rounded-full ${ring} animate-ping`} />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${core}`} />
    </span>
  );
}
