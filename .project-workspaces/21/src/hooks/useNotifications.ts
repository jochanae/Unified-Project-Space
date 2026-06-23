import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

export interface NotificationItem {
  id: string;
  type: 'reply' | 'reaction' | 'milestone' | 'circle_removed' | 'circle_join' | 'circle_comment' | 'reminder' | 'companion_push' | 'companion_reminder';
  message: string;
  createdAt: string;
  postId?: string;
  emoji?: string;
  memberName?: string;
  circleId?: string;
  memberId?: string;
}

const MILESTONE_LABELS: Record<string, string> = {
  first_message: 'New connection made! 🌟',
  '7_day_streak': '7-day streak! 🔥',
  '30_day_streak': '30 days of friendship! 💛',
  vulnerable_share: 'Opened up — that took courage 🤝',
  crisis_followup: 'Checking in on you 💛',
};

async function fetchNotifications(userId: string): Promise<NotificationItem[]> {
  const items: NotificationItem[] = [];
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  // Fetch posts, milestones, general notifications, and active reminders in parallel
  const [{ data: userPosts }, { data: milestones }, { data: generalNotifs }, { data: reminders }] = await Promise.all([
    supabase.from('user_posts').select('id').eq('user_id', userId),
    supabase.from('companion_milestones')
      .select('id, milestone_type, member_id, achieved_at')
      .eq('user_id', userId).gt('achieved_at', since)
      .order('achieved_at', { ascending: false }).limit(15),
    supabase.from('notifications')
      .select('id, type, message, created_at, metadata, read')
      .eq('user_id', userId).eq('read', false).gt('created_at', since)
      .order('created_at', { ascending: false }).limit(20),
    supabase.from('reminders')
      .select('id, reminder_text, companion_name, remind_at, days_of_week, created_at')
      .eq('user_id', userId).eq('active', true)
      .order('created_at', { ascending: false }).limit(10),
  ]);

  // If user has posts, fetch comments + reactions in parallel
  if (userPosts && userPosts.length > 0) {
    const postIds = userPosts.map(p => p.id);
    const [{ data: comments }, { data: reactions }] = await Promise.all([
      supabase.from('post_comments')
        .select('id, content, user_name, post_id, created_at')
        .in('post_id', postIds).neq('user_id', userId).gt('created_at', since)
        .order('created_at', { ascending: false }).limit(30),
      supabase.from('post_reactions')
        .select('id, emoji, post_id, created_at, user_id')
        .in('post_id', postIds).neq('user_id', userId).gt('created_at', since)
        .order('created_at', { ascending: false }).limit(30),
    ]);

    if (comments) {
      for (const c of comments) {
        items.push({
          id: `reply-${c.id}`,
          type: 'reply',
          message: `${c.user_name} replied: "${c.content.slice(0, 80)}${c.content.length > 80 ? '…' : ''}"`,
          createdAt: c.created_at,
          postId: c.post_id,
          memberName: c.user_name,
        });
      }
    }
    if (reactions) {
      for (const r of reactions) {
        items.push({
          id: `reaction-${r.id}`,
          type: 'reaction',
          message: `Someone reacted ${r.emoji} to your post`,
          createdAt: r.created_at,
          postId: r.post_id,
          emoji: r.emoji,
        });
      }
    }
  }

  if (milestones) {
    const dismissedKey = `dismissed-milestones-${userId}`;
    const dismissed: string[] = JSON.parse(localStorage.getItem(dismissedKey) || '[]');

    for (const m of milestones) {
      if (dismissed.includes(m.id)) continue;
      const label = MILESTONE_LABELS[m.milestone_type] || m.milestone_type.replace(/_/g, ' ');
      items.push({
        id: `milestone-${m.id}`,
        type: 'milestone',
        message: `🎉 ${label}`,
        createdAt: m.achieved_at,
      });
    }
  }

  if (generalNotifs) {
    for (const n of generalNotifs) {
      const meta = n.metadata as Record<string, any> | null;
      items.push({
        id: `notif-${n.id}`,
        type: (n.type as NotificationItem['type']) || 'circle_removed',
        message: n.message,
        createdAt: n.created_at,
        circleId: meta?.circle_id,
        memberId: meta?.member_id,
      });
    }
  }

  // Add active reminders
  if (reminders) {
    for (const r of reminders) {
      const days = (r.days_of_week as string[]).join(', ');
      items.push({
        id: `reminder-${r.id}`,
        type: 'reminder',
        message: `⏰ ${r.companion_name}: "${r.reminder_text}" — ${r.remind_at} on ${days}`,
        createdAt: r.created_at,
      });
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return items.slice(0, 50);
}

export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications-feed', userId],
    queryFn: () => fetchNotifications(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    // Mark notifications table as read
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    // Dismiss all visible milestones by saving their IDs locally
    const currentItems = query.data || [];
    const milestoneIds = currentItems
      .filter(i => i.type === 'milestone')
      .map(i => i.id.replace('milestone-', ''));
    if (milestoneIds.length > 0) {
      const dismissedKey = `dismissed-milestones-${userId}`;
      const existing: string[] = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
      const merged = [...new Set([...existing, ...milestoneIds])];
      localStorage.setItem(dismissedKey, JSON.stringify(merged));
    }

    // Invalidate to refetch
    queryClient.invalidateQueries({ queryKey: ['notifications-feed', userId] });
  }, [userId, queryClient, query.data]);

  return { ...query, markAllRead };
}
