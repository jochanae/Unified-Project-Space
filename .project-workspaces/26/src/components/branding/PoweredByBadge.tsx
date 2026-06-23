import { Sparkles } from 'lucide-react';

interface PoweredByBadgeProps {
  className?: string;
  variant?: 'light' | 'dark';
  size?: 'xs' | 'sm' | 'md';
}

export function PoweredByBadge({ className = '', variant = 'light', size = 'sm' }: PoweredByBadgeProps) {
  // Muted gray for professional white-label appearance
  const textColor = 'text-muted-foreground/70';
  const brandColor = 'text-muted-foreground';
  
  const sizeClasses = {
    xs: 'text-[8px] gap-0.5',
    sm: 'text-[10px] gap-1',
    md: 'text-xs gap-1.5'
  };

  const iconSizes = {
    xs: 'h-2 w-2',
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3'
  };
  
  return (
    <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
      <span className={textColor}>Powered by</span>
      <a 
        href="https://coinsbloom.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className={`font-semibold ${brandColor} hover:opacity-80 transition-opacity flex items-center gap-0.5`}
      >
        <Sparkles className={iconSizes[size]} />
        CoinsBloom
      </a>
    </div>
  );
}
