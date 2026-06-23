// PERF: 2026-03-15 — Narrowed select() columns for connections — reduces payload size per fetch
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { clearFreshExperienceState, clearLocationSessionState, clearProfileSessionState } from '@/lib/sessionReset';

const CONNECTIONS_SELECT = 'id, user_id, member_id, name, connected_at, avatar_url, voice_id, bio, personality, age, handle, gender, is_archived, connection_mode, backstory, relationship_level, origin_story, image_style, appearance_desc, background_url, communication_style, last_message, reference_image_url, circles, studio_selections, is_created';
import { logger } from '@/utils/logger';
import { loadMemory, clearMemory, saveMemory, MemoryEntry, CompanionMemory } from '@/lib/memory';
import type { User } from '@supabase/supabase-js';

export type VisualMode = 'abstract' | 'personal' | 'unsure';
/** @deprecated Use VisualMode instead */
export type ConnectionMode = VisualMode;

export interface Profile {
  userName: string;
  username?: string;
  bio?: string;
  vibe?: string;
  phoneNumber?: string;
  smsOptIn?: boolean;
  companionName: string;
  companionGender: 'male' | 'female' | 'neutral';
  avatarUrl?: string;
  companionAvatarUrl?: string;
  companionAppearanceDesc?: string;
  companionReferenceImageUrl?: string;
  visualMode: VisualMode;
  userAppearanceDesc?: string;
  userReferenceImageUrl?: string;
  companionVoiceId?: string;
  imageStyle?: 'photorealistic' | 'anime' | 'illustrated' | 'abstract';
  personalityTraits?: Record<string, string | string[]>;
  dateOfBirth?: string;
  parentalConsentEmail?: string;
  parentalConsentGranted?: boolean;
  kidsMode?: boolean;
  isBlocked?: boolean;
  matureMode?: boolean;
  roleplayMode?: boolean;
  micSensitivity?: number;
  preferredLanguage?: string;
  namePronunciation?: string;
  preferredName?: string;
  interests?: string;
  timezone?: string;
  onboardingCompleted?: boolean;
  onboardingPath?: string;
  vibePreferences?: string[];
  presencePreference?: string;
  visualStyle?: string;
  preferredCompanionName?: string | null;
  safetyNetEnabled?: boolean;
  circadianCeremonies?: boolean;
  thinkFreelyPokeLevel?: number;
  homeCity?: string;
  homeAnchor?: string;
  workHubCity?: string;
  homeAddress?: string;
  homeLat?: number;
  homeLon?: number;
  workAddress?: string;
  workLat?: number;
  workLon?: number;
  voiceTrialSecondsUsed?: number;
  voiceMinutesUsed?: number;
  voiceMinutesResetAt?: string;
  createdAt: string;
}

export interface Connection {
  memberId: string;
  name: string;
  connectedAt: string;
  lastMessage?: string;
  appearanceDesc?: string;
  referenceImageUrl?: string;
  avatarUrl?: string;
  voiceId?: string;
  // Created companion metadata
  bio?: string;
  personality?: string;
  age?: string;
  handle?: string;
  gender?: string;
  circles?: string[];
  isCreated?: boolean;
  studioSelections?: Record<string, string | string[]>;
  backgroundUrl?: string;
  communicationStyle?: string;
  isArchived?: boolean;
  
  connectionMode?: string;
  backstory?: string;
  relationshipLevel?: number;
  originStory?: string;
  imageStyle?: string;
}

const STORAGE_KEY = 'compani-profile';
const CONNECTIONS_KEY = 'compani-connections';
const MIGRATED_KEY = 'compani-migrated';

const DEFAULT_COMPANION_NAME = '';
const DEFAULT_COMPANION_GENDER: 'male' | 'female' | 'neutral' = 'neutral';

function mapDbProfile(dbProfile: any, user: User): Profile {
  return {
    userName: (dbProfile.preferred_name && dbProfile.preferred_name.trim()) || dbProfile.user_name,
    username: dbProfile.username ?? undefined,
    bio: dbProfile.bio ?? undefined,
    vibe: dbProfile.vibe ?? undefined,
    phoneNumber: dbProfile.phone_number ?? undefined,
    smsOptIn: dbProfile.sms_opt_in,
    companionName: dbProfile.companion_name,
    companionGender: (dbProfile.companion_gender as Profile['companionGender']) || 'neutral',
    avatarUrl: (dbProfile as any).avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || undefined,
    companionAvatarUrl: dbProfile.companion_avatar_url ?? undefined,
    companionAppearanceDesc: dbProfile.companion_appearance_desc ?? undefined,
    companionReferenceImageUrl: dbProfile.companion_reference_image_url ?? undefined,
    visualMode: (dbProfile.connection_mode as VisualMode) || 'unsure',
    userAppearanceDesc: dbProfile.user_appearance_desc ?? undefined,
    userReferenceImageUrl: dbProfile.user_reference_image_url ?? undefined,
    companionVoiceId: undefined,
    imageStyle: (dbProfile as any).image_style ?? 'photorealistic',
    personalityTraits: (dbProfile as any).personality_traits ?? {},
    dateOfBirth: dbProfile.date_of_birth ?? undefined,
    parentalConsentEmail: dbProfile.parental_consent_email ?? undefined,
    parentalConsentGranted: dbProfile.parental_consent_granted ?? false,
    kidsMode: (dbProfile as any).kids_mode ?? false,
    isBlocked: (dbProfile as any).is_blocked ?? false,
    matureMode: (dbProfile as any).mature_mode ?? false,
    roleplayMode: (dbProfile as any).roleplay_mode ?? false,
    micSensitivity: (dbProfile as any).mic_sensitivity ?? 50,
    preferredLanguage: (dbProfile as any).preferred_language ?? 'auto',
    namePronunciation: (dbProfile as any).name_pronunciation ?? undefined,
    preferredName: (dbProfile as any).preferred_name ?? undefined,
    interests: (dbProfile as any).interests ?? undefined,
    timezone: (dbProfile as any).timezone ?? undefined,
    onboardingCompleted: (dbProfile as any).onboarding_completed ?? false,
    onboardingPath: (dbProfile as any).onboarding_path ?? undefined,
    vibePreferences: (dbProfile as any).vibe_preferences ?? [],
    presencePreference: (dbProfile as any).presence_preference ?? undefined,
    visualStyle: (dbProfile as any).visual_style ?? undefined,
    preferredCompanionName: (dbProfile as any).preferred_companion_name ?? null,
    safetyNetEnabled: (dbProfile as any).safety_net_enabled ?? false,
    circadianCeremonies: (dbProfile as any).circadian_ceremonies ?? true,
    thinkFreelyPokeLevel: (dbProfile as any).think_freely_poke_level ?? 0,
    homeCity: (dbProfile as any).home_city ?? undefined,
    homeAnchor: (dbProfile as any).home_anchor ?? 'dashboard',
    workHubCity: (dbProfile as any).work_hub_city ?? undefined,
    homeAddress: (dbProfile as any).home_address ?? undefined,
    homeLat: (dbProfile as any).home_lat ?? undefined,
    homeLon: (dbProfile as any).home_lon ?? undefined,
    workAddress: (dbProfile as any).work_address ?? undefined,
    workLat: (dbProfile as any).work_lat ?? undefined,
    workLon: (dbProfile as any).work_lon ?? undefined,
    voiceTrialSecondsUsed: (dbProfile as any).voice_trial_seconds_used ?? 0,
    voiceMinutesUsed: (dbProfile as any).voice_minutes_used ?? 0,
    voiceMinutesResetAt: (dbProfile as any).voice_minutes_reset_at ?? undefined,
    createdAt: dbProfile.created_at,
  };
}

function mapDbConnections(dbConns: any[]): Connection[] {
  return dbConns.map((c) => ({
    memberId: c.member_id,
    name: c.name,
    connectedAt: c.connected_at,
    lastMessage: c.last_message ?? undefined,
    appearanceDesc: c.appearance_desc ?? undefined,
    referenceImageUrl: c.reference_image_url ?? undefined,
    avatarUrl: c.avatar_url ?? undefined,
    voiceId: c.voice_id ?? undefined,
    bio: c.bio ?? undefined,
    personality: c.personality ?? undefined,
    age: c.age ?? undefined,
    handle: c.handle ?? undefined,
    gender: c.gender ?? undefined,
    circles: c.circles ?? undefined,
    isCreated: c.is_created ?? false,
    studioSelections: c.studio_selections ?? undefined,
    backgroundUrl: c.background_url ?? undefined,
    communicationStyle: c.communication_style ?? undefined,
    isArchived: c.is_archived ?? false,
    
    connectionMode: (c as any).connection_mode ?? 'friend',
    backstory: (c as any).backstory ?? undefined,
    relationshipLevel: (c as any).relationship_level ?? 1,
    originStory: (c as any).origin_story ?? undefined,
    imageStyle: (c as any).image_style ?? undefined,
  }));
}

async function fetchProfileAndConnections(user: User) {
  // If offline, serve from localStorage cache
  if (!navigator.onLine) {
    const cachedProfile = localStorage.getItem(STORAGE_KEY);
    const cachedConns = localStorage.getItem(CONNECTIONS_KEY);
    const cachedOwnerId = localStorage.getItem('compani-connections-owner');
    if (cachedProfile && cachedOwnerId === user.id) {
      const profile: Profile = JSON.parse(cachedProfile);
      const connections: Connection[] = cachedConns ? JSON.parse(cachedConns) : [];
      return { profile, connections };
    }
    // No cache available — throw so React Query retries when online
    throw new Error('Offline and no cached data');
  }

  const { data: dbProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // If the query failed due to auth/RLS issues, throw so React Query retries
  // instead of treating it as "no profile" and showing the onboarding screen.
  if (profileError && !dbProfile) {
    console.warn('[useProfile] Profile fetch error — will retry:', profileError.message);
    throw new Error(`Profile fetch failed: ${profileError.message}`);
  }

  if (!dbProfile) {
    // Check for migration
    const hasMigrated = localStorage.getItem(MIGRATED_KEY);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && !hasMigrated) {
      await migrateLocalData(user.id, stored);
      // Re-fetch after migration
      return fetchProfileAndConnections(user);
    }
    // Pre-fill from Google
    const googleName = user.user_metadata?.full_name || user.user_metadata?.name || '';
    if (googleName) {
      localStorage.setItem('compani-prefill-name', googleName);
    }
    return { profile: null, connections: [] };
  }

  const profile = mapDbProfile(dbProfile, user);

  // Auto-fill user reference image from OAuth provider (Google/Apple) if not already set
  const oauthAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  if (oauthAvatar && !profile.userReferenceImageUrl) {
    profile.userReferenceImageUrl = oauthAvatar;
    // Write to DB fire-and-forget — don't block the rest of profile load
    supabase.from('profiles')
      .update({ user_reference_image_url: oauthAvatar })
      .eq('user_id', user.id)
      .then(null, () => {});
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));

  const { data: dbConns } = await supabase
    .from('connections')
    .select(CONNECTIONS_SELECT)
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('connected_at', { ascending: false });

  const connections = mapDbConnections(dbConns || []);

  const needsFreshExperienceReset = !profile.onboardingCompleted && !profile.dateOfBirth && connections.length === 0;
  if (needsFreshExperienceReset) {
    clearFreshExperienceState();
    clearLocationSessionState();
  }

  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));
    localStorage.setItem('compani-connections-owner', user.id);

  // Sync memories to localStorage cache
  const { data: dbMemories } = await supabase
    .from('memories')
    .select('*')
    .eq('user_id', user.id);

  if (dbMemories && dbMemories.length > 0) {
    const memEntries: MemoryEntry[] = dbMemories.map((m) => ({
      text: m.text,
      category: m.category as MemoryEntry['category'],
      extractedAt: m.extracted_at,
    }));
    const mem: CompanionMemory = {
      entries: memEntries,
      lastExtractedAt: memEntries[memEntries.length - 1]?.extractedAt ?? null,
    };
    saveMemory(mem);
  }

  return { profile, connections };
}

async function migrateLocalData(userId: string, storedProfile: string) {
  try {
    const parsed = JSON.parse(storedProfile);
    const p: Profile = {
      companionName: DEFAULT_COMPANION_NAME,
      companionGender: DEFAULT_COMPANION_GENDER,
      visualMode: 'unsure',
      createdAt: new Date().toISOString(),
      userName: '',
      ...parsed,
    };

    await supabase.from('profiles').upsert({
      user_id: userId,
      user_name: p.userName,
      username: p.username || null,
      vibe: p.vibe || null,
      companion_name: p.companionName,
      companion_gender: p.companionGender,
      phone_number: p.phoneNumber || null,
      sms_opt_in: p.smsOptIn || false,
      created_at: p.createdAt || new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // SECURITY: Only migrate localStorage connections that belong to THIS user.
    // If the stored connections have a different owner_id (or no owner_id),
    // they belong to a previous user on this browser — discard them immediately.
    const storedConns = localStorage.getItem(CONNECTIONS_KEY);
    const storedOwnerId = localStorage.getItem('compani-connections-owner');
    if (storedConns && storedOwnerId === userId) {
      const conns: Connection[] = JSON.parse(storedConns);
      if (conns.length > 0) {
        await supabase.from('connections').upsert(
          conns.map((c) => ({
            user_id: userId,
            member_id: c.memberId,
            name: c.name,
            connected_at: c.connectedAt,
            last_message: c.lastMessage || null,
          })),
          { onConflict: 'user_id,member_id' }
        );
      }
    } else if (storedConns && storedOwnerId !== userId) {
      // Different user's data in localStorage — clear it immediately before it contaminates
      console.warn('[Profile] Clearing localStorage connections from previous user');
      localStorage.removeItem(CONNECTIONS_KEY);
      localStorage.removeItem('compani-connections-owner');
    }

    const memory = loadMemory();
    if (memory.entries.length > 0) {
      // Get the user's first connection member_id for legacy localStorage memories
      const { data: firstConn } = await supabase
        .from('connections')
        .select('member_id')
        .eq('user_id', userId)
        .order('connected_at', { ascending: true })
        .limit(1)
        .single();
      const fallbackMemberId = firstConn?.member_id || 'unknown';

      await supabase.from('memories').insert(
        memory.entries.map((e) => ({
          user_id: userId,
          text: e.text,
          category: e.category,
          extracted_at: e.extractedAt,
          member_id: fallbackMemberId,
        }))
      );
    }

    if (p.phoneNumber && p.smsOptIn) {
      await supabase.from('sms_profiles').update({ user_id: userId }).eq('user_id', userId);
    }

    localStorage.setItem(MIGRATED_KEY, 'true');
  } catch (e) {
    console.error('[Migration] Failed:', e);
  }
}

export function useProfile(user: User | null) {
  const queryClient = useQueryClient();

  const { data, isLoading: loading, isFetched } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfileAndConnections(user!),
    enabled: !!user,
    staleTime: 0,               // always refetch — prevents dashboard showing stale avatarUrl/backgroundUrl
    refetchOnWindowFocus: true,
    retry: 3,                    // retry on auth/RLS errors instead of showing onboarding
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  });

  const profile = data?.profile ?? null;
  const connections = data?.connections ?? [];

  // Real-time sync for connections: patch React Query cache and localStorage when connections table updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile-connections-sync')
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'connections',
          filter: `user_id=eq.${user.id}`,
        },
        (payload: { new: Record<string, any>; old: Record<string, any> }) => {
          const newRow = payload.new;
          const oldRow = payload.old;
          const memberId = newRow?.member_id;
          if (!memberId) return;

          // Build a patch of changed fields we care about
          const patch: Partial<Connection> = {};
          if (newRow.last_message !== oldRow.last_message) patch.lastMessage = newRow.last_message ?? undefined;
          if (newRow.avatar_url !== oldRow.avatar_url) patch.avatarUrl = newRow.avatar_url ?? undefined;
          if (newRow.background_url !== oldRow.background_url) patch.backgroundUrl = newRow.background_url ?? undefined;
          if (newRow.name !== oldRow.name) patch.name = newRow.name;
          if (newRow.relationship_level !== oldRow.relationship_level) patch.relationshipLevel = newRow.relationship_level;

          if (Object.keys(patch).length === 0) return;

          const currentData = queryClient.getQueryData<{ profile: Profile | null; connections: Connection[] }>(['profile', user.id]);
          const currentConns = currentData?.connections ?? [];
          const idx = currentConns.findIndex((c) => c.memberId === memberId);
          if (idx === -1) return;

          const updatedConns = currentConns.map((c, i) =>
            i === idx ? { ...c, ...patch } : c
          );
          localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updatedConns));
          queryClient.setQueryData(['profile', user.id], { profile: currentData?.profile ?? null, connections: updatedConns });
        }
      )
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'connections',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // New companion added — invalidate to refetch full connections list
          queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const saveProfile = useCallback(async (newProfile: Omit<Profile, 'companionName' | 'companionGender' | 'visualMode'> & Partial<Pick<Profile, 'companionName' | 'companionGender' | 'visualMode'>>) => {
    if (!user) return;

    const full: Profile = {
      companionName: DEFAULT_COMPANION_NAME,
      companionGender: DEFAULT_COMPANION_GENDER,
      visualMode: 'unsure',
      ...newProfile,
    };

    logger.log('[saveProfile] Saving profile with bio:', full.bio, 'vibe:', full.vibe);

    const upsertPayload = {
      user_id: user.id,
      user_name: full.userName,
      username: full.username || null,
      preferred_name: full.preferredName || null,
      vibe: full.vibe || null,
      bio: full.bio || null,
      companion_name: full.companionName,
      companion_gender: full.companionGender,
      phone_number: full.phoneNumber || null,
      sms_opt_in: full.smsOptIn || false,
      date_of_birth: full.dateOfBirth || null,
      created_at: full.createdAt || new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'user_id' });

    if (error) {
      console.error('[saveProfile] Failed to save profile:', error);
      throw error;
    }

    logger.log('[saveProfile] Profile saved successfully, bio in DB:', upsertPayload.bio);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
    localStorage.setItem(MIGRATED_KEY, 'true');

    queryClient.setQueryData(['profile', user.id], { profile: full, connections });
  }, [user, connections, queryClient]);

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!profile || !user) return;
    const updated = { ...profile, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Read the CURRENT cached connections at call time — not the stale closure value.
    // This prevents updateProfile from overwriting connections that addConnection
    // just wrote (e.g. after Browse/Studio connect flow).
    const currentCached = queryClient.getQueryData<{ profile: Profile | null; connections: Connection[] }>(['profile', user.id]);
    const currentConnections = currentCached?.connections ?? connections;
    queryClient.setQueryData(['profile', user.id], { profile: updated, connections: currentConnections });

    const dbUpdates: Record<string, unknown> = {};
    if (updates.userName !== undefined) dbUpdates.user_name = updates.userName;
    if (updates.username !== undefined) dbUpdates.username = updates.username;
    if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
    if (updates.vibe !== undefined) dbUpdates.vibe = updates.vibe;
    if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
    if (updates.smsOptIn !== undefined) dbUpdates.sms_opt_in = updates.smsOptIn;
    if (updates.companionName !== undefined) dbUpdates.companion_name = updates.companionName;
    if (updates.companionGender !== undefined) dbUpdates.companion_gender = updates.companionGender;
    if (updates.companionAvatarUrl !== undefined) dbUpdates.companion_avatar_url = updates.companionAvatarUrl;
    if (updates.companionAppearanceDesc !== undefined) dbUpdates.companion_appearance_desc = updates.companionAppearanceDesc ?? null;
    if (updates.companionReferenceImageUrl !== undefined) dbUpdates.companion_reference_image_url = updates.companionReferenceImageUrl;
    if (updates.visualMode !== undefined) dbUpdates.connection_mode = updates.visualMode;
    if (updates.userAppearanceDesc !== undefined) dbUpdates.user_appearance_desc = updates.userAppearanceDesc;
    if (updates.userReferenceImageUrl !== undefined) dbUpdates.user_reference_image_url = updates.userReferenceImageUrl;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
    if (updates.imageStyle !== undefined) dbUpdates.image_style = updates.imageStyle ?? null;
    if (updates.personalityTraits !== undefined) dbUpdates.personality_traits = updates.personalityTraits;
    if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
    if (updates.parentalConsentEmail !== undefined) dbUpdates.parental_consent_email = updates.parentalConsentEmail;
    if (updates.parentalConsentGranted !== undefined) dbUpdates.parental_consent_granted = updates.parentalConsentGranted;
    if (updates.kidsMode !== undefined) dbUpdates.kids_mode = updates.kidsMode;
    if (updates.micSensitivity !== undefined) dbUpdates.mic_sensitivity = updates.micSensitivity;
    if (updates.preferredLanguage !== undefined) dbUpdates.preferred_language = updates.preferredLanguage;
    if (updates.matureMode !== undefined) dbUpdates.mature_mode = updates.matureMode;
    if (updates.roleplayMode !== undefined) dbUpdates.roleplay_mode = updates.roleplayMode;
    if (updates.namePronunciation !== undefined) dbUpdates.name_pronunciation = updates.namePronunciation;
    if (updates.preferredName !== undefined) dbUpdates.preferred_name = updates.preferredName;
    if (updates.interests !== undefined) dbUpdates.interests = updates.interests;
    if (updates.timezone !== undefined) dbUpdates.timezone = updates.timezone;
    if (updates.safetyNetEnabled !== undefined) dbUpdates.safety_net_enabled = updates.safetyNetEnabled;
    if (updates.circadianCeremonies !== undefined) dbUpdates.circadian_ceremonies = updates.circadianCeremonies;
    if (updates.thinkFreelyPokeLevel !== undefined) dbUpdates.think_freely_poke_level = updates.thinkFreelyPokeLevel;
    if ('homeCity' in updates) dbUpdates.home_city = updates.homeCity || null;
    if (updates.homeAnchor !== undefined) dbUpdates.home_anchor = updates.homeAnchor;
    if ('workHubCity' in updates) dbUpdates.work_hub_city = updates.workHubCity || null;
    if ('homeAddress' in updates) dbUpdates.home_address = updates.homeAddress || null;
    if ('homeLat' in updates) dbUpdates.home_lat = updates.homeLat ?? null;
    if ('homeLon' in updates) dbUpdates.home_lon = updates.homeLon ?? null;
    if ('workAddress' in updates) dbUpdates.work_address = updates.workAddress || null;
    if ('workLat' in updates) dbUpdates.work_lat = updates.workLat ?? null;
    if ('workLon' in updates) dbUpdates.work_lon = updates.workLon ?? null;

    if (Object.keys(dbUpdates).length > 0) {
      await supabase.from('profiles').update(dbUpdates).eq('user_id', user.id);
    }
  }, [profile, user, connections, queryClient]);

  // Sign-out: nuke ALL cached data to prevent cross-user bleed on shared devices
  const signOutCleanup = useCallback(() => {
    clearProfileSessionState();
    clearFreshExperienceState();
    clearMemory();
    // Clear the ENTIRE query cache — not just the current user's profile.
    // Without this, a second user logging in on the same browser inherits
    // stale favorites, badges, plans, media, etc. from the previous session.
    queryClient.clear();
  }, [queryClient]);

  // Full account deletion — only used from Settings "Delete Account"
  const clearProfile = useCallback(async () => {
    if (user) {
      await supabase.from('memories').delete().eq('user_id', user.id);
      await supabase.from('connections').delete().eq('user_id', user.id);
      await supabase.from('profiles').delete().eq('user_id', user.id);
    }
    clearProfileSessionState();
    clearFreshExperienceState();
    clearMemory();
    queryClient.setQueryData(['profile', user?.id], { profile: null, connections: [] });
  }, [user, queryClient]);

  const addConnection = useCallback(async (connection: Connection) => {
    // CRITICAL: Verify the current auth session matches the user we're writing for.
    // This prevents stale closures from a previous session writing data under the wrong user.
    const { data: { session } } = await supabase.auth.getSession();
    if (!user || !session || session.user.id !== user.id) {
      console.error('[addConnection] Session mismatch — aborting to prevent cross-user data bleed');
      return;
    }

    const currentData = queryClient.getQueryData<{ profile: Profile | null; connections: Connection[] }>(['profile', user?.id]);
    const currentConns = currentData?.connections ?? [];
    if (currentConns.some((c) => c.memberId === connection.memberId)) return;

    const updatedConns = [connection, ...currentConns];
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updatedConns));
    queryClient.setQueryData(['profile', user?.id], { profile: currentData?.profile ?? null, connections: updatedConns });

    const upsertData: Record<string, unknown> = {
      user_id: user.id,
      member_id: connection.memberId,
      name: connection.name,
      connected_at: connection.connectedAt,
      last_message: connection.lastMessage || null,
      is_archived: false,
    };
    // Only set avatar_url if we actually have one — avoid wiping existing DB value
    if (connection.avatarUrl) {
      upsertData.avatar_url = connection.avatarUrl;
    }
    if (connection.backgroundUrl) {
      upsertData.background_url = connection.backgroundUrl;
    }
    // Always persist companion metadata when provided
    if (connection.isCreated) upsertData.is_created = true;
    if (connection.bio) upsertData.bio = connection.bio;
    if (connection.personality) upsertData.personality = connection.personality;
    if (connection.age) upsertData.age = connection.age;
    if (connection.handle) upsertData.handle = connection.handle;
    if (connection.gender) upsertData.gender = connection.gender;
    if (connection.circles) upsertData.circles = connection.circles;
    if (connection.connectionMode) upsertData.connection_mode = connection.connectionMode;
    if (connection.backstory) upsertData.backstory = connection.backstory;
    if (connection.originStory) upsertData.origin_story = connection.originStory;
    if (connection.imageStyle) upsertData.image_style = connection.imageStyle;
    if (connection.appearanceDesc) upsertData.appearance_desc = connection.appearanceDesc;

    const { count } = await supabase
      .from('connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('member_id', connection.memberId);
    const isNewConnection = count === 0;

    const { error } = await supabase.from('connections').upsert(upsertData as any, { onConflict: 'user_id,member_id' });
    if (!error && isNewConnection) {
      setTimeout(() => navigator.vibrate?.([15, 50, 30]), 200);
    }
  }, [user, queryClient]);

  const isConnected = useCallback((memberId: string) => {
    return connections.some((c) => c.memberId === memberId);
  }, [connections]);

  const updateConnection = useCallback(async (memberId: string, updates: Partial<Connection>) => {
    const currentData = queryClient.getQueryData<{ profile: Profile | null; connections: Connection[] }>(['profile', user?.id]);
    const updatedConns = (currentData?.connections ?? []).map((c) => c.memberId === memberId ? { ...c, ...updates } : c);
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updatedConns));
    queryClient.setQueryData(['profile', user?.id], { profile: currentData?.profile ?? null, connections: updatedConns });

    if (user) {
      const dbUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.appearanceDesc !== undefined) dbUpdates.appearance_desc = updates.appearanceDesc;
      if (updates.referenceImageUrl !== undefined) dbUpdates.reference_image_url = updates.referenceImageUrl;
      if (updates.lastMessage !== undefined) dbUpdates.last_message = updates.lastMessage;
      if (updates.voiceId !== undefined) dbUpdates.voice_id = updates.voiceId;
      if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;
      if (updates.studioSelections !== undefined) dbUpdates.studio_selections = updates.studioSelections;
      if (updates.bio !== undefined) dbUpdates.bio = updates.bio;
      if (updates.personality !== undefined) dbUpdates.personality = updates.personality;
      if (updates.age !== undefined) dbUpdates.age = updates.age;
      if (updates.handle !== undefined) dbUpdates.handle = updates.handle;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.backgroundUrl !== undefined) dbUpdates.background_url = updates.backgroundUrl;
      if (updates.communicationStyle !== undefined) dbUpdates.communication_style = updates.communicationStyle;
      
      if (updates.connectionMode !== undefined) dbUpdates.connection_mode = updates.connectionMode;
      if (updates.backstory !== undefined) dbUpdates.backstory = updates.backstory;
      if ((updates as any).originStory !== undefined) dbUpdates.origin_story = (updates as any).originStory;
      if (Object.keys(dbUpdates).length > 0) {
        logger.log('[Profile] Saving connection update:', memberId, dbUpdates);
        const { error } = await (supabase as any).from('connections').update(dbUpdates).eq('user_id', user.id).eq('member_id', memberId);
        if (error) console.error('[Profile] Connection update failed:', error);
      }
    }
  }, [user, queryClient]);

  const removeConnection = useCallback(async (memberId: string, opts?: { deleteHistory?: boolean }) => {
    const currentData = queryClient.getQueryData<{ profile: Profile | null; connections: Connection[] }>(['profile', user?.id]);
    const updatedConns = (currentData?.connections ?? []).filter((c) => c.memberId !== memberId);
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updatedConns));
    queryClient.setQueryData(['profile', user?.id], { profile: currentData?.profile ?? null, connections: updatedConns });

    if (user) {
      await supabase.from('connections').delete().eq('user_id', user.id).eq('member_id', memberId);

      // Always clean up companion-specific data from all related tables
      await Promise.all([
        supabase.from('companion_facts').delete().eq('user_id', user.id).eq('member_id', memberId),
        supabase.from('memories').delete().eq('user_id', user.id).eq('member_id', memberId),
        supabase.from('companion_collectibles').delete().eq('user_id', user.id).eq('member_id', memberId),
        supabase.from('reminders').delete().eq('user_id', user.id).eq('member_id', memberId),
        supabase.from('companion_plans').delete().eq('user_id', user.id).eq('member_id', memberId),
      ]);

      if (opts?.deleteHistory) {
        // Also clean up chat messages, feed posts, milestones, and media
        await Promise.all([
          supabase.from('chat_messages').delete().eq('user_id', user.id).eq('member_id', memberId),
          supabase.from('companion_feed_posts' as any).delete().eq('user_id', user.id).eq('member_id', memberId),
          supabase.from('companion_milestones').delete().eq('user_id', user.id).eq('member_id', memberId),
          supabase.from('companion_media').delete().eq('user_id', user.id).eq('member_id', memberId),
        ]);
      }
    }
  }, [user, queryClient]);

  const archiveConnection = useCallback(async (memberId: string) => {
    const currentData = queryClient.getQueryData<{ profile: Profile | null; connections: Connection[] }>(['profile', user?.id]);
    const conn = (currentData?.connections ?? []).find((c) => c.memberId === memberId);
    const updatedConns = (currentData?.connections ?? []).filter((c) => c.memberId !== memberId);
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updatedConns));
    queryClient.setQueryData(['profile', user?.id], { profile: currentData?.profile ?? null, connections: updatedConns });

    if (user) {
      await supabase
        .from('connections')
        .update({ is_archived: true, archived_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('member_id', memberId);

      // Clean up Cami memories that reference this companion by name
      // so Cami doesn't keep bringing up archived friends
      if (conn?.name) {
        const { data: camiMems } = await supabase
          .from('cami_memories')
          .select('id, text')
          .eq('user_id', user.id);
        if (camiMems?.length) {
          const nameLower = conn.name.toLowerCase();
          const toDelete = camiMems.filter(m => m.text.toLowerCase().includes(nameLower));
          if (toDelete.length > 0) {
            await supabase
              .from('cami_memories')
              .delete()
              .in('id', toDelete.map(m => m.id));
          }
        }
      }
    }
  }, [user, queryClient]);

  const restoreConnection = useCallback(async (memberId: string) => {
    if (!user) return;
    const { data } = await supabase
      .from('connections')
      .select(CONNECTIONS_SELECT)
      .eq('user_id', user.id)
      .eq('member_id', memberId)
      .maybeSingle();

    if (!data) return;

    await supabase
      .from('connections')
      .update({ is_archived: false, archived_at: null })
      .eq('user_id', user.id)
      .eq('member_id', memberId);

    const restoredConn: Connection = {
      memberId: data.member_id,
      name: data.name,
      connectedAt: data.connected_at,
      lastMessage: data.last_message ?? undefined,
      avatarUrl: data.avatar_url ?? undefined,
      bio: data.bio ?? undefined,
      personality: data.personality ?? undefined,
      age: data.age ?? undefined,
      handle: data.handle ?? undefined,
      gender: data.gender ?? undefined,
      isCreated: data.is_created ?? false,
      backgroundUrl: data.background_url ?? undefined,
      isArchived: false,
    };

    const currentData = queryClient.getQueryData<{ profile: Profile | null; connections: Connection[] }>(['profile', user?.id]);
    const updatedConns = [...(currentData?.connections ?? []), restoredConn];
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(updatedConns));
    queryClient.setQueryData(['profile', user?.id], { profile: currentData?.profile ?? null, connections: updatedConns });
  }, [user, queryClient]);

  const fetchArchivedConnections = useCallback(async (): Promise<Connection[]> => {
    if (!user) return [];
    const { data } = await supabase
      .from('connections')
      .select(CONNECTIONS_SELECT)
      .eq('user_id', user.id)
      .eq('is_archived', true)
      .order('archived_at', { ascending: false });

    return (data || []).map((c) => ({
      memberId: c.member_id,
      name: c.name,
      connectedAt: c.connected_at,
      lastMessage: c.last_message ?? undefined,
      avatarUrl: c.avatar_url ?? undefined,
      bio: c.bio ?? undefined,
      personality: c.personality ?? undefined,
      age: c.age ?? undefined,
      handle: c.handle ?? undefined,
      gender: c.gender ?? undefined,
      isCreated: c.is_created ?? false,
      backgroundUrl: c.background_url ?? undefined,
      isArchived: true,
    }));
  }, [user]);

  return { profile, connections, loading, isFetched, saveProfile, updateProfile, clearProfile, signOutCleanup, addConnection, isConnected, updateConnection, removeConnection, archiveConnection, restoreConnection, fetchArchivedConnections };
}
