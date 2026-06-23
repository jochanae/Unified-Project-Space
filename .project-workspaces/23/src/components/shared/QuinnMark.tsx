import { useId } from 'react';
import { cn } from '@/lib/utils';

interface QuinnMarkProps {
  className?: string;
  size?: number;
}

export function QuinnMark({ className, size = 24 }: QuinnMarkProps) {
  const gradientId = useId();
  const glowId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={gradientId} x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(var(--primary))" />
          <stop offset="0.62" stopColor="hsl(var(--primary))" stopOpacity="0.92" />
          <stop offset="1" stopColor="hsl(var(--gold))" />
        </linearGradient>
        <filter id={glowId} x="-35%" y="-35%" width="170%" height="170%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M12 2.75C13.02 7.1 15.52 9.72 20.05 10.9C15.52 12.08 13.02 14.7 12 19.25C10.98 14.7 8.48 12.08 3.95 10.9C8.48 9.72 10.98 7.1 12 2.75Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="1.9"
        strokeLinejoin="round"
        filter={`url(#${glowId})`}
      />
      <path
        d="M18.5 3.75V7.25M20.25 5.5H16.75M5.8 16.2V18.8M7.1 17.5H4.5"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}