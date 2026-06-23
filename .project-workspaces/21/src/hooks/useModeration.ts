import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBlockedUsers(userId: string | undefined) {
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('blocked_users')
        .select('blocked_member_id')
        .eq('user_id', userId);
      if (data) {
        setBlockedIds(new Set(data.map((d) => d.blocked_member_id)));
      }
    })();
  }, [userId]);

  const blockUser = useCallback(async (memberId: string) => {
    if (!userId) return;
    setBlockedIds((prev) => new Set(prev).add(memberId));
    const { error } = await supabase
      .from('blocked_users')
      .insert({ user_id: userId, blocked_member_id: memberId });
    if (error && !error.message.includes('duplicate')) {
      toast.error('Failed to block user');
    } else {
      toast.success('User blocked — their posts are now hidden');
    }
  }, [userId]);

  const unblockUser = useCallback(async (memberId: string) => {
    if (!userId) return;
    setBlockedIds((prev) => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
    await supabase
      .from('blocked_users')
      .delete()
      .eq('user_id', userId)
      .eq('blocked_member_id', memberId);
    toast.success('User unblocked');
  }, [userId]);

  const isBlocked = useCallback((memberId: string) => blockedIds.has(memberId), [blockedIds]);

  return { blockedIds, blockUser, unblockUser, isBlocked };
}

export async function reportContent(
  reporterId: string,
  memberId: string,
  reason: string,
  postId?: string,
  details?: string
) {
  const { error } = await supabase.from('reports').insert({
    reporter_id: reporterId,
    reported_member_id: memberId,
    reported_post_id: postId || null,
    reason,
    details: details || null,
  });
  if (error) {
    toast.error('Failed to submit report');
    return false;
  }
  toast.success('Report submitted — thanks for keeping Compani safe 💛');
  return true;
}
