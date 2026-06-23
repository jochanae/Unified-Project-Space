import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TradeIdea {
  id: string;
  user_id: string;
  symbol: string;
  title: string;
  content: string;
  trade_direction: 'long' | 'short' | 'neutral';
  asset_class: string;
  entry_price: number | null;
  target_price: number | null;
  stop_loss: number | null;
  chart_image_url: string | null;
  likes_count: number;
  comments_count: number;
  status: string;
  outcome: string | null;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    show_real_name: boolean;
  };
  user_has_liked?: boolean;
}

export interface DiscussionThread {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  views_count: number;
  replies_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  last_activity_at: string;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
    username: string | null;
    show_real_name: boolean;
  };
}

export interface ChatRoom {
  id: string;
  name: string;
  description: string | null;
  asset_class: string | null;
  is_active: boolean;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface UserTradingStats {
  user_id: string;
  total_ideas_shared: number;
  successful_ideas: number;
  win_rate: number;
  followers_count: number;
  following_count: number;
  reputation_score: number;
}

export function useCommunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch trade ideas
  const { data: tradeIdeas = [], isLoading: loadingIdeas, refetch: refetchIdeas } = useQuery({
    queryKey: ['trade-ideas'],
    queryFn: async () => {
      const { data: ideas, error } = await supabase
        .from('trade_ideas')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch author profiles (use profiles_public view for other users' data)
      const userIds = [...new Set(ideas.map(i => i.user_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url, username, show_real_name')
        .in('user_id', userIds);

      // Check if current user has liked
      let userLikes: string[] = [];
      if (user) {
        const { data: likes } = await supabase
          .from('trade_idea_likes')
          .select('trade_idea_id')
          .eq('user_id', user.id);
        userLikes = likes?.map(l => l.trade_idea_id) || [];
      }

      return ideas.map(idea => ({
        ...idea,
        author: profiles?.find(p => p.user_id === idea.user_id) || null,
        user_has_liked: userLikes.includes(idea.id),
      })) as TradeIdea[];
    },
  });

  // Fetch discussion threads
  const { data: threads = [], isLoading: loadingThreads, refetch: refetchThreads } = useQuery({
    queryKey: ['discussion-threads'],
    queryFn: async () => {
      const { data: threadData, error } = await supabase
        .from('discussion_threads')
        .select('*')
        .order('is_pinned', { ascending: false })
        .order('last_activity_at', { ascending: false });

      if (error) throw error;

      const userIds = [...new Set(threadData.map(t => t.user_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url, username, show_real_name')
        .in('user_id', userIds);

      return threadData.map(thread => ({
        ...thread,
        author: profiles?.find(p => p.user_id === thread.user_id) || null,
      })) as DiscussionThread[];
    },
  });

  // Fetch chat rooms
  const { data: chatRooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as ChatRoom[];
    },
  });

  // Create trade idea mutation
  const createTradeIdea = useMutation({
    mutationFn: async (idea: Omit<TradeIdea, 'id' | 'created_at' | 'likes_count' | 'comments_count' | 'status' | 'author' | 'user_has_liked'>) => {
      const { data, error } = await supabase
        .from('trade_ideas')
        .insert([{ ...idea, user_id: user!.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-ideas'] });
      toast.success('Trade idea shared!');
    },
    onError: (error) => {
      toast.error('Failed to share trade idea');
      console.error(error);
    },
  });

  // Like/unlike trade idea
  const toggleLike = useMutation({
    mutationFn: async ({ ideaId, hasLiked }: { ideaId: string; hasLiked: boolean }) => {
      if (hasLiked) {
        const { error } = await supabase
          .from('trade_idea_likes')
          .delete()
          .eq('trade_idea_id', ideaId)
          .eq('user_id', user!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trade_idea_likes')
          .insert([{ trade_idea_id: ideaId, user_id: user!.id }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trade-ideas'] });
    },
  });

  // Create discussion thread
  const createThread = useMutation({
    mutationFn: async (thread: { title: string; content: string; category: string; tags?: string[] }) => {
      const { data, error } = await supabase
        .from('discussion_threads')
        .insert([{ ...thread, user_id: user!.id }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-threads'] });
      toast.success('Discussion started!');
    },
    onError: (error) => {
      toast.error('Failed to create discussion');
      console.error(error);
    },
  });

  // Follow/unfollow user
  const toggleFollow = useMutation({
    mutationFn: async ({ targetUserId, isFollowing }: { targetUserId: string; isFollowing: boolean }) => {
      if (isFollowing) {
        const { error } = await supabase
          .from('user_follows')
          .delete()
          .eq('follower_id', user!.id)
          .eq('following_id', targetUserId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_follows')
          .insert([{ follower_id: user!.id, following_id: targetUserId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Follow status updated');
    },
  });

  // Report content
  const reportContent = useMutation({
    mutationFn: async (report: { content_type: string; content_id: string; reason: string; description?: string }) => {
      const { error } = await supabase
        .from('content_reports')
        .insert([{ ...report, reporter_id: user!.id }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report submitted. Thank you for helping keep the community safe.');
    },
  });

  return {
    tradeIdeas,
    threads,
    chatRooms,
    loadingIdeas,
    loadingThreads,
    loadingRooms,
    createTradeIdea,
    toggleLike,
    createThread,
    toggleFollow,
    reportContent,
    refetchIdeas,
    refetchThreads,
  };
}

// Separate hook for chat with realtime
export function useChatRoom(roomId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomId) return;

    const fetchMessages = async () => {
      setLoading(true);
      const { data: messageData, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (error) {
        console.error('Error fetching messages:', error);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(messageData.map(m => m.user_id))];
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      setMessages(
        messageData.map(msg => ({
          ...msg,
          author: profiles?.find(p => p.user_id === msg.user_id) || null,
        }))
      );
      setLoading(false);
    };

    fetchMessages();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const newMessage = payload.new as ChatMessage;
          const { data: profile } = await supabase
            .from('profiles_public')
            .select('user_id, full_name, avatar_url')
            .eq('user_id', newMessage.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMessage, author: profile || null },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = async (content: string) => {
    if (!user || !roomId) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert([{ room_id: roomId, user_id: user.id, content }]);

    if (error) {
      toast.error('Failed to send message');
      console.error(error);
    }
  };

  return { messages, loading, sendMessage };
}
