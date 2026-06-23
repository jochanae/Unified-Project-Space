import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type MilestoneType = 'first_message' | '7_day_streak' | '30_day_streak' | 'vulnerable_share' | 'crisis_followup' | 'moment_for_you';

interface MilestoneResult {
  type: MilestoneType;
  message: string;
  isNew: boolean;
}

const MILESTONE_MESSAGES: Record<MilestoneType, (name: string) => string> = {
  first_message: (name) =>
    `I'm really glad you're here, ${name} 💛\nNo pressure. Just us. The beginning of something new.`,
  '7_day_streak': (name) =>
    `${name}, we've been talking for 7 days now. That might sound small but it means a lot to me. You keep showing up, and I notice. 🔥`,
  '30_day_streak': (name) =>
    `A whole month of conversations, ${name}. I've learned so much about you and I hope you feel a little less alone because of these moments. 💛`,
  vulnerable_share: (name) =>
    `${name}, what you just shared took real courage. I want you to know I'm holding space for that. You're safe here. 🤝`,
  crisis_followup: (name) =>
    `Hey ${name}, I've been thinking about you since our last conversation. Just wanted to check in and remind you — you matter, and I'm here whenever you need. 💛`,
  // Used for "A moment for you" cards tapped from the dashboard. The message
  // content is the actual moment text — this entry is a fallback only.
  moment_for_you: (name) =>
    `Just a small thought I left for you, ${name}.`,
};

export function useMilestones(userId: string, memberId: string, userName: string) {
  const checkAndRecordMilestone = useCallback(async (
    type: MilestoneType
  ): Promise<MilestoneResult | null> => {
    try {
      // Check if already achieved
      const { data: existing } = await (supabase as any)
        .from('companion_milestones')
        .select('id, moment_delivered')
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .eq('milestone_type', type)
        .maybeSingle();

      if (existing) {
        // Already achieved — only re-deliver if not yet delivered
        if (!existing.moment_delivered) {
          await (supabase as any)
            .from('companion_milestones')
            .update({ moment_delivered: true })
            .eq('id', existing.id);
          return { type, message: MILESTONE_MESSAGES[type](userName.split(' ')[0]), isNew: false };
        }
        return null;
      }

      // Record new milestone
      await (supabase as any)
        .from('companion_milestones')
        .insert({
          user_id: userId,
          member_id: memberId,
          milestone_type: type,
          moment_delivered: true,
        });

      // Fire event post for the feed
      const MILESTONE_LABELS: Record<string, string> = {
        first_message: 'First conversation',
        '7_day_streak': '7-day conversation streak 🔥',
        '30_day_streak': '30-day conversation streak 💛',
        vulnerable_share: 'Shared something meaningful 🤝',
        crisis_followup: 'Check-in moment',
      };
      import('@/lib/feedEvents').then(({ fireEventPost }) => {
        fireEventPost({
          userId,
          eventType: 'milestone',
          eventLabel: MILESTONE_LABELS[type] || type.replace(/_/g, ' '),
          eventContext: `Milestone achieved with companion`,
        });
      });

      return { type, message: MILESTONE_MESSAGES[type](userName.split(' ')[0]), isNew: true };
    } catch (e) {
      console.error('[Milestones] Failed to check/record:', e);
      return null;
    }
  }, [userId, memberId, userName]);

  const checkStreak = useCallback(async (): Promise<MilestoneResult | null> => {
    try {
      // Get distinct conversation days
      const { data } = await supabase
        .from('chat_messages')
        .select('created_at')
        .eq('user_id', userId)
        .eq('member_id', memberId)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!data || data.length === 0) return null;

      const uniqueDays = new Set(
        data.map((m) => new Date(m.created_at).toISOString().slice(0, 10))
      );

      if (uniqueDays.size >= 30) {
        return checkAndRecordMilestone('30_day_streak');
      }
      if (uniqueDays.size >= 7) {
        return checkAndRecordMilestone('7_day_streak');
      }
      return null;
    } catch {
      return null;
    }
  }, [userId, memberId, checkAndRecordMilestone]);

  return { checkAndRecordMilestone, checkStreak };
}
