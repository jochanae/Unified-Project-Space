// PERF: 2026-03-15 — Added AbortController for fetch in useEffect — prevents state update after unmount
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const GENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-presence-moment`;

const PRESENCE_MOMENTS = [
  'Put your phone down for five minutes. Just breathe.',
  "Look out a window. Notice one thing you haven't before.",
  'Text someone you haven\'t talked to in a while.',
  'Drink a glass of water. Your body will thank you.',
  'Step outside — even sixty seconds of fresh air counts.',
  'Name three things you can hear right now.',
  "Stretch your shoulders. You're holding more than you think.",
  "Write down one thing you're grateful for today.",
  'Close your eyes and take three slow breaths.',
  "Do something kind for yourself — you've earned it.",
];

function getStaticPresenceMoment(): string {
  const now = new Date();
  const daySeed = now.getFullYear() * 366 + now.getMonth() * 31 + now.getDate();
  return PRESENCE_MOMENTS[daySeed % PRESENCE_MOMENTS.length];
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const today = new Date();
  return d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
}

export interface CompanionContext {
  connectionMode?: string;
  personality?: string;
  bio?: string;
}

export interface UsePresenceMomentParams {
  userId: string | null;
  primaryMemberId: string | null;
  firstName: string;
  companionContext?: CompanionContext;
}

export function usePresenceMoment({
  userId,
  primaryMemberId,
  firstName,
  companionContext,
}: UsePresenceMomentParams) {
  const [contentByMember, setContentByMember] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [companionName, setCompanionName] = useState<string | null>(null);

  const content = primaryMemberId ? contentByMember[primaryMemberId] ?? null : contentByMember['__global'] ?? null;

  const fetchAndGenerate = useCallback(async (signal?: AbortSignal) => {
    const cacheKey = primaryMemberId || '__global';
    // If we already have a cached moment for this companion, skip
    if (contentByMember[cacheKey]) {
      setLoading(false);
      return;
    }

    if (!userId) {
      setContentByMember(prev => ({ ...prev, [cacheKey]: getStaticPresenceMoment() }));
      setLoading(false);
      return;
    }

    try {
      // 1. Check if we have a cached moment for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartIso = todayStart.toISOString();

      const { data: cached } = await supabase
        .from('presence_moments')
        .select('content, generated_at')
        .eq('user_id', userId)
        .gte('generated_at', todayStartIso)
        .order('generated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.content && isToday(cached.generated_at)) {
        setContentByMember(prev => ({ ...prev, [cacheKey]: cached.content }));
        setLoading(false);
        return;
      }

      // 2. Fetch profile context (first name, interests, bio, vibe, personality_traits)
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_name, preferred_name, interests, bio, vibe, personality_traits')
        .eq('user_id', userId)
        .maybeSingle();

      const profileFirstName = profile?.preferred_name?.trim() ||
        profile?.user_name?.split(' ')[0] ||
        firstName ||
        '';

      const profileContext = profile
        ? {
            interests: profile.interests ?? undefined,
            bio: profile.bio ?? undefined,
            vibe: profile.vibe ?? undefined,
            personality_traits: profile.personality_traits ?? undefined,
          }
        : undefined;

      // Recency window: only feed signals from the last 48h into the generator.
      // Older context (week-old trip, stale mood, etc.) makes the moment feel
      // out-of-date and jarring on the home screen.
      const RECENCY_WINDOW_MS = 48 * 60 * 60 * 1000;
      const recencyCutoff = new Date(Date.now() - RECENCY_WINDOW_MS).toISOString();
      const isRecent = (iso?: string | null) =>
        !!iso && Date.now() - new Date(iso).getTime() < RECENCY_WINDOW_MS;

      // 3. Fetch companion name + last 10 messages with primary companion (last 48h only)
      let messages: { role: string; content: string }[] = [];
      if (primaryMemberId) {
        const { data: connData } = await supabase
          .from('connections')
          .select('name')
          .eq('member_id', primaryMemberId)
          .eq('user_id', userId)
          .maybeSingle();
        if (connData?.name) setCompanionName(connData.name);

        const { data: msgData } = await supabase
          .from('chat_messages')
          .select('role, content')
          .eq('user_id', userId)
          .eq('member_id', primaryMemberId)
          .gte('created_at', recencyCutoff)
          .order('created_at', { ascending: false })
          .limit(10);
        messages = (msgData || []).reverse().map((m) => ({
          role: m.role,
          content: m.content,
        }));
      }

      // 4. Parallel fetches: mood, journal, guidance plans (mood/journal gated by 48h recency)
      const [moodRes, journalRes, plansRes] = await Promise.all([
        supabase
          .from('mood_checkins')
          .select('mood_emoji, mood_level, note, created_at')
          .eq('user_id', userId)
          .gte('created_at', recencyCutoff)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('journal_entries')
          .select('content, created_at')
          .eq('user_id', userId)
          .eq('is_private', false)
          .gte('created_at', recencyCutoff)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('companion_plans' as any)
          .select('title, companion_name, steps')
          .eq('user_id', userId)
          .eq('status', 'active')
          .eq('plan_type', 'guidance')
          .limit(3),
      ]);

      // Defensive double-check in case DB filter is bypassed for any reason
      const recentMood = isRecent(moodRes.data?.created_at) ? moodRes.data ?? undefined : undefined;
      const recentJournal = isRecent(journalRes.data?.created_at) ? journalRes.data ?? undefined : undefined;
      const guidancePlans = plansRes.data ?? undefined;

      // 5. Call the API to generate
      const resp = await fetch(GENERATE_URL, {
        method: 'POST',
        signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          firstName: profileFirstName || undefined,
          profileContext,
          messages,
          recentMood,
          recentJournal,
          guidancePlans,
          companionContext: companionContext || undefined,
        }),
      });

      if (!resp.ok) {
        throw new Error('Generation failed');
      }

      const { content: generated } = await resp.json();
      if (signal?.aborted) return;
      if (generated && typeof generated === 'string' && generated.trim()) {
        await supabase.from('presence_moments').insert({
          user_id: userId,
          content: generated.trim(),
        });
        setContentByMember(prev => ({ ...prev, [cacheKey]: generated.trim() }));
      } else {
        setContentByMember(prev => ({ ...prev, [cacheKey]: getStaticPresenceMoment() }));
      }
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return;
      setContentByMember(prev => ({ ...prev, [cacheKey]: getStaticPresenceMoment() }));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [userId, primaryMemberId, firstName, companionContext]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAndGenerate(controller.signal);
    return () => controller.abort();
  }, [fetchAndGenerate]);

  return {
    content: content ?? getStaticPresenceMoment(),
    loading,
    companionName,
  };
}
