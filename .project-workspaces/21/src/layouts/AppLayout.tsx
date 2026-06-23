import { useEffect, useState, useCallback, useRef } from 'react';
import SwipePillarWrapper, { getPillarIndex, getPillarTransitionVariants } from '@/components/SwipePillarWrapper';
import { AnimatePresence, motion } from 'framer-motion';
import FindFriendSheet from '@/components/FindFriendSheet';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAppContext } from '@/contexts/AppContext';
import { logger } from '@/utils/logger';
import AppHeader from '@/components/AppHeader';
import UserAvatarLightbox from '@/components/UserAvatarLightbox';
import AppFooterBar from '@/components/AppFooterBar';

import PWAInstallBanner from '@/components/PWAInstallBanner';
import LoadingSpinner from '@/components/LoadingSpinner';
import LandingPage from '@/components/LandingPage';
import WelcomeSetup from '@/components/WelcomeSetup';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import DobPromptDialog from '@/components/DobPromptDialog';
import GlobalBackdrop from '@/components/GlobalBackdrop';
import OfflineBanner from '@/components/OfflineBanner';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { hasPendingInsight } from '@/components/PrivateInsightCard';
import { hasSeenWelcome, hasSeenManifesto } from '@/components/WelcomeEnvelope';
import { useVibePoints } from '@/hooks/useVibePoints';
import { Home, MessageCircle, BookOpen, Globe, MonitorPlay, Settings, LogOut, Crown, FlaskConical, ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, ClipboardList, Search, Paintbrush, Gift, Compass } from 'lucide-react';
import LiveLearnSheet from '@/components/LiveLearnSheet';
import CompaniLogo from '@/components/CompaniLogo';
import { cn } from '@/lib/utils';
import { isUnder13, isMinor, calculateAge, treatAsMinor } from '@/lib/ageUtils';
import { toast } from 'sonner';
import { useAdminSetting } from '@/hooks/useAdminSettings';
import { useAbsenceDetection } from '@/hooks/useAbsenceDetection';
import { useNudgeEngine } from '@/hooks/useNudgeEngine';
import { SoundscapeProvider } from '@/contexts/SoundscapeContext';
import { useNightMode } from '@/hooks/useNightMode';
import { useGeoLocation } from '@/hooks/useGeoLocation';
import { useFoundingMemberStatus } from '@/hooks/useFoundingMemberStatus';
import FoundingBadgeReveal from '@/components/FoundingBadgeReveal';
import FoundingSnapshot from '@/components/FoundingSnapshot';
import { useFoundingNotifications } from '@/hooks/useFoundingNotifications';
import { useViewUsageTracker } from '@/hooks/useViewUsageTracker';
import { getStoredAnchor, anchorToRoute, useLastPageTracker } from '@/hooks/useHomeAnchor';

const SIDEBAR_STORAGE_KEY = 'compani-sidebar-state';

export default function AppLayout() {
  const queryClient = useQueryClient();
  useOfflineSync();
  useViewUsageTracker(); // Phase 3 — track which pinnable view the user opens
  useLastPageTracker(); // Remember last visited page for resume-on-reopen
  const circadianPhase = useNightMode(); // Circadian CSS variable shift (10 PM – 5 AM)
  const isDeepSleep = circadianPhase === 'night';
  

  // iOS PWA session recovery: when user returns to the PWA after OAuth in Safari,
  // the auth state may not have fired. Re-check session on every visibility restore.
  // Refresh data when user returns to the app (PWA foreground resume).
  // visibilitychange fires reliably on both iOS and Android PWAs when the
  // user switches back from another app — window focus events do NOT.
  // We debounce to avoid hammering the DB on rapid tab switches.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastRefresh = 0;
    const DEBOUNCE_MS = 10_000; // at most once every 10 seconds

    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastRefresh < DEBOUNCE_MS) return;
      lastRefresh = now;

      // Always re-validate the session so auth tokens stay fresh
      supabase.auth.getSession().catch(() => {});

      // Invalidate the key queries so stale data refreshes automatically.
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-feed'] });
      queryClient.invalidateQueries({ queryKey: ['notification-badges'] });
      queryClient.invalidateQueries({ queryKey: ['companion-plans'] });
      queryClient.invalidateQueries({ queryKey: ['companion-plans-completed'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [queryClient]);
  const {
    user, profile, connections, companionMemberId,
    loading, profileFetched, signOut, saveProfile, updateProfile, markTabSeen,
    badges, subscription, kidsMode,
    activeConnection, activeConnectionIndex, setActiveConnectionIndex,
    fetchArchivedConnections,
  } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation();
  const prevPathnameRef = useRef<string | null>(null);
  const { balance: vibePoints } = useVibePoints(user?.id ?? null);
  const { subscribed, startCheckout } = subscription;
  useGeoLocation(user?.id, connections[0]?.name, {
    homeCity: profile?.homeCity,
    homeLat: profile?.homeLat,
    homeLon: profile?.homeLon,
    workCity: profile?.workHubCity,
    workLat: profile?.workLat,
    workLon: profile?.workLon,
  });
  const { showReveal, showSnapshot, serialNumber: foundingSerial, tier: foundingTier, claimDate: foundingClaimDate, markAsNotified, markSnapshotSaved } = useFoundingMemberStatus();
  const { notifications: foundingNotifications, dismiss: dismissFoundingNotification } = useFoundingNotifications();
  const circlesBeta = useAdminSetting('circles_beta_label');
  const onboardingComplete = hasSeenManifesto() && hasSeenWelcome();
  const circlesDisabled = useAdminSetting('circles_disabled');

  // queryClient already declared at top of component

  const [hasArchivedSidebar, setHasArchivedSidebar] = useState(false);
  const [showFindFriend, setShowFindFriend] = useState(false);
  const [showProfileCard, setShowProfileCard] = useState(false);
  const [hasPendingInsightFlag, setHasPendingInsightFlag] = useState(false);

  // Check for pending insight on mount and periodically
  useEffect(() => {
    setHasPendingInsightFlag(hasPendingInsight());
    const interval = setInterval(() => setHasPendingInsightFlag(hasPendingInsight()), 3000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    fetchArchivedConnections().then(arr => setHasArchivedSidebar(arr.length > 0));
  }, [fetchArchivedConnections, connections.length]);

  // ── Companion expression system ──
  const companionName = activeConnection?.name || profile?.companionName || '';
  const absence = useAbsenceDetection(user?.id ?? null, companionName, activeConnection?.connectionMode || 'friend');
  useNudgeEngine({
    userId: user?.id ?? null,
    companionName,
    communicationStyle: activeConnection?.communicationStyle ?? null,
    daysSinceLastLogin: absence.daysSinceLastLogin,
  });

  // ── Welcome / Welcome Back toast — role-aware for returning users ──
  const welcomeShownRef = useRef(false);
  useEffect(() => {
    if (welcomeShownRef.current || !user?.id || !profileFetched || location.pathname !== '/') return;
    // Delay toast on Think Freely (home) to let opening animation finish
    const WELCOME_TOAST_DELAY = 4500;
    welcomeShownRef.current = true;

    const displayName = profile?.preferredName || profile?.userName || 'friend';
    const welcomeKey = `compani-welcomed-${user.id}`;
    const isFirstVisit = !localStorage.getItem(welcomeKey);

    if (isFirstVisit) {
      localStorage.setItem(welcomeKey, 'true');
      setTimeout(() => {
        toast(`Welcome to Compani, ${displayName} 💛`, {
          description: 'Your space is ready. Everything here stays between us.',
          duration: 4000,
          position: 'bottom-right',
        });
      }, WELCOME_TOAST_DELAY);
    } else {
      // Role-aware returning-user toast with companion context
      const conn = activeConnection;
      const cName = conn?.name;
      const mode = conn?.connectionMode || 'friend';

      let message = `Welcome back, ${displayName} ✨`;
      if (cName) {
        const roleMessages: Record<string, string> = {
          friend: `${cName} is here whenever you're ready.`,
          romantic: `Your space with ${cName} is waiting 💛`,
          mentor: `Welcome back. ${cName} has updated your Blueprint.`,
          accountability: `${cName} is ready to check in — let's go 💪`,
          assistant: `${cName} is standing by with updates for you.`,
          'kids-companion': `${cName} is excited to see you! 🌟`,
        };
        message = roleMessages[mode] || roleMessages.friend;
      }

      const actionLabels: Record<string, string> = {
        friend: 'Open your space',
        romantic: 'Open your space',
        mentor: 'Open Blueprint',
        accountability: 'Open Blueprint',
        assistant: 'Open dashboard',
        'kids-companion': 'Open space',
      };
      const actionLabel = actionLabels[mode] || 'Open your space';

      setTimeout(() => {
        toast(message, {
          duration: 3500,
          position: 'bottom-right',
          action: connections.length > 0 ? {
            label: actionLabel,
            onClick: () => navigate('/my-world'),
          } : undefined,
        });
      }, WELCOME_TOAST_DELAY);
    }
  }, [user?.id, profileFetched, profile?.preferredName, profile?.userName, activeConnection, connections.length, navigate]);

  // ── Auto-trigger checkout from landing page plan selection ──
  const pendingPlanHandled = useRef(false);
  useEffect(() => {
    if (pendingPlanHandled.current || !user?.id || !profileFetched) return;
    const pendingPlan = sessionStorage.getItem('compani-pending-plan');
    if (!pendingPlan) return;
    pendingPlanHandled.current = true;
    sessionStorage.removeItem('compani-pending-plan');

    // Import STRIPE_TIERS dynamically to check validity
    import('@/hooks/useSubscription').then(({ STRIPE_TIERS }) => {
      const tier = STRIPE_TIERS[pendingPlan as keyof typeof STRIPE_TIERS];
      if (tier) {
        toast('Opening checkout…', { duration: 2000, position: 'top-center' });
        startCheckout(tier.price_id).catch(() => {
          toast.error('Could not open checkout. You can upgrade from Settings anytime.');
        });
      }
    });
  }, [user?.id, profileFetched, startCheckout]);


  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) return stored === 'expanded';
    // Default: expanded on xl+ (1280px), collapsed on lg (1024-1279)
    return typeof window !== 'undefined' && window.innerWidth >= 1280;
  });

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded(prev => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? 'expanded' : 'collapsed');
      return next;
    });
  }, []);

  // Check admin role
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user?.id) { setIsAdmin(false); return; }
    supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user?.id]);

  const isInChat = location.pathname.startsWith('/chat/');
  const isInMatchmaking = false;
  const isInCircles = location.pathname === '/circles' || location.pathname.startsWith('/circles/');

  // Show DOB prompt ONLY for users who truly don't have a DOB in the database.
  // Returning users who already completed onboarding skip this entirely.
  // IMPORTANT: default to `null` (undecided) — never show the dialog until DB confirms.
  const [showDobPrompt, setShowDobPrompt] = useState<boolean | null>(null);
  const dobCheckedRef = useRef(false);

  useEffect(() => {
    if (!user || !profile || loading) return;

    // If the cached profile already has a DOB, skip immediately
    if (profile.dateOfBirth) {
      setShowDobPrompt(false);
      dobCheckedRef.current = true;
      return;
    }

    // If we already checked the DB this session, don't re-check
    if (dobCheckedRef.current) return;
    dobCheckedRef.current = true;

    // Double-check the DB directly to guard against stale cache.
    supabase
      .from('profiles')
      .select('date_of_birth')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data?.date_of_birth) {
          // DB has DOB — update cache and skip prompt
          updateProfile({ dateOfBirth: data.date_of_birth } as any);
          setShowDobPrompt(false);
        } else {
          // No DOB — WelcomeSetup gate will handle this (line ~434)
          setShowDobPrompt(true);
        }
      });
  }, [user, profile, loading, updateProfile]);

  // Pick up pending companion from carousel Connect button (survives auth + onboarding)
  // pendingCompanion redirect — now sends to /browse instead of /connect
  useEffect(() => {
    if (!user || !profile || loading) return;
    const pending = sessionStorage.getItem('pendingCompanion');
    if (pending) {
      const onboardingPath = profile.onboardingPath;
      if (onboardingPath === 'browse' || onboardingPath === 'studio') {
        sessionStorage.removeItem('pendingCompanion');
        return;
      }
      sessionStorage.removeItem('pendingCompanion');
      try {
        const state = JSON.parse(pending);
        navigate('/browse', { state, replace: true });
      } catch { /* ignore corrupt data */ }
    }
  }, [user, profile, loading, navigate]);

  const handleDobSubmit = useCallback(async (dob: string, parentEmail?: string) => {
    // Write directly to DB first — don't rely on optimistic cache
    const under13 = isUnder13(dob);
    const minor1317 = isMinor(dob);
    const setKidsMode = under13 || minor1317;
    const dbUpdates: Record<string, unknown> = {
      date_of_birth: dob,
      parental_consent_email: parentEmail || null,
      parental_consent_granted: false,
      ...(setKidsMode ? { kids_mode: true } : {}),
    };
    const { error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('user_id', user!.id);

    if (error) {
      console.error('[DOB] Failed to save:', error);
      throw error; // Let DobPromptDialog show the error
    }

    // DB confirmed — now update cache so the prompt goes away
    await updateProfile({
      dateOfBirth: dob,
      parentalConsentEmail: parentEmail || null,
      parentalConsentGranted: false,
      ...(setKidsMode ? { kidsMode: true } : {}),
    } as any);

    // Force refetch profile from DB to ensure in-memory cache has the saved DOB
    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('date_of_birth')
      .eq('user_id', user!.id)
      .maybeSingle();

    if (freshProfile?.date_of_birth) {
      // Update cache again with confirmed DB value
      await updateProfile({ dateOfBirth: freshProfile.date_of_birth } as any);
    }

    // Send parental consent email if under-13 user provided a parent email
    if (parentEmail && under13) {
      try {
        await supabase.functions.invoke('send-parental-consent-email', {
          body: {
            parentEmail,
            childName: profile?.preferredName || profile?.userName || 'Your child',
            childAge: calculateAge(dob),
          },
        });
      } catch (emailErr) {
        console.warn('[DOB] Parental consent email failed (non-blocking):', emailErr);
      }
    }

    setShowDobPrompt(false);
  }, [user, updateProfile]);

  // (prefillName removed — no longer needed with new onboarding flow)

  if (loading) {
    return (
      <div className="flex min-h-[100svh] w-full items-center justify-center" style={{ background: '#0f1221' }}>
        <LoadingSpinner size="lg" label="Loading your world…" />
      </div>
    );
  }

  if (!user) return <><OfflineBanner /><ErrorBoundary><LandingPage /></ErrorBoundary></>;

  // Guard: user exists but profile fetch hasn't completed yet — show spinner, not onboarding.
  // profileFetched only becomes true after the profile query resolves (data or null).
  if (user && !profileFetched) {
    return (
      <div className="flex min-h-[100svh] w-full items-center justify-center" style={{ background: '#0f1221' }}>
        <LoadingSpinner size="lg" label="Loading your world…" />
      </div>
    );
  }

  // ── Welcome Setup Gate ──────────────────────────────────────────────────────
  // New users (any signup method) who have no DOB saved see WelcomeSetup once.
  // Existing users with DOB already saved skip this entirely.
  // Replaces the old onboarding gate — no companion choice required upfront.
  const hasExistingConnection = connections && connections.length > 0;

  // Blocked account gate — must show before any other screen
  if (profile && (profile as any).isBlocked) {
    return (
      <div className="flex min-h-[100svh] w-full flex-col items-center justify-center px-6 text-center" style={{ background: '#0f1221' }}>
        <div className="max-w-sm space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-destructive/20 flex items-center justify-center text-4xl">
            🚫
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Account suspended</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Your account has been suspended due to a violation of our community guidelines.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              If you believe this is a mistake, contact us at{' '}
              <a href="mailto:support@mycompani.app" className="text-primary hover:underline">
                support@mycompani.app
              </a>
            </p>
          </div>
          <button
            onClick={signOut}
            className="w-full py-3 rounded-2xl text-sm font-semibold bg-white/10 text-foreground hover:bg-white/15 transition-all"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (profile && !profile.dateOfBirth) {
    return (
      <ErrorBoundary>
        <WelcomeSetup
          initialName={profile.userName || ''}
          onComplete={async (name, dob, parentEmail) => {
            // Save name + DOB together
            const under13 = isUnder13(dob);
            const minor1317 = isMinor(dob);
            const setKidsMode = under13 || minor1317;
            // Check if this is the test account (serial #0) — keep onboarding_completed false
            // so the full ceremony chain replays after DOB gate
            const { data: serialRow } = await supabase
              .from('beta_serial_numbers')
              .select('serial_number')
              .eq('user_id', user!.id)
              .maybeSingle();
            const isTestAccount = serialRow?.serial_number === 0;

            const dbUpdates: Record<string, unknown> = {
              user_name: name,
              date_of_birth: dob,
              onboarding_completed: isTestAccount ? false : true,
              parental_consent_email: parentEmail || null,
              parental_consent_granted: false,
              ...(setKidsMode ? { kids_mode: true } : {}),
            };
            const { error } = await supabase
              .from('profiles')
              .update(dbUpdates)
              .eq('user_id', user!.id);
            if (error) throw error;

            await updateProfile({
              userName: name,
              dateOfBirth: dob,
              parentalConsentEmail: parentEmail || null,
              parentalConsentGranted: false,
              ...(setKidsMode ? { kidsMode: true } : {}),
            } as any);

            // Send parental consent email if under-13
            if (parentEmail && under13) {
              try {
                await supabase.functions.invoke('send-parental-consent-email', {
                  body: { parentEmail, childName: name, childAge: calculateAge(dob) },
                });
              } catch (emailErr) {
                console.warn('[WelcomeSetup] Parental consent email failed (non-blocking):', emailErr);
              }
            }

            // Full reload ensures fresh profile data — WelcomeEnvelope ceremony will show next
            window.location.href = '/';
          }}
        />
      </ErrorBoundary>
    );
  }

  // Auto-fix: existing users without onboarding_completed flag — patch silently
  // Only applies to users who already have companions (pre-flag legacy users).
  // New users mid-ceremony won't have connections yet — don't auto-patch them.
  // Skip test account (serial #0) so it can replay ceremonies.
  if (profile && !(profile as any).onboardingCompleted && user && hasExistingConnection) {
    supabase.from('beta_serial_numbers').select('serial_number').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (data?.serial_number !== 0) {
        supabase.from('profiles').update({ onboarding_completed: true } as any).eq('user_id', user.id).then(() => {});
      }
    });
  }

  // DOB is now collected before onboarding — this catches edge cases
  // where an existing user somehow has no DOB (e.g. pre-DOB accounts).
  if (showDobPrompt === true) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-[100svh] w-full items-center justify-center" style={{ background: '#0f1221' }}>
          <DobPromptDialog open onSubmit={handleDobSubmit} />
        </div>
      </ErrorBoundary>
    );
  }

  // Under 13 without parental consent — show waiting screen after onboarding
  const under13AwaitingConsent = profile && isUnder13(profile.dateOfBirth) && !profile.parentalConsentGranted;
  if (under13AwaitingConsent) {
    return (
      <ErrorBoundary>
        <div className="flex min-h-[100svh] w-full flex-col items-center justify-center px-6" style={{ background: '#0f1221' }}>
          <div className="max-w-sm text-center space-y-6">
            {/* Friendly illustration placeholder */}
            <div className="w-32 h-32 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center text-5xl">
              💛
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Your account is waiting for a parent&apos;s approval
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                We sent an email to your parent — once they approve, you&apos;re all set! 💛
              </p>
            </div>
            <button
              onClick={signOut}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold bg-white/10 text-foreground hover:bg-white/15 transition-all"
            >
              Sign out
            </button>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  const isInStudio = location.pathname === '/studio';
  const isInAdmin = location.pathname === '/admin';
  const isInThinkFreely = location.pathname === '/think-freely' || location.pathname === '/';
  const isFullBleed = ['/', '/think-freely', '/browse', '/threads', '/store', '/favorites', '/messages', '/vault'].includes(location.pathname);

  // Full-screen routes (no header/nav) — chat, matchmaking, circles
  // Circles are full-bleed (no app-shell max-width cap) — wrapped in bg-background for theme inheritance
  if (isInCircles) {
    return (
      <div className="min-h-[100svh] text-foreground relative" style={{ background: 'hsl(240 20% 5%)' }}>
        <OfflineBanner />
        {/* No GlobalBackdrop — Circles have their own self-contained dark backgrounds */}
        <div className="relative z-10">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  if (isInChat || isInMatchmaking) {
    return (
      <div className="min-h-[100svh] w-full relative">
        <OfflineBanner />
        <GlobalBackdrop />
        <div className="relative z-10">
          <ErrorBoundary>
            <SwipePillarWrapper>
              <Outlet />
            </SwipePillarWrapper>
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  if (isInAdmin) {
    return (
      <div className="relative">
        <OfflineBanner />
        <GlobalBackdrop />
        <div className="relative z-10">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  // Studio: full-width breakout (hero needs 100vw) — with pull-to-refresh
  if (isInStudio) {
    return (
      <div className="relative min-h-[100svh]">
        <OfflineBanner />
        <GlobalBackdrop />
        <div className="relative z-10">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  // Full-bleed routes and default: full-width background, centered content
  return (
    <SoundscapeProvider>
    <div className="relative min-h-[100svh] w-full overflow-x-hidden">
      <OfflineBanner />
      {!isInThinkFreely && <GlobalBackdrop />}
      <div className="relative z-10 flex h-[100svh]">

        {/* ── Desktop/Tablet persistent sidebar (hidden below lg) ── */}
        <aside
          className={cn(
            'hidden lg:flex shrink-0 flex-col border-r border-white/10 backdrop-blur-xl h-[100svh] sticky top-0 z-20 transition-all duration-300 ease-in-out',
            'bg-background/90',
            sidebarExpanded ? 'w-60 xl:w-64' : 'w-16'
          )}
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
        >
          {/* Sidebar header with toggle */}
          <div className={cn('flex flex-col border-b border-border/30', sidebarExpanded ? 'px-4 py-4' : 'px-0 py-3 items-center')}>
            {sidebarExpanded ? (
              <div className="flex items-center justify-between w-full">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 transition-opacity hover:opacity-80">
                  <CompaniLogo size="md" />
                </button>
                <button
                  onClick={toggleSidebar}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={toggleSidebar}
                className="flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors w-10 h-8"
                title="Expand sidebar"
              >
                <ChevronsRight className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Active companion card with cycling */}
          {connections.length > 0 && (
            <div className="border-b border-border/30">
              <div className={cn(
                'flex items-center w-full',
                sidebarExpanded ? 'gap-2 p-2.5 mx-1.5 my-2' : 'flex-col py-3 gap-1'
              )}>
                {/* Left arrow — always visible for premium, guides discovery */}
                {subscribed && (
                  <button
                    onClick={() => {
                      if (connections.length < 2) {
                        if (hasArchivedSidebar) {
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
                      const prev = (activeConnectionIndex - 1 + connections.length) % connections.length;
                      setActiveConnectionIndex(prev);
                    }}
                    className={cn(
                      'flex items-center justify-center rounded-full transition-colors',
                      connections.length >= 2
                        ? 'text-muted-foreground hover:text-primary hover:bg-muted/60'
                        : 'text-muted-foreground/40',
                      sidebarExpanded ? 'h-6 w-6 shrink-0' : 'h-5 w-5'
                    )}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Avatar + name */}
                <button
                  onClick={() => navigate(`/chat/${activeConnection?.memberId || connections[0].memberId}`)}
                  className={cn(
                    'flex items-center hover:bg-muted/60 transition-colors rounded-xl',
                    sidebarExpanded ? 'gap-3 flex-1 min-w-0 p-1 text-left' : 'justify-center'
                  )}
                >
                  <div className={cn('rounded-full overflow-hidden bg-muted shrink-0', sidebarExpanded ? 'h-10 w-10' : 'h-9 w-9')}>
                    {(activeConnection || connections[0]).avatarUrl
                      ? <img src={(activeConnection || connections[0]).avatarUrl} alt={(activeConnection || connections[0]).name} className="h-full w-full object-cover" />
                      : <span className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">{(activeConnection || connections[0]).name.charAt(0)}</span>
                    }
                  </div>
                  {sidebarExpanded && (
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{(activeConnection || connections[0]).name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {connections.length >= 2 ? `${activeConnectionIndex + 1} of ${connections.length}` : 'Active companion'}
                      </p>
                    </div>
                  )}
                </button>

                {/* Set as primary button — visible when viewing a non-primary companion */}
                {sidebarExpanded && connections.length >= 2 && activeConnectionIndex > 0 && (
                  <button
                    onClick={async () => {
                      const conn = activeConnection || connections[0];
                      await updateProfile({ companionName: conn.name, companionAvatarUrl: conn.avatarUrl });
                      // Move this connection to index 0 by reordering
                      toast.success(`${conn.name} is now your primary companion 💛`);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-muted/60 shrink-0"
                    title="Set as primary companion"
                  >
                    ⭐ Primary
                  </button>
                )}

                {/* Right arrow — always visible for premium */}
                {subscribed && (
                  <button
                    onClick={() => {
                      if (connections.length < 2) {
                        if (hasArchivedSidebar) {
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
                      const next = (activeConnectionIndex + 1) % connections.length;
                      setActiveConnectionIndex(next);
                    }}
                    className={cn(
                      'flex items-center justify-center rounded-full transition-colors',
                      connections.length >= 2
                        ? 'text-muted-foreground hover:text-primary hover:bg-muted/60'
                        : 'text-muted-foreground/40',
                      sidebarExpanded ? 'h-6 w-6 shrink-0' : 'h-5 w-5'
                    )}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Nav items */}
          <nav className={cn('flex-1 overflow-y-auto space-y-0.5', sidebarExpanded ? 'p-3' : 'p-1.5', isDeepSleep && 'animate-deep-sleep')}>
            {(() => {
              const storedAnchor = getStoredAnchor();
              const homeRoute = anchorToRoute(storedAnchor, connections[activeConnectionIndex]?.memberId);
              const isNonDefaultAnchor = storedAnchor !== 'dashboard';
              return [
                { icon: Home, label: 'Home', path: homeRoute, pinned: isNonDefaultAnchor },
                { icon: MessageCircle, label: 'Messages', path: '/messages' },
                { icon: ClipboardList, label: 'Plans', path: '/plans' },
                { icon: BookOpen, label: 'Story', path: '/story' },
                { icon: Globe, label: 'Blueprint', path: '/personal-intel' },
                { icon: Compass, label: 'Journey', path: '/passport' },
                { icon: Search, label: 'Browse', path: '/browse' },
                { icon: Paintbrush, label: 'Studio', path: '/studio' },
                { icon: Gift, label: 'Gift Shop', path: '/store' },
                { icon: Crown, label: subscribed ? 'My Plan' : 'Premium', path: '/pricing' },
              ].map(({ icon: SideIcon, label, path, pinned }) => (
                <button
                  key={label}
                  onClick={() => {
                    const isKidUser = profile?.dateOfBirth ? treatAsMinor(profile.dateOfBirth) : false;
                    if (path === '/circles' && circlesDisabled.value && !isAdmin && !isKidUser) {
                      toast.info('🚧 Circles is under construction', { description: 'This feature is coming soon!' });
                      return;
                    }
                    navigate(path);
                  }}
                  className={cn(
                    'flex items-center w-full rounded-xl text-sm font-medium transition-colors duration-1000',
                    sidebarExpanded ? 'gap-3 px-3 py-2.5 text-left' : 'justify-center py-2.5',
                    location.pathname === path
                      ? isDeepSleep ? 'bg-indigo-500/10 text-indigo-400/60' : 'bg-primary/10 text-primary'
                      : isDeepSleep ? 'text-indigo-400/40 hover:text-primary/80 hover:bg-muted/60' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                  title={!sidebarExpanded ? label : undefined}
                >
                  <span className="relative shrink-0">
                    <SideIcon className="h-4 w-4" />
                    {pinned && (
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-400" />
                    )}
                  </span>
                  {sidebarExpanded && (
                    <>
                      {label}
                      {pinned && (
                        <span className="text-[9px] text-amber-400/70 ml-auto">Anchored</span>
                      )}
                      {label === 'Circles' && circlesBeta.value && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/30">Beta</span>
                      )}
                    </>
                  )}
                </button>
              ));
            })()}

            {/* Live & Learn */}
            {sidebarExpanded ? (
              <LiveLearnSheet
                trigger={
                  <button className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-left text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                    <MonitorPlay className="h-4 w-4" />
                    Live &amp; Learn
                  </button>
                }
              />
            ) : (
              <LiveLearnSheet
                trigger={
                  <button className="flex items-center justify-center w-full rounded-xl py-2.5 text-sm font-medium transition-colors text-muted-foreground hover:bg-muted/60 hover:text-foreground" title="Live & Learn">
                    <MonitorPlay className="h-4 w-4" />
                  </button>
                }
              />
            )}
          </nav>

          {/* Sidebar footer */}
          <div className={cn('border-t border-border/30 space-y-0.5', sidebarExpanded ? 'p-3' : 'p-1.5')}>
            <button
              onClick={() => navigate('/beta-feedback')}
              className={cn(
                'flex items-center w-full rounded-xl text-sm font-medium transition-colors duration-1000',
                sidebarExpanded ? 'gap-3 px-3 py-2.5 text-left' : 'justify-center py-2.5',
                location.pathname === '/beta-feedback'
                  ? isDeepSleep ? 'bg-indigo-500/10 text-indigo-400/60' : 'bg-primary/10 text-primary'
                  : isDeepSleep ? 'text-indigo-400/40 hover:text-primary/80 hover:bg-muted/60' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              title={!sidebarExpanded ? 'Beta Feedback' : undefined}
            >
              <FlaskConical className="h-4 w-4 shrink-0" />
              {sidebarExpanded && 'Beta Feedback'}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className={cn(
                'flex items-center w-full rounded-xl text-sm font-medium transition-colors duration-1000',
                sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5',
                isDeepSleep ? 'text-indigo-400/40 hover:text-primary/80 hover:bg-muted/60' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              )}
              title={!sidebarExpanded ? 'Settings' : undefined}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {sidebarExpanded && 'Settings'}
            </button>
            <button
              onClick={signOut}
              className={cn(
                'flex items-center w-full rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-destructive transition-colors',
                sidebarExpanded ? 'gap-3 px-3 py-2.5' : 'justify-center py-2.5'
              )}
              title={!sidebarExpanded ? 'Sign out' : undefined}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {sidebarExpanded && 'Sign out'}
            </button>
          </div>
        </aside>

        {/* ── Main content area ── */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Header — full-width edge-to-edge on all screens. */}
          <AppHeader
            userName={profile.userName}
            avatarUrl={profile.avatarUrl}
            username={profile.username}
            isAdmin={isAdmin}
            kidsMode={kidsMode}
            onAvatarClick={() => setShowProfileCard(true)}
            onLogoClick={() => navigate('/')}
            onSignOut={signOut}
            onNavigate={(path) => navigate(path)}
            onFindFriend={() => setShowFindFriend(true)}
            notificationCount={badges?.feed || 0}
            vibePoints={vibePoints}
            isPremium={subscribed}
            goldenPulse={hasPendingInsightFlag}
          />
          <FindFriendSheet open={showFindFriend} onClose={() => setShowFindFriend(false)} />
          <UserAvatarLightbox
            open={showProfileCard}
            onClose={() => setShowProfileCard(false)}
            profile={profile}
            onUpdateProfile={updateProfile}
          />

          <div
            data-app-scroller
            className="flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] overscroll-y-contain lg:pb-4 pb-20"
            style={{ minHeight: 0, WebkitOverflowScrolling: 'touch' }}
          >
            <SwipePillarWrapper>
              <AnimatePresence mode="wait" initial={false} onExitComplete={() => { prevPathnameRef.current = location.pathname; }}>
                {(() => {
                  const variants = getPillarTransitionVariants(location.pathname, prevPathnameRef.current);
                  prevPathnameRef.current = location.pathname;
                  return (
                    <motion.div
                      key={location.pathname}
                      initial={variants.initial}
                      animate={variants.animate}
                      exit={variants.exit}
                      transition={variants.transition}
                      className="content-container h-full"
                    >
                      <ErrorBoundary><Outlet /></ErrorBoundary>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </SwipePillarWrapper>
          </div>
        </div>

        {/* Footer — mobile/tablet portrait only. */}
        <div className="lg:hidden">
          <AppFooterBar />
        </div>
      </div>
      
      <PWAInstallBanner />
      {onboardingComplete && showReveal && foundingSerial && foundingTier && (
        <FoundingBadgeReveal
          serialNumber={foundingSerial}
          tier={foundingTier}
          onDismiss={markAsNotified}
        />
      )}
      {onboardingComplete && !showReveal && showSnapshot && foundingSerial && foundingTier && foundingClaimDate && (
        <FoundingSnapshot
          serialNumber={foundingSerial}
          tier={foundingTier}
          claimDate={foundingClaimDate}
          userName={profile?.preferredName || profile?.userName || 'Member'}
          onDismiss={() => markSnapshotSaved()}
          onSaved={() => markSnapshotSaved()}
        />
      )}
      {foundingNotifications.map(n => (
        <motion.div
          key={n.id}
          initial={{ opacity: 0, x: 20, y: -8 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 40 }}
          className="fixed top-[72px] right-4 z-[80] w-[280px] rounded-2xl backdrop-blur-xl overflow-hidden cursor-pointer"
          style={{
            background: 'rgba(19,20,36,0.80)',
            border: '1px solid rgba(212,175,55,0.20)',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.08)',
          }}
          onClick={() => dismissFoundingNotification(n.id)}
        >
          <div className="p-4">
            <p className="text-xs leading-relaxed" style={{ color: 'rgb(212,175,55)' }}>
              {n.message}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
    </SoundscapeProvider>
  );
}
