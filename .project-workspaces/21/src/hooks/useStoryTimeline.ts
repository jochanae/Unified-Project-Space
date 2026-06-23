import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TimelineEntryType = 'memory' | 'milestone' | 'plan' | 'rhythm' | 'mood' | 'moment';

export interface TimelineEntry {
  id: string;
  type: TimelineEntryType;
  text: string;
  category: string;
  date: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

interface RawMemory {
  id: string;
  text: string;
  category: string;
  extracted_at: string;
}

interface RawMilestone {
  id: string;
  milestone_type: string;
  achieved_at: string;
  moment_delivered: boolean;
}

interface RawPlan {
  id: string;
  title: string;
  emoji: string;
  category: string;
  completed_at: string;
  companion_name: string;
  is_rhythm: boolean;
}

interface RawMood {
  id: string;
  mood_emoji: string;
  mood_level: number;
  note: string | null;
  created_at: string;
}

interface RawFavorite {
  id: string;
  post_content: string;
  source: string;
  image_url: string | null;
  created_at: string;
}

const MILESTONE_LABELS: Record<string, string> = {
  first_message: '💛 First conversation together',
  '7_day_streak': '🔥 7-day streak reached',
  '30_day_streak': '💛 One month of conversations',
  vulnerable_share: '🤝 A moment of real courage',
  crisis_followup: '💛 Checked in on you',
};

function normalizeMemory(m: RawMemory): TimelineEntry {
  return {
    id: `mem-${m.id}`,
    type: 'memory',
    text: m.text,
    category: m.category,
    date: m.extracted_at,
  };
}

function normalizeMilestone(m: RawMilestone): TimelineEntry {
  return {
    id: `mile-${m.id}`,
    type: 'milestone',
    text: MILESTONE_LABELS[m.milestone_type] || m.milestone_type,
    category: 'milestone',
    date: m.achieved_at,
    metadata: { milestoneType: m.milestone_type },
  };
}

function normalizePlan(p: RawPlan): TimelineEntry {
  const text = p.is_rhythm
    ? `${p.emoji} Kept ${p.title} rhythm`
    : `${p.emoji} Completed: ${p.title}`;
  return {
    id: `plan-${p.id}`,
    type: p.is_rhythm ? 'rhythm' : 'plan',
    text,
    category: p.category,
    date: p.completed_at,
    metadata: { companionName: p.companion_name },
  };
}

function normalizeMood(m: RawMood): TimelineEntry {
  return {
    id: `mood-${m.id}`,
    type: 'mood',
    text: m.note
      ? `${m.mood_emoji} Feeling ${moodLabel(m.mood_level)} — "${m.note}"`
      : `${m.mood_emoji} Feeling ${moodLabel(m.mood_level)}`,
    category: 'emotional',
    date: m.created_at,
    metadata: { moodLevel: m.mood_level, emoji: m.mood_emoji },
  };
}

function moodLabel(level: number): string {
  if (level <= 1) return 'rough';
  if (level <= 2) return 'low';
  if (level <= 3) return 'okay';
  if (level <= 4) return 'good';
  return 'great';
}

function normalizeFavorite(f: RawFavorite): TimelineEntry {
  return {
    id: `fav-${f.id}`,
    type: 'moment',
    text: f.post_content,
    category: f.source === 'chat' ? 'chat' : f.source === 'milestone' ? 'milestone' : 'saved',
    date: f.created_at,
    imageUrl: f.image_url || undefined,
  };
}

export function formatTimelineDate(dateStr: string): string {
  const d = new Date(dateStr);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const today = startOf(new Date());
  const that = startOf(d);
  const diffDays = Math.round((today - that) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function groupByDate(entries: TimelineEntry[]): { label: string; items: TimelineEntry[] }[] {
  const groups = new Map<string, TimelineEntry[]>();
  for (const e of entries) {
    const label = formatTimelineDate(e.date);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(e);
  }
  return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

const PAGE_SIZE = 50;

export function useStoryTimeline(userId: string | undefined) {
  const [allEntries, setAllEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [memoriesRes, milestonesRes, plansRes, moodRes, favoritesRes] = await Promise.all([
      supabase
        .from('memories')
        .select('id, text, category, extracted_at')
        .eq('user_id', userId)
        .order('extracted_at', { ascending: false })
        .limit(500),
      (supabase as any)
        .from('companion_milestones')
        .select('id, milestone_type, achieved_at, moment_delivered')
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false }),
      (supabase as any)
        .from('companion_plans')
        .select('id, title, emoji, category, completed_at, companion_name, is_rhythm')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(200),
      supabase
        .from('mood_checkins')
        .select('id, mood_emoji, mood_level, note, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('favorites')
        .select('id, post_content, source, image_url, created_at')
        .eq('user_id', userId)
        .in('source', ['chat', 'milestone', 'match'])
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    const memories = (memoriesRes.data as RawMemory[] || []).map(normalizeMemory);
    const milestones = (milestonesRes.data as RawMilestone[] || []).map(normalizeMilestone);
    const plans = (plansRes.data as RawPlan[] || []).map(normalizePlan);
    const moods = (moodRes.data as RawMood[] || []).map(normalizeMood);
    const moments = (favoritesRes.data as RawFavorite[] || []).map(normalizeFavorite);

    const combined = [...memories, ...milestones, ...plans, ...moods, ...moments]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setAllEntries(combined);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const loadMore = useCallback(() => {
    setDisplayCount(c => Math.min(c + PAGE_SIZE, allEntries.length));
  }, [allEntries.length]);

  return { allEntries, loading, displayCount, loadMore, refetch: fetchAll };
}
