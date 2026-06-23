interface AnimatedGradientHeartProps {
  size?: number;
  className?: string;
  pulse?: boolean;
  id?: string;
}

export default function AnimatedGradientHeart({ size = 16, pulse = true, className = '', id }: AnimatedGradientHeartProps) {
  const gradientId = id || `grad-heart-${size}-${Math.random().toString(36).slice(2, 6)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`${pulse ? 'animate-[heartPulse_3s_ease-in-out_infinite]' : ''} ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%">
            <animate attributeName="stop-color" values="#B5707A;#E8547C;#8B5CF6;#B5707A" dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="50%">
            <animate attributeName="stop-color" values="#E8547C;#8B5CF6;#B5707A;#E8547C" dur="4s" repeatCount="indefinite" />
          </stop>
          <stop offset="100%">
            <animate attributeName="stop-color" values="#8B5CF6;#B5707A;#E8547C;#8B5CF6" dur="4s" repeatCount="indefinite" />
          </stop>
        </linearGradient>
      </defs>
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}
