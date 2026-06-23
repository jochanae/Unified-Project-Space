import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CompanionMediaItem {
  id: string;
  userId: string;
  memberId: string;
  mediaType: 'sticker' | 'selfie' | 'activity' | 'likeness' | 'contextual' | 'backdrop' | 'text-image' | 'edit-image';
  imageUrl: string;
  caption: string | null;
  prompt: string | null;
  createdAt: string;
  usageCount: number;
  stickerTarget?: 'user' | 'companion';
}

function mapRow(row: any): CompanionMediaItem {
  return {
    id: row.id,
    userId: row.user_id,
    memberId: row.member_id,
    mediaType: row.media_type,
    imageUrl: row.image_url,
    caption: row.caption,
    prompt: row.prompt,
    createdAt: row.created_at,
    usageCount: row.usage_count ?? 0,
    stickerTarget: row.sticker_target || 'companion',
  };
}

async function fetchMedia(userId: string, memberId: string): Promise<CompanionMediaItem[]> {
  const { data, error } = await (supabase as any)
    .from('companion_media')
    .select('id, media_type, image_url, caption, created_at, prompt, usage_count, sticker_target')
    .eq('user_id', userId)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

export function useCompanionMedia(userId: string | null, memberId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['companion-media', userId, memberId];

  const { data: media = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchMedia(userId!, memberId!),
    enabled: !!userId && !!memberId,
    staleTime: 5 * 60 * 1000,
  });

  const saveMedia = useCallback(
    async (item: { mediaType: string; imageUrl: string; caption?: string; prompt?: string; stickerTarget?: 'user' | 'companion' }) => {
      if (!userId || !memberId) return;
      try {
        await (supabase as any).from('companion_media').insert({
          user_id: userId,
          member_id: memberId,
          media_type: item.mediaType,
          image_url: item.imageUrl,
          caption: item.caption || null,
          prompt: item.prompt || null,
          sticker_target: item.stickerTarget || 'companion',
        });
        queryClient.invalidateQueries({ queryKey });
      } catch (e) {
        console.error('[CompanionMedia] Save failed:', e);
      }
    },
    [userId, memberId, queryClient, queryKey]
  );

  const deleteMedia = useCallback(
    async (id: string) => {
      try {
        // Optimistic remove
        queryClient.setQueryData<CompanionMediaItem[]>(queryKey, (prev) => (prev || []).filter((m) => m.id !== id));
        const { error } = await (supabase as any).from('companion_media').delete().eq('id', id);
        if (error) {
          console.error('[CompanionMedia] Delete failed:', error);
          // Revert optimistic update
          queryClient.invalidateQueries({ queryKey });
        }
      } catch (e) {
        console.error('[CompanionMedia] Delete failed:', e);
        queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient, queryKey]
  );

  const getCachedSticker = useCallback(
    (expression: string) => media.find((m) => m.mediaType === 'sticker' && m.prompt === expression),
    [media]
  );

  const incrementUsage = useCallback(
    async (id: string) => {
      queryClient.setQueryData<CompanionMediaItem[]>(queryKey, (prev) =>
        (prev || []).map((m) => (m.id === id ? { ...m, usageCount: m.usageCount + 1 } : m))
      );
      try {
        const item = media.find((m) => m.id === id);
        const newCount = (item?.usageCount ?? 0) + 1;
        await (supabase as any).from('companion_media').update({ usage_count: newCount }).eq('id', id);
      } catch (e) {
        console.error('[CompanionMedia] Increment usage failed:', e);
      }
    },
    [media, queryClient, queryKey]
  );

  // Split stickers by target
  const userStickers = media.filter((m) => m.mediaType === 'sticker' && m.stickerTarget === 'user');
  const companionStickers = media.filter((m) => m.mediaType === 'sticker' && m.stickerTarget === 'companion');
  // Legacy: all stickers (for backwards compat)
  const stickers = media.filter((m) => m.mediaType === 'sticker');
  const selfies = media.filter((m) => m.mediaType === 'selfie');
  const activities = media.filter((m) => m.mediaType === 'activity' || m.mediaType === 'contextual' || m.mediaType === 'backdrop');

  return { media, stickers, userStickers, companionStickers, selfies, activities, loading, saveMedia, deleteMedia, getCachedSticker, incrementUsage, refresh: () => queryClient.invalidateQueries({ queryKey }) };
}
