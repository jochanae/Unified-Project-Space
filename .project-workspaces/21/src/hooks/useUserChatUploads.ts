import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getSignedUrl } from '@/lib/signedUrl';

/**
 * Read-only listing of a user's uploaded chat images from the
 * `chat-images` storage bucket (folder: `{userId}/`).
 *
 * This is intentionally a pure storage read — no companion_media
 * inserts, no chat-flow changes. It surfaces what the user has
 * already uploaded so it isn't lost from view.
 */
export interface UserUploadItem {
  path: string;
  name: string;
  signedUrl: string;
  createdAt: string | null;
  size: number | null;
}

const PAGE_LIMIT = 200;

async function fetchUserUploads(userId: string): Promise<UserUploadItem[]> {
  const { data, error } = await supabase.storage
    .from('chat-images')
    .list(userId, {
      limit: PAGE_LIMIT,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    console.warn('[useUserChatUploads] list failed:', error.message);
    return [];
  }

  // Filter out folders / placeholder rows (only image files)
  const files = (data || []).filter(
    (f) => f.name && !f.name.endsWith('/') && f.name !== '.emptyFolderPlaceholder'
  );

  // Sign each URL in parallel
  const signed = await Promise.all(
    files.map(async (f) => {
      const path = `${userId}/${f.name}`;
      const url = await getSignedUrl('chat-images', path);
      return {
        path,
        name: f.name,
        signedUrl: url || '',
        createdAt: (f as any).created_at ?? null,
        size: (f.metadata as any)?.size ?? null,
      } as UserUploadItem;
    })
  );

  return signed.filter((s) => s.signedUrl);
}

export function useUserChatUploads(userId: string | null) {
  const queryClient = useQueryClient();
  const { data: uploads = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['user-chat-uploads', userId],
    queryFn: () => fetchUserUploads(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const deleteUpload = async (path: string): Promise<boolean> => {
    const { error } = await supabase.storage.from('chat-images').remove([path]);
    if (error) {
      console.warn('[useUserChatUploads] delete failed:', error.message);
      return false;
    }
    // Optimistically drop from cache, then revalidate
    queryClient.setQueryData<UserUploadItem[]>(['user-chat-uploads', userId], (old) =>
      (old || []).filter((u) => u.path !== path)
    );
    refetch();
    return true;
  };

  return { uploads, loading, refresh: refetch, deleteUpload };
}
