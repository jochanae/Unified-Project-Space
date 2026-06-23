interface QuinnIconProps {
  variant?: "chat-q" | "chat-sparkle";
  className?: string;
  size?: number;
}

export function QuinnIcon({ variant = "chat-q", className = "", size = 24 }: QuinnIconProps) {
  const gradientId = `quinn-gradient-${variant}`;
  const glowId = `quinn-glow-${variant}`;
  
  if (variant === "chat-sparkle") {
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
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Chat bubble shape */}
        <path
          d="M20 11.5C20 15.64 16.64 19 12.5 19C11.13 19 9.85 18.65 8.73 18.04L5 19L5.96 15.27C5.35 14.15 5 12.87 5 11.5C5 7.36 8.36 4 12.5 4C16.64 4 20 7.36 20 11.5Z"
          fill={`url(#${gradientId})`}
          filter={`url(#${glowId})`}
        />
        {/* Sparkle/asterisk in center */}
        <g stroke="white" strokeWidth="1.5" strokeLinecap="round">
          <line x1="12.5" y1="8" x2="12.5" y2="15" />
          <line x1="9" y1="11.5" x2="16" y2="11.5" />
          <line x1="10" y1="9" x2="15" y2="14" />
          <line x1="15" y1="9" x2="10" y2="14" />
        </g>
      </svg>
    );
  }

  // Default: chat-q variant - bubble with large Q inside
  // When size is large (footer), scale up internal elements proportionally
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
      {/* Chat bubble shape - larger and more prominent */}
      <path
        d="M22 11C22 16.52 17.52 21 12 21C10.18 21 8.48 20.47 7.02 19.55L2 21L3.45 16C2.53 14.52 2 12.82 2 11C2 5.48 6.48 1 12 1C17.52 1 22 5.48 22 11Z"
        fill={`url(#${gradientId})`}
        filter={`url(#${glowId})`}
      />
      {/* Letter Q - extra large, bold, centered in bubble */}
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
