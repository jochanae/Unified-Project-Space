import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type MomentSource = 'feed' | 'chat' | 'milestone' | 'match';

export interface FavoritePost {
  id: string;
  postId: string;
  memberId: string;
  postContent: string;
  postImageKey?: string;
  postTimeAgo?: string;
  source: MomentSource;
  imageUrl?: string;
  createdAt: string;
}

function mapRow(r: any): FavoritePost {
  return {
    id: r.id,
    postId: r.post_id,
    memberId: r.member_id,
    postContent: r.post_content,
    postImageKey: r.post_image_key ?? undefined,
    postTimeAgo: r.post_time_ago ?? undefined,
    source: (r.source as MomentSource) || 'feed',
    imageUrl: r.image_url ?? undefined,
    createdAt: r.created_at,
  };
}

async function fetchFavorites(userId: string): Promise<FavoritePost[]> {
  const { data } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data || []).map(mapRow);
}

export function useFavorites(userId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = ['favorites', userId];

  const { data: favorites = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchFavorites(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const isFavorited = useCallback((postId: string) => {
    return favorites.some((f) => f.postId === postId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (post: { id: string; memberId: string; content: string; imageKey?: string; timeAgo?: string }) => {
    if (!userId) return;

    const existing = favorites.find((f) => f.postId === post.id);
    if (existing) {
      queryClient.setQueryData<FavoritePost[]>(queryKey, (prev) => (prev || []).filter((f) => f.postId !== post.id));
      await supabase.from('favorites').delete().eq('id', existing.id);
    } else {
      const { data } = await supabase.from('favorites').insert({
        user_id: userId,
        post_id: post.id,
        member_id: post.memberId,
        post_content: post.content,
        post_image_key: post.imageKey || null,
        post_time_ago: post.timeAgo || null,
        source: 'feed',
      }).select().single();

      if (data) {
        queryClient.setQueryData<FavoritePost[]>(queryKey, (prev) => [mapRow(data), ...(prev || [])]);
      }
    }
  }, [userId, favorites, queryClient, queryKey]);

  const saveChatMoment = useCallback(async (opts: { memberId: string; content: string; imageUrl?: string }) => {
    if (!userId) return;
    const postId = `chat-${Date.now()}`;
    const { data } = await supabase.from('favorites').insert({
      user_id: userId,
      post_id: postId,
      member_id: opts.memberId,
      post_content: opts.content,
      source: 'chat',
      image_url: opts.imageUrl || null,
    }).select().single();

    if (data) {
      queryClient.setQueryData<FavoritePost[]>(queryKey, (prev) => [mapRow(data), ...(prev || [])]);
    }
  }, [userId, queryClient, queryKey]);

  const saveAutoMoment = useCallback(async (opts: { memberId: string; content: string; source: 'milestone' | 'match'; imageUrl?: string }) => {
    if (!userId) return;
    // Client-side dedup check first
    const cachedDup = favorites.find(
      (f) => f.source === opts.source && f.memberId === opts.memberId && f.postContent === opts.content
    );
    if (cachedDup) return;

    // DB-level dedup check to prevent race conditions
    const { data: dbDup } = await supabase.from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('source', opts.source)
      .eq('member_id', opts.memberId)
      .eq('post_content', opts.content)
      .limit(1)
      .maybeSingle();
    if (dbDup) return;

    const postId = `${opts.source}-${Date.now()}`;
    const { data } = await supabase.from('favorites').insert({
      user_id: userId,
      post_id: postId,
      member_id: opts.memberId,
      post_content: opts.content,
      source: opts.source,
      image_url: opts.imageUrl || null,
    }).select().single();

    if (data) {
      queryClient.setQueryData<FavoritePost[]>(queryKey, (prev) => [mapRow(data), ...(prev || [])]);
    }
  }, [userId, favorites, queryClient, queryKey]);

  return { favorites, loading, isFavorited, toggleFavorite, saveChatMoment, saveAutoMoment };
}
