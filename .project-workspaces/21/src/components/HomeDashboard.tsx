// PERF: 2026-03-15 — Added skeleton loaders — eliminates layout shift during data load
// PERF: 2026-03-15 — Fixed useEffect deps for fetchRecent — prevents stale closure
// PERF: 2026-03-15 — Added mountedRef check in setTimeout — prevents setState after unmount
import { useState, useEffect, useMemo, useCallback, useRef, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import BackdropMenuButton from './BackdropMenuButton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useMilestoneToasts } from '@/hooks/useMilestoneToasts';
import { usePresenceMoment } from '@/hooks/usePresenceMoment';
import { MessageCircle, Star, Sparkles, ChevronRight, ChevronDown, UserPlus, Crown, Lock, Trash2, AlertTriangle, Archive, Shirt, RefreshCw, Camera, SmilePlus, Feather, Newspaper, Compass, Palette, Gift, BookOpen, ClipboardList, CheckCircle2, Calendar, Moon, Waves, MoreHorizontal, MapPin, Globe, Plus } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { useCompanionPlans } from '@/hooks/useCompanionPlans';
import { sendPlanCompletionToChat } from '@/lib/sendPlanCompletionToChat';
import WeeklySummaryCard from './WeeklySummaryCard';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AnimatedGradientHeart from './AnimatedGradientHeart';
import CompanionImageReveal from './CompanionImageReveal';
import AbstractAvatar from './AbstractAvatar';
import DepthSignals from './DepthSignals';
import WelcomeTourCard from './WelcomeTourCard';
import { getMember } from '@/lib/communityPersonas';
import { postImages } from '@/lib/postImages';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { FREE_LIMITS } from '@/hooks/useSubscription';
import type { FavoritePost, MomentSource } from '@/hooks/useFavorites';
import type { DepthSignals as DepthSignalsType } from '@/hooks/useDepthSignals';
import type { Connection, Profile } from '@/hooks/useProfile';
import LiveLearnCarousel from './LiveLearnCarousel';
import CompanionMemorySheet from './CompanionMemorySheet';
import { useTheme } from '@/hooks/useTheme';
import UpgradeBanner from './UpgradeBanner';
import MemoryTimelineSheet from './MemoryTimelineSheet';
import CompanionPresenceCue from './CompanionPresenceCue';
import BriefingBottomSheet from './BriefingBottomSheet';
import ContextStatusBar from './ContextStatusBar';
import PersonalIntelSection from './PersonalIntelSection';
import PrivateInsightCard from './PrivateInsightCard';
// SanctuaryPulseWidget retired — Privacy Mode is now in chat
// PassportSlate now accessed via Globe icon → /passport route
import MemoryRecapPebble from './dashboard/MemoryRecapPebble';
import FounderSecretGesture from './dashboard/FounderSecretGesture';
import LuminousEntry from './dashboard/LuminousEntry';
import PresenceTour from './PresenceTour';
import { useAdminSetting } from '@/hooks/useAdminSettings';
import ThoughtStream from './dashboard/ThoughtStream';
import FocusModeCard from './dashboard/FocusModeCard';
import QuickNoteWidget from './dashboard/QuickNoteWidget';

import { useAbsenceDetection } from '@/hooks/useAbsenceDetection';

interface HomeDashboardProps {
  userName: string;
  companion: {
    memberId?: string;
    name?: string;
    avatarUrl?: string;
    visualMode?: string;
    lastMessage?: string;
    backgroundUrl?: string;
    connectionMode?: string;
  };
  connections: Connection[];
  favorites: FavoritePost[];
  messageCount: number;
  depthSignals: DepthSignalsType;
  subscribed: boolean;
  onOpenCompanion: () => void;
  onOpenMessages: () => void;
  onOpenFavorites: () => void;
  onFindCompanion: () => void;
  onOpenWellness?: () => void;
  onOpenJournal?: () => void;
  onOpenThinkFreely?: () => void;
  onOpenPlans?: () => void;
  onOpenMoodCheckin?: () => void;
  onOpenTimeline?: () => void;
  onOpenThreads?: () => void;
  onOpenBrowse?: () => void;
  onOpenStudio?: () => void;
  onOpenChat: (memberId: string) => void;
  onUpgrade: () => void;
  onRemoveCompanion?: (memberId: string) => void;
  onArchiveCompanion?: (memberId: string) => void;
  onRestoreCompanion?: (memberId: string) => void;
  onSwitchCompanion?: (memberId: string) => void;
  archivedConnections?: Connection[];
  onOpenStore?: () => void;
  onOpenVault?: () => void;
  wardrobeCount?: number;
  onRestoreData?: () => void;
  isMinor?: boolean;
  onUploadBackdrop?: (file: File) => void;
  onDeleteBackdrop?: () => void;
  uploadingBackdrop?: boolean;
  userId: string;
  profile?: Profile | null;
  updateProfile?: (updates: Partial<Profile>) => void;
  focusMode?: {
    isFocusActive: boolean;
    elapsed: number;
    toggle: () => void;
  };
  /**
   * Optional slot rendered directly under the Greeting hero card.
   * Used to anchor the Strategist tile as the "deeper room" door —
   * visually tethered to the welcome moment, not buried below.
   */
  postGreetingSlot?: React.ReactNode;
}

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const first = name.split(' ')[0];
  if (hour < 12) return `Good morning, ${first}`;
  if (hour < 17) return `Good afternoon, ${first}`;
  return `Good evening, ${first}`;
}

const TAGLINES_MORNING = [
  'Your space is ready ☀️',
  'A new day to connect',
  'Your friends are here for you',
  "Today's a good day to be present",
  'Rise & shine — your world is ready',
];

const TAGLINES_AFTERNOON = [
  'Your space is ready ✨',
  'Your people, your pace',
  'Connection starts here',
  'Keep the momentum going',
  'Your friends are thinking of you',
];

const TAGLINES_EVENING = [
  'Wind down with your circle 🌙',
  'Your friends are here for you',
  'Reflect, connect, unwind',
  "You're never alone here",
  'End the day on your terms',
];

function getTagline(): string {
  const hour = new Date().getHours();
  const pool = hour < 12 ? TAGLINES_MORNING : hour < 17 ? TAGLINES_AFTERNOON : TAGLINES_EVENING;
  // Pick a pseudo-random tagline based on the current date so it stays stable within a session
  const daySeed = new Date().getDate() + new Date().getMonth() * 31;
  return pool[daySeed % pool.length];
}

/** Dynamic "frequency" status based on time of day and companion state */
function getFrequencyStatus(hasCompanion: boolean, companionName?: string): { label: string; glow: string } {
  if (!hasCompanion) return { label: 'Calibrating', glow: 'rgba(212,175,80,0.15)' };
  const h = new Date().getHours();
  if (h >= 5 && h < 7) return { label: 'Awaiting Presence', glow: 'rgba(212,175,80,0.12)' };
  if (h >= 7 && h < 10) return { label: 'Initializing Rhythm', glow: 'rgba(212,175,80,0.2)' };
  if (h >= 22 || h < 5) return { label: 'In Repose', glow: 'rgba(147,130,220,0.2)' };
  return { label: 'In Resonance', glow: 'rgba(212,175,80,0.25)' };
}

function getFormattedDate(): string {
  const now = new Date();
  const date = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const time = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${date} · ${time}`;
}

const SOURCE_LABELS: Record<MomentSource, { emoji: string; label: string }> = {
  feed: { emoji: '📌', label: 'Saved' },
  chat: { emoji: '💬', label: 'Chat' },
  milestone: { emoji: '🏆', label: 'Milestone' },
  match: { emoji: '💛', label: 'First meeting' },
};

function getBondLabel(msgCount: number): string {
  if (msgCount <= 10) return 'Just met 👋';
  if (msgCount <= 50) return 'Getting to know each other 🌱';
  if (msgCount <= 150) return 'Growing closer 💛';
  if (msgCount <= 300) return 'Deep bond ✨';
  return 'Unbreakable 🧡';
}

export default function HomeDashboard({
  userName, companion, connections, favorites, messageCount, depthSignals,
  subscribed, onOpenCompanion, onOpenMessages, onOpenFavorites, onFindCompanion,
  onOpenWellness, onOpenJournal, onOpenThinkFreely, onOpenPlans, onOpenMoodCheckin, onOpenTimeline, onOpenThreads, onOpenBrowse, onOpenStudio, onOpenChat, onUpgrade, onRemoveCompanion, onArchiveCompanion, onRestoreCompanion, onSwitchCompanion, archivedConnections, onOpenStore, onOpenVault, wardrobeCount, onRestoreData, isMinor,
  onUploadBackdrop, onDeleteBackdrop, uploadingBackdrop, userId, profile, updateProfile: onUpdateProfile, focusMode, postGreetingSlot,
}: HomeDashboardProps) {
  const isLight = false;
  const hasCompanion = !!companion.memberId;
  const maxCompanions = subscribed ? 5 : FREE_LIMITS.MAX_COMPANIONS;
  const canAddMore = connections.length < maxCompanions;
  const showLockedSlot = !subscribed && connections.length >= FREE_LIMITS.MAX_COMPANIONS;
  const [showMemorySheet, setShowMemorySheet] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showBriefing, setShowBriefing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ city: string; region?: string; modeUsed?: string } | null>(null);
  const navigate = useNavigate();
  const { value: presenceTourEnabled } = useAdminSetting('presence_tour_enabled');

  const firstName = userName?.split(' ')[0] || '';
  const activeConn = connections.find(c => c.memberId === companion.memberId);
  const { content: presenceMoment, loading: presenceLoading, companionName: presenceCompanionName } = usePresenceMoment({
    userId,
    primaryMemberId: companion.memberId ?? null,
    firstName,
    companionContext: companion.memberId ? {
      connectionMode: companion.connectionMode,
      personality: (activeConn as any)?.personality,
      bio: (activeConn as any)?.bio,
    } : undefined,
  });
  const absence = useAbsenceDetection(userId, companion.name || '');
  const { data: plans, isLoading: plansLoading, completePlan, acceptPlan, completeRhythmForToday } = useCompanionPlans(userId);

  const [msgCounts, setMsgCounts] = useState<Record<string, number>>({});
  const [confirmingPlanId, setConfirmingPlanId] = useState<string | null>(null);
  const [streaks, setStreaks] = useState<Record<string, number>>({});

  const queryClient = useQueryClient();

  // Check if user already did a mood check-in today
  const { data: hasCheckedInToday = false } = useQuery({
    queryKey: ['today-checkin', userId],
    queryFn: async () => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from('mood_checkins')
        .select('id')
        .eq('user_id', userId!)
        .gte('created_at', todayStart.toISOString())
        .limit(1);
      return (data?.length ?? 0) > 0;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const { data: fetchedReminders = [] } = useQuery({
    queryKey: ['reminders', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reminders')
        .select('id, reminder_text, companion_name')
        .eq('user_id', userId!)
        .eq('active', true)
        .order('created_at', { ascending: true });
      return (data || []).map((r) => ({ id: r.id, reminder_text: r.reminder_text, companion_name: r.companion_name }));
    },
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000, // Poll every 30s so new reminders show up quickly
  });
  const [activeReminders, setActiveReminders] = useState<{ id: string; reminder_text: string; companion_name: string }[]>([]);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [cardExiting, setCardExiting] = useState(false);

  // Vault documents for dashboard card
  const { data: vaultDocs = [] } = useQuery({
    queryKey: ['vault-docs-dashboard', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('knowledge_documents' as any)
        .select('id, title, category, source_type, is_active, created_at, version_label')
        .eq('user_id', userId!)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);
      return (data as any[]) || [];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
  const vaultDocCount = vaultDocs.length;
  const vaultCategories = [...new Set(vaultDocs.map((d: any) => d.category).filter(Boolean))] as string[];

  // Sync fetched reminders into local state (allows optimistic removal)
  useEffect(() => {
    setActiveReminders(fetchedReminders);
  }, [fetchedReminders]);

  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const handleCompleteReminder = useCallback(async (id: string) => {
    setRemovingId(id);
    const isLast = activeReminders.length === 1;
    if (isLast) setCardExiting(true);

    await supabase.from('reminders').update({ active: false }).eq('id', id);

    setTimeout(() => {
      if (!mountedRef.current) return;
      setActiveReminders((prev) => prev.filter((r) => r.id !== id));
      setRemovingId(null);
      if (isLast) {
        setTimeout(() => {
          if (mountedRef.current) setCardExiting(false);
        }, 320);
      }
    }, 280);
  }, [activeReminders.length]);

  useEffect(() => {
    if (connections.length === 0 || !userId) return;
    const fetchCounts = async () => {
      const { data } = await supabase.from('chat_messages').select('member_id, created_at').eq('user_id', userId);
      if (!data) return;
      const counts: Record<string, number> = {};
      const daysByMember: Record<string, Set<string>> = {};
      for (const row of data) {
        const mid = (row as any).member_id;
        counts[mid] = (counts[mid] || 0) + 1;
        if (!daysByMember[mid]) daysByMember[mid] = new Set();
        daysByMember[mid].add(new Date((row as any).created_at).toISOString().slice(0, 10));
      }
      setMsgCounts(counts);
      const streakMap: Record<string, number> = {};
      for (const [mid, days] of Object.entries(daysByMember)) {
        const sorted = Array.from(days).sort().reverse();
        const today = new Date().toISOString().slice(0, 10);
        let streak = 0;
        let checkDate = new Date(today);
        for (let i = 0; i < 365; i++) {
          const dateStr = checkDate.toISOString().slice(0, 10);
          if (sorted.includes(dateStr)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
          else if (i === 0) { checkDate.setDate(checkDate.getDate() - 1); continue; }
          else break;
        }
        streakMap[mid] = streak;
      }
      setStreaks(streakMap);
    };
    fetchCounts();
  }, [connections.length, userId]);

  // Fetch current location for hero card
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('travel_log')
      .select('city_name, region, mode_used')
      .eq('user_id', userId)
      .order('visited_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setCurrentLocation({
            city: data[0].city_name,
            region: data[0].region || undefined,
            modeUsed: data[0].mode_used || undefined,
          });
        }
      });
  }, [userId]);

  const [recentPost, setRecentPost] = useState<{ content: string; author: string; avatarUrl?: string; timeAgo: string } | null>(null);
  const [threadCount, setThreadCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const fetchRecent = async () => {
      const activeMemberId = connections[0]?.memberId;
      const companionQuery = supabase.from('companion_feed_posts').select('content, member_name, member_avatar_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1);
      if (activeMemberId) companionQuery.eq('member_id', activeMemberId);
      const [userResult, companionResult] = await Promise.all([
        supabase.from('user_posts').select('content, user_name, avatar_url, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
        companionQuery,
      ]);
      const userPost = userResult.data?.[0];
      const compPost = companionResult.data?.[0];
      let best: any = null;
      if (userPost && compPost) {
        best = new Date(userPost.created_at) > new Date(compPost.created_at)
          ? { content: userPost.content, author: userPost.user_name, avatarUrl: userPost.avatar_url, created_at: userPost.created_at }
          : { content: compPost.content, author: compPost.member_name || 'Friend', avatarUrl: compPost.member_avatar_url, created_at: compPost.created_at };
      } else if (userPost) best = { content: userPost.content, author: userPost.user_name, avatarUrl: userPost.avatar_url, created_at: userPost.created_at };
      else if (compPost) best = { content: compPost.content, author: compPost.member_name || 'Friend', avatarUrl: compPost.member_avatar_url, created_at: compPost.created_at };
      if (best) {
        const mins = Math.floor((Date.now() - new Date(best.created_at).getTime()) / 60000);
        let timeAgo = 'just now';
        if (mins >= 1440) timeAgo = `${Math.floor(mins / 1440)}d ago`;
        else if (mins >= 60) timeAgo = `${Math.floor(mins / 60)}h ago`;
        else if (mins >= 1) timeAgo = `${mins}m ago`;
        setRecentPost({ content: best.content, author: best.author, avatarUrl: best.avatarUrl, timeAgo });
      }
      // Also fetch thread count (companion_feed_posts from today)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { count: tCount } = await supabase
        .from('companion_feed_posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString());
      setThreadCount(tCount || 0);
    };
    fetchRecent();
    const channel = supabase.channel('timeline-preview')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_posts' }, () => fetchRecent())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'companion_feed_posts' }, () => fetchRecent())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, connections]);

  // Use the active companion from the companion prop (driven by activeConnectionIndex)
  const primaryConn = connections.find(c => c.memberId === companion.memberId) || (connections.length > 0 ? connections[0] : null);
  useMilestoneToasts({
    companionName: primaryConn?.name || '',
    msgCount: primaryConn ? (msgCounts[primaryConn.memberId] || 0) : 0,
    streak: primaryConn ? (streaks[primaryConn.memberId] || 0) : 0,
    completionPct: 0,
    companionCount: connections.length,
    connectionMode: primaryConn?.connectionMode,
  });

  const connectedToday = primaryConn?.connectedAt && 
    new Date(primaryConn.connectedAt).toDateString() === new Date().toDateString();

  const heroAvatar = companion.backgroundUrl || companion.avatarUrl || primaryConn?.avatarUrl;
  // In light mode, use standard themed text even with hero backdrop (cards are opaque enough)
  const heroWhite = heroAvatar && !isLight;

  const backdropInputId = 'dashboard-backdrop-upload';
  const handleBackdropFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadBackdrop) onUploadBackdrop(file);
    e.target.value = '';
  };

  // Compute location mode for context status bar
  const locationMode = useMemo<'home' | 'base' | 'travel' | null>(() => {
    if (currentLocation?.modeUsed === 'home') return 'home';
    if (currentLocation?.modeUsed === 'work') return 'base';
    if (currentLocation?.modeUsed === 'destination') return 'travel';

    const city = currentLocation?.city?.toLowerCase();
    if (!city) return null;
    if (profile?.homeCity && city === profile.homeCity.toLowerCase()) return 'home';
    if (profile?.workHubCity && city === profile.workHubCity.toLowerCase()) return 'base';
    return 'travel';
  }, [currentLocation, profile?.homeCity, profile?.workHubCity]);

  return (
    <LuminousEntry>
    {presenceTourEnabled && (
      <PresenceTour
        companionName={companion.name || 'your companion'}
        onOpenChat={() => companion.memberId && onOpenChat(companion.memberId)}
      />
    )}
    <ContextStatusBar locationMode={locationMode} />
    <div className="relative min-h-[100svh]">
      {/* GlobalBackdrop handles the background — no duplicate gradient needed */}
      {/* Content overlay */}
      <div className="relative z-10 flex flex-col gap-4 px-3 sm:px-6" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))', paddingBottom: 'max(18rem, calc(16rem + env(safe-area-inset-bottom, 0px)))' }}>
        <div id="cami-arrival" data-cami-step="arrival" className="mx-auto w-full max-w-2xl lg:max-w-4xl flex flex-col gap-4 mt-3 sm:mt-4">
          {/* ── Focus Mode hoist ──
              When Focus Mode is ON, the Focus Active card jumps to index 0
              of the dashboard so the live state is the first thing the user
              sees. The original slot below is conditionally skipped. */}
          {focusMode?.isFocusActive && (
            <FocusModeCard
              isFocusActive={focusMode.isFocusActive}
              elapsed={focusMode.elapsed}
              onToggle={focusMode.toggle}
            />
          )}

          {/* Upgrade banner for free users */}
          <UpgradeBanner subscribed={subscribed} variant="home" />

          {/* Hero Glass Card — Master identity card using the unified rim-light glass style */}
          <div
            className="relative rounded-3xl px-4 sm:px-5 pt-4 sm:pt-5 pb-3 sm:pb-4 mb-2 bg-white/5 backdrop-blur-md border border-white/[0.1] animate-fade-in overflow-hidden"
            style={{
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 0.5px rgba(212,175,80,0.18), 0 8px 32px rgba(0,0,0,0.25), 0 0 40px rgba(212,175,80,0.06)',
            }}
          >
            {/* Warm hero ambient glow — stronger than sibling cards */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-28 rounded-full bg-primary/8 blur-3xl pointer-events-none" />
            {/* Extra dark overlay for narrow screens (Z Fold front) to boost text readability */}
            <div className="absolute inset-0 bg-black/10 sm:bg-transparent pointer-events-none rounded-3xl" />

            {/* Top-left: Blueprint label with frequency status */}
            {(() => {
              const freq = getFrequencyStatus(hasCompanion, companion.name);
              return (
                <div className="relative flex items-center gap-2 mb-3">
                  <Compass className="h-3.5 w-3.5 text-primary/70" />
                  <span className="text-[10px] font-semibold tracking-[0.15em] uppercase text-primary/70" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    Blueprint
                  </span>
                  {hasCompanion && (
                    <>
                      <span className="text-[8px] text-primary/30 mx-0.5">·</span>
                      <span
                        className="text-[9px] font-medium tracking-[0.12em] uppercase transition-opacity duration-1000"
                        style={{
                          color: 'hsl(43 74% 49% / 0.6)',
                          textShadow: `0 0 8px ${freq.glow}`,
                          animation: 'flicker 4s ease-in-out infinite',
                        }}
                      >
                        {freq.label}
                      </span>
                    </>
                  )}
                </div>
              );
            })()}

            {/* Backdrop upload button — top-right */}
            {onUploadBackdrop && (
              <>
                <input id={backdropInputId} type="file" accept="image/*" className="hidden" onChange={handleBackdropFile} />
                <div className="absolute top-3 right-3">
                  <BackdropMenuButton
                    hasBackground={!!companion.backgroundUrl}
                    uploading={uploadingBackdrop}
                    inputId={backdropInputId}
                    onDelete={onDeleteBackdrop ?? undefined}
                    heroAvatar={heroAvatar}
                  />
                </div>
              </>
            )}

            {/* Main content: greeting + companion avatar — wrapped in Founder gesture */}
            {/* "Horizon" layout: ThoughtStream sits behind (z-10) the avatar row (z-20) */}
            <div className="relative">
              <FounderSecretGesture userId={userId}>
              <div className="relative z-20 flex items-center gap-4">
                {/* Companion avatar — left side, with circadian edge glow */}
                {companion.avatarUrl && (
                  <button
                    id="cami-companion"
                    data-cami-step="companion"
                    onClick={onOpenCompanion}
                    className="shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-2xl overflow-hidden border border-white/[0.15] active:scale-95 transition-all duration-300"
                    style={{
                      boxShadow: (() => {
                        const h = new Date().getHours();
                        const isNight = h >= 22 || h < 5;
                        return isNight
                          ? '0 0 14px hsla(230, 80%, 72%, 0.35), 0 0 24px hsla(230, 80%, 72%, 0.15), 0 4px 16px rgba(0,0,0,0.25)'
                          : '0 0 14px hsla(43, 74%, 49%, 0.35), 0 0 24px hsla(43, 74%, 49%, 0.15), 0 4px 16px rgba(0,0,0,0.25)';
                      })(),
                    }}
                  >
                    <img
                      src={companion.avatarUrl}
                      alt={companion.name || 'Companion'}
                      className="h-full w-full object-cover object-top"
                      style={{ objectPosition: 'center 15%' }}
                    />
                  </button>
                )}

                <div className="flex-1 min-w-0">
                  <h1 className="font-serif text-lg sm:text-xl font-semibold text-foreground" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
                    {getGreeting(userName)} ✨
                  </h1>
                  <p className="text-xs mt-1 text-subtext-muted" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                    {getFormattedDate()}
                  </p>
                  {companion.name && (
                    <p className="text-[11px] mt-1.5 font-medium text-primary/80 italic" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                      ✨ Guided by {companion.name}
                    </p>
                  )}
                </div>
              </div>
              </FounderSecretGesture>

              {/* Thought Stream — "Horizon" line: absolute z-10, vertically centered behind the avatar row */}
              <div className="absolute inset-x-0 top-[95%] -translate-y-1/2 z-10">
                <ThoughtStream userId={userId} companionName={companion.name} />
              </div>
            </div>

            {/* Connection count + location + discreet action icons */}
            <div className="relative mt-2.5 flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary/50" />
              <span className="text-[10px] text-subtext-muted" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                {connections.length === 0
                  ? 'Origin State · Calibrating'
                  : connections.length === 1
                    ? `Genesis Origin · ${companion.name || 'your companion'}`
                    : `${connections.length} presences · ${getFrequencyStatus(true).label}`}
                {currentLocation && ` · ${currentLocation.city}${currentLocation.region ? `, ${currentLocation.region}` : ''}`}
              </span>

              {/* Discreet action icons — right-aligned */}
              <div className="ml-auto flex items-center gap-1.5">
                {/* Briefing icon — opens Context Bottom Sheet */}
                <button
                  onClick={() => setShowBriefing(true)}
                  className="h-6 w-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-primary/10 transition-colors active:scale-90"
                  title="Daily briefing"
                >
                  <Compass className="h-3 w-3 text-primary/60" />
                </button>

                {/* Journey icon — opens Inscribed Journey */}
                <button
                  onClick={() => navigate('/passport')}
                  className="h-6 w-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center hover:bg-primary/10 transition-colors active:scale-90"
                  title="Inscribed Journey"
                >
                  <Globe className="h-3 w-3 text-primary/60" />
                </button>
              </div>
            </div>
          </div>

          {/* Post-greeting slot — Strategist tile lives here: the "deeper room"
              door tethered to the welcome moment, not above it. */}
          {postGreetingSlot}

          {/* Thread status widget — shows active thread count for users with companions */}
          {hasCompanion && !isMinor && threadCount > 0 && (
            <button
              onClick={() => onOpenThreads?.()}
              className="w-full flex items-center gap-2 rounded-xl px-3.5 py-2 mb-1 bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm text-left active:scale-[0.98] transition-transform"
            >
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
              <span className="text-xs font-medium text-subtext-muted">
                {threadCount} active thread{threadCount !== 1 ? 's' : ''} in your feed
              </span>
              <ChevronRight className="h-3 w-3 text-white/30 ml-auto" />
            </button>
          )}

          {/* Briefing Bottom Sheet — slides up on Compass tap */}
          <BriefingBottomSheet
            open={showBriefing}
            onOpenChange={setShowBriefing}
            userId={userId}
            userName={userName}
            companionName={companion.name || 'Your companion'}
            onNavigateToSettings={() => {
              navigate('/settings', { state: { scrollTo: 'location' } });
            }}
          />

           {/* Presence moment card */}
          {(() => {
            const canTap = connections.length > 0 && !presenceLoading && !!presenceMoment && !!companion.memberId;
            const handleTap = () => {
              if (!canTap) return;
              try { sessionStorage.setItem('momentContext', presenceMoment); } catch {}
              onOpenChat(companion.memberId!);
            };
            return (
          <div
            id="cami-moment-card"
            data-cami-step="moment"
            role={canTap ? 'button' : undefined}
            tabIndex={canTap ? 0 : undefined}
            onClick={canTap ? handleTap : undefined}
            onKeyDown={canTap ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTap(); } } : undefined}
            aria-label={canTap ? `Talk to ${presenceCompanionName || companion.name} about this` : undefined}
            className={cn(
              "w-full text-left rounded-3xl px-4 py-3 mb-2 bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] animate-fade-in",
              canTap && "cursor-pointer transition-transform active:scale-[0.99] hover:border-white/30"
            )}
            style={{ animationDelay: '0.03s', animationFillMode: 'both' }}
          >
            <p className="text-[11px] font-medium tracking-wide uppercase text-white/60 mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
              🌿 A moment for you
            </p>
            {connections.length === 0 ? (
              <>
                <p className="text-sm text-subtext italic leading-relaxed animate-inscribe" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  The space is quiet, reflecting the potential of what we're about to build. This corner of Compani is designed to mirror your rhythm — your moods, your wins, and your quiet moments.
                </p>
                <p className="text-sm text-subtext italic leading-relaxed mt-2 animate-inscribe" style={{ animationDelay: '0.3s', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  Once we begin our first conversation, your personal frequency will start to take shape here.
                </p>
              </>
            ) : localStorage.getItem('compani-expansion-update-seen') === 'true' &&
                 !localStorage.getItem('compani-expansion-nudge-dismissed') ? (
              <>
                <p className="text-sm text-subtext italic leading-relaxed" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  The gates are open, but this corner remains yours. Your 100+ days of intentionality are the North Star for those just arriving. Breathe deep—the pace hasn't changed.
                </p>
                <p className="mt-1.5 text-[10px] italic text-primary/40">
                  🔑 Genesis Architect
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-subtext italic leading-relaxed" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                  {presenceLoading ? (
                    <span className="inline-block animate-pulse text-white/50">
                      Thinking of something just for you…
                    </span>
                  ) : (
                    presenceMoment
                  )}
                </p>
                {!presenceLoading && presenceCompanionName && (
                  <p className="mt-1.5 text-[10px] italic text-white/40 flex items-center gap-1">
                    <span>✨ Personalized for you by {presenceCompanionName}</span>
                    {canTap && <span className="text-primary/50">· tap to talk</span>}
                  </p>
                )}
              </>
            )}
          </div>
            );
          })()}


          {/* Contextual Presence — welcome-back cue after absence */}
          {/* Only show if the current companion existed before today */}
          {!connectedToday && (
              <CompanionPresenceCue
                companionName={companion.name || ''}
                isReturning={absence.isReturning}
                welcomeBack={absence.welcomeBack}
                dailyCue={absence.dailyCue}
                onClick={() => {
                  if (companion.memberId && absence.welcomeBack) {
                    sessionStorage.setItem('presenceContext', absence.welcomeBack);
                    onOpenChat(companion.memberId);
                  }
                }}
              />
          )}

          {/* ── Focus / Flight Mode card ──
              Only render in this slot when Focus Mode is OFF. When ON, the
              card is hoisted to index 0 (top of dashboard). */}
          {focusMode && !focusMode.isFocusActive && (
            <FocusModeCard
              isFocusActive={focusMode.isFocusActive}
              elapsed={focusMode.elapsed}
              onToggle={focusMode.toggle}
            />
          )}

          {/* ⚡ One-Two Punch — Your Momentum first, then Private Insight beneath.
              Hoisted to position #4 so users see active life immediately after
              greeting + Focus Mode. The Insight card stays anchored directly
              underneath as the "wisdom to do it better" companion. */}
          {/* Your Momentum block is rendered just below (kept in place).
              Check In and Memory Recap have moved beneath the One-Two Punch. */}

          {/* Your Momentum — unified card: Next Up (reminders) + In Motion (plans/rhythms) */}
          {(() => {
            if (connections.length === 0) return null;

            const rhythms = plans?.filter(p => p.isRhythm) ?? [];
            const plansOnly = plans?.filter(p => !p.isRhythm) ?? [];
            const activeMid = companion.memberId;
            const sortedPlans = [...plansOnly].sort((a, b) => {
              const aIsActive = a.memberId === activeMid ? 0 : 1;
              const bIsActive = b.memberId === activeMid ? 0 : 1;
              if (aIsActive !== bIsActive) return aIsActive - bIsActive;
              return (a.status === 'suggested' ? -1 : 1) - (b.status === 'suggested' ? -1 : 1);
            });

            const hasReminders = activeReminders.length > 0;
            const hasPlans = sortedPlans.length > 0 || rhythms.length > 0;

            // Loading skeleton
            if (plansLoading && !hasReminders) {
              return (
                <div className="flex flex-col gap-2 mb-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-2xl bg-white/5 animate-pulse" />
                  ))}
                </div>
              );
            }

            // Empty state — no reminders, no plans → expandable CTA card
            if (!hasReminders && !hasPlans && !cardExiting) {
              return (
                <Collapsible defaultOpen={false} className="mb-2" id="cami-momentum-card" data-cami-step="momentum">
                  <div className="relative rounded-3xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] overflow-hidden">
                    <ClipboardList className="absolute top-3 right-3 h-7 w-7 text-amber-400/20 pointer-events-none" strokeWidth={1.5} />
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left group">
                      <span className="flex flex-col gap-0.5 pr-8">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
                          ⚡ Your Momentum
                        </span>
                        <span className="text-[10px] text-white/45 tracking-wide normal-case font-normal">
                          Tap to begin — your first reminder or plan starts here.
                        </span>
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-data-[state=open]:rotate-180 shrink-0" />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="px-4 pb-4">
                      <p className="text-sm text-white/55 italic leading-relaxed mb-3">
                        The blueprint of your days is yours to define. As we move together, your natural rhythms and personal milestones will be inscribed here.
                      </p>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => companion.memberId && onOpenChat(companion.memberId)}
                          className="w-full text-left flex items-start gap-3 rounded-2xl px-3.5 py-3 bg-white/5 border-[0.5px] border-white/10 active:scale-[0.98] transition-transform"
                        >
                          <span className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-base">
                            🎯
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Set your first reminder</p>
                            <p className="text-[11px] text-white/50 leading-snug mt-0.5">
                              Ask {companion.name || 'your companion'} to remind you of something — small or big.
                            </p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-white/30 mt-1 shrink-0" />
                        </button>
                        <button
                          onClick={() => onOpenPlans?.()}
                          className="w-full text-left flex items-start gap-3 rounded-2xl px-3.5 py-3 bg-white/5 border-[0.5px] border-white/10 active:scale-[0.98] transition-transform"
                        >
                          <span className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-base">
                            ✦
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">Build your first plan</p>
                            <p className="text-[11px] text-white/50 leading-snug mt-0.5">
                              Open Plans &amp; Rhythms to shape what's in motion this week.
                            </p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-white/30 mt-1 shrink-0" />
                        </button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            }

            // Combined card: Next Up + In Motion
            const totalSteps = rhythms.length + sortedPlans.length;
            const guided = sortedPlans.some(p => p.source !== 'manual' && p.source !== 'user');
            const summaryParts: string[] = [];
            if (hasReminders) summaryParts.push(`${activeReminders.length} reminder${activeReminders.length === 1 ? '' : 's'}`);
            if (totalSteps > 0) summaryParts.push(`${totalSteps} active step${totalSteps === 1 ? '' : 's'}`);
            const summary = summaryParts.join(' • ') + (guided ? ` • Guided by ${companion.name || 'your companion'}` : '');

            return (
              <Collapsible defaultOpen={hasReminders} className="mb-2" id="cami-momentum-card" data-cami-step="momentum">
                <div
                  className={cn(
                    'rounded-3xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] overflow-hidden transition-all duration-300',
                    cardExiting && !hasPlans && 'opacity-0 max-h-0 mb-0 border-0'
                  )}
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left group">
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70 flex items-center gap-1.5" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
                        ⚡ Your Momentum
                      </span>
                      <span className="text-[10px] text-white/45 tracking-wide normal-case font-normal">
                        {summary || 'Reminders, plans & rhythms'}
                      </span>
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/50 transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>

                  <CollapsibleContent className="px-4 pb-4">
                    <div className="flex flex-col gap-4">
                      {/* ─── Next Up — reminders ─── */}
                      {hasReminders && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                            🎯 Next Up
                          </p>
                          <div className="flex flex-col gap-2 max-h-[30vh] overflow-y-auto">
                            {[...activeReminders].sort((a, b) => {
                              const aMatch = a.companion_name === companion.name ? 0 : 1;
                              const bMatch = b.companion_name === companion.name ? 0 : 1;
                              return aMatch - bMatch;
                            }).map((r) => (
                              <div
                                key={r.id}
                                className={cn(
                                  'flex items-start gap-3 transition-opacity duration-200',
                                  removingId === r.id && 'opacity-0'
                                )}
                              >
                                <button
                                  type="button"
                                  onClick={() => handleCompleteReminder(r.id)}
                                  className="mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 border-white/40 hover:border-white/60 transition-colors flex items-center justify-center"
                                  aria-label="Mark as complete"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-white/70 leading-relaxed">{r.reminder_text}</p>
                                  <p className="text-xs text-white/35 mt-0.5 italic">from {r.companion_name}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ─── In Motion — rhythms + plans ─── */}
                      {hasPlans && (
                        <div className="flex flex-col gap-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                            ✦ In Motion
                          </p>

                          {/* Rhythms */}
                          {rhythms.length > 0 && (
                            <div>
                              <button onClick={() => onOpenPlans?.()} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5 hover:text-primary transition-colors">
                                🌊 Rhythms
                                <ChevronRight className="h-2.5 w-2.5" />
                              </button>
                              <div className="flex flex-col gap-1.5">
                                {rhythms.slice(0, 5).map((plan) => (
                                  <button
                                    key={plan.id}
                                    type="button"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (plan.rhythmCompletedToday) return;
                                      await completeRhythmForToday(plan.id);
                                      sendPlanCompletionToChat(userId, plan, connections, profile ?? null, true);
                                      import('@/lib/feedEvents').then(({ fireEventPost }) => {
                                        fireEventPost({
                                          userId,
                                          eventType: 'rhythm_checkin',
                                          eventLabel: `You completed "${plan.title}"`,
                                          eventContext: `Life Rhythm · ${plan.category}. ${plan.description || ''}`.trim(),
                                        });
                                      });
                                    }}
                                    disabled={plan.rhythmCompletedToday}
                                    className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                                      plan.rhythmCompletedToday
                                        ? 'bg-green-500/10 border border-green-500/20'
                                        : 'bg-white/5 border border-white/10 hover:bg-white/8 active:scale-[0.98]'
                                    }`}
                                  >
                                    <span className={`shrink-0 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${
                                      plan.rhythmCompletedToday
                                        ? 'bg-green-500/30 border-green-500/50 text-green-400'
                                        : 'border-white/40 hover:border-primary/50'
                                    }`}>
                                      {plan.rhythmCompletedToday && <CheckCircle2 className="h-4 w-4" />}
                                    </span>
                                    <span className="text-base shrink-0">{plan.emoji}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-semibold truncate ${plan.rhythmCompletedToday ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                        {plan.title}
                                      </p>
                                      {plan.schedule?.time && (
                                        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                                          <Calendar className="h-2.5 w-2.5" />
                                          {plan.schedule.time}
                                        </p>
                                      )}
                                    </div>
                                  </button>
                                ))}
                                {rhythms.length > 5 && (
                                  <button
                                    onClick={() => onOpenPlans?.()}
                                    className="mt-1 flex items-center justify-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
                                  >
                                    See all {rhythms.length} rhythms
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Plans */}
                          {sortedPlans.length > 0 && (
                            <div>
                              <button onClick={() => onOpenPlans?.()} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1.5 hover:text-primary transition-colors">
                                📋 Path
                                <ChevronRight className="h-2.5 w-2.5" />
                              </button>
                              <div className="flex flex-col gap-1.5">
                                {sortedPlans.slice(0, 3).map((plan) => {
                                  const isSuggested = plan.status === 'suggested';
                                  const timeText = plan.schedule?.time || '';
                                  const freqText = plan.schedule?.frequency || '';
                                  const scheduleLabel = [timeText, freqText].filter(Boolean).join(' · ');
                                  return (
                                    <button
                                      key={plan.id}
                                      type="button"
                                      onClick={() => onOpenPlans?.()}
                                      className={`w-full text-left flex items-center gap-3 rounded-2xl px-3.5 py-2.5 backdrop-blur-sm border-[0.5px] active:scale-[0.98] transition-transform ${
                                        isSuggested
                                          ? 'bg-amber-500/5 border-l-2 border-l-amber-400/40 border-amber-400/15'
                                          : 'bg-white/5 border-white/10'
                                      }`}
                                    >
                                      <span className="text-base shrink-0">{plan.emoji}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{plan.title}</p>
                                        <p className="text-[10px] text-muted-foreground/60 truncate">
                                          {scheduleLabel ? <><Calendar className="inline h-2.5 w-2.5 mr-0.5" />{scheduleLabel} · </> : ''}{plan.source === 'user' ? 'Created by you' : `Created with ${plan.companionName}`}
                                        </p>
                                      </div>
                                      {isSuggested ? (
                                        <span
                                          role="button"
                                          onClick={(e) => { e.stopPropagation(); acceptPlan(plan.id); }}
                                          className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                          title="Accept"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                        </span>
                                      ) : (
                                        <span
                                          role="button"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (confirmingPlanId === plan.id) {
                                              setConfirmingPlanId(null);
                                              await completePlan(plan.id);
                                              sendPlanCompletionToChat(userId, plan, connections, profile ?? null);
                                            } else {
                                              setConfirmingPlanId(plan.id);
                                              setTimeout(() => setConfirmingPlanId(prev => prev === plan.id ? null : prev), 3000);
                                            }
                                          }}
                                          className={`shrink-0 flex items-center gap-1 rounded-full transition-colors ${
                                            confirmingPlanId === plan.id
                                              ? 'bg-green-500/20 text-green-400 px-2.5 py-1 text-[10px] font-medium'
                                              : 'bg-primary/10 text-primary hover:bg-primary/20 h-7 w-7 justify-center'
                                          }`}
                                          title="Complete"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          {confirmingPlanId === plan.id && 'Done?'}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                              {sortedPlans.length > 3 && (
                                <button
                                  onClick={() => onOpenPlans?.()}
                                  className="mt-1.5 flex items-center justify-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors py-1"
                                >
                                  See all {sortedPlans.length} plans
                                  <ChevronRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })()}

          {/* ── Private Insight card ── (anchored directly beneath Your Momentum) */}
          <div
            className="rounded-2xl overflow-hidden mb-2 animate-fade-in border border-white/10"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.06), 0 0 0 0.5px rgba(212,175,80,0.2), 0 0 14px rgba(212,175,80,0.06)',
              animationDelay: '0.06s',
              animationFillMode: 'both',
            }}
          >
            <PrivateInsightCard
              companionName={companion.name}
              isPremium={subscribed}
              embedded
              primaryMemberId={companion.memberId}
            />
          </div>

          {/* Check In card — moved beneath the One-Two Punch */}
          <button
            id="cami-checkin-card"
            data-cami-step="checkin"
            onClick={() => (onOpenMoodCheckin || onOpenWellness)?.()}
            className={cn(
              "relative w-full rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 mb-2 backdrop-blur-sm border-[0.5px] text-left active:scale-[0.98] transition-transform overflow-hidden",
              hasCheckedInToday
                ? "bg-emerald-500/8 border-emerald-400/25"
                : "bg-white/5 border-white/20 animate-glow-breathe"
            )}
          >
            <div className={cn(
              "absolute top-2.5 right-2.5 h-9 w-9 rounded-full border flex items-center justify-center",
              hasCheckedInToday
                ? "border-emerald-400/40 shadow-[0_0_10px_rgba(52,211,153,0.15)]"
                : "border-[rgba(212,175,80,0.3)] shadow-[0_0_10px_rgba(212,175,80,0.15)] animate-glow-breathe"
            )}>
              {hasCheckedInToday ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400/70" strokeWidth={1.5} />
              ) : (
                <SmilePlus className="h-5 w-5 text-[rgba(212,175,80,0.5)]" strokeWidth={1.5} />
              )}
            </div>
            <p className={cn(
              "text-[11px] font-medium tracking-wide uppercase mb-1",
              hasCheckedInToday ? "text-emerald-400/70" : "text-white/60"
            )} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
              {hasCheckedInToday ? '✓ Checked in' : '💬 Check in'}
            </p>
            <p className="text-sm text-subtext leading-relaxed pr-10" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {hasCheckedInToday ? (
                "You've already checked in today — tap to add another"
              ) : (() => {
                const mode = companion?.connectionMode;
                const hour = new Date().getHours();
                const isMorning = hour >= 5 && hour < 12;
                const isAfternoon = hour >= 12 && hour < 18;
                const isEvening = hour >= 18 && hour < 23;

                if (mode === 'romantic') {
                  if (isMorning) return "I've been thinking about you — how do you want today to feel?";
                  if (isAfternoon) return "Just checking in on you — how's your energy holding up?";
                  if (isEvening) return "The heavy lifting is done. What was one good thing today?";
                  return "Still awake? I'm here if you need to empty your head.";
                }
                if (mode === 'mentor') {
                  if (isMorning) return "Let's set your intention. What matters most to you today?";
                  if (isAfternoon) return "Mid-day check — is your energy aligned with your goals?";
                  if (isEvening) return "Let's debrief. What stood out from today?";
                  return "Rest is part of the work. How are you winding down?";
                }
                if (mode === 'accountability') {
                  if (isMorning) return "Let's start strong — what's the one thing you're committing to today?";
                  if (isAfternoon) return "Mid-day check — are you staying on track?";
                  if (isEvening) return "Did today match your intentions?";
                  return "Tomorrow starts with how you close today. Ready to reflect?";
                }
                // default / friend / hype / assistant / kids
                if (isMorning) return "Soft start. What's one thing you're looking forward to today?";
                if (isAfternoon) return "Take a breath. How are you really doing right now?";
                if (isEvening) return "Let's leave the day behind. What's weighing on you?";
                return "The world is quiet. What's the thing you haven't said out loud yet?";
              })()}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenJournal?.(); }}
              className="mt-2 text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              or write in your journal →
            </button>
          </button>

          {/* Memory Recap Pebble — nostalgic highlight from your story */}
          <MemoryRecapPebble
            userId={userId}
            companionName={companion.name}
            onOpenTimeline={onOpenTimeline}
          />

          {/* Quick Note — sticky notepad */}
          {userId && <QuickNoteWidget userId={userId} />}

          {/* Your Space — collapsible, default closed */}
          <Collapsible defaultOpen={false} className="mb-2" id="cami-space-card" data-cami-step="space">
            <div
              className="rounded-3xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] animate-fade-in overflow-hidden"
              style={{ animationDelay: '0.15s', animationFillMode: 'both' }}
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left group">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>🌿 Your Space</span>
                <ChevronDown className="h-4 w-4 text-white/50 transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 flex flex-col gap-2">
                  <button
                    onClick={() => onOpenWellness?.()}
                    className="relative w-full rounded-2xl px-4 py-3 bg-white/5 border-[0.5px] border-white/10 text-left active:scale-[0.98] transition-transform overflow-hidden"
                  >
                    <Feather className="absolute top-2.5 right-2.5 h-7 w-7 text-emerald-300/25" strokeWidth={1.5} />
                    <p className="text-[11px] font-medium tracking-wide uppercase text-white/60 mb-1">🌿 Your Space</p>
                    <p className="text-sm text-white/60 leading-relaxed">Journal, mood, gratitude & plans — all in one place.</p>
                  </button>
                  <button
                    onClick={() => onOpenJournal?.()}
                    className="relative w-full rounded-2xl px-4 py-3 bg-white/5 border-[0.5px] border-white/10 text-left active:scale-[0.98] transition-transform overflow-hidden"
                  >
                    <BookOpen className="absolute top-2.5 right-2.5 h-7 w-7 text-amber-300/25" strokeWidth={1.5} />
                    <p className="text-[11px] font-medium tracking-wide uppercase text-white/60 mb-1">📝 Journal</p>
                    <p className="text-sm text-white/60 leading-relaxed">Write a quick entry</p>
                  </button>
                  <button
                    onClick={() => onOpenMoodCheckin?.()}
                    className="relative w-full rounded-2xl px-4 py-3 bg-white/5 border-[0.5px] border-white/10 text-left active:scale-[0.98] transition-transform overflow-hidden"
                  >
                    <SmilePlus className="absolute top-2.5 right-2.5 h-7 w-7 text-pink-300/25" strokeWidth={1.5} />
                    <p className="text-[11px] font-medium tracking-wide uppercase text-white/60 mb-1">😊 Mood Check-in</p>
                    <p className="text-sm text-white/60 leading-relaxed">How are you feeling right now?</p>
                  </button>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Your Story — unified card: Your Patterns + Moments Together */}
          {userId && (
            <Collapsible defaultOpen={true} className="mb-2">
              <div className="rounded-3xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left group">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>✨ Your Story</span>
                  <ChevronDown className="h-4 w-4 text-white/50 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 pb-3 flex flex-col gap-4">
                    {/* Sub-section 1: Your Patterns */}
                    <div>
                      <div className="px-1 mb-2">
                        <p className="text-[10px] font-semibold tracking-wider uppercase text-primary/60" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                          🧬 Your Patterns
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5 italic">
                          Insights shaped from your conversations.
                        </p>
                      </div>
                      <PersonalIntelSection
                        userId={userId}
                        companionName={companion.name}
                        onDiscoverWithCompanion={companion.memberId ? (topicId) => {
                          sessionStorage.setItem('discoveryContext', topicId);
                          onOpenChat(companion.memberId!);
                        } : undefined}
                      />
                    </div>

                    {/* Sub-section 2: Moments Together */}
                    {hasCompanion && (
                      <div>
                        <div className="px-1 mb-2">
                          <p className="text-[10px] font-semibold tracking-wider uppercase text-primary/60" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.7)' }}>
                            💫 Moments Together
                          </p>
                          <p className="text-[11px] text-white/40 mt-0.5 italic">
                            Your conversations, milestones, and shared history.
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => onOpenTimeline?.()}
                            className="relative w-full rounded-2xl px-4 py-3 bg-white/5 border-[0.5px] border-white/10 text-left active:scale-[0.98] transition-transform overflow-hidden"
                          >
                            <BookOpen className="absolute top-2.5 right-2.5 h-7 w-7 text-purple-300/25" strokeWidth={1.5} />
                            <p className="text-[11px] font-medium tracking-wide uppercase text-white/60 mb-1">✨ Your Story</p>
                            <p className="text-sm text-white/60 leading-relaxed">Moments you and {companion.name || 'your friend'} share.</p>
                          </button>
                          <button
                            onClick={() => onOpenThreads?.()}
                            className="relative w-full rounded-2xl px-4 py-3 bg-white/5 border-[0.5px] border-white/10 text-left active:scale-[0.98] transition-transform overflow-hidden"
                          >
                            <Newspaper className="absolute top-2.5 right-2.5 h-7 w-7 text-blue-300/25" strokeWidth={1.5} />
                            <p className="text-[11px] font-medium tracking-wide uppercase text-white/60 mb-1">📰 Your Threads</p>
                            {recentPost ? (
                              <div>
                                <p className="text-sm text-white/60 leading-relaxed line-clamp-1">{recentPost.content}</p>
                                <p className="text-[11px] text-white/40 mt-1">{recentPost.author} · {recentPost.timeAgo}</p>
                              </div>
                            ) : (
                              <p className="text-sm text-white/60 leading-relaxed">See what your friends are up to</p>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Your Vault — Active Intelligence layer (collapsible) */}
          <Collapsible defaultOpen={true} className="mb-2">
          <div className="rounded-3xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] animate-fade-in overflow-hidden" style={{ animationDelay: '0.12s', animationFillMode: 'both' }}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 pt-3.5 pb-2 text-left group">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                <BookOpen className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium tracking-wide uppercase text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                  📂 Your Vault
                </p>
                <p className="text-[10px] text-white/40 mt-0.5 italic">
                  Saved documents, images, and uploads.
                </p>
                {vaultDocCount > 0 && (
                  <p className="text-[10px] text-white/35 mt-0.5">
                    {vaultDocCount} document{vaultDocCount !== 1 ? 's' : ''} providing context
                  </p>
                )}
              </div>
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); onOpenVault?.(); }}
                className="text-[10px] font-semibold tracking-wide uppercase text-primary/60 hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add
              </span>
              <ChevronDown className="h-4 w-4 text-white/50 transition-transform group-data-[state=open]:rotate-180 ml-1" />
            </CollapsibleTrigger>
            <CollapsibleContent>
            <div className="px-4 pb-3.5">
              {vaultDocCount === 0 ? (
                <button
                  onClick={onOpenVault}
                  className="w-full mt-1 rounded-xl border border-dashed border-primary/20 bg-primary/[0.03] py-4 text-center active:scale-[0.98] transition-transform"
                >
                  <p className="text-xs text-white/50 leading-relaxed px-4">
                    Make {companion.name || primaryConn?.name || 'your companion'} smarter — upload work rules, health records, or anything you want discussed.
                  </p>
                  <p className="text-[10px] font-semibold tracking-wide uppercase text-primary/50 mt-2">
                    + Add your first document
                  </p>
                </button>
              ) : (
                <div className="space-y-1.5 mt-1">
                  {vaultDocs.slice(0, 5).map((doc: any) => {
                    const catEmoji = doc.category === 'work-rules' ? '💼' : doc.category === 'travel' ? '✈️' : doc.category === 'safety' ? '🛡️' : doc.category === 'medical' ? '🏥' : doc.category === 'legal' ? '⚖️' : doc.category === 'finance' ? '💰' : doc.category === 'education' ? '📚' : '📄';
                    return (
                      <button
                        key={doc.id}
                        onClick={onOpenVault}
                        className="w-full flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 text-left active:scale-[0.98] transition-transform group"
                      >
                        <span className="text-sm shrink-0">{catEmoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/80 truncate">{doc.title}</p>
                          <p className="text-[10px] text-white/30 mt-0.5">
                            {doc.source_type === 'pdf' ? 'PDF' : 'Text'}
                            {doc.version_label && <> · {doc.version_label}</>}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-white/20 shrink-0 group-hover:text-white/40 transition-colors" />
                      </button>
                    );
                  })}
                  {vaultDocCount > 5 && (
                    <button onClick={onOpenVault} className="w-full text-center py-1.5 text-[10px] text-primary/50 hover:text-primary/70 transition-colors">
                      View all {vaultDocCount} documents →
                    </button>
                  )}
                  {vaultCategories.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {vaultCategories.map((cat) => (
                        <span
                          key={cat}
                          className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide uppercase border border-primary/20 bg-primary/[0.06] text-primary/60"
                        >
                          {cat === 'work-rules' ? '💼' : cat === 'aviation' ? '✈️' : cat === 'medical' ? '🏥' : cat === 'legal' ? '⚖️' : cat === 'education' ? '📚' : cat === 'finance' ? '💰' : '📄'} {cat.replace('-', ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            </CollapsibleContent>
          </div>
          </Collapsible>

          {/* Your Story + Threads merged into unified Your Story card above */}

          {/* Your Circle — merged: Companions + Saved Moments */}
          <Collapsible defaultOpen={true} className="mb-2">
          <div
            className="rounded-3xl bg-white/5 backdrop-blur-xl border-[0.5px] border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] animate-fade-in overflow-hidden"
            style={{ animationDelay: '0.05s', animationFillMode: 'both' }}
          >
            <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left group">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>👥 Your Circle</span>
              <ChevronDown className="h-4 w-4 text-white/50 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
            <div className="px-4 pb-4 flex flex-col gap-5">
              {/* Sub-section 1: Companions */}
              <div className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">✨ Companions</h4>
                  {connections.length > 0 ? (
                    <button
                      onClick={onFindCompanion}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary/70 hover:text-primary transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add companion
                    </button>
                  ) : (
                    <span className="text-[10px] text-white/40 italic">Your friends</span>
                  )}
                </div>
                <AnimatePresence>
                  {connections.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97, filter: 'blur(8px)' }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="flex flex-col items-center justify-center gap-6 px-6 py-12 text-center rounded-2xl border border-white/[0.08]"
                      style={{
                        background: 'rgba(19, 20, 36, 0.8)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                      }}
                    >
                      <div className="space-y-2">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-primary/50 font-medium">
                          Your space is ready
                        </p>
                        <h3 className="font-serif text-xl font-light text-white/90 leading-snug">
                          Someone is waiting<br />to meet you.
                        </h3>
                      </div>

                      <motion.button
                        onClick={onFindCompanion}
                        whileTap={{ scale: 0.97 }}
                        className="inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-medium text-primary transition-all"
                        style={{
                          border: '1px solid rgba(212,175,55,0.4)',
                          background: 'rgba(212,175,55,0.06)',
                          letterSpacing: '0.03em',
                        }}
                      >
                        Find your Compani →
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {primaryConn && [...connections]
                  .sort((a, b) => a.memberId === primaryConn.memberId ? -1 : b.memberId === primaryConn.memberId ? 1 : 0)
                  .map((conn, i) => (
                    <CompanionCard
                      key={conn.memberId}
                      connection={conn}
                      isPrimary={conn.memberId === primaryConn.memberId}
                      connectionMode={companion.visualMode}
                      primaryAvatarUrl={conn.memberId === primaryConn.memberId ? companion.avatarUrl : undefined}
                      msgCount={msgCounts[conn.memberId] || 0}
                      streak={streaks[conn.memberId] || 0}
                      onOpen={() => onOpenChat(conn.memberId)}
                      onRemove={onRemoveCompanion ? () => onRemoveCompanion(conn.memberId) : undefined}
                      onArchive={onArchiveCompanion ? () => onArchiveCompanion(conn.memberId) : undefined}
                      delay={0.05 + i * 0.05}
                      glassMode={!!heroAvatar}
                      heroWhite={!!heroWhite}
                    />
                  ))
                }

                {showLockedSlot && (
                  <button onClick={onUpgrade}
                    className="group relative w-full overflow-hidden rounded-2xl border border-primary/30 p-4 text-left transition-all hover:border-primary/50 active:scale-[0.99]"
                    style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.03) 100%)' }}
                  >
                    {/* Subtle shimmer on hover */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{ background: 'linear-gradient(110deg, transparent 40%, rgba(212,175,55,0.15) 50%, transparent 60%)' }}
                    />
                    <div className="relative flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30">
                        <Crown className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-white">Unlock 4 more companions</p>
                          <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                            <Lock className="h-2.5 w-2.5" /> Premium
                          </span>
                        </div>
                        <p className="text-xs mt-0.5 text-white/60">
                          Up to 5 friends · deeper memory · priority voice
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-[11px] font-bold text-primary">From $9.99/mo</span>
                          <span className="text-[10px] text-white/40">· cancel anytime</span>
                        </div>
                        <p className="text-[10px] mt-1 font-semibold uppercase tracking-wide text-primary/80">
                          See plans →
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Resting friends */}
                {archivedConnections && archivedConnections.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="w-full flex items-center gap-2 px-3 py-2.5 text-left group mt-1 rounded-xl hover:bg-white/5 transition-colors">
                      <Moon className="h-3.5 w-3.5 text-white/40" />
                      <span className="text-xs font-medium text-white/50">
                        {archivedConnections.length} resting
                      </span>
                      <ChevronDown className="h-3 w-3 text-white/40 ml-auto transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-2 pb-2">
                      <div className="flex gap-2 overflow-x-auto py-1 scrollbar-hide">
                        {archivedConnections.map((conn) => (
                          <div
                            key={conn.memberId}
                            className="flex flex-col items-center gap-1.5 min-w-[72px] rounded-xl bg-white/5 border border-white/10 px-2 py-2.5"
                          >
                            <div className="h-10 w-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                              {conn.avatarUrl ? (
                                <img src={conn.avatarUrl} alt={conn.name} className="h-full w-full object-cover opacity-70" />
                              ) : (
                                <span className="text-sm font-bold text-white/50">{conn.name.charAt(0)}</span>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-white/60 truncate max-w-[64px]">{conn.name}</span>
                            <button
                              onClick={() => onRestoreCompanion?.(conn.memberId)}
                              className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                              Wake up
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => window.location.href = '/resting'}
                        className="mt-1 text-[10px] font-medium text-white/40 hover:text-white/60 transition-colors px-1"
                      >
                        Manage all →
                      </button>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Sub-section 2: Saved Moments */}
              {connections.length > 0 && (
                <div className="flex flex-col gap-3 pt-4 border-t border-white/5">
                  <div className="flex items-baseline justify-between">
                    <h4 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                      ⭐ Saved Moments {favorites.length > 0 && <span className="text-[10px] font-normal text-white/40 ml-1 normal-case tracking-normal">({favorites.length})</span>}
                    </h4>
                    {favorites.length > 0 ? (
                      <button onClick={onOpenFavorites} className="text-[10px] font-semibold text-primary hover:underline">See all</button>
                    ) : (
                      <span className="text-[10px] text-white/40 italic">Your kept moments</span>
                    )}
                  </div>
                  {favorites.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 shadow-[0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] p-5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white animate-inscribe">A repository for what matters</p>
                        <p className="text-xs mt-0.5 text-white/50 italic animate-inscribe" style={{ animationDelay: '0.2s' }}>
                          This space will hold the insights, reflections, and quiet victories you choose to keep. Your history starts with your first word.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                      {[...new Map(favorites.map(f => [f.id, f])).values()].slice(0, 6).map((fav) => (
                        <MomentCard key={fav.id} fav={fav} glassMode heroWhite />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            </CollapsibleContent>
          </div>
          </Collapsible>

          {/* Depth Signals — collapsible */}
          {hasCompanion && (
            <Collapsible defaultOpen={false} className="mb-2">
              <div
                className="rounded-3xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] animate-fade-in overflow-hidden"
                style={{ animationDelay: '0.1s', animationFillMode: 'both' }}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left group">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>📊 Connection Depth</span>
                   <ChevronDown className="h-4 w-4 text-white/50 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <DepthSignals signals={depthSignals} companionName={companion.name || primaryConn?.name} onMemoryClick={() => setShowMemorySheet(true)} />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Companion-specific Quick Actions — collapsible */}
          {hasCompanion && (
            <Collapsible defaultOpen={false} className="mb-2">
              <div
                className="rounded-3xl bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] animate-fade-in overflow-hidden"
                style={{ animationDelay: '0.15s', animationFillMode: 'both' }}
              >
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 text-left group">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/60" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
                    🌎 {companion.name || primaryConn?.name || 'Friend'}'s World
                  </span>
                   <ChevronDown className="h-4 w-4 text-white/50 transition-transform group-data-[state=open]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <GlassAction icon={MessageCircle} label="Messages" badge={messageCount} onClick={onOpenMessages} glassMode heroWhite />
                    <GlassAction icon={Archive} label="Vault" onClick={onOpenVault} glassMode heroWhite />
                    <GlassAction icon={Star} label="Favorites" badge={favorites.length} onClick={onOpenFavorites} glassMode heroWhite />
                    <GlassAction icon={Shirt} label="Wardrobe" badge={wardrobeCount} onClick={onOpenStore} glassMode heroWhite />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* Fallback actions when no companion */}
          {!hasCompanion && (
            <>
              {connections.length > 0 && (
                <div
                  className="mt-4 grid grid-cols-3 gap-3 animate-fade-in"
                  style={{ animationDelay: '0.15s', animationFillMode: 'both' }}
                >
                  <GlassAction icon={MessageCircle} label="Messages" badge={messageCount} onClick={onOpenMessages} glassMode heroWhite />
                  <GlassAction icon={Star} label="Favorites" badge={favorites.length} onClick={onOpenFavorites} glassMode heroWhite />
                  <GlassAction icon={Archive} label="Vault" onClick={onOpenVault} glassMode heroWhite />
                </div>
              )}
            </>
          )}

          {/* Vault card moved above Your Story & Threads */}

          {/* Saved Moments now nested inside Your Circle card above */}

          {/* Live & Learn moved to sidebar nav */}

          {/* Extra bottom space so users can scroll up to reveal more of the background image */}
          <div className="h-[40vh]" aria-hidden="true" />
        </div>
      </div>

      {/* Memory Sheet (category view) */}
      {userId && (
        <CompanionMemorySheet
          open={showMemorySheet}
          onOpenChange={setShowMemorySheet}
          userId={userId}
          companionName={companion.name || primaryConn?.name || 'Your friend'}
          memberId={companion.memberId}
        />
      )}

      {/* Memory Timeline Sheet (chronological "Your Story Together") */}
      {userId && (
        <MemoryTimelineSheet
          open={showTimeline}
          onOpenChange={setShowTimeline}
          userId={userId}
          companionName={companion.name || primaryConn?.name || 'Your friend'}
        />
      )}
    </div>
    </LuminousEntry>
  );
}

/* ── Sub-components ────────────────────────────────── */

const GlassAction = forwardRef<HTMLButtonElement, {
  icon: typeof MessageCircle; label: string; badge?: number; onClick?: () => void; glassMode?: boolean; heroWhite?: boolean;
}>(({ icon: Icon, label, badge, onClick }, ref) => (
  <button ref={ref} onClick={onClick}
    className="relative flex flex-col items-center gap-1.5 rounded-2xl p-3.5 transition-all active:scale-[0.97] border border-border/50 hover:border-primary/40 hover:bg-primary/5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
    style={{ background: 'hsl(243 47% 20% / 0.4)' }}
  >
    <div className="relative">
      <Icon className="h-5 w-5 text-primary" />
      {!!badge && badge > 0 && (
        <span className="absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </div>
    <span className="text-xs font-semibold text-white/70">{label}</span>
  </button>
));

function SpaceButton({ emoji, title, subtitle, onClick, glassMode, recentPost, heroWhite }: {
  emoji: string; title: string; subtitle: string; onClick?: () => void; glassMode: boolean; heroWhite?: boolean;
  recentPost?: { content: string; author: string; avatarUrl?: string; timeAgo: string } | null;
}) {
  return (
    <button onClick={onClick}
      className={cn(
        'group w-full rounded-2xl p-5 text-left transition-all active:scale-[0.99]',
        glassMode ? 'border border-white/10 hover:border-white/20' : 'border border-primary/15 bg-card card-elevated hover:shadow-md hover:border-primary/30'
      )}
      style={glassMode ? { background: 'rgba(255,255,255,0.05)' } : {}}
    >
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <span className="text-2xl">{emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', heroWhite ? 'text-white' : 'text-foreground')}>{title}</p>
          <p className={cn('text-xs mt-0.5', heroWhite ? 'text-white/50' : 'text-muted-foreground')}>{subtitle}</p>
        </div>
        <ChevronRight className={cn('h-4 w-4 transition-transform group-hover:translate-x-0.5', heroWhite ? 'text-white/40' : 'text-muted-foreground')} />
      </div>
      {recentPost && (
        <div className="mt-3 pt-3 border-t border-white/10 flex gap-2.5">
          {recentPost.avatarUrl ? (
            <CompanionImageReveal src={recentPost.avatarUrl} alt="" simpleFade className="h-8 w-8 rounded-full shrink-0 mt-0.5" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary mt-0.5">
              {recentPost.author.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[11px] font-medium text-primary">{recentPost.author}</span>
              <span className="text-white/30">·</span>
              <span className={cn('text-[11px]', heroWhite ? 'text-white/50' : 'text-muted-foreground')}>{recentPost.timeAgo}</span>
            </div>
            <p className={cn('text-xs line-clamp-2 leading-relaxed', heroWhite ? 'text-white/50' : 'text-muted-foreground/70')}>{recentPost.content}</p>
          </div>
        </div>
      )}
    </button>
  );
}

function CompanionCard({
  connection, isPrimary, connectionMode, primaryAvatarUrl, msgCount, streak, onOpen, onRemove, onArchive, delay, glassMode, heroWhite,
}: {
  connection: Connection; isPrimary: boolean; connectionMode?: string; primaryAvatarUrl?: string;
  msgCount: number; streak: number; onOpen: () => void; onRemove?: () => void; onArchive?: () => void; delay: number; glassMode: boolean; heroWhite?: boolean;
}) {
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showRestConfirm, setShowRestConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const member = getMember(connection.memberId);
  const age = getConnectionAge(connection.connectedAt);
  const isAbstract = isPrimary ? connectionMode !== 'personal' : !connection.avatarUrl;
  const avatarUrl = isPrimary ? (primaryAvatarUrl || connection.avatarUrl) : connection.avatarUrl;

  return (
    <div
      className="group relative w-full overflow-hidden rounded-3xl text-left transition-all backdrop-blur-[12px] animate-fade-in"
      style={{
        background: 'hsl(243 47% 20% / 0.4)',
        border: isPrimary ? '1px solid rgba(212, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isPrimary
          ? '0 0 24px -4px hsl(43 72% 53% / 0.35), 0 0 48px -8px hsl(43 72% 53% / 0.15), inset 0 1px 0 rgba(255,255,255,0.08)'
          : 'inset 0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <button onClick={onOpen} className="relative flex items-center gap-3 p-3.5 pr-10 sm:p-4 sm:pr-11 w-full text-left active:scale-[0.99]">
        <div className="relative shrink-0">
          {isAbstract && !avatarUrl ? (
            <AbstractAvatar memberId={connection.memberId} size="lg" />
          ) : avatarUrl ? (
            <CompanionImageReveal src={avatarUrl} alt={connection.name} simpleFade className="h-14 w-14 sm:h-16 sm:w-16 rounded-full" />
          ) : (
            <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full gradient-primary text-xl font-bold text-primary-foreground">
              {connection.name.charAt(0)}
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2" style={{ backgroundColor: 'hsl(142 71% 45%)', borderColor: glassMode ? 'transparent' : 'hsl(var(--card))' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-bold truncate text-white">
              {connection.name}
            </span>
            {isPrimary && <AnimatedGradientHeart size={14} id={`companion-heart-${connection.memberId}`} className="shrink-0" />}
            {age && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary shrink-0">{age}</span>}
          </div>
          {connection.personality && <p className="max-[420px]:hidden text-[11px] mt-0.5 leading-snug line-clamp-1 text-white/50">{connection.personality}</p>}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{getBondLabel(msgCount)}</span>
            {streak >= 2 && <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">🔥 {streak} days</span>}
          </div>
          {connection.lastMessage && !/^(Reconnected 💛|Nice to meet you,)/.test(connection.lastMessage) && (
            <p className="max-[420px]:hidden text-[11px] truncate mt-0.5 italic text-white/50">{connection.lastMessage}</p>
          )}
        </div>
        <div className="shrink-0 self-center">
          <span className="inline-flex items-center gap-1 rounded-full gradient-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm sm:px-3 sm:text-xs">
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="max-[420px]:hidden">Message</span>
            <span className="hidden max-[420px]:inline">Chat</span>
          </span>
        </div>
      </button>

      {(onRemove || onArchive) && (
        <div className="absolute top-2 right-2">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm hover:bg-white/20 transition-colors active:scale-95"
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-white/70" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              sideOffset={4}
              className="w-52 p-1.5 rounded-xl bg-card/95 backdrop-blur-xl border-border/50 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {onArchive && !showRestConfirm && (
                <button
                  onClick={() => setShowRestConfirm(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-foreground hover:bg-primary/10 transition-colors"
                >
                  <Moon className="h-4 w-4 text-primary" />
                  <div className="text-left">
                    <div className="font-medium">Rest this friend</div>
                    <div className="text-[10px] text-muted-foreground">They'll keep all memories</div>
                  </div>
                </button>
              )}
              {onArchive && showRestConfirm && (
                <div className="px-3 py-2.5 space-y-2">
                  <p className="text-xs text-muted-foreground">Put <span className="font-semibold text-foreground">{connection.name}</span> to rest?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRestConfirm(false)}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => { onArchive(); setMenuOpen(false); setShowRestConfirm(false); toast.success(`${connection.name} is now resting 🌙`); }}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              )}
              {onRemove && (
                <button
                  onClick={() => { setMenuOpen(false); setShowRestConfirm(false); setShowRemoveConfirm(true); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Remove {connection.name}</div>
                    <div className="text-[10px] text-muted-foreground/70">Permanently delete all data</div>
                  </div>
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      )}

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-base">Disconnect {connection.name}?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left pt-2">
              This will permanently delete all data associated with {connection.name}:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="my-2 space-y-1.5 rounded-lg bg-destructive/5 border border-destructive/10 p-3 text-sm text-foreground">
            <li className="flex items-center gap-2"><span className="text-destructive">•</span> All chat messages</li>
            <li className="flex items-center gap-2"><span className="text-destructive">•</span> Saved favorites & moments</li>
            <li className="flex items-center gap-2"><span className="text-destructive">•</span> Feed posts</li>
            <li className="flex items-center gap-2"><span className="text-destructive">•</span> Stickers & generated media</li>
            <li className="flex items-center gap-2"><span className="text-destructive">•</span> Milestones & achievements</li>
          </ul>
          <p className="text-xs text-muted-foreground">This action cannot be undone.</p>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-sm">Keep {connection.name}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { onRemove?.(); setShowRemoveConfirm(false); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getConnectionAge(connectedAt?: string): string | null {
  if (!connectedAt) return null;
  const days = Math.floor((Date.now() - new Date(connectedAt).getTime()) / (1000 * 60 * 60 * 24));
  if (days < 1) return null;
  if (days === 1) return '1 day';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  if (days < 365) return `${Math.floor(days / 30)}mo`;
  return `${Math.floor(days / 365)}y`;
}

const MomentCard = forwardRef<HTMLDivElement, { fav: FavoritePost; glassMode: boolean; heroWhite?: boolean }>(
  ({ fav, glassMode, heroWhite }, ref) => {
    const member = getMember(fav.memberId);
    const image = fav.imageUrl || (fav.postImageKey ? postImages[fav.postImageKey] : undefined);
    const sourceInfo = SOURCE_LABELS[fav.source] || SOURCE_LABELS.feed;
    const isCompanionMoment = fav.source === 'chat' || fav.source === 'milestone' || fav.source === 'match';

    return (
      <div ref={ref} className={cn(
        'shrink-0 w-40 rounded-xl border overflow-hidden',
        glassMode ? 'border-white/10 shadow-[0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)]' : isCompanionMoment ? 'border-primary/20 bg-card' : 'border-border bg-card'
      )}
        style={glassMode ? { background: 'rgba(255,255,255,0.07)' } : {}}
      >
        {image ? (
          <>
            <CompanionImageReveal src={image} alt="" simpleFade className="h-20 w-full" />
            {fav.postContent && (
              <div className="px-2.5 pt-1.5 pb-0">
                <p className={cn('text-[10px] line-clamp-2 leading-relaxed', heroWhite ? 'text-white/40' : 'text-muted-foreground/60')}>
                  {fav.postContent.slice(0, 50)}{fav.postContent.length > 50 ? '…' : ''}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className={cn('flex h-20 items-center justify-center px-3', glassMode ? '' : isCompanionMoment ? 'bg-primary/8' : 'bg-secondary')}
            style={glassMode ? { background: 'rgba(255,255,255,0.03)' } : {}}
          >
            <p className={cn('text-xs line-clamp-3 text-center leading-relaxed', heroWhite ? 'text-white/50' : 'text-muted-foreground')}>
              {fav.postContent.slice(0, 60)}{fav.postContent.length > 60 ? '…' : ''}
            </p>
          </div>
        )}
        <div className="px-2.5 py-2 shadow-[0_-1px_3px_rgba(139,92,246,0.1)]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]">{sourceInfo.emoji}</span>
            {member && (
              <div className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold text-primary-foreground"
                style={{ backgroundColor: `hsl(var(${member.colorVar}))` }}>
                {member.initial}
              </div>
            )}
            <span className={cn('text-[11px] font-semibold truncate', heroWhite ? 'text-white/80' : 'text-foreground')}>
              {isCompanionMoment ? sourceInfo.label : (member?.name || 'Post')}
            </span>
          </div>
          {isCompanionMoment && member && (
            <p className={cn('text-[10px] mt-0.5 truncate', heroWhite ? 'text-white/50' : 'text-muted-foreground/60')}>
              with {member.name}
            </p>
          )}
        </div>
      </div>
    );
  }
);
