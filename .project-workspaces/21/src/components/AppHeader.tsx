import { useState, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, User, Menu, Heart, HelpCircle, Users, X, Settings, Zap, ShieldCheck, MonitorPlay, Crown, FlaskConical, BookOpen, Leaf, ClipboardList, Compass, Sparkles, Search, Paintbrush, Gift, Lock, MessageSquareShare, Plus, Moon } from 'lucide-react';
import { isFocusModeActive } from '@/hooks/useFocusMode';
import { motion, AnimatePresence } from 'framer-motion';

import CompaniLogo from './CompaniLogo';
import NotificationsSheet from './NotificationsSheet';
import LiveLearnSheet from './LiveLearnSheet';
import SoundscapeQuickToggle from './SoundscapeQuickToggle';

import BetaFeedbackModal from './BetaFeedbackModal';
import FoundingBadge from './FoundingBadge';
import { useFoundingMemberStatus } from '@/hooks/useFoundingMemberStatus';
import ArchitectKeyIcon from '@/components/dashboard/ArchitectKeyIcon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppContext } from '@/contexts/AppContext';


interface AppHeaderProps {
  userName: string;
  avatarUrl?: string;
  username?: string;
  isAdmin?: boolean;
  isPremium?: boolean;
  kidsMode?: boolean;
  onAvatarClick: () => void;
  onLogoClick?: () => void;
  onSignOut?: () => void;
  onNavigate?: (path: string) => void;
  onFindFriend?: () => void;
  notificationCount?: number;
  vibePoints?: number;
  goldenPulse?: boolean;
}

/* ── Hamburger menu items ───────────────────────────── */
const HAMBURGER_ITEMS = [
  { icon: Compass, label: 'Your World', desc: 'Dashboard & overview', path: '/my-world' },
  { icon: Lock, label: 'Private Mode', desc: 'Use 🔒 in chat for zero-trace', path: '__info_only__' },
  { icon: Heart, label: 'Find a Friend', desc: 'Browse or build a new friend', path: '__find_friend__' },
  { icon: Paintbrush, label: 'Full Studio', desc: 'Customize your companion', path: '/studio' },
  { icon: Gift, label: 'Gift Shop', desc: 'Gifts & surprises for companions', path: '/store' },
  { icon: ClipboardList, label: 'Your Path', desc: 'Plans, goals & rhythms', path: '/plans' },
  { icon: Sparkles, label: 'Blueprints', desc: 'Saved Strategist, Auditor & Visionary plans', path: '/blueprints' },
  { icon: Search, label: 'About You', desc: 'Decode yourself with discoveries', path: '/personal-intel' },
  { icon: Leaf, label: 'Your Space', desc: 'Journal, mood & wellness', path: '/wellness' },
  { icon: BookOpen, label: 'Your Story', desc: 'Moments from your journey', path: '/story' },
  { icon: Users, label: 'Threads', desc: 'Community feed for all users', path: '/threads' },
  { icon: Users, label: 'Circles', desc: 'Group chats & communities', path: '/circles', badge: 'Beta', kidsOnly: true },
  { icon: Sparkles, label: 'Upgrade', desc: 'Unlock premium features', path: '/pricing', premiumHide: true },
  { icon: Settings, label: 'Settings', desc: 'Manage your account', path: '/settings' },
  { icon: HelpCircle, label: 'Help & FAQ', desc: 'Get answers & support', path: '/help' },
];

export default function AppHeader({ userName, avatarUrl, username, isAdmin, isPremium, kidsMode, onAvatarClick, onLogoClick, onSignOut, onNavigate, onFindFriend, notificationCount = 0, vibePoints = 0, goldenPulse = false }: AppHeaderProps) {
  const { isFoundingMember, serialNumber, tier, percentile, joinedAfterCount } = useFoundingMemberStatus();
  // Reactive Focus Mode state — re-renders header when focus toggles
  const [focusActive, setFocusActive] = useState(() => isFocusModeActive());
  useEffect(() => {
    const handler = (e: Event) => setFocusActive(!!(e as CustomEvent).detail?.active);
    const storageHandler = () => setFocusActive(isFocusModeActive());
    window.addEventListener('focus-mode-change', handler);
    window.addEventListener('storage', storageHandler);
    return () => {
      window.removeEventListener('focus-mode-change', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);
  // Founder detection for welcome-beat animation.
  // Decided synchronously to prevent a post-paint class swap (gold-breath -> welcome-beat) glitch.
  // We optimistically assume "already beat" until the admin check confirms otherwise.
  const [isFounder, setIsFounder] = useState(false);
  const [welcomeBeatDone, setWelcomeBeatDone] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      const uid = data?.user?.id;
      if (!uid || cancelled) return;
      const beatKey = `founder-beat-${uid}`;
      // Skip the Supabase round-trip if we've already beat this session.
      if (sessionStorage.getItem(beatKey)) return;
      supabase.from('user_roles').select('role').eq('user_id', uid).eq('role', 'admin').maybeSingle()
        .then(({ data: roleData }) => {
          if (cancelled || !roleData) return;
          sessionStorage.setItem(beatKey, Date.now().toString());
          // Flip both flags together so the class transitions cleanly into welcome-beat once.
          setWelcomeBeatDone(false);
          setIsFounder(true);
          setTimeout(() => {
            if (!cancelled) setWelcomeBeatDone(true);
          }, 1600);
        });
    });
    return () => { cancelled = true; };
  }, []);

  const { connections, activeConnection, setActiveConnectionIndex } = useAppContext();
  
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) setAvatarMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <>
    <header className={`glass sticky top-0 z-[60] flex w-full items-center justify-between rounded-b-2xl border-b border-border overflow-visible shadow-[0_4px_24px_-2px_rgba(0,0,0,0.35)]`} style={{ paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)', paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)', paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(3.5rem + env(safe-area-inset-top, 0px))' }}>
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-2 min-w-0 overflow-visible">
        <button
          onClick={() => setHamburgerOpen(true)}
          className="flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60 text-foreground transition-colors hover:bg-muted active:scale-95"
          aria-label="Menu"
        >
          <Menu className="h-5 w-5 text-primary/70" />
        </button>
        <button onClick={onLogoClick} className="flex items-center gap-2 transition-opacity hover:opacity-80 active:scale-[0.97] min-w-0 overflow-visible">
          <CompaniLogo size="sm" showTagline goldenPulse={goldenPulse} />
        </button>
      </div>

      {/* Right side: VP pill + notifications + avatar */}
      <div className="flex items-center gap-2 shrink-0">
        {/* VP Pill */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="flex items-center gap-1 rounded-full bg-transparent border-none p-0 sm:bg-cyan-400/10 sm:border sm:border-cyan-400/20 sm:px-2.5 sm:py-1 text-[11px] font-bold"
        >
          <Zap className="h-3 w-3 text-cyan-400" />
          <span className="text-cyan-400">{vibePoints}</span>
        </motion.div>

        {/* Focus Mode active indicator */}
        <AnimatePresence>
          {focusActive && (
            <motion.div
              key="focus-indicator"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <Moon className="h-3 w-3 text-[hsl(230_70%_70%)] animate-deep-sleep" />
              <span className="text-[9px] tracking-[0.12em] uppercase text-[hsl(230_60%_65%)] font-medium hidden sm:inline">
                Focus
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        

        {/* Avatar — slim menu: Profile + Sign out only */}
        <div ref={avatarMenuRef} className="relative shrink-0">
          <button
            onClick={() => setAvatarMenuOpen((o) => !o)}
            className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${isPremium ? 'avatar-glow-premium' : ''}`}
            style={{
              boxShadow: isPremium
                ? undefined
                : '0 0 0 2px hsl(var(--primary) / 0.2)',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={userName}
                className="h-10 w-10 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            {/* Founding serial badge — bottom-left */}
            <FoundingBadge serial={serialNumber} size="sm" />
          </button>
            {/* Golden key for Origin Partners */}
            {tier === 'genesis' && localStorage.getItem('compani-origin-partner') === 'true' && (
              <span className="absolute -top-1 -left-1">
                <ArchitectKeyIcon size={10} />
              </span>
            )}
            {isPremium && (
              <span
                className="absolute -bottom-0.5 right-0 flex h-4 w-4 items-center justify-center rounded-full border shadow-sm"
                style={{
                  background: 'rgba(15,18,33,0.9)',
                  borderColor: 'rgba(212,175,55,0.4)',
                  boxShadow: '0 0 8px rgba(212,175,55,0.2)',
                }}
              >
                <Crown className="h-2.5 w-2.5 text-amber-400" style={{ filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.8))' }} />
              </span>
            )}

          <AnimatePresence>
            {avatarMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 z-[100] w-56 rounded-[32px] p-6 overflow-hidden bg-[#131424]/95 backdrop-blur-2xl border border-white/10"
                style={{ boxShadow: '0 20px 50px rgba(0,0,0,0.4), 0 8px 32px -4px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)' }}
              >
                {/* User info */}
                <div className="px-3 py-2.5 mb-1" style={{ borderBottom: '1px solid linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }}>
                  <div className="h-px w-full mb-2" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.2), transparent)' }} />
                  <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5 tracking-wide">
                    {userName}
                    {isPremium && <Crown className="h-3 w-3 text-amber-400 shrink-0" style={{ filter: 'drop-shadow(0 0 4px rgba(212,175,80,0.4))' }} />}
                    {document.documentElement.classList.contains('night') && (
                      <Moon className="h-3 w-3 shrink-0 text-blue-300/60" style={{ filter: 'drop-shadow(0 0 6px rgba(147,197,253,0.4))' }} />
                    )}
                   </p>
                  {isFoundingMember && serialNumber && tier && (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[9px] tracking-widest uppercase cursor-default ${
                              tier === 'genesis'
                                ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                                : 'bg-slate-400/10 border border-slate-400/30 text-slate-300'
                            }`}
                            style={tier === 'genesis' ? { boxShadow: '0 0 8px rgba(212,175,55,0.3)' } : undefined}
                          >
                            {tier === 'genesis' ? 'Genesis' : 'Foundation'} #{String(serialNumber).padStart(3, '0')}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs max-w-[220px]">
                          <span>
                            {tier === 'genesis'
                              ? `Genesis Architect · #${String(serialNumber).padStart(3, '0')} · Present at origin`
                              : `Foundation Member · #${String(serialNumber).padStart(3, '0')} · Part of what made this real`}
                          </span>
                          {percentile !== null && percentile <= 50 && (
                            <span className="block mt-1 text-white/50">Earliest {percentile}%</span>
                          )}
                          {joinedAfterCount !== null && joinedAfterCount >= 5 && (
                            <span className="block text-white/50">{joinedAfterCount} joined after you</span>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                <button
                  onClick={() => {
                    setAvatarMenuOpen(false);
                    if (username) {
                      onNavigate?.(`/profile/${username}`);
                    } else {
                      onAvatarClick();
                    }
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-light text-muted-foreground transition-all hover:text-foreground active:scale-[0.97]"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <User className="h-4 w-4" style={{ filter: 'drop-shadow(0 0 3px hsl(var(--primary) / 0.3))' }} />
                  Profile
                </button>

                <button
                  onClick={() => {
                    setAvatarMenuOpen(false);
                    onNavigate?.('/settings');
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-light text-muted-foreground transition-all hover:text-foreground active:scale-[0.97]"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <Settings className="h-4 w-4" style={{ filter: 'drop-shadow(0 0 3px hsl(var(--primary) / 0.3))' }} />
                  Settings
                </button>

                {isAdmin && (
                  <>
                    <div className="h-px mx-2 my-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,80,0.15), transparent)' }} />
                    <button
                      onClick={() => {
                        setAvatarMenuOpen(false);
                        onNavigate?.('/admin');
                      }}
                      className={`flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold text-amber-400 transition-all duration-500 active:scale-[0.97] relative overflow-hidden ${isFounder && !welcomeBeatDone ? 'animate-[welcome-beat_1.5s_ease-out_1]' : 'animate-[gold-breath_4s_ease-in-out_infinite]'}`}
                      style={{ background: 'rgba(212,175,80,0.1)', border: '1px solid rgba(212,175,55,0.3)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,175,80,0.2)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(212,175,80,0.1)'}
                    >
                      <ShieldCheck className="h-4 w-4" style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,80,0.5))' }} />
                      <span className="tracking-wide">Admin Hub</span>
                      <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-amber-400" style={{ background: 'rgba(212,175,55,0.2)', border: '0.5px solid rgba(212,175,55,0.5)', boxShadow: '0 0 15px rgba(212,175,55,0.3)', letterSpacing: '0.12em' }}>Super</span>
                    </button>
                  </>
                )}

                <div className="h-px mx-2 my-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)' }} />

                {onSignOut && (
                  <button
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      onSignOut();
                    }}
                    className="group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 transition-all duration-500 active:scale-[0.97]"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
                      e.currentTarget.style.boxShadow = 'inset 0 0 20px rgba(239,68,68,0.05)';
                      e.currentTarget.style.color = 'rgba(248,113,113,0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    }}
                  >
                    <div className="relative p-1.5 rounded-lg transition-all duration-700 group-hover:bg-red-500/10 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                      <LogOut className="h-4 w-4 transition-colors duration-500" />
                      <span className="absolute inset-0 rounded-lg bg-red-500/20 scale-0 group-hover:scale-125 group-hover:opacity-0 transition-all duration-1000" />
                    </div>
                    <span className="text-sm font-light tracking-widest uppercase">Sign Out</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>

    {/* ── Hamburger overlay ──────────────────────────── */}
    <AnimatePresence>
      {hamburgerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm"
            onClick={() => setHamburgerOpen(false)}
          />

          {/* Slide-in panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed left-0 top-0 bottom-0 z-[201] w-72 max-w-[80vw] flex flex-col bg-white/[0.05] backdrop-blur-xl shadow-[20px_0_50px_rgba(0,0,0,0.3)]"
            style={{ borderRight: '0.5px solid rgba(255,255,255,0.1)' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid transparent', backgroundImage: 'linear-gradient(rgba(15,18,33,0.88), rgba(15,18,33,0.88)), linear-gradient(90deg, transparent, hsl(var(--primary) / 0.15), transparent)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
              <button
                onClick={() => { setHamburgerOpen(false); onNavigate?.('/'); }}
                className="transition-opacity hover:opacity-80"
              >
                <CompaniLogo size="md" />
              </button>
              <button
                onClick={() => setHamburgerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.05] text-muted-foreground hover:text-foreground hover:bg-white/[0.08] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Time-aware greeting */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              className="px-6 pt-6 pb-3"
            >
              <span
                className="block text-[10px] uppercase font-medium animate-shimmer"
                style={{ letterSpacing: '0.3em', color: 'rgba(212,175,55,0.6)' }}
              >
                {new Date().getHours() < 12 ? 'Good Morning,' :
                 new Date().getHours() < 18 ? 'Good Afternoon,' : 'Good Evening,'}
              </span>
              <h2 className="text-2xl font-light text-foreground mt-1" style={{ letterSpacing: '-0.01em' }}>
                {userName}
              </h2>
              <div className="h-px w-8 mt-2" style={{ opacity: 0.4, background: 'linear-gradient(90deg, rgba(212,175,55,0.6), transparent)' }} />
            </motion.div>

            <div className="h-px mx-5" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.12), transparent)' }} />

            {/* ── Presence Gallery — Companion Switcher ── */}
            {(() => {
              const visibleConnections = connections;
              if (visibleConnections.length === 0) return null;
              return (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5 }}
                className="px-4 pt-4 pb-3"
              >
                <p className="text-[9px] uppercase font-medium mb-3 ml-1" style={{ letterSpacing: '0.3em', color: 'hsl(var(--muted-foreground) / 0.4)' }}>
                  Switch Presence
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x">
                  {visibleConnections.map((conn) => {
                    const idx = connections.findIndex((c) => c.memberId === conn.memberId);
                    const isActive = conn.memberId === activeConnection?.memberId;
                    return (
                      <button
                        key={conn.memberId}
                        onClick={() => {
                          setActiveConnectionIndex(idx);
                          if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                          setHamburgerOpen(false);
                          onNavigate?.(`/chat/${conn.memberId}`);
                        }}
                        className="relative flex-shrink-0 snap-center group flex flex-col items-center"
                      >
                        {/* Active Halo */}
                        {isActive && (
                          <div className="absolute -inset-1 rounded-full blur-md opacity-30 animate-pulse" style={{ background: 'hsl(var(--primary))' }} />
                        )}
                        {/* Avatar */}
                        <div
                          className="relative w-12 h-12 rounded-full overflow-hidden transition-all duration-500"
                          style={{
                            border: isActive ? '2px solid hsl(var(--primary))' : '2px solid hsl(var(--border) / 0.2)',
                            filter: isActive ? 'none' : 'grayscale(0.6)',
                            opacity: isActive ? 1 : 0.55,
                          }}
                        >
                          {conn.avatarUrl ? (
                            <img src={conn.avatarUrl} alt={conn.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-light" style={{ background: 'hsl(var(--primary) / 0.12)', color: 'hsl(var(--primary))' }}>
                              {conn.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        {/* Name */}
                        <span
                          className="block mt-1.5 text-[9px] uppercase text-center transition-opacity duration-300 truncate max-w-[56px]"
                          style={{
                            letterSpacing: '0.12em',
                            color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                            opacity: isActive ? 1 : 0,
                          }}
                        >
                          {conn.name}
                        </span>
                      </button>
                    );
                  })}
                  {/* Create New slot */}
                  <button
                    onClick={() => { setHamburgerOpen(false); onFindFriend?.(); }}
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
                    style={{
                      border: '2px dashed hsl(var(--border) / 0.2)',
                      color: 'hsl(var(--muted-foreground) / 0.35)',
                    }}
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </motion.div>
              );
            })()}

            <div className="h-px mx-5" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.08), transparent)' }} />

            {/* Menu items */}
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {HAMBURGER_ITEMS.filter((item) => {
                if ((item as any).kidsOnly && !kidsMode) return false;
                if ((item as any).premiumHide && isPremium) return false;
                return true;
              }).map((item, i, arr) => {
                // Insert gradient dividers after logical groups
                const showDivider = i === 1 || i === 5 || i === 8;
                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.2 + i * 0.06, ease: 'easeOut' }}
                  >
                    <button
                      onClick={() => {
                        setHamburgerOpen(false);
                        if (item.path === '__find_friend__') {
                          onFindFriend?.();
                        } else if (item.path === '__info_only__') {
                          toast('Tap the 🔒 icon in your chat header to enable Private Mode', { icon: '🛡️', duration: 3500 });
                        } else {
                          onNavigate?.(item.path);
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all active:scale-[0.97]"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.06))',
                          boxShadow: '0 0 12px hsl(var(--primary) / 0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                        }}
                      >
                        <item.icon className="h-5 w-5 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.35))' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-foreground tracking-wide">{item.label}</p>
                          {item.badge && (
                            <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary" style={{ background: 'hsl(var(--primary) / 0.1)', boxShadow: '0 0 6px hsl(var(--primary) / 0.12)' }}>{item.badge}</span>
                          )}
                        </div>
                        <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.55, letterSpacing: '0.03em' }}>{item.desc}</p>
                      </div>
                    </button>
                    {showDivider && (
                      <div className="h-px mx-4 my-1" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)' }} />
                    )}
                  </motion.div>
                );
              })}

              {/* Live & Learn — opens sheet/dialog */}
              <LiveLearnSheet
                trigger={
                  <button
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all active:scale-[0.97]"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.06))',
                        boxShadow: '0 0 12px hsl(var(--primary) / 0.08), inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >
                      <MonitorPlay className="h-5 w-5 text-primary" style={{ filter: 'drop-shadow(0 0 4px hsl(var(--primary) / 0.35))' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground tracking-wide">Live &amp; Learn</p>
                      <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.55, letterSpacing: '0.03em' }}>Tips, guides &amp; videos</p>
                    </div>
                  </button>
                }
              />
            </div>

            {/* Beta Feedback — floating glass pill */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="px-4 pb-2 pt-1"
            >
              <button
                onClick={() => { setHamburgerOpen(false); setFeedbackOpen(true); }}
                className="group flex w-full items-center justify-center gap-2.5 rounded-2xl px-4 py-3 transition-all duration-500 active:scale-[0.97]"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                  border: '0.5px solid rgba(6,182,212,0.25)',
                  boxShadow: '0 0 15px rgba(6,182,212,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(6,182,212,0.14)';
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(6,182,212,0.18)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(6,182,212,0.08)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(6,182,212,0.1)';
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                <span className="text-[11px] uppercase font-medium" style={{ letterSpacing: '0.2em', color: 'rgba(165,243,252,0.8)' }}>
                  Share Beta Feedback
                </span>
                <MessageSquareShare className="h-3.5 w-3.5 text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
            </motion.div>

            {/* Footer */}
            <div className="p-4" style={{ borderTop: '1px solid transparent', backgroundImage: 'linear-gradient(rgba(15,18,33,0.88), rgba(15,18,33,0.88)), linear-gradient(90deg, transparent, hsl(var(--primary) / 0.1), transparent)', backgroundOrigin: 'border-box', backgroundClip: 'padding-box, border-box' }}>
              <p className="text-[10px] text-center" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.3, letterSpacing: '0.1em' }}>
                Compani — Your friend, your way
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

    <NotificationsSheet open={notifOpen} onOpenChange={setNotifOpen} />
    <BetaFeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} userName={userName} />
    </>
  );
}
