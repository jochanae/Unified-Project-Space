import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadMemory, saveMemory, mergeNewMemories, formatMemoriesForPrompt, MemoryEntry } from '@/lib/memory';

export interface JournalEntry {
  id: string;
  prompt: string | null;
  content: string;
  moodTag: string | null;
  isPrivate: boolean;
  sourceType: string;
  checkinId: string | null;
  createdAt: string;
  imageUrl?: string | null;
}

export interface MoodCheckin {
  id: string;
  moodLevel: number;
  moodEmoji: string;
  note: string | null;
  createdAt: string;
}

export interface GratitudeEntry {
  id: string;
  items: string[];
  createdAt: string;
}

const FALLBACK_PROMPTS = [
  "What's taking up the most space in your mind today?",
  "Describe a moment from today that made you feel something.",
  "What would you say to your younger self right now?",
  "What's one thing you're carrying that you wish you could set down?",
  "If today had a soundtrack, what would it be and why?",
  "What boundaries do you need to honor this week?",
  "Write about someone who showed up for you recently.",
  "What does 'enough' look like for you today?",
  "What are you avoiding? Why do you think that is?",
  "Describe your ideal tomorrow morning in detail.",
  "What emotion keeps visiting you this week?",
  "What's a small win you haven't celebrated yet?",
  "Write a letter to the person you're becoming.",
  "What does your body need from you today?",
];

const AFFIRMATIONS = [
  "You are allowed to take up space.",
  "Your pace is valid. There's no rush.",
  "You don't have to earn rest.",
  "The people who matter see you.",
  "It's okay to not have it all figured out.",
  "You are more resilient than you realize.",
  "Your feelings are data, not destiny.",
  "Today is enough. You are enough.",
  "Small steps still count as movement.",
  "You deserve the kindness you give others.",
  "Your story isn't over — this is just a chapter.",
  "You are worthy of good things happening to you.",
  "It's brave to ask for help.",
  "You're doing better than you think.",
];

export function getDailyPrompt(): string {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % FALLBACK_PROMPTS.length;
  return FALLBACK_PROMPTS[dayIndex];
}

export function getDailyAffirmation(): string {
  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % AFFIRMATIONS.length;
  return AFFIRMATIONS[dayIndex];
}

const PROMPT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/journal-prompts`;

export function useWellness(userId: string | null, userName?: string, activeConnectionNames?: string[], primaryMemberId?: string | null) {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [moods, setMoods] = useState<MoodCheckin[]>([]);
  const [gratitudes, setGratitudes] = useState<GratitudeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiPrompts, setAiPrompts] = useState<string[]>([]);
  const [promptsLoading, setPromptsLoading] = useState(false);

  // Pagination state
  const WELLNESS_PAGE = 30;
  const [hasMoreJournals, setHasMoreJournals] = useState(false);
  const [hasMoreMoods, setHasMoreMoods] = useState(false);
  const [hasMoreGratitudes, setHasMoreGratitudes] = useState(false);
  const [loadingMoreWellness, setLoadingMoreWellness] = useState(false);

  // Load all wellness data
  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      const [jRes, mRes, gRes] = await Promise.all([
        supabase.from('journal_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(WELLNESS_PAGE),
        supabase.from('mood_checkins').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(WELLNESS_PAGE),
        supabase.from('gratitude_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(WELLNESS_PAGE),
      ]);

      if (jRes.data) {
        setJournals(jRes.data.map(r => ({ id: r.id, prompt: r.prompt, content: r.content, moodTag: r.mood_tag, isPrivate: (r as any).is_private ?? false, sourceType: (r as any).source_type ?? 'manual', checkinId: (r as any).checkin_id ?? null, createdAt: r.created_at, imageUrl: (r as any).image_url ?? null })));
        setHasMoreJournals(jRes.data.length >= WELLNESS_PAGE);
      }
      if (mRes.data) {
        setMoods(mRes.data.map(r => ({ id: r.id, moodLevel: r.mood_level, moodEmoji: r.mood_emoji, note: r.note, createdAt: r.created_at })));
        setHasMoreMoods(mRes.data.length >= WELLNESS_PAGE);
      }
      if (gRes.data) {
        setGratitudes(gRes.data.map(r => ({ id: r.id, items: (r.items as string[]) || [], createdAt: r.created_at })));
        setHasMoreGratitudes(gRes.data.length >= WELLNESS_PAGE);
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  // Load more for a specific wellness type
  const loadMoreWellness = useCallback(async (type: 'journals' | 'moods' | 'gratitudes') => {
    if (!userId || loadingMoreWellness) return;
    setLoadingMoreWellness(true);
    try {
      if (type === 'journals' && hasMoreJournals && journals.length > 0) {
        const oldest = journals[journals.length - 1].createdAt;
        const { data } = await supabase.from('journal_entries').select('*').eq('user_id', userId)
          .lt('created_at', oldest).order('created_at', { ascending: false }).limit(WELLNESS_PAGE);
        if (data) {
          const mapped = data.map(r => ({ id: r.id, prompt: r.prompt, content: r.content, moodTag: r.mood_tag, isPrivate: (r as any).is_private ?? false, sourceType: (r as any).source_type ?? 'manual', checkinId: (r as any).checkin_id ?? null, createdAt: r.created_at }));
          setJournals(prev => [...prev, ...mapped]);
          setHasMoreJournals(data.length >= WELLNESS_PAGE);
        } else { setHasMoreJournals(false); }
      }
      if (type === 'moods' && hasMoreMoods && moods.length > 0) {
        const oldest = moods[moods.length - 1].createdAt;
        const { data } = await supabase.from('mood_checkins').select('*').eq('user_id', userId)
          .lt('created_at', oldest).order('created_at', { ascending: false }).limit(WELLNESS_PAGE);
        if (data) {
          const mapped = data.map(r => ({ id: r.id, moodLevel: r.mood_level, moodEmoji: r.mood_emoji, note: r.note, createdAt: r.created_at }));
          setMoods(prev => [...prev, ...mapped]);
          setHasMoreMoods(data.length >= WELLNESS_PAGE);
        } else { setHasMoreMoods(false); }
      }
      if (type === 'gratitudes' && hasMoreGratitudes && gratitudes.length > 0) {
        const oldest = gratitudes[gratitudes.length - 1].createdAt;
        const { data } = await supabase.from('gratitude_entries').select('*').eq('user_id', userId)
          .lt('created_at', oldest).order('created_at', { ascending: false }).limit(WELLNESS_PAGE);
        if (data) {
          const mapped = data.map(r => ({ id: r.id, items: (r.items as string[]) || [], createdAt: r.created_at }));
          setGratitudes(prev => [...prev, ...mapped]);
          setHasMoreGratitudes(data.length >= WELLNESS_PAGE);
        } else { setHasMoreGratitudes(false); }
      }
    } finally {
      setLoadingMoreWellness(false);
    }
  }, [userId, loadingMoreWellness, journals, moods, gratitudes, hasMoreJournals, hasMoreMoods, hasMoreGratitudes]);

  // Sync wellness data to memory layer — only once per session to prevent duplicates
  const hasSyncedRef = useRef(false);

  const syncWellnessToMemory = useCallback(async () => {
    if (!userId || hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const memoryEntries: MemoryEntry[] = [];
    const now = new Date().toISOString();

    // Convert recent moods to emotional memories
    if (moods.length > 0) {
      const recentMood = moods[0];
      const moodLabels: Record<number, string> = { 1: 'rough', 2: 'low', 3: 'okay', 4: 'good', 5: 'great' };
      memoryEntries.push({
        text: `Recently feeling ${moodLabels[recentMood.moodLevel] || 'okay'}${recentMood.note ? ` — ${recentMood.note}` : ''}`,
        category: 'emotional',
        extractedAt: now,
      });
    }

    if (gratitudes.length > 0) {
      const recent = gratitudes[0];
      if (recent.items.length > 0) {
        memoryEntries.push({
          text: `Grateful for: ${recent.items.join(', ')}`,
          category: 'general',
          extractedAt: now,
        });
      }
    }

    // Only sync non-private journals to companion memory
    const publicJournals = journals.filter(j => !j.isPrivate);
    if (publicJournals.length > 0) {
      const recent = publicJournals[0];
      const snippet = recent.content.slice(0, 100);
      memoryEntries.push({
        text: `Journaled about: ${snippet}`,
        category: 'emotional',
        extractedAt: now,
      });
    }

    if (memoryEntries.length > 0) {
      const current = loadMemory();
      const updated = mergeNewMemories(current, memoryEntries);
      saveMemory(updated);

      // Check DB for duplicates before inserting
      for (const entry of memoryEntries) {
        const { data: existing } = await supabase
          .from('memories')
          .select('id')
          .eq('user_id', userId)
          .eq('text', entry.text)
          .limit(1);
        
        if (!existing || existing.length === 0) {
          await supabase.from('memories').insert({
            user_id: userId,
            text: entry.text,
            category: entry.category,
            extracted_at: entry.extractedAt,
            member_id: primaryMemberId || 'unknown',
          });
        }
      }
    }
  }, [userId, moods, gratitudes, journals]);

  // Auto-sync wellness to memory once after data loads
  useEffect(() => {
    if (!userId || loading) return;
    if (moods.length === 0 && journals.length === 0 && gratitudes.length === 0) return;
    syncWellnessToMemory();
  }, [loading]);

  // Fetch AI-personalized journal prompts
  const fetchAiPrompts = useCallback(async () => {
    if (!userId || !userName) return;
    setPromptsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      let recentConversation: { role: string; content: string }[] | undefined;
      if (primaryMemberId) {
        try {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('role, content')
            .eq('user_id', userId)
            .eq('member_id', primaryMemberId)
            .order('created_at', { ascending: false })
            .limit(5);
          if (!error && data && data.length > 0) {
            recentConversation = data.map(r => ({ role: r.role, content: r.content }));
          }
        } catch {
          // Proceed without recent conversation — additive only
        }
      }

      const memory = loadMemory();
      const memoriesText = formatMemoriesForPrompt(memory);
      const body: Record<string, unknown> = {
        userName,
        recentMoods: moods.slice(0, 5).map(m => ({ emoji: m.moodEmoji, note: m.note })),
        recentJournals: journals.slice(0, 3).map(j => ({ content: j.content })),
        recentGratitudes: gratitudes.slice(0, 3).map(g => ({ items: g.items })),
        memories: memoriesText,
        activeConnectionNames: activeConnectionNames || [],
      };
      if (recentConversation) body.recentConversation = recentConversation;

      const resp = await fetch(PROMPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(body),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.prompts?.length > 0) {
          setAiPrompts(data.prompts);
        }
      }
    } catch (e) {
      console.error('[Wellness] AI prompts failed:', e);
    } finally {
      setPromptsLoading(false);
    }
  }, [userId, userName, moods, journals, gratitudes, activeConnectionNames, primaryMemberId]);

  const addJournalEntry = useCallback(async (content: string, prompt?: string, moodTag?: string, isPrivate?: boolean, sourceType?: string, checkinId?: string, imageUrl?: string) => {
    if (!userId) return;
    const payload = {
      user_id: userId, content, prompt: prompt || null, mood_tag: moodTag || null, is_private: isPrivate ?? false,
      source_type: sourceType || 'manual', checkin_id: checkinId || null,
      ...(imageUrl ? { image_url: imageUrl } : {}),
    };

    if (!navigator.onLine) {
      const { enqueue } = await import('@/lib/offlineQueue');
      const tempId = `offline-journal-${Date.now()}`;
      enqueue({ id: tempId, type: 'journal_entry', table: 'journal_entries', payload, queuedAt: new Date().toISOString() });
      // Optimistic local update
      setJournals(prev => [{ id: tempId, prompt: prompt || null, content, moodTag: moodTag || null, isPrivate: isPrivate ?? false, sourceType: sourceType || 'manual', checkinId: checkinId || null, createdAt: new Date().toISOString(), imageUrl: imageUrl || null }, ...prev]);
      const { toast } = await import('sonner');
      toast('Journal entry saved offline — will sync when back online', { icon: '📤' });
      return;
    }

    const { data, error } = await supabase.from('journal_entries').insert(payload as any).select().single();
    if (data && !error) {
      setJournals(prev => [{ id: data.id, prompt: data.prompt, content: data.content, moodTag: data.mood_tag, isPrivate: (data as any).is_private ?? false, sourceType: (data as any).source_type ?? 'manual', checkinId: (data as any).checkin_id ?? null, createdAt: data.created_at, imageUrl: (data as any).image_url ?? null }, ...prev]);
    }
  }, [userId]);

  const toggleJournalPrivacy = useCallback(async (journalId: string) => {
    const entry = journals.find(j => j.id === journalId);
    if (!entry || !userId) return;
    const newVal = !entry.isPrivate;
    const { error } = await supabase.from('journal_entries').update({ is_private: newVal } as any).eq('id', journalId);
    if (!error) {
      setJournals(prev => prev.map(j => j.id === journalId ? { ...j, isPrivate: newVal } : j));
    }
  }, [userId, journals]);

  const addMoodCheckin = useCallback(async (moodLevel: number, moodEmoji: string, note?: string, companionContext?: Record<string, unknown>) => {
    if (!userId) return;
    const payload = {
      user_id: userId, mood_level: moodLevel, mood_emoji: moodEmoji, note: note || null,
      companion_context: (companionContext || { referenced: false }) as any,
    };

    if (!navigator.onLine) {
      const { enqueue } = await import('@/lib/offlineQueue');
      const tempId = `offline-mood-${Date.now()}`;
      enqueue({ id: tempId, type: 'mood_checkin', table: 'mood_checkins', payload, queuedAt: new Date().toISOString() });
      setMoods(prev => [{ id: tempId, moodLevel, moodEmoji, note: note || null, createdAt: new Date().toISOString() }, ...prev]);
      const { toast } = await import('sonner');
      toast('Mood check-in saved offline — will sync when back online', { icon: '📤' });
      return;
    }

    const { data, error } = await supabase.from('mood_checkins').insert(payload as any).select().single();
    if (data && !error) {
      setMoods(prev => [{ id: data.id, moodLevel: data.mood_level, moodEmoji: data.mood_emoji, note: data.note, createdAt: data.created_at }, ...prev]);
      import('@/lib/feedEvents').then(({ fireEventPost }) => {
        fireEventPost({
          userId: userId!,
          eventType: 'mood_log',
          eventLabel: `You logged a mood: ${moodEmoji}`,
          eventContext: note || `Mood level: ${moodLevel}/5`,
        });
      });
    }
    return data;
  }, [userId]);

  const addGratitudeEntry = useCallback(async (items: string[]) => {
    if (!userId) return;
    const payload = { user_id: userId, items: items as any };

    if (!navigator.onLine) {
      const { enqueue } = await import('@/lib/offlineQueue');
      const tempId = `offline-gratitude-${Date.now()}`;
      enqueue({ id: tempId, type: 'gratitude_entry', table: 'gratitude_entries', payload, queuedAt: new Date().toISOString() });
      setGratitudes(prev => [{ id: tempId, items, createdAt: new Date().toISOString() }, ...prev]);
      const { toast } = await import('sonner');
      toast('Gratitude entry saved offline — will sync when back online', { icon: '📤' });
      return;
    }

    const { data, error } = await supabase.from('gratitude_entries').insert(payload).select().single();
    if (data && !error) {
      setGratitudes(prev => [{ id: data.id, items: (data.items as string[]) || [], createdAt: data.created_at }, ...prev]);
    }
  }, [userId]);

  const today = new Date().toISOString().slice(0, 10);
  const hasJournaledToday = journals.some(j => j.createdAt.slice(0, 10) === today);
  const hasMoodToday = moods.some(m => m.createdAt.slice(0, 10) === today);
  const hasGratitudeToday = gratitudes.some(g => g.createdAt.slice(0, 10) === today);

  // Calculate journal streak
  const journalStreak = (() => {
    if (journals.length === 0) return 0;
    let streak = 0;
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    const dates = new Set(journals.map(j => j.createdAt.slice(0, 10)));
    for (let i = 0; i < 365; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      if (dates.has(d.toISOString().slice(0, 10))) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  })();

  return {
    journals, moods, gratitudes, loading,
    addJournalEntry, addMoodCheckin, addGratitudeEntry, toggleJournalPrivacy,
    hasJournaledToday, hasMoodToday, hasGratitudeToday,
    dailyPrompt: getDailyPrompt(),
    dailyAffirmation: getDailyAffirmation(),
    journalStreak,
    aiPrompts, promptsLoading, fetchAiPrompts,
    // Pagination
    loadMoreWellness, loadingMoreWellness,
    hasMoreJournals, hasMoreMoods, hasMoreGratitudes,
  };
}
