import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, Hammer, Layers, BarChart3, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QuinnHUD } from './QuinnHUD';
import { QuinnMark } from './QuinnMark';
import { useUnreadLeads } from '@/hooks/use-unread-leads';
import { QUINN_OPEN_EVENT } from '@/features/quinn/lib/quinn-context';

const BAR_HEIGHT = 56;
const NOTCH_RADIUS = 38;

interface FooterSlot {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
}

function getSlots(): { left: FooterSlot[]; right: FooterSlot[] } {
  return {
    left: [
      { label: 'Build',   icon: Hammer, action: '/workspace' },
      { label: 'Studio',  icon: Wand2,  action: '/studio' },
    ],
    right: [
      { label: 'Analytics', icon: BarChart3, action: '/analytics' },
      { label: 'Projects',  icon: Layers,    action: '/projects' },
    ],
  };
}

/**
 * Global MarQ-anchored footer for all authenticated pages EXCEPT /workspace
 * (which uses the full CinematicDock with build-stream integration).
 * Now integrates the QuinnHUD overlay instead of inline chat.
 */
export function GlobalQuinnFooter() {
  const navigate = useNavigate();
  const location = useLocation();

  const [hudOpen, setHudOpen] = useState(false);
  const [prefillPrompt, setPrefillPrompt] = useState<string | undefined>(undefined);
  const isWorkspace = location.pathname.startsWith('/workspace');
  const { count: unreadLeads } = useUnreadLeads();

  // Close HUD on route change
  useEffect(() => {
    setHudOpen(false);
    setPrefillPrompt(undefined);
  }, [location.pathname]);

  // External "open MarQ" requests (e.g. Geo Insights "Ask MarQ" button)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { prefillPrompt?: string } | undefined;
      setPrefillPrompt(detail?.prefillPrompt);
      setHudOpen(true);
    };
    window.addEventListener(QUINN_OPEN_EVENT, handler);
    return () => window.removeEventListener(QUINN_OPEN_EVENT, handler);
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    if (isWorkspace) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'j' || e.key === 'k') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setHudOpen(o => !o);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isWorkspace]);

  // Don't render on /workspace — CinematicDock handles that
  if (isWorkspace) return null;

  const { left, right } = getSlots();

  const handleSlot = (slot: FooterSlot) => {
    if (slot.action.startsWith('scroll:')) {
      const selector = slot.action.replace('scroll:', '');
      const el = document.querySelector(selector);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate(slot.action);
    }
  };

  return (
    <>
      {/* HUD Overlay */}
      <QuinnHUD open={hudOpen} onClose={() => { setHudOpen(false); setPrefillPrompt(undefined); }} prefillPrompt={prefillPrompt} />

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        {/* MarQ button */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-[51] flex flex-col items-center pointer-events-auto"
          style={{ bottom: BAR_HEIGHT - 28 }}
        >
          <div className={cn(
            'absolute inset-0 m-auto h-[66px] w-[66px] rounded-full',
            'bg-gradient-to-br from-primary/25 to-primary/5',
            'blur-lg opacity-50',
          )} />
          <button
            onClick={() => setHudOpen(o => !o)}
            className={cn(
              'relative flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full overflow-hidden',
              'border border-primary/35 shadow-[0_10px_32px_hsl(var(--primary)/0.22)]',
              'active:scale-95 transition-all duration-300',
              !hudOpen && 'animate-[quinnPulseRing_3s_ease-in-out_infinite]',
            )}
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.22), hsl(var(--background) / 0.82))',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              ...(hudOpen ? {
                boxShadow: '0 0 0 2.5px hsl(var(--primary) / 0.5), 0 0 30px hsl(var(--primary) / 0.3), 0 4px 16px -4px hsl(var(--primary) / 0.4)',
              } : {}),
            }}
            title="Open Intelligence Layer (⌘J)"
          >
            {hudOpen ? (
              <ChevronDown className="h-5 w-5 text-primary" />
            ) : (
              <>
                <QuinnMark size={20} />
                <span className="text-[7px] font-bold uppercase tracking-[0.08em] leading-none text-primary">
                  MarQ
                </span>
              </>
            )}
            {!hudOpen && unreadLeads > 0 && (
              <span
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shadow-[0_0_10px_hsl(var(--primary)/0.6)] animate-pulse"
                aria-label={`${unreadLeads} unread leads`}
              >
                {unreadLeads > 9 ? '9+' : unreadLeads}
              </span>
            )}
          </button>
        </div>

        {/* Dock bar */}
        <div className="relative safe-area-bottom pointer-events-auto">
          <div
            className={cn(
              'bg-background/60 backdrop-blur-2xl border-t border-border/20',
              'shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.12)]',
            )}
            style={{
              height: BAR_HEIGHT,
              WebkitMaskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0px, transparent ${NOTCH_RADIUS - 2}px, black ${NOTCH_RADIUS - 1}px)`,
              maskImage: `radial-gradient(circle ${NOTCH_RADIUS}px at 50% 0px, transparent ${NOTCH_RADIUS - 2}px, black ${NOTCH_RADIUS - 1}px)`,
            }}
          >
            <div className="flex items-center h-full px-4 max-w-lg mx-auto relative">
              {/* Left slots */}
              <div className="flex items-center justify-evenly flex-1">
              {left.map(slot => (
                  <button
                    key={slot.label}
                    onClick={() => handleSlot(slot)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-3 py-2 rounded-xl',
                      'text-muted-foreground/60 hover:text-foreground',
                      'transition-colors duration-200',
                      location.pathname === slot.action && 'text-gold drop-shadow-[0_0_6px_hsl(var(--gold)/0.5)]',
                    )}
                  >
                    <slot.icon className="h-5 w-5" />
                    <span className="text-[9px] font-medium tracking-wide">{slot.label}</span>
                  </button>
                ))}
              </div>

              {/* Center spacer */}
              <div style={{ width: NOTCH_RADIUS * 2 + 8 }} className="shrink-0" />

              {/* Right slots */}
              <div className="flex items-center justify-evenly flex-1">
              {right.map(slot => (
                  <button
                    key={slot.label}
                    onClick={() => handleSlot(slot)}
                    className={cn(
                      'flex flex-col items-center gap-1 px-3 py-2 rounded-xl',
                      'text-muted-foreground/60 hover:text-foreground',
                      'transition-colors duration-200',
                      location.pathname === slot.action && 'text-gold drop-shadow-[0_0_6px_hsl(var(--gold)/0.5)]',
                    )}
                  >
                    <slot.icon className="h-5 w-5" />
                    <span className="text-[9px] font-medium tracking-wide">{slot.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
