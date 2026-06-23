import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { hasSeenWelcome } from './WelcomeEnvelope';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, MessageCircle, ChevronLeft, ChevronRight, BookOpen, Globe, ClipboardList, Lock } from 'lucide-react';
import { getStoredAnchor, anchorToRoute } from '@/hooks/useHomeAnchor';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/contexts/AppContext';
import CompanionImageReveal from './CompanionImageReveal';
import CompanionQuickSheet from './CompanionQuickSheet';
import AvatarExpressionOverlay from './AvatarExpressionOverlay';
import { useCompanionExpressionStore } from '@/stores/useCompanionExpressionStore';
import { toast } from '@/components/ui/sonner';



/* ── Shortcut registry (kept for FooterShortcutEditor compat) ── */
export interface FooterShortcut {
  id: string;
  label: string;
  icon: React.ReactNode;
  route: string;
}

export const AVAILABLE_SHORTCUTS: FooterShortcut[] = [
  { id: 'home', label: 'Home', icon: <Home className="h-5 w-5" />, route: '/' },
  { id: 'messages', label: 'Messages', icon: <MessageCircle className="h-5 w-5" />, route: '/messages' },
  { id: 'plans', label: 'Plans', icon: <ClipboardList className="h-5 w-5" />, route: '/plans' },
  { id: 'story', label: 'Story', icon: <BookOpen className="h-5 w-5" />, route: '/story' },
  { id: 'world', label: 'World', icon: <Globe className="h-5 w-5" />, route: '/world' },
];

const HIDDEN_ROUTES = ['/auth', '/reset-password', '/browse', '/studio'];
const CIRCLE_ROOM_PATTERN = /^\/circles\/[^/]+$/;
const LONG_PRESS_MS = 500;

/* ── Nav items ─────────────────────────────────────────────── */
const LEFT_ITEMS = [
  { id: 'messages', label: 'Messages', icon: <MessageCircle className="h-5 w-5" />, route: '/messages' },
  { id: 'plans', label: 'Plans', icon: <ClipboardList className="h-5 w-5" />, route: '/plans' },
];
const RIGHT_ITEMS_BASE = [
  { id: 'story', label: 'Story', icon: <BookOpen className="h-5 w-5" />, route: '/story' },
  { id: 'world', label: 'World', icon: <Globe className="h-5 w-5" />, route: '/world' },
];

/* ── Component ────────────────────────────────────────────── */
export default function AppFooterBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    connections, subscription, badges,
    activeConnection, activeConnectionIndex, setActiveConnectionIndex,
    fetchArchivedConnections,
  } = useAppContext();
  const isPremium = subscription?.subscribed ?? false;
  
  const [hasArchived, setHasArchived] = useState(false);
  useEffect(() => {
    fetchArchivedConnections().then(arr => setHasArchived(arr.length > 0));
  }, [fetchArchivedConnections, connections.length]);

  const activeConn = activeConnection ?? null;
  const cycleConnections = connections;
  const canCycle = cycleConnections.length >= 2;

  /* ── Premium: long-press handling ───────────────────────── */
  const [quickSheetOpen, setQuickSheetOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  const onPointerDown = useCallback(() => {
    if (!isPremium) return;
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      if (connections.length >= 1) setQuickSheetOpen(true);
    }, LONG_PRESS_MS);
  }, [connections.length, isPremium]);

  const onPointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const handleCompanionTap = () => {
    if (didLongPress.current) return;
    if (!activeConn) navigateWithSanctuaryExit('/browse');
    else navigateWithSanctuaryExit(`/chat/${activeConn.memberId}`);
  };

  /* ── Premium: arrow cycling ─────────────────────────────── */
  const handlePremiumArrow = (direction: 'left' | 'right') => {
    if (cycleConnections.length === 0) {
      if (hasArchived) {
        toast('Wake a resting friend or browse for new', {
          action: { label: 'Resting', onClick: () => navigate('/resting') },
          cancel: { label: 'Browse new', onClick: () => navigate('/browse') },
        });
      } else {
        toast('Create your first friend to get started', {
          action: { label: 'Browse', onClick: () => navigate('/browse') },
        });
      }
      return;
    }
    if (cycleConnections.length === 1) {
      if (hasArchived) {
        toast('Wake a resting friend or browse for new', {
          action: { label: 'Resting', onClick: () => navigate('/resting') },
          cancel: { label: 'Browse new', onClick: () => navigate('/browse') },
        });
      } else {
        toast('Add another friend to switch between them', {
          action: { label: 'Browse', onClick: () => navigate('/browse') },
        });
      }
      return;
    }
    const len = connections.length;
    if (len === 0) return;
    const step = direction === 'right' ? 1 : -1;
    const next = (activeConnectionIndex + step + len) % len;
    setActiveConnectionIndex(next);
  };

  /* ── Expression store — must be before any early return (React hooks rule) ── */
  const { expression, ambient, activeNudges } = useCompanionExpressionStore();

  /* ── Sanctuary exit interception — hook must be before early return ── */
  const navigateWithSanctuaryExit = useCallback((route: string) => {
    const isOnSanctuary = false; // Think Freely retired — Privacy Mode is now in chat
    if (isOnSanctuary) {
      const event = new CustomEvent('sanctuary-exit', { detail: { targetRoute: route } });
      window.dispatchEvent(event);
      const onComplete = () => {
        window.removeEventListener('sanctuary-exit-complete', onComplete);
        navigate(route);
      };
      window.addEventListener('sanctuary-exit-complete', onComplete);
      setTimeout(() => {
        window.removeEventListener('sanctuary-exit-complete', onComplete);
        navigate(route);
      }, 1600);
    } else {
      navigate(route);
    }
  }, [location.pathname, navigate]);

  /* ── Visibility ──────────────────────────────────────────── */
  const shouldHide = HIDDEN_ROUTES.some(r => location.pathname === r || location.pathname.startsWith(r + '/')) || CIRCLE_ROOM_PATTERN.test(location.pathname);
  // Hide during onboarding (Welcome Envelope / invite gate) — footer peeks through and looks unpolished
  const isOnboardingActive = location.pathname === '/' && !hasSeenWelcome() && connections.length === 0;
  if (shouldHide || isOnboardingActive) return null;

  const isActive = (route: string) => location.pathname === route;
  const badgeFor = (id: string) => {
    if (id === 'messages') return (badges?.messages || 0) + (badges?.feed || 0);
    return 0;
  };

  /* ── Bloom / Fold animation variants ─────────────────────── */
  const bloomFromCenter = (side: 'left' | 'right', index: number) => {
    const xOffset = side === 'left' ? 60 : -60;
    const staggerIn = 0.08 + index * 0.1;
    const staggerOut = index * 0.05;
    return {
      initial: { opacity: 0, x: xOffset, y: 0, scale: 0.4, filter: 'blur(4px)' },
      animate: {
        opacity: 1, x: 0, y: 0, scale: 1, filter: 'blur(0px)',
        transition: { type: 'spring' as const, stiffness: 260, damping: 22, delay: staggerIn },
      },
      exit: {
        opacity: 0, x: xOffset * 0.4, y: 8, scale: 0.7, filter: 'blur(4px)',
        transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as [number, number, number, number], delay: staggerOut },
      },
    };
  };

  /* ── Render a standard nav item ──────────────────────────── */
  const renderItem = (item: typeof LEFT_ITEMS[0], side: 'left' | 'right', index: number) => {
    const active = isActive(item.route);
    const badge = badgeFor(item.id);
    const variants = bloomFromCenter(side, index);
    return (
      <motion.button
        key={item.id}
        {...variants}
        onClick={() => navigateWithSanctuaryExit(item.route)}
        onPointerDown={(e) => {
          const el = e.currentTarget;
          const rect = el.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const size = Math.max(rect.width, rect.height) * 2;
          const ripple = document.createElement('span');
          ripple.className = 'ripple-effect';
          ripple.style.width = `${size}px`;
          ripple.style.height = `${size}px`;
          ripple.style.left = `${x - size / 2}px`;
          ripple.style.top = `${y - size / 2}px`;
          el.appendChild(ripple);
          ripple.addEventListener('animationend', () => ripple.remove());
        }}
        className={cn(
          'ripple-container flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-colors duration-1000 min-w-[44px] relative',
          active
            ? isDeepSleep ? 'text-indigo-400/60' : 'text-primary'
            : isDeepSleep ? 'text-indigo-400/40 hover:text-primary/80' : 'text-primary/50 hover:text-primary/80',
          isDeepSleep && !active && 'animate-deep-sleep'
        )}
      >
        <div className="relative">
          {item.icon}
          {badge > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-1.5 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold notification-badge-gold shadow-[0_0_8px_hsl(var(--primary)/0.4)]"
            >
              {badge > 99 ? '99+' : badge}
            </motion.span>
          )}
        </div>
        <span className={cn(
          'text-[10px] font-semibold leading-none',
          active
            ? isDeepSleep ? 'text-indigo-400/60' : 'text-primary'
            : isDeepSleep ? 'text-indigo-400/40' : 'text-primary/50'
        )}>
          {item.label}
        </span>
        {active && (
          <motion.div
            layoutId="footer-indicator"
            className="absolute -top-px left-1/4 right-1/4 h-0.5 rounded-full bg-primary"
            transition={{ type: 'tween', duration: 0 }}
          />
        )}
      </motion.button>
    );
  };

  const hasNudge = activeNudges.length > 0;
  const homeActive = isActive('/') || isActive('/my-world');
  const isThinkFreely = false; // Think Freely retired

  /* ── Time-of-day mode detection ── */
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
  const isEvening = currentHour > 20 || (currentHour === 20 && currentMinute >= 30) || currentHour < 5;
  const isMorning = currentHour >= 7 && currentHour < 10;
  const isDeepSleep = currentHour >= 22 || currentHour < 5;
  const companionLabel = activeConn?.name || 'Their World';
  const RIGHT_ITEMS = [
    RIGHT_ITEMS_BASE[0],
    { ...RIGHT_ITEMS_BASE[1], label: companionLabel, route: '/world' },
  ];

  const renderCenterSpacer = () => {
    return (
      <div className="flex flex-col items-center justify-self-center shrink-0 px-1" style={{ width: isPremium ? 90 : 64 }}>
        <div className="h-14" />
      </div>
    );
  };

  const renderNamePill = () => {
    return (
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-[-56px] z-[59] flex flex-col items-center pointer-events-none">
        <div className="pointer-events-auto mt-[82px] flex flex-col items-center gap-1">
          {/* Companion name — dimmed "Muted" on Think Freely */}
        <span className="text-[10px] font-semibold text-foreground/80 truncate max-w-[100px] leading-tight drop-shadow-sm">
            {isThinkFreely
              ? (activeConn ? `${activeConn.name} · muted` : 'Connect')
              : (activeConn ? `"${activeConn.name}"` : 'Connect')
            }
          </span>
          {/* Contextual status — floating with thinking dots */}
          {ambient.type === 'contextual' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="flex items-center gap-1 text-[9px] font-medium text-primary/70"
            >
              {/* Wavy thinking dots */}
              <span className="flex items-center gap-[2px]">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="inline-block h-[3px] w-[3px] rounded-full bg-primary/60"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                  />
                ))}
              </span>
              <span className="italic drop-shadow-sm">
                {ambient.emoji ? ambient.emoji + ' ' : ''}{ambient.text}
              </span>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  const renderFloatingCenter = () => {
    return (
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-[-28px] z-[61] flex flex-col items-center pointer-events-auto">
        <div className="flex items-center gap-1">
          {isPremium && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePremiumArrow('left'); }}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full backdrop-blur-md border border-white/10 transition-all group',
                canCycle ? 'bg-white/8 text-foreground hover:text-primary hover:bg-white/12 active:bg-white/16' : 'bg-white/4 text-muted-foreground/40 cursor-default'
              )}
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
          )}

          <motion.button
            onClick={handleCompanionTap}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={onPointerUp}
            whileTap={{ scale: 0.92 }}
            className={cn(
              "relative flex h-14 w-14 items-center justify-center rounded-full shadow-md overflow-hidden",
              !isThinkFreely && "animate-[amberPulseRing_3s_ease-in-out_infinite]"
            )}
            style={{
              boxShadow: isThinkFreely
                ? '0 0 0 2px hsl(0 0% 40% / 0.3), 0 4px 12px -4px rgba(0,0,0,0.4)'
                : '0 0 0 2.5px hsl(38 70% 60% / 0.5), 0 0 14px 2px hsl(38 70% 60% / 0.2), 0 4px 16px -4px hsl(var(--primary) / 0.4)',
              background: isThinkFreely
                ? 'linear-gradient(135deg, hsl(0 0% 20% / 0.3), hsl(0 0% 15% / 0.2))'
                : 'linear-gradient(135deg, hsl(38 70% 60% / 0.08), hsl(38 70% 60% / 0.02))',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              opacity: isThinkFreely ? 0.5 : 1,
              filter: isThinkFreely ? 'grayscale(0.6)' : 'none',
            }}
          >
            {activeConn?.avatarUrl || activeConn?.referenceImageUrl ? (
              <CompanionImageReveal src={activeConn.avatarUrl || activeConn.referenceImageUrl || ''} alt={activeConn.name} simpleFade className="h-full w-full object-top" style={{ objectPosition: 'center 15%' }} />
            ) : activeConn ? (
              <div className="flex h-full w-full items-center justify-center gradient-primary text-primary-foreground font-bold text-lg">
                {activeConn.name.charAt(0)}
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center gradient-primary text-primary-foreground font-bold text-lg">
                ?
              </div>
            )}
            <AvatarExpressionOverlay expression={expression} />
            {/* Muted lock badge on Think Freely — companion is "waiting" */}
            {isThinkFreely && activeConn && (
              <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 border border-white/20 backdrop-blur-sm z-10">
                <Lock className="h-2 w-2 text-white/50" />
              </div>
            )}
            {hasNudge && expression === 'idle' && !isThinkFreely && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, opacity: [0.5, 1, 0.5] }}
                transition={{ opacity: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }, scale: { duration: 0.3 } }}
                className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-accent border border-card"
              />
            )}
          </motion.button>

          {isPremium && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePremiumArrow('right'); }}
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full backdrop-blur-md border border-white/10 transition-all group',
                canCycle ? 'bg-white/8 text-foreground hover:text-primary hover:bg-white/12 active:bg-white/16' : 'bg-white/4 text-muted-foreground/40 cursor-default'
              )}
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 w-full z-[60]" data-mobile-nav="true" style={{ transform: 'translate3d(0,0,0)', WebkitTransform: 'translate3d(0,0,0)' }}>
        {/* Floating avatar — above the mask, not clipped */}
        <div className="absolute inset-x-0 top-0 flex justify-center pointer-events-none z-[1]">
          {renderFloatingCenter()}
          {renderNamePill()}
        </div>

        {/* Home button — routes to last visited page */}
        <motion.button
          onClick={() => {
            const anchor = getStoredAnchor();
            const route = anchorToRoute(anchor, activeConn?.memberId);
            navigate(route);
          }}
          animate={isThinkFreely ? {
            boxShadow: isEvening
              ? [
                  '0 0 0 0px hsl(255 50% 60% / 0), 0 0 0px 0px hsl(255 50% 60% / 0)',
                  '0 0 0 3px hsl(255 50% 60% / 0.25), 0 0 14px 4px hsl(255 50% 60% / 0.15)',
                  '0 0 0 0px hsl(255 50% 60% / 0), 0 0 0px 0px hsl(255 50% 60% / 0)',
                ]
              : [
                  '0 0 0 0px hsl(38 70% 50% / 0), 0 0 0px 0px hsl(38 70% 50% / 0)',
                  '0 0 0 3px hsl(38 70% 50% / 0.25), 0 0 14px 4px hsl(38 70% 50% / 0.15)',
                  '0 0 0 0px hsl(38 70% 50% / 0), 0 0 0px 0px hsl(38 70% 50% / 0)',
                ],
          } : {}}
          transition={isThinkFreely ? { duration: isEvening ? 6 : 3, repeat: Infinity, ease: 'easeInOut' } : {}}
          className={cn(
            'absolute -top-10 left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-md',
            isThinkFreely && isEvening
              ? 'bg-[hsl(255_50%_60%/0.2)] text-[hsl(255_50%_70%)] border border-[hsl(255_50%_60%/0.5)] backdrop-blur-xl'
              : isThinkFreely
                ? 'bg-primary/20 text-primary border border-[hsl(38_70%_50%/0.5)] backdrop-blur-xl'
                : homeActive
                  ? 'bg-primary/20 text-primary border border-primary/30 backdrop-blur-xl'
                  : 'bg-card/80 backdrop-blur-xl text-muted-foreground hover:text-primary hover:bg-primary/10 border border-border/30'
          )}
        >
          <Home className="h-3.5 w-3.5" />
          {/* Gold anchor dot — visible when a non-default anchor is active */}
          {getStoredAnchor() !== 'dashboard' && (
            <span
              className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full"
              style={{
                background: 'hsl(38 70% 60%)',
                boxShadow: '0 0 6px 1px hsl(38 70% 50% / 0.5)',
              }}
            />
          )}
        </motion.button>

        {/* Globe — opens Blueprint/Insights World (growth, insights, long-term view) */}
        <motion.button
          onClick={() => navigateWithSanctuaryExit('/personal-intel')}
          animate={{
            scale: isMorning
              ? [1, 1.1, 1]
              : isThinkFreely
                ? [1, 1.08, 1]
                : 1,
          }}
          transition={{
            scale: { duration: isMorning ? 4 : 3, repeat: Infinity, ease: isMorning ? [0.4, 0, 0.2, 1] : 'easeInOut' },
          }}
          style={{
            right: 12,
            ...(isMorning ? {
              boxShadow: '0 0 0 3px hsl(16 85% 55% / 0.3), 0 0 16px 4px hsl(16 85% 55% / 0.3), 0 0 30px 8px hsl(16 85% 55% / 0.12)',
              background: 'linear-gradient(135deg, hsl(16 85% 55% / 0.2), hsl(30 90% 60% / 0.08))',
              backdropFilter: 'blur(12px)',
            } : isThinkFreely ? {
              boxShadow: '0 0 0 3px hsl(38 70% 50% / 0.2), 0 0 16px 4px hsl(38 70% 50% / 0.25), 0 0 30px 8px hsl(38 70% 50% / 0.1)',
              background: 'linear-gradient(135deg, hsl(38 70% 50% / 0.15), hsl(38 70% 50% / 0.05))',
              backdropFilter: 'blur(12px)',
            } : {
              backdropFilter: 'blur(12px)',
            }),
          }}
          className={cn(
            'absolute -top-10 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-md text-xl leading-none',
            isMorning
              ? 'border-2 border-[hsl(16_85%_55%/0.6)]'
              : isThinkFreely
                ? 'border-2 border-[hsl(38_70%_50%/0.6)]'
                : 'bg-card/80 backdrop-blur-xl border border-border/30'
          )}
        >
          <motion.span
            animate={isThinkFreely || isMorning ? { rotate: 360 } : { rotate: 0 }}
            transition={isThinkFreely || isMorning ? { duration: isMorning ? 15 : 20, repeat: Infinity, ease: 'linear' } : { duration: 0.3 }}
            className="inline-block"
          >
            🌎
          </motion.span>
        </motion.button>

        {/* Gradient fade above footer on Think Freely — smooth organic transition */}
        {isThinkFreely && (
          <div
            className="absolute bottom-full left-0 right-0 h-24 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent 0%, hsl(234 35% 9%) 100%)',
            }}
          />
        )}
        <div
          className={cn(
            'backdrop-blur-xl rounded-t-2xl relative transition-all duration-300',
            isThinkFreely
              ? 'border-t-0 shadow-none'
              : 'border-t border-white/10 shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.35)]'
          )}
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)',
            WebkitMaskImage: 'radial-gradient(circle 40px at 50% 0px, transparent 38px, black 39px)',
            maskImage: 'radial-gradient(circle 40px at 50% 0px, transparent 38px, black 39px)',
            ...(isThinkFreely ? { background: 'hsl(234 35% 9%)', backdropFilter: 'none', WebkitBackdropFilter: 'none', borderTop: 'none', boxShadow: 'none' } : { background: 'rgba(0,0,0,0.2)' }),
          }}
        >
          <div className={cn(
            'grid items-end px-2 pb-2 pt-1.5 max-w-lg mx-auto relative gap-0',
            isThinkFreely ? 'grid-cols-[auto] justify-center' : 'grid-cols-[1fr_1fr_auto_1fr_1fr]'
          )}>
            <AnimatePresence mode="popLayout">
              {!isThinkFreely && LEFT_ITEMS.map((item, i) => renderItem(item, 'left', i))}
            </AnimatePresence>
            {renderCenterSpacer()}
            <AnimatePresence mode="popLayout">
              {!isThinkFreely && RIGHT_ITEMS.map((item, i) => renderItem(item, 'right', i))}
            </AnimatePresence>
          </div>
        </div>
      </nav>

      {/* Premium long-press quick sheet */}
      {isPremium && (
        <CompanionQuickSheet open={quickSheetOpen} onOpenChange={setQuickSheetOpen} />
      )}

    
    </>
  );
}
