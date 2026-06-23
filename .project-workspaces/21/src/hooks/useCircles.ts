import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { moderateContent, CRISIS_RESOURCES } from '@/lib/moderation';

export interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  invite_code: string;
  creator_id: string;
  created_at: string;
  companion_enabled: boolean;
  circle_type: string;
  default_layout: string;
  room_type: string;
}

export interface CircleMember {
  id: string;
  circle_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  display_name?: string;
  avatar_url?: string;
}

export interface CircleMessage {
  id: string;
  circle_id: string;
  user_id: string;
  sender_name: string;
  sender_type: string;
  content: string;
  created_at: string;
}

export function useCircles(userId?: string) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('custom_circles')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setCircles(data as unknown as Circle[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const createCircle = async (name: string, emoji: string, description: string, circleType: string = 'social', defaultLayout: string = 'grid', roomType: string = 'spatial') => {
    if (!userId) throw new Error('Must be signed in');
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) throw new Error('Invalid circle name');

    const { data, error } = await supabase.from('custom_circles').insert({
      name, emoji, description, slug, creator_id: userId, circle_type: circleType,
      default_layout: defaultLayout,
      room_type: roomType,
      // Auto-start session for the creator so they aren't blocked by their own waiting room
      session_active: true,
    } as any).select().single();

    if (error) {
      if (error.code === '23505') throw new Error('A Circle with that name already exists');
      throw error;
    }

    // Auto-add creator as owner with profile avatar
    const circle = data as unknown as Circle;
    let displayName = name;
    let avatarUrl: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_name, companion_avatar_url, user_reference_image_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (profile) {
        displayName = profile.user_name || name;
        avatarUrl = profile.user_reference_image_url || null;
      }
    // Prefer auth user avatar (Google photo) over companion avatar
      // Use cached session to avoid network call that can invalidate a stale session
      if (!avatarUrl) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const authUser = currentSession?.user;
        avatarUrl = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null;
      }
      // Only fallback to companion avatar as last resort
      if (!avatarUrl) {
        avatarUrl = profile?.companion_avatar_url || null;
      }
    } catch (e) { logger.warn("[useCircles] Operation failed:", e); }

    await supabase.from('circle_members' as any).insert({
      circle_id: circle.id, user_id: userId, role: 'owner',
      display_name: displayName,
      avatar_url: avatarUrl,
    });

    await load();
    return circle;
  };

  const joinByCode = async (code: string) => {
    if (!userId) throw new Error('Must be signed in');
    // Look up circle by invite code — use service role or direct query
    const { data: circle, error: findError } = await supabase
      .from('custom_circles')
      .select('*')
      .eq('invite_code', code.trim().toLowerCase())
      .maybeSingle();

    if (findError || !circle) throw new Error('Invalid invite code');

    const c = circle as unknown as Circle;

    // Check already a member
    const { data: existing } = await supabase
      .from('circle_members' as any)
      .select('id')
      .eq('circle_id', c.id)
      .eq('user_id', userId)
      .maybeSingle();
    if (existing) throw new Error("You're already in this Circle");

    // Fetch profile for display name & avatar
    let memberDisplayName: string | null = null;
    let memberAvatar: string | null = null;
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_name, companion_avatar_url, user_reference_image_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (profile) {
        memberDisplayName = profile.user_name;
        memberAvatar = profile.user_reference_image_url || null;
      }
      // Prefer auth avatar (Google photo) over companion
      // Use cached session to avoid network call that can invalidate a stale session
      if (!memberAvatar) {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const authUser = currentSession?.user;
        memberAvatar = authUser?.user_metadata?.avatar_url || authUser?.user_metadata?.picture || null;
      }
      if (!memberAvatar && profile) {
        memberAvatar = profile.companion_avatar_url || null;
      }
    } catch (e) { logger.warn("[useCircles] Operation failed:", e); }

    const { error } = await supabase.from('circle_members' as any).insert({
      circle_id: c.id, user_id: userId, role: 'member',
      display_name: memberDisplayName,
      avatar_url: memberAvatar,
    });
    if (error) throw error;

    // Notify the Circle owner
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_name')
        .eq('user_id', userId)
        .maybeSingle();
      const name = profile?.user_name || 'Someone';
      await supabase.from('notifications').insert({
        user_id: c.creator_id,
        type: 'circle_join',
        message: `${name} joined your Circle ${c.emoji} ${c.name}`,
        metadata: { circle_id: c.id },
      } as any);
    } catch (e) { logger.warn("[useCircles] Operation failed:", e); }

    await load();
    return c;
  };

  const deleteCircle = async (circleId: string) => {
    const { error } = await supabase.from('custom_circles').delete().eq('id', circleId);
    if (error) throw error;
    await load();
  };

  const leaveCircle = async (circleId: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('circle_members' as any)
      .delete()
      .eq('circle_id', circleId)
      .eq('user_id', userId);
    if (error) throw error;
    await load();
  };

  return { circles, loading, createCircle, joinByCode, deleteCircle, leaveCircle };
}

export function useCircleChat(circleId: string, userId?: string) {
  const [messages, setMessages] = useState<CircleMessage[]>([]);
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId || !userId) return;

    const loadMessages = async () => {
      const { data } = await supabase
        .from('circle_messages' as any)
        .select('*')
        .eq('circle_id', circleId)
        .order('created_at', { ascending: true })
        .limit(200);
      if (data) setMessages(data as unknown as CircleMessage[]);
      setLoading(false);
    };

    const loadMembers = async () => {
      const { data } = await supabase
        .from('circle_members' as any)
        .select('*')
        .eq('circle_id', circleId);
      if (data) setMembers(data as unknown as CircleMember[]);
    };

    loadMessages();
    loadMembers();

    // Realtime subscription
    const channel = supabase
      .channel(`circle-${circleId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'circle_messages',
        filter: `circle_id=eq.${circleId}`,
      }, (payload: any) => {
        const msg = payload.new as CircleMessage;
        // Deduplicate: only add if not already in the list (prevents doubles from own inserts)
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'circle_messages',
        filter: `circle_id=eq.${circleId}`,
      }, (payload: any) => {
        const deletedId = payload.old?.id;
        if (deletedId) setMessages((prev) => prev.filter(m => m.id !== deletedId));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circleId, userId]);

  const sendMessage = async (content: string, senderName: string, senderType: string = 'human') => {
    if (!userId || !content.trim()) return;

    // Moderate human messages before sending
    if (senderType === 'human') {
      try {
        // Check if ALL circle members have mature_mode enabled
        let allMembersHaveMatureMode = false;
        try {
          const { data: memberRows } = await supabase
            .from('circle_members' as any)
            .select('user_id')
            .eq('circle_id', circleId);
          if (memberRows && memberRows.length > 0) {
            const memberUserIds = (memberRows as any[]).map((m: any) => m.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('user_id, mature_mode')
              .in('user_id', memberUserIds);
            if (profiles && profiles.length === memberUserIds.length) {
              allMembersHaveMatureMode = profiles.every((p: any) => p.mature_mode === true);
            }
          }
        } catch (e) { logger.warn("[useCircles] Operation failed:", e); }

        const modResult = await moderateContent(content.trim(), 'message', allMembersHaveMatureMode);
        if (!modResult.approved) {
          toast.error(modResult.message || "This message didn't quite fit. Want to try again?");
          return;
        }
        if (modResult.crisis) {
          toast(CRISIS_RESOURCES.title, {
            description: CRISIS_RESOURCES.message,
            duration: 10000,
          });
        }
      } catch {
        // On moderation failure, allow the message through
      }
    }

    const { error } = await supabase.from('circle_messages' as any).insert({
      circle_id: circleId,
      user_id: userId,
      sender_name: senderName,
      sender_type: senderType,
      content: content.trim(),
    });
    if (error) {
      toast.error('Failed to send message');
      throw error;
    }

    // Notify Circle owner about new messages from other members
    if (senderType === 'human') {
      try {
        const { data: circle } = await supabase
          .from('custom_circles')
          .select('creator_id, name, emoji')
          .eq('id', circleId)
          .maybeSingle();
        if (circle && circle.creator_id !== userId) {
          const snippet = content.trim().slice(0, 60) + (content.trim().length > 60 ? '…' : '');
          await supabase.from('notifications').insert({
            user_id: circle.creator_id,
            type: 'circle_comment',
            message: `${senderName} in ${circle.emoji} ${circle.name}: "${snippet}"`,
            metadata: { circle_id: circleId },
          } as any);
        }
      } catch (e) { logger.warn("[useCircles] Operation failed:", e); }
    }
  };

  return { messages, members, loading, sendMessage };
}
