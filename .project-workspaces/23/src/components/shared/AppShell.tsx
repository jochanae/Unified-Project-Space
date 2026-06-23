import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LogOut, User, CreditCard, Settings, ShieldCheck, Plus, FolderKanban, Camera, HelpCircle, Crown, Menu, Home, Sparkles, X, BarChart3, Radio, ShieldOff, Loader2, TrendingUp, Search, BookOpen, Rocket, Wand2 } from 'lucide-react';
import { MentalShredder } from '@/features/quinn';
import { LogoCapsule } from './LogoCapsule';
import { GlobalQuinnFooter } from './GlobalQuinnFooter';
import { QuinnContextChip } from './QuinnContextChip';
import { FirstLeadCelebration } from './FirstLeadCelebration';
import { KnowledgeHint } from './KnowledgeHint';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useAuth } from '@/features/auth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useFunnelHub } from '@/features/projects';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { GlobalSearchModal } from './GlobalSearchModal';
import { QuickCreateLeadModal } from './QuickCreateLeadModal';
import { HeaderProjectSwitcher } from './HeaderProjectSwitcher';
import { HeaderCollabStack } from '@/features/collab';
import { subscribeQuickAction, exportAnalyticsCsv } from '@/lib/quick-actions';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSubscription } from '@/features/billing/hooks/use-subscription';
import { useUserTimezoneSync } from '@/hooks/use-user-timezone-sync';

export function AppShell() {
  useUserTimezoneSync();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addProject, activeProjectId } = useFunnelHub();

  const [avatarOpen, setAvatarOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showShredder, setShowShredder] = useState(false);
  const [showNewLead, setShowNewLead] = useState(false);
  const { user: currentUser } = useCurrentUser();
  const { tier: subscriptionTier } = useSubscription();
  const tierLabel = subscriptionTier === 'growth' ? 'Growth' : subscriptionTier === 'operator' ? 'Operator' : 'Standard';
  const isPaidTier = subscriptionTier !== 'free';
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userEmail = session?.user?.email || '';
  const userId = session?.user?.id;
  // Initials: two letters only when user explicitly provides two names (e.g. "Jo Chanae" → "JC").
  // Single name → single letter ("Jo" → "J") to respect identity and avoid wrong-feeling monograms.
  const computeInitials = (name: string, email: string): string => {
    const source = (name || '').trim();
    if (source) {
      const parts = source.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    if (email) {
      const prefix = email.split('@')[0] || '';
      return prefix.charAt(0).toUpperCase() || '?';
    }
    return '?';
  };

  // Load user profile
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('users')
      .select('avatar_url, display_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.display_name) setDisplayName(data.display_name);
      });
  }, [userId]);

  // Subscribe to global quick-action events from search modal
  useEffect(() => {
    return subscribeQuickAction((action) => {
      if (action === 'open-new-lead') setShowNewLead(true);
      else if (action === 'open-zero-trace') setShowShredder(true);
      else if (action === 'export-analytics') {
        if (currentUser?.orgId) exportAnalyticsCsv(currentUser.orgId);
        else toast.error('Sign in required to export');
      }
    });
  }, [currentUser?.orgId]);

  const { data: subscriptionData } = useQuery({
    queryKey: ['user-subscription', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', userId!)
        .eq('status', 'active')
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', userId);

      if (updateError) throw updateError;

      setAvatarUrl(urlWithCacheBust);
      toast.success('Profile photo updated!');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [userId]);

  const { data: adminData } = useQuery({
    queryKey: ['user-admin-role', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId!)
        .eq('role', 'admin')
        .maybeSingle();
      return data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => { setIsPremium(!!subscriptionData); }, [subscriptionData]);
  useEffect(() => { setIsAdmin(!!adminData); }, [adminData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAvatarOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Lock body scroll while the mobile nav drawer is open to prevent
  // touch scroll bleed-through to the page underneath.
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setAvatarOpen(false);
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    addProject(newName.trim(), newDesc.trim());
    setShowNew(false);
    setNewName('');
    setNewDesc('');
    toast.success('Project created');
    if (location.pathname !== '/workspace') {
      setTimeout(() => navigate('/workspace'), 300);
    }
  };

  const showName = displayName || userEmail;


  // Page title map for desktop top bar
  const PAGE_TITLES: Record<string, string> = {
    '/dashboard':      'Dashboard',
    '/projects':       'Projects',
    '/workspace':      'Workspace',
    '/analytics':      'Analytics',
    '/signal-lab':     'Signal Lab',
    '/strategy':       'Strategy Blueprint',
    '/studio':         'Studio',
    
    '/logo-generator': 'Brand Studio',
    '/launch':         'Quick Launch',
    '/settings':       'Settings',
    '/help':           'Help & Support',
    
    '/pricing':        'Billing',
    '/admin':          'Admin Hub',
  };
  const pageTitle = PAGE_TITLES[location.pathname] ?? 'IntoIQ';

  // Keep browser tab title in sync with current route
  useEffect(() => {
    const base = PAGE_TITLES[location.pathname];
    document.title = base ? `${base} · IntoIQ` : 'IntoIQ';
  }, [location.pathname]);

  // Mobile drawer: focus trap + restore focus + Escape to close
  const drawerRef = useRef<HTMLElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!menuOpen) return;
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    const root = drawerRef.current;
    // Focus first focusable element
    const focusables = root?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'
    );
    focusables?.[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); return; }
      if (e.key !== 'Tab' || !root) return;
      const f = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input, select, textarea'
      );
      if (!f.length) return;
      const first = f[0]; const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      // Restore focus to opener
      lastFocusedRef.current?.focus?.();
    };
  }, [menuOpen]);

  // Sidebar nav groups
  const NAV = [
    {
      label: 'Core',
      items: [
        { label: 'Builder',   icon: Sparkles,    path: '/workspace' },
        { label: 'Studio',    icon: Wand2,       path: '/studio' },
        { label: 'Projects',  icon: FolderKanban, path: '/projects' },
      ],
    },
    {
      label: 'Results',
      items: [
        { label: 'Dashboard',  icon: Home,     path: '/dashboard' },
        { label: 'Analytics',  icon: BarChart3, path: '/analytics' },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Signal Lab',     icon: Radio,      path: '/signal-lab' },
        { label: 'Strategy',       icon: TrendingUp, path: '/strategy' },
        { label: 'Quick Launch',   icon: Rocket,     path: '/launch' },
      ],
    },
    {
      label: 'Account',
      items: [
        { label: 'Help',     icon: HelpCircle, path: '/help' },
        { label: 'Settings', icon: Settings,   path: '/settings' },
      ],
    },
  ];

  const sidebarStyle: React.CSSProperties = {
    backgroundColor: 'hsl(var(--background) / 0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  return (
    <>
      {/* ══════════════════════════════════════════
          DESKTOP SIDEBAR  (lg+ only)
      ══════════════════════════════════════════ */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-[220px] flex-col border-r border-border/10"
        style={sidebarStyle}
      >
        {/* Brand row */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-border/10 shrink-0">
          <LogoCapsule size="sm" onClick={() => navigate('/dashboard')} />
          <span className="text-sm font-semibold text-foreground/80 truncate">IntoIQ</span>
          {isPaidTier && (
            <span
              className="ml-auto shrink-0 text-[9px] font-semibold uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-full"
              style={{
                color: 'rgb(212,175,55)',
                background: 'rgba(212,175,55,0.1)',
                border: '0.5px solid rgba(212,175,55,0.3)',
              }}
            >
              {tierLabel}
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-4">
          {NAV.map((section) => (
            <div key={section.label}>
              <p className="px-2 mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/40">
                {section.label}
              </p>
              {section.items.map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors mb-0.5',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
          {isAdmin && (
            <div>
              <p className="px-2 mb-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/40">
                System
              </p>
              <button
                onClick={() => navigate('/admin')}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors mb-0.5',
                  location.pathname === '/admin'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                style={location.pathname === '/admin' ? {} : { color: 'rgba(212,175,55,0.7)' }}
              >
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                Admin Hub
              </button>
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="border-t border-border/10 p-3 space-y-1 shrink-0">
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="relative shrink-0"
            >
              <div
                className="flex h-7 w-7 items-center justify-center overflow-hidden text-xs font-bold text-primary bg-primary/10"
                style={{
                  borderRadius: '28%',
                  boxShadow: isPremium
                    ? '0 0 0 1.5px rgba(212,175,55,0.5)'
                    : '0 0 0 1.5px hsl(var(--primary) / 0.3)',
                }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-7 w-7 object-cover" style={{ borderRadius: '28%' }} />
                ) : (
                  computeInitials(displayName, userEmail)
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                  <Loader2 className="h-3 w-3 text-white animate-spin" />
                </div>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground/80 truncate flex items-center gap-1">
                {showName}
                {isPremium && <Crown className="h-2.5 w-2.5 shrink-0" style={{ color: 'rgb(212,175,55)' }} />}
              </p>
              <p className="text-[10px] text-muted-foreground/50 truncate">Into Innovations</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MOBILE HEADER  (below lg only — unchanged)
      ══════════════════════════════════════════ */}
      <header
        className="lg:hidden glass sticky top-0 z-[60] flex h-14 w-full items-center justify-between border-b border-border/20 pointer-events-auto"
        style={{
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 12px)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 12px)',
          isolation: 'isolate',
        }}
      >
        {/* Left side */}
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 overflow-hidden">
          <button
            onClick={() => setMenuOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 active:scale-95 shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <LogoCapsule size="sm" onClick={() => navigate('/dashboard')} />
          <div className="h-5 w-px bg-border/30 mx-0.5 shrink-0 hidden sm:block" />
          <HeaderProjectSwitcher onCreateNew={() => setShowNew(true)} />
          <button
            onClick={() => navigate('/projects')}
            className={cn(
              "hidden sm:flex h-8 items-center gap-1.5 rounded-full border border-border/30 bg-muted/40 px-2 sm:px-3 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 shrink-0",
              location.pathname === '/projects' && "bg-muted text-foreground"
            )}
            aria-label="My projects"
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Projects</span>
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-border/30 bg-muted/40 text-foreground transition-colors hover:bg-muted active:scale-95 shrink-0"
            aria-label="New project"
          >
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border/30 bg-muted/40 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 shrink-0"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden lg:inline-flex ml-1 h-4 items-center gap-0.5 rounded border border-border/30 bg-background/40 px-1 font-mono text-[9px] text-muted-foreground/60">⌘K</kbd>
          </button>
          <ThemeSwitcher />
          <button
            onClick={() => navigate('/pricing')}
            className={cn(
              "hidden sm:flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] backdrop-blur-md transition-all active:scale-95 shrink-0",
              isPaidTier
                ? "border-gold/40 bg-gold/10 text-gold shadow-[0_0_12px_hsl(var(--gold)/0.18)] hover:shadow-[0_0_18px_hsl(var(--gold)/0.28)]"
                : "border-gold/25 bg-background/40 text-gold/80 hover:border-gold/45 hover:text-gold"
            )}
          >
            {isPaidTier ? (<><Crown className="h-3 w-3" /><span>{tierLabel}</span></>) : (<><span className="text-muted-foreground">Standard</span><span className="text-gold/40">·</span><span>Upgrade</span></>)}
          </button>
          <HeaderCollabStack projectId={activeProjectId} />
          <div ref={avatarRef} className="relative shrink-0">
            <button
              onClick={() => setAvatarOpen(o => !o)}
              className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden transition-all active:scale-95"
              style={{ borderRadius: '28%', boxShadow: isPremium ? '0 0 0 2px rgba(212,175,55,0.55), 0 0 14px rgba(212,175,55,0.22)' : '0 0 0 2px hsl(var(--primary) / 0.3)' }}
              aria-label="User menu"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="h-10 w-10 object-cover" style={{ borderRadius: '28%' }} />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-sm font-bold text-primary" style={{ borderRadius: '28%' }}>
                  {computeInitials(displayName, userEmail)}
                </div>
              )}
            </button>
            {isPremium && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center border shadow-sm" style={{ borderRadius: '32%', background: 'hsl(var(--background) / 0.9)', borderColor: 'rgba(212,175,55,0.4)', boxShadow: '0 0 8px rgba(212,175,55,0.2)' }}>
                <Crown className="h-2.5 w-2.5" style={{ color: 'rgb(212,175,55)', filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.8))' }} />
              </span>
            )}
            {avatarOpen && <div className="fixed inset-0 z-[90] bg-background/60 backdrop-blur-sm lg:hidden" onClick={() => setAvatarOpen(false)} />}
            {avatarOpen && (
              <div className="absolute right-0 top-full mt-2 z-[100] w-64 rounded-[24px] p-5 overflow-hidden animate-in fade-in-0 zoom-in-95 slide-in-from-top-2"
                style={{ backgroundColor: 'hsl(var(--background) / 0.95)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid hsl(var(--border) / 0.3)', boxShadow: '0 20px 50px rgba(0,0,0,0.4)' }}>
                <div className="flex items-center gap-3 pb-3 mb-2">
                  <div className="relative group shrink-0">
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="relative flex h-12 w-12 items-center justify-center rounded-full overflow-hidden transition-all hover:opacity-80">
                      {avatarUrl ? <img src={avatarUrl} alt="Profile" className="h-12 w-12 rounded-full object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">{computeInitials(displayName, userEmail)}</div>}
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="h-4 w-4 text-white" /></div>
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">{showName}{isPremium && <Crown className="h-3 w-3 shrink-0" style={{ color: 'rgb(212,175,55)' }} />}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{uploading ? 'Uploading…' : isPremium ? '💎 Premium' : 'Free plan'}</p>
                  </div>
                </div>
                <div className="h-px w-full mb-2" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border) / 0.3), transparent)' }} />
                <button onClick={() => { setAvatarOpen(false); navigate('/settings'); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"><User className="h-4 w-4" /> Profile</button>
                <button onClick={() => { setAvatarOpen(false); navigate('/pricing'); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"><CreditCard className="h-4 w-4" /> Billing</button>
                <button onClick={() => { setAvatarOpen(false); navigate('/settings'); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"><Settings className="h-4 w-4" /> Settings</button>
                <button onClick={() => { setAvatarOpen(false); navigate('/help'); }} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50"><HelpCircle className="h-4 w-4" /> Help & Support</button>
                {isAdmin && (<><div className="h-px mx-2 my-2" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,80,0.2), transparent)' }} /><button onClick={() => { setAvatarOpen(false); navigate('/admin'); }} className="flex w-full items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all relative overflow-hidden" style={{ color: 'rgb(212,175,55)', background: 'rgba(212,175,80,0.08)', border: '1px solid rgba(212,175,55,0.25)' }}><ShieldCheck className="h-4 w-4" /><span>Admin Hub</span><span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ color: 'rgb(212,175,55)', background: 'rgba(212,175,55,0.15)', border: '0.5px solid rgba(212,175,55,0.4)' }}>Super</span></button></>)}
                <div className="h-px mx-2 my-2" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border) / 0.2), transparent)' }} />
                <button onClick={handleSignOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-destructive/70 transition-colors hover:text-destructive hover:bg-destructive/5"><LogOut className="h-4 w-4" /> Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════ */}
      <div className="lg:pl-[220px] flex min-h-screen min-w-0 flex-col overflow-x-hidden">

        {/* Desktop slim top bar (lg+ only) */}
        <div
          className="hidden lg:flex h-12 sticky top-0 z-40 items-center px-5 gap-3 border-b border-border/10 shrink-0"
          style={{ backgroundColor: 'hsl(var(--background) / 0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <span className="text-sm font-semibold text-foreground/80">{pageTitle}</span>
          <div className="flex-1" />
          <HeaderProjectSwitcher onCreateNew={() => setShowNew(true)} />
          <button
            onClick={() => setShowNew(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border/30 bg-muted/40 text-foreground transition-colors hover:bg-muted active:scale-95 shrink-0"
            aria-label="New project"
          >
            <Plus className="h-4 w-4 text-primary" />
          </button>
          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-full border border-border/30 bg-muted/40 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 shrink-0"
            aria-label="Search"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <kbd className="ml-1 h-4 inline-flex items-center gap-0.5 rounded border border-border/30 bg-background/40 px-1 font-mono text-[9px] text-muted-foreground/60">⌘K</kbd>
          </button>
          <ThemeSwitcher />
          <HeaderCollabStack projectId={activeProjectId} />
        </div>

        {/* Page content */}
        <div className="min-w-0 flex-1 overflow-x-hidden pt-4 sm:pt-6 pb-24 lg:pb-12">
          <Outlet />
        </div>

        <QuinnContextChip />
        <GlobalQuinnFooter />
        <FirstLeadCelebration />
      </div>

      {/* ══════════════════════════════════════════
          MOBILE SLIDE-IN DRAWER  (unchanged)
      ══════════════════════════════════════════ */}
      {menuOpen && (
        <div className="fixed inset-0 z-[200]" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-background/60 backdrop-blur-md animate-in fade-in-0 duration-200 touch-none overscroll-contain" onTouchMove={(e) => e.preventDefault()} />
          <nav
            ref={drawerRef as React.RefObject<HTMLElement>}
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="absolute left-0 top-0 h-full w-72 max-w-[80vw] p-6 flex flex-col overflow-y-auto overscroll-contain animate-in slide-in-from-left duration-300"
            style={{ backgroundColor: 'hsl(var(--background) / 0.97)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', borderRight: '1px solid hsl(var(--border) / 0.2)', boxShadow: '4px 0 40px rgba(0,0,0,0.3)', WebkitOverflowScrolling: 'touch' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <LogoCapsule size="sm" />
              <button onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-4">
              {NAV.map((section) => (
                <div key={section.label}>
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">
                    {section.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {section.items.map((item) => {
                      const isActive = location.pathname === item.path ||
                        (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                      return (
                        <button
                          key={item.path}
                          onClick={() => { setMenuOpen(false); navigate(item.path); }}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                            isActive
                              ? "text-primary bg-primary/10 font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 text-left">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {isAdmin && (
                <div>
                  <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/40">
                    System
                  </p>
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/admin'); }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      location.pathname === '/admin'
                        ? "text-primary bg-primary/10 font-medium"
                        : "hover:bg-muted/50"
                    )}
                    style={location.pathname === '/admin' ? {} : { color: 'rgba(212,175,55,0.8)' }}
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">Admin Hub</span>
                  </button>
                </div>
              )}
            </nav>
            <div className="mt-auto pt-4">
              <div className="h-px mb-4" style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--border) / 0.2), transparent)' }} />
              <div className="flex items-center justify-between">
                <button onClick={() => { setMenuOpen(false); handleSignOut(); }} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-destructive/70 transition-colors hover:text-destructive hover:bg-destructive/5">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
                <Button variant="ghost" size="sm" className="gap-2 text-xs text-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-all" onClick={() => { setMenuOpen(false); setTimeout(() => setShowShredder(true), 300); }}>
                  <ShieldOff className="h-3.5 w-3.5" />
                  <span>Zero-Trace</span>
                </Button>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* ══════════════════════════════════════════
          DIALOGS & MODALS  (unchanged)
      ══════════════════════════════════════════ */}
      <AlertDialog open={showShredder} onOpenChange={setShowShredder}>
        <AlertDialogContent className="glass border-destructive/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><ShieldOff className="h-5 w-5 text-destructive" />Mental Shredder</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              This will <strong>permanently destroy</strong> all local data on this device — cached content, session tokens, stored preferences, and browser storage. You will be signed out immediately.
              <br /><br />
              <span className="text-muted-foreground/60">Your cloud data (projects, funnels, pages) remains safe in your account. This only wipes the local footprint.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                try {
                  localStorage.clear(); sessionStorage.clear();
                  if (window.indexedDB?.databases) { const dbs = await window.indexedDB.databases(); for (const db of dbs) { if (db.name) window.indexedDB.deleteDatabase(db.name); } }
                  if ('caches' in window) { const keys = await caches.keys(); await Promise.all(keys.map(k => caches.delete(k))); }
                  if (navigator.serviceWorker) { const regs = await navigator.serviceWorker.getRegistrations(); await Promise.all(regs.map(r => r.unregister())); }
                  await supabase.auth.signOut();
                  toast.success('Zero-Trace activated. All local data destroyed.', { description: 'Your workspace has been wiped clean.', duration: 3000 });
                  setTimeout(() => { window.location.href = '/'; }, 1500);
                } catch { await supabase.auth.signOut().catch(() => {}); window.location.href = '/'; }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              <ShieldOff className="h-4 w-4" /> Activate Zero-Trace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project name" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            <Textarea placeholder="Description (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
          </div>
          <DialogFooter><Button onClick={handleCreate}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <GlobalSearchModal open={searchOpen} onOpenChange={setSearchOpen} />
      <QuickCreateLeadModal open={showNewLead} onOpenChange={setShowNewLead} />
      <KnowledgeHint />
    </>
  );
}
