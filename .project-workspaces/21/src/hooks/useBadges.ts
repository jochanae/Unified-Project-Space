import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Badge {
  id: string;
  badge_id: string;
  badge_name: string;
  badge_emoji: string;
  earned_at: string;
  source: string;
}

// Badge definitions
export const BADGE_DEFINITIONS: Record<string, { name: string; emoji: string }> = {
  'digital-guard': { name: 'Digital Guard', emoji: '🛡️' },
  'safety-scholar': { name: 'Safety Scholar', emoji: '📚' },
  'creative-explorer': { name: 'Creative Explorer', emoji: '🎨' },
  'storyteller': { name: 'Storyteller', emoji: '✍️' },
  'tone-checker': { name: 'Tone Checker', emoji: '🔍' },
};

export function useBadges(userId: string | null) {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBadges(data as Badge[]);
        setLoading(false);
      });
  }, [userId]);

  const hasBadge = useCallback((badgeId: string) => {
    return badges.some(b => b.badge_id === badgeId);
  }, [badges]);

  const awardBadge = useCallback(async (badgeId: string, source: string = 'learn') => {
    if (!userId) return false;
    if (badges.some(b => b.badge_id === badgeId)) return false; // already earned

    const def = BADGE_DEFINITIONS[badgeId];
    if (!def) return false;

    const { data: awarded, error } = await supabase.rpc('award_badge', {
      p_badge_id: badgeId,
      p_badge_name: def.name,
      p_badge_emoji: def.emoji,
      p_source: source,
    });

    if (error || !awarded) {
      if (error) console.error('Badge award failed:', error);
      return false;
    }

    const newBadge: Badge = {
      id: crypto.randomUUID(),
      badge_id: badgeId,
      badge_name: def.name,
      badge_emoji: def.emoji,
      earned_at: new Date().toISOString(),
      source,
    };
    setBadges(prev => [newBadge, ...prev]);
    toast.success(`${def.emoji} Badge earned: ${def.name}!`, { duration: 4000 });
    return true;
  }, [userId, badges]);

  return { badges, loading, hasBadge, awardBadge };
}
