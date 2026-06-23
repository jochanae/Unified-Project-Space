import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { logger } from '@/utils/logger';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, Profile, Connection } from '@/hooks/useProfile';
import { useFavorites } from '@/hooks/useFavorites';
import { useNotificationBadges, markTabSeen } from '@/hooks/useNotificationBadges';
import { useDepthSignals } from '@/hooks/useDepthSignals';
import { useCompanionMedia } from '@/hooks/useCompanionMedia';
import { useSubscription, SubscriptionStatus, FREE_LIMITS, PREMIUM_LIMITS } from '@/hooks/useSubscription';
import { useLoginReconciliation } from '@/hooks/useLoginReconciliation';
import { supabase } from '@/integrations/supabase/client';
import { loadMemory } from '@/lib/memory';
import { isUnder13, isMinor } from '@/lib/ageUtils';
import type { MatchResult } from '@/lib/companionTypes';
import type { CommunityMember } from '@/lib/communityPersonas';
import { buildGenerationPayload, isAbstractStyle } from '@/lib/generationPayload';


interface AppContextType {
  user: ReturnType<typeof useAuth>['user'];
  profile: Profile | null;
  kidsMode: boolean;
  connections: Connection[];
  companionMemberId?: string;
  activeConnection?: Connection;
  activeConnectionIndex: number;
  setActiveConnectionIndex: (index: number) => void;
  loading: boolean;
  authLoading: boolean;
  profileLoading: boolean;
  profileFetched: boolean;
  // Actions
  signOut: () => Promise<void>;
  saveProfile: ReturnType<typeof useProfile>['saveProfile'];
  updateProfile: ReturnType<typeof useProfile>['updateProfile'];
  clearProfile: ReturnType<typeof useProfile>['clearProfile'];
  addConnection: ReturnType<typeof useProfile>['addConnection'];
  isConnected: ReturnType<typeof useProfile>['isConnected'];
  updateConnection: ReturnType<typeof useProfile>['updateConnection'];
  removeConnection: ReturnType<typeof useProfile>['removeConnection'];
  archiveConnection: ReturnType<typeof useProfile>['archiveConnection'];
  restoreConnection: ReturnType<typeof useProfile>['restoreConnection'];
  fetchArchivedConnections: ReturnType<typeof useProfile>['fetchArchivedConnections'];
  // Favorites
  favorites: ReturnType<typeof useFavorites>['favorites'];
  favLoading: boolean;
  isFavorited: ReturnType<typeof useFavorites>['isFavorited'];
  toggleFavorite: ReturnType<typeof useFavorites>['toggleFavorite'];
  saveChatMoment: ReturnType<typeof useFavorites>['saveChatMoment'];
  saveAutoMoment: ReturnType<typeof useFavorites>['saveAutoMoment'];
  // Badges
  badges: { messages: number; feed: number };
  markTabSeen: (tab: string) => void;
  // Depth & media
  depthSignals: ReturnType<typeof useDepthSignals>;
  companionMedia: ReturnType<typeof useCompanionMedia>;
  // Matchmaking
  handleMatchComplete: (result: MatchResult) => void;
  handleConnectMember: (member: CommunityMember) => void;
  handleDisconnectCompanion: (memberId?: string) => void;
  // Subscription
  subscription: SubscriptionStatus & {
    startCheckout: (priceId: string) => Promise<void>;
    startDonation: (amount: number) => Promise<void>;
    openPortal: () => Promise<void>;
    checkSubscription: () => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | null>(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    const err = new Error('useAppContext must be used within AppProvider');
    // Log but don't throw — prevents white-screen crashes when provider boundary
    // is momentarily missing (e.g. route transitions, HMR)
    console.error(err.message);
    throw err;
  }
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeConnectionIndex, setActiveConnectionIndexRaw] = useState(() => {
    try {
      const saved = localStorage.getItem('compani_active_companion_idx');
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });
  const { user, loading: authLoading, signOut, hadSession } = useAuth();
  const { profile, connections, loading: profileLoading, isFetched: profileFetched, saveProfile, updateProfile, clearProfile, signOutCleanup, addConnection, isConnected, updateConnection, removeConnection, archiveConnection, restoreConnection, fetchArchivedConnections } = useProfile(user);
  const { favorites, loading: favLoading, isFavorited, toggleFavorite, saveChatMoment, saveAutoMoment } = useFavorites(user?.id ?? null);
  const queryClient = useQueryClient();
  const badges = useNotificationBadges(user?.id);

  // Clamp index and derive active connection.
  const clampedIndex = Math.min(activeConnectionIndex, Math.max(connections.length - 1, 0));
  const activeConnection = connections.length > 0 ? connections[clampedIndex] : undefined;
  const companionMemberId = activeConnection?.memberId;

  // kidsMode: from profile.kidsMode if set, or derived from dateOfBirth (under 13 or 13-17). Unknown DOB = minor.
  const kidsMode = useMemo(() => {
    if (!profile) return false;
    if (profile.kidsMode === true) return true;
    const dob = profile.dateOfBirth;
    return !dob || !!(isUnder13(dob) || isMinor(dob));
  }, [profile]);

  const setActiveConnectionIndex = useCallback((idx: number) => {
    const pool = connections;
    const clampedIdx = Math.min(idx, Math.max(pool.length - 1, 0));
    setActiveConnectionIndexRaw(clampedIdx);

    // Sync profile-level fields to the newly active companion so all
    // generation calls that read from profile get correct style/appearance data
    try { localStorage.setItem('compani_active_companion_idx', String(clampedIdx)); } catch {}

    const newConn = pool[clampedIdx];
    if (newConn && user) {
      updateProfile({
        companionName: newConn.name,
        companionAvatarUrl: newConn.avatarUrl || undefined,
        companionAppearanceDesc: newConn.appearanceDesc || null,
        imageStyle: newConn.imageStyle || null,
        visualMode: newConn.imageStyle && isAbstractStyle(newConn.imageStyle) ? 'abstract' : (newConn.avatarUrl ? 'personal' : 'abstract'),
      } as any);
    }
  }, [connections, user, updateProfile]);

  // Clamp back if visible connections shrink
  useEffect(() => {
    if (activeConnectionIndex >= connections.length && connections.length > 0) {
      setActiveConnectionIndexRaw(0);
    }
  }, [connections.length, activeConnectionIndex]);

  const depthSignals = useDepthSignals(user?.id ?? null, companionMemberId);
  const companionMedia = useCompanionMedia(user?.id ?? null, companionMemberId);
  const subscriptionHook = useSubscription(user?.id);

  // Auto-reconcile orphaned companions and restore missing avatars on login
  useLoginReconciliation(user, connections, addConnection, updateConnection);

  // Auto-detect and save user timezone
  useEffect(() => {
    if (!user || !profile || profileLoading) return;
    const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detectedTz && detectedTz !== profile.timezone) {
      updateProfile({ timezone: detectedTz });
    }
  }, [user, profile?.timezone, profileLoading]);

  // Warn if active companion has no avatar after profile loads — helps catch persistence bugs early
  useEffect(() => {
    if (!authLoading && !profileLoading && user && activeConnection && !activeConnection.avatarUrl) {
      logger.warn(
        `[CompanionAvatar] ⚠️ activeConnection "${activeConnection.name}" (${activeConnection.memberId}) has no avatarUrl after profile load. ` +
        `This companion will render without a photo. Check connections table avatar_url column.`
      );
    }
  }, [authLoading, profileLoading, user, activeConnection]);

  const navigate = useNavigate();

  // ── Session watchdog ──────────────────────────────────────────────────────
  // If the user had a session but it's now gone (expired token, server-side
  // revocation, etc.), clean up and redirect to auth instead of showing a
  // broken "zombie" UI with silent 401/403 errors everywhere.
  useEffect(() => {
    if (authLoading) return; // Wait for auth to settle
    if (!user && hadSession.current) {
      logger.log('[SessionWatchdog] Session lost — signing out and redirecting');
      signOutCleanup();
      queryClient.clear();
      toast.error('Your session expired — please sign back in');
      navigate('/auth', { replace: true });
    }
  }, [user, authLoading, signOutCleanup, queryClient, navigate]);


  useEffect(() => {
    if (!user?.id || !profile?.phoneNumber || !profile?.smsOptIn) return;

    // Combine activity + memory sync into a single effect to reduce intervals
    const syncSms = async () => {
      try {
        const memory = loadMemory();
        const updates: Record<string, unknown> = {
          last_app_active: new Date().toISOString(),
        };
        if (memory.entries.length > 0) {
          updates.memories = memory.entries as any;
        }
        await supabase
          .from('sms_profiles')
          .update(updates)
          .eq('user_id', user.id);
      } catch (e) {
        console.error('SMS sync failed:', e);
      }
    };
    syncSms();
    const interval = setInterval(syncSms, 10 * 60 * 1000); // every 10 min
    return () => clearInterval(interval);
  }, [user?.id, profile?.phoneNumber, profile?.smsOptIn]);

  const matchInFlightRef = useRef(false);
  const handleMatchComplete = useCallback(async (result: MatchResult) => {
    // Global creation lock — prevents duplicate companions from concurrent calls
    if (matchInFlightRef.current) {
      logger.warn('[AppContext] handleMatchComplete already in flight — skipping duplicate call');
      return;
    }
    matchInFlightRef.current = true;
    try {
    const alreadyConnected = connections.some((c) => c.memberId === result.member.id);
    const maxCompanions = subscriptionHook.subscribed ? PREMIUM_LIMITS.MAX_COMPANIONS : FREE_LIMITS.MAX_COMPANIONS;

    if (!alreadyConnected) {
      if (subscriptionHook.subscribed && connections.length >= maxCompanions) {
        toast.error(`You already have ${PREMIUM_LIMITS.MAX_COMPANIONS} active companions. Archive one before adding another.`);
        return;
      }

      if (!subscriptionHook.subscribed && connections.length >= maxCompanions) {
        // Free tier keeps one active slot. Replace the oldest active companion only.
        const overflowCount = connections.length - maxCompanions + 1;
        const toArchive = [...connections].slice(-overflowCount);
        for (const existing of toArchive) {
          await archiveConnection(existing.memberId);
        }
      }
    }

    // Build connection with created companion metadata if applicable
    const connectionData: Connection = {
      memberId: result.member.id,
      name: result.member.name,
      connectedAt: new Date().toISOString(),
      lastMessage: `Nice to meet you, ${profile?.userName}! 💛`,
    };

    // Attach pre-generated avatar to the connection — including abstract images (e.g. waterfall)
    // so the chat never auto-generates a face portrait to replace it.
    const preGeneratedAvatar = (result as any).avatarUrl || result.member.avatarUrl;
    if (preGeneratedAvatar) {
      connectionData.avatarUrl = preGeneratedAvatar;
      connectionData.backgroundUrl = preGeneratedAvatar;
    }

    // If this is a created companion, store their full identity
    if (result.isCreated) {
      connectionData.isCreated = true;
      connectionData.bio = result.member.bio;
      connectionData.personality = result.member.personality;
      connectionData.age = result.member.age;
      connectionData.handle = result.member.handle;
      connectionData.gender = result.member.gender;
      connectionData.circles = result.member.circles as string[];
    }

    // Set the role from matchmaking if provided
    if (result.connectionMode) {
      connectionData.connectionMode = result.connectionMode;
    }

    if ((result as any).imageStyle) {
      connectionData.imageStyle = (result as any).imageStyle;
    }

    await addConnection(connectionData);

    if (!profile?.companionName || profile.companionName === 'Ted' || profile.companionName === '') {
      await updateProfile({ companionName: result.member.name });
    }
    if (result.visualMode && result.visualMode !== 'unsure') {
      await updateProfile({ visualMode: result.visualMode });
    }

    // Seed the welcome post and generate avatar for created companions
    if (result.isCreated && user) {
      try {
        await supabase.from('companion_feed_posts' as any).insert({
          user_id: user.id,
          member_id: result.member.id,
          content: result.tailoredPost.content,
          circle: result.tailoredPost.circle || null,
          member_name: result.member.name,
          member_handle: result.member.handle,
          member_personality: result.member.personality,
          member_bio: result.member.bio,
          member_age: result.member.age,
          member_gender: result.member.gender || 'neutral',
        } as any);
      } catch (e) {
        console.error('Failed to seed welcome post:', e);
      }

      // Skip auto avatar generation if:
      // 1. Visual mode is abstract/unsure (use animated gradient heart placeholder)
      // 2. Avatar was already generated during the matchmaking flow
      // 3. Caller explicitly flagged skipAvatarGeneration (e.g. FirstMoment does its own gen)
      const resolvedVisualMode = result.visualMode || 'unsure';
      if (resolvedVisualMode === 'abstract' || resolvedVisualMode === 'unsure') {
        updateConnection(result.member.id, { isGeneratingAvatar: false } as any);
      } else if (preGeneratedAvatar || (result as any).skipAvatarGeneration) {
        // Avatar already attached during matchmaking or caller handles its own generation — skip duplicate
        updateConnection(result.member.id, { isGeneratingAvatar: false } as any);
        logger.log('[AppContext] Skipping avatar gen — already have or caller manages:', preGeneratedAvatar || 'caller-managed');
      } else {
      // Generate avatar in background — only when user has described appearance
      const appearanceDesc = result.appearanceDesc || `A ${result.member.age} ${result.member.gender} person. ${result.member.bio}`;
      const resolvedVisualStyle = result.imageStyle || profile?.visualStyle || profile?.imageStyle || 'photorealistic';
      const resolvedPathType = isAbstractStyle(resolvedVisualStyle) ? 'abstract' : 'face';
      updateConnection(result.member.id, { imageStyle: resolvedVisualStyle, isGeneratingAvatar: true } as any);
      supabase.from('connections').update({ image_style: resolvedVisualStyle, appearance_desc: appearanceDesc }).eq('user_id', user.id).eq('member_id', result.member.id).then(null, () => {});
      supabase.functions.invoke('generate-avatar', {
        body: buildGenerationPayload({ userId: user.id, memberId: result.member.id, visualStyle: resolvedVisualStyle, pathType: resolvedPathType, appearanceDescription: appearanceDesc }),
      }).then(async ({ data: avatarData }) => {
        if (avatarData?.avatarUrl) {
          // Atomic DB write — verify it succeeds before updating UI
          const { error: dbError } = await (supabase as any)
            .from('connections')
            .update({ avatar_url: avatarData.avatarUrl, background_url: avatarData.avatarUrl, reference_image_url: avatarData.avatarUrl })
            .eq('user_id', user.id)
            .eq('member_id', result.member.id);

          if (dbError) {
            console.error('[CompanionPhoto] DB write failed for generated avatar:', dbError);
            toast.error('Photo upload failed — please try again');
            updateConnection(result.member.id, { isGeneratingAvatar: false } as any);
            return;
          }

          // DB confirmed — now update feed posts and local state
          await supabase
            .from('companion_feed_posts' as any)
            .update({ member_avatar_url: avatarData.avatarUrl } as any)
            .eq('user_id', user.id)
            .eq('member_id', result.member.id);
          // Only update local state after DB write confirmed
          updateConnection(result.member.id, { avatarUrl: avatarData.avatarUrl, backgroundUrl: avatarData.avatarUrl, referenceImageUrl: avatarData.avatarUrl, isGeneratingAvatar: false } as any);
          // Sync to profile so all fallback surfaces have the avatar
          await updateProfile({ companionAvatarUrl: avatarData.avatarUrl });
          // Force dashboard and settings to re-render with the new avatar immediately
          queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
          toast.success(`${result.member.name}'s avatar is ready! 💛`);
        }
      }).catch((e) => {
        console.error('Avatar generation failed:', e);
        updateConnection(result.member.id, { isGeneratingAvatar: false } as any);
        toast(`${result.member.name} is ready to chat — their photo didn't generate. You can try again in Studio anytime. 💛`, { duration: 5000, icon: '💛' });
      });
      } // end else (non-abstract visual mode)
    }

    saveAutoMoment({
      memberId: result.member.id,
      content: `You met ${result.member.name} 💛`,
      source: 'match',
    });

    // Force the profile query to refetch immediately so the dashboard picks up
    // the new connection without requiring a manual refresh.
    // staleTime would normally block this for 30s.
    if (user) {
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    }
    // Don't navigate here — let the caller decide where to go
    } finally {
      matchInFlightRef.current = false;
    }
  }, [
    connections,
    subscriptionHook.subscribed,
    profile,
    user,
    archiveConnection,
    addConnection,
    updateConnection,
    updateProfile,
    saveAutoMoment,
  ]);

  const handleConnectMember = useCallback(async (member: CommunityMember) => {
    // Upload avatar to storage if it's a local asset path
    let avatarUrl = member.avatarUrl;
    if (avatarUrl && user?.id && (avatarUrl.startsWith('/') || avatarUrl.startsWith('data:'))) {
      const uploadWithRetry = async (attempt = 1): Promise<string | null> => {
        try {
          const response = await fetch(avatarUrl!);
          const blob = await response.blob();
          const ext = blob.type === 'image/png' ? 'png' : 'jpg';
          const path = `browse/${member.id}.${ext}`;
          const { error } = await supabase.storage.from('companion-avatars').upload(path, blob, { upsert: true, contentType: blob.type });
          if (error) {
            if (attempt < 2) return uploadWithRetry(attempt + 1);
            return null;
          }
          const { data: urlData } = supabase.storage.from('companion-avatars').getPublicUrl(path);
          // Verify the file actually exists by probing
          try {
            const probe = await fetch(urlData.publicUrl, { method: 'HEAD' });
            if (!probe.ok && attempt < 2) return uploadWithRetry(attempt + 1);
          } catch { /* probe failed, accept URL anyway */ }
          return urlData.publicUrl;
        } catch (e) {
          if (attempt < 2) return uploadWithRetry(attempt + 1);
          console.error('[ConnectMember] Avatar upload failed after retry:', e);
          return null;
        }
      };
      const uploaded = await uploadWithRetry();
      if (uploaded) avatarUrl = uploaded;
    }

    addConnection({
      memberId: member.id,
      name: member.name,
      connectedAt: new Date().toISOString(),
      lastMessage: `Nice to meet you, ${profile?.userName}! 💛`,
      avatarUrl,
      backgroundUrl: avatarUrl, // Auto-set backdrop = avatar for persistence
      bio: member.bio,
      personality: member.personality,
      age: member.age,
      gender: member.gender,
      handle: member.handle,
      isCreated: true,
    });
    if (!profile?.companionName || profile.companionName === 'Ted' || profile.companionName === '') {
      await updateProfile({ companionName: member.name });
    }
    // Sync avatar to profile so all fallback surfaces have it
    if (avatarUrl) {
      await updateProfile({ companionAvatarUrl: avatarUrl });
    }
  }, [profile, user, addConnection, updateProfile]);

  const handleDisconnectCompanion = useCallback(async (targetMemberId?: string) => {
    if (!connections.length) return;
    const conn = targetMemberId
      ? connections.find(c => c.memberId === targetMemberId) || connections[0]
      : connections[0];
    await removeConnection(conn.memberId);
    // If we disconnected the primary companion, update profile
    if (!targetMemberId || conn.memberId === connections[0]?.memberId) {
      const remaining = connections.filter(c => c.memberId !== conn.memberId);
      if (remaining.length > 0) {
        await updateProfile({ companionName: remaining[0].name });
      } else {
        await updateProfile({ companionName: '', companionAvatarUrl: undefined, companionAppearanceDesc: undefined, visualMode: 'unsure' });
      }
    }

    // Cascading orphan cleanup for the disconnected companion
    if (user) {
      const uid = user.id;
      const mid = conn.memberId;
      await Promise.all([
        supabase.from('favorites').delete().eq('user_id', uid).eq('member_id', mid),
        supabase.from('chat_messages').delete().eq('user_id', uid).eq('member_id', mid),
        supabase.from('companion_feed_posts').delete().eq('user_id', uid).eq('member_id', mid),
        supabase.from('companion_media').delete().eq('user_id', uid).eq('member_id', mid),
        supabase.from('companion_milestones').delete().eq('user_id', uid).eq('member_id', mid),
      ]);
      queryClient.invalidateQueries({ queryKey: ['favorites', uid] });
    }
  }, [connections, removeConnection, updateProfile, user, queryClient]);

  const handleMarkTabSeen = useCallback((tab: string) => {
    if (user?.id) markTabSeen(tab as 'feed' | 'messages', user.id);
  }, [user?.id]);

  const handleSignOut = useCallback(async () => {
    signOutCleanup(); // Clear local cache only — DO NOT delete DB data
    await signOut();
  }, [signOutCleanup, signOut]);

  return (
    <AppContext.Provider value={{
      user,
      profile,
      kidsMode,
      connections,
      companionMemberId,
      activeConnection,
      activeConnectionIndex: clampedIndex,
      setActiveConnectionIndex,
      // Stay in loading state until profile query has actually resolved (not just enabled).
      // Without this, there's a brief window where user exists but profile hasn't loaded yet,
      // which causes AppLayout to flash the onboarding screen for existing users.
      loading: authLoading || (!!user && (profileLoading || !profileFetched)),
      authLoading,
      profileLoading,
      profileFetched,
      signOut: handleSignOut,
      saveProfile,
      updateProfile,
      clearProfile,
      addConnection,
      isConnected,
      updateConnection,
      removeConnection,
      archiveConnection,
      restoreConnection,
      fetchArchivedConnections,
      favorites,
      favLoading,
      isFavorited,
      toggleFavorite,
      saveChatMoment,
      saveAutoMoment,
      badges: { messages: badges.messages || 0, feed: badges.feed || 0 },
      markTabSeen: handleMarkTabSeen,
      depthSignals,
      companionMedia,
      handleMatchComplete,
      handleConnectMember,
      handleDisconnectCompanion,
      subscription: subscriptionHook,
    }}>
      {children}
    </AppContext.Provider>
  );
}
