import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuinnFABProps {
  onClick: () => void;
  isPulsing?: boolean;
  className?: string;
}

export function QuinnFAB({ onClick, isPulsing = false, className }: QuinnFABProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 right-6 z-[90]",
        "flex items-center justify-center",
        "h-14 w-14 rounded-full",
        "bg-primary text-primary-foreground",
        "shadow-lg shadow-primary/25",
        "hover:scale-105 active:scale-95",
        "transition-all duration-200",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
        isPulsing && "animate-pulse",
        className
      )}
      title="Open Quinn"
    >
      <Sparkles className="h-6 w-6" />
      {isPulsing && (
        <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-30" />
      )}
    </button>
  );
}
