import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CircleCompanion {
  id: string;
  circle_id: string;
  user_id: string;
  member_id: string;
  companion_name: string;
  avatar_url: string | null;
  mode: 'active' | 'quiet';
  created_at: string;
}

export function useCircleCompanions(circleId: string, userId?: string) {
  const [companions, setCompanions] = useState<CircleCompanion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!circleId) return;
    // Join against connections to exclude archived companions
    const { data } = await supabase
      .from('circle_companions')
      .select('*')
      .eq('circle_id', circleId);
    // Filter out companions whose underlying connection is archived
    if (data && data.length > 0 && userId) {
      const { data: archivedConns } = await supabase
        .from('connections')
        .select('member_id')
        .eq('user_id', userId)
        .eq('is_archived', true);
      const archivedIds = new Set((archivedConns || []).map((c: any) => c.member_id));
      const filtered = (data as unknown as CircleCompanion[]).filter(c => !archivedIds.has(c.member_id));
      setCompanions(filtered);
      setLoading(false);
      return;
    }
    if (data) setCompanions(data as unknown as CircleCompanion[]);
    setLoading(false);
  }, [circleId, userId]);

  useEffect(() => { load(); }, [load]);

  const linkCompanion = async (memberId: string, name: string, avatarUrl?: string | null) => {
    if (!userId) return;
    const { error } = await supabase.from('circle_companions').insert({
      circle_id: circleId,
      user_id: userId,
      member_id: memberId,
      companion_name: name,
      avatar_url: avatarUrl || null,
      mode: 'active',
    } as any);
    if (error) {
      if (error.code === '23505') {
        // Already linked — this is correct state, stay silent
        return;
      }
      throw error;
    }
    toast.success(`${name} joined the Circle ✨`);
    await load();
  };

  const unlinkCompanion = async (memberId: string, name: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('circle_companions')
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .eq('member_id', memberId);
    if (error) throw error;
    toast.success(`${name} left the Circle`);
    await load();
  };

  const setMode = async (memberId: string, mode: 'active' | 'quiet') => {
    if (!userId) return;
    const { error } = await supabase
      .from('circle_companions')
      .update({ mode } as any)
      .eq('circle_id', circleId)
      .eq('user_id', userId)
      .eq('member_id', memberId);
    if (error) throw error;
    setCompanions(prev => prev.map(c =>
      c.member_id === memberId && c.user_id === userId ? { ...c, mode } : c
    ));
    toast.success(mode === 'active' ? 'Companion set to Active — will post & respond' : 'Companion set to Quiet — responds when addressed');
  };

  // Get the user's linked companions
  const myCompanions = companions.filter(c => c.user_id === userId);
  // Get all companions in the circle (including from other users)
  const allCompanions = companions;

  return { companions: allCompanions, myCompanions, loading, linkCompanion, unlinkCompanion, setMode, reload: load };
}
