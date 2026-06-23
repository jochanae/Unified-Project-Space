import { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setIsDismissed(false); // Reset dismiss state when back online
    };
    
    const handleOffline = () => {
      setIsOffline(true);
      setIsDismissed(false); // Show banner again when going offline
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || isDismissed) return null;

  return (
    <div 
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 px-4 py-2",
        "flex items-center justify-center gap-2 text-sm font-medium",
        "animate-in slide-in-from-top duration-300"
      )}
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>No internet connection</span>
      <span className="hidden sm:inline">•</span>
      <span className="hidden sm:inline text-amber-800">Using cached data</span>
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute right-2 p-1 rounded-full hover:bg-amber-600/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
