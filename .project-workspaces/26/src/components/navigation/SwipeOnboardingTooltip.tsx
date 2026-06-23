import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, ArrowUpDown, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const DISMISSED_KEY = 'coinsbloom_swipe_onboarding_dismissed';

export function SwipeOnboardingTooltip({ arrowPosition, onVisibilityChange }: { arrowPosition: number; onVisibilityChange?: (visible: boolean) => void }) {
  const [visible, setVisible] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const checkDismissed = async () => {
      // Check localStorage first (fast)
      if (localStorage.getItem(DISMISSED_KEY)) return;

      // Check DB for logged-in users
      if (user) {
        const { data } = await supabase.from('profiles').select('nav_tips_dismissed').eq('id', user.id).single();
        if (data?.nav_tips_dismissed) {
          localStorage.setItem(DISMISSED_KEY, 'true');
          return;
        }
      }

      // Not dismissed — show after delay
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    };
    checkDismissed();
  }, [user]);

  useEffect(() => {
    onVisibilityChange?.(visible);
  }, [visible, onVisibilityChange]);

  const dismiss = async () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
    // Persist to DB so it stays dismissed across devices/sessions
    if (user) {
      await supabase.from('profiles').update({ nav_tips_dismissed: true }).eq('id', user.id);
    }
  };

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[70] w-[min(320px,90vw)] animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ bottom: `${arrowPosition + 52}px` }}
    >
      <div className="bg-card border border-border rounded-xl shadow-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-sm text-foreground">Navigation Tips ✨</h4>
          <button onClick={dismiss} className="text-muted-foreground hover:text-foreground p-0.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex items-center shrink-0">
              <ChevronLeft className="h-3.5 w-3.5" />
              <ChevronRight className="h-3.5 w-3.5" />
            </div>
            <span>Swipe or tap arrows to switch pages</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
            <span>Drag the arrows up or down to reposition them</span>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-3.5 w-3.5 shrink-0" />
            <span>Disable arrows in Settings → Dashboard Appearance</span>
          </div>
        </div>

        <Button onClick={dismiss} size="sm" variant="outline" className="w-full text-xs h-7">
          Got it!
        </Button>
      </div>
      {/* Arrow pointer toward the navigation arrows */}
      <div className="flex justify-center">
        <div className="w-3 h-3 bg-card border-b border-r border-border rotate-45 -mt-1.5" />
      </div>
    </div>,
    document.body
  );
}
