interface QuinnIconProps {
  className?: string;
  size?: number;
}

export function QuinnIcon({ className = "", size = 24 }: QuinnIconProps) {
  const gradientId = `quinn-gradient-${size}`;
  const glowId = `quinn-glow-${size}`;
  const isLarge = size >= 40;
  const fontSize = isLarge ? 16 : 13;
  const yPosition = isLarge ? 16 : 15;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(174, 84%, 45%)" />
          <stop offset="100%" stopColor="hsl(174, 84%, 35%)" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M22 11C22 16.52 17.52 21 12 21C10.18 21 8.48 20.47 7.02 19.55L2 21L3.45 16C2.53 14.52 2 12.82 2 11C2 5.48 6.48 1 12 1C17.52 1 22 5.48 22 11Z"
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
      />
      <text
        x="12"
        y={yPosition}
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="900"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
        style={{ letterSpacing: '-0.5px' }}
      >
        Q
      </text>
    </svg>
  );
}
