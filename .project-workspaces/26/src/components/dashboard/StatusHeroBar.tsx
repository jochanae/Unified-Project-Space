import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, RefreshCw, CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDashboardRefresh } from "@/hooks/useDashboardRefresh";
import { useConnectionStatus } from "@/hooks/useConnectionStatus";
import { useOfflineSyncContext } from "@/contexts/OfflineSyncContext";
import { usePartnerBranding } from "@/contexts/PartnerBrandingContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";

interface StatusHeroBarProps {
  onSubscriptionClick?: () => void;
  planName?: string;
  userName?: string;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Night Owl Mode";
}

export function StatusHeroBar({ onSubscriptionClick, planName, userName }: StatusHeroBarProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const { refreshAllData, isRefreshing } = useDashboardRefresh();
  const { isOnline, refresh: refreshStatus } = useConnectionStatus();
  const { pendingCount, isSyncing, syncNow } = useOfflineSyncContext();
  const { isPartnerBranded } = usePartnerBranding();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (date: Date) => {
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr} • ${timeStr}`;
  };

  const handleRefresh = async () => {
    await refreshAllData();
    refreshStatus();
    if (pendingCount > 0 && isOnline) await syncNow();
  };

  return (
    <TooltipProvider>
      <div className="relative overflow-hidden bg-gradient-to-r from-[hsl(250,70%,55%)] via-[hsl(280,65%,55%)] to-[hsl(330,75%,58%)] text-white px-3 sm:px-4 md:px-6 py-5 sm:py-6 shadow-xl shadow-purple-500/20 border-b border-white/10">
        {/* Decorative orbs */}
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-[hsl(320,70%,70%)]/30 blur-xl" />
        <div className="absolute left-1/3 -top-6 w-24 h-24 rounded-full bg-[hsl(260,60%,75%)]/40 blur-xl" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-2">
            {/* Left: Active indicator + Greeting */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="min-w-0">
                {userName ? (
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-white leading-tight">
                    {getTimeGreeting()},{" "}
                    <span className="text-white font-extrabold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                      {userName}
                    </span>
                  </h1>
                ) : (
                  <h1 className="text-base sm:text-lg md:text-xl font-bold text-white">Your Financial Dashboard</h1>
                )}
                <p className="text-[11px] sm:text-xs text-white/70 mt-0.5">{formatDate(currentTime)}</p>
              </div>
            </div>

            {/* Right: Ghost badge + actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Frosted glass subscription badge */}
              {onSubscriptionClick && planName && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onSubscriptionClick}
                      className="flex items-center gap-1.5 h-6 sm:h-7 rounded-full border border-white/25 hover:border-white/40 px-2.5 sm:px-3 transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.12)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        boxShadow: '0 0 12px rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="text-[10px] text-white/70">✦</span>
                      <span className="text-[9px] sm:text-[10px] font-semibold text-white/90 whitespace-nowrap uppercase" style={{ letterSpacing: '0.05em' }}>
                        {planName.replace(/\s*plan\s*/i, '')}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>View subscription</TooltipContent>
                </Tooltip>
              )}

              {!isPartnerBranded && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="icon" variant="ghost"
                      onClick={() => navigate("/support")}
                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-white/10"
                    >
                      <Heart className="h-3.5 w-3.5 text-white/40" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Support</TooltipContent>
                </Tooltip>
              )}
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" variant="ghost"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-white/10 disabled:opacity-70"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 text-white/40 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRefreshing ? "Syncing..." : "Refresh"}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Offline/pending — only show when there's something to report */}
          {(!isOnline || pendingCount > 0) && (
            <div className="flex items-center gap-3 mt-2 text-[9px] font-medium text-white/30">
              {!isOnline && <span className="text-red-300/60">Offline — using cached data</span>}
              {pendingCount > 0 && (
                <span className="flex items-center gap-1 text-amber-300/60">
                  <CloudOff className={`w-2.5 h-2.5 ${isSyncing ? 'animate-pulse' : ''}`} />
                  {isSyncing ? 'Syncing' : `${pendingCount} pending`}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}