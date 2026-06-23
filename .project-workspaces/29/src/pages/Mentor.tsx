import { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { QuinnChat } from "@/components/quinn/QuinnChat";
import { QuinnFAB } from "@/components/quinn/QuinnFAB";

export default function Mentor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isMinimized, setIsMinimized] = useState(false);
  
  // Resolve prompt from either router state or ?q= query param (GlobalSearchModal)
  const initialPrompt = useMemo(() => {
    const state = location.state as { prompt?: string; prefillMessage?: string; minimized?: boolean } | null;
    return state?.prompt ?? state?.prefillMessage ?? searchParams.get('q') ?? null;
  }, [location.state, searchParams]);

  // Check if we came from a navigation (like "analyze my journal")
  useEffect(() => {
    const state = location.state as { minimized?: boolean } | null;
    if (state?.minimized) {
      setIsMinimized(true);
    }
  }, [location.state]);

  const handleClose = () => {
    navigate(-1); // Go back to previous page
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  const handleExpand = () => {
    setIsMinimized(false);
  };

  // When minimized, show FAB
  if (isMinimized) {
    return (
      <QuinnFAB onClick={handleExpand} isPulsing />
    );
  }

  // Full-page immersive Quinn
  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <QuinnChat 
        onClose={handleClose} 
        onMinimize={handleMinimize}
        showCloseButton
        initialPrompt={initialPrompt}
      />
    </div>
  );
}
