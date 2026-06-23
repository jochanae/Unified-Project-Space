import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

function dayHash(dateStr: string): number {
  return dateStr.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

async function fetchPortraitImages(userId: string, memberId: string): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from('companion_media')
    .select('image_url')
    .eq('user_id', userId)
    .eq('member_id', memberId)
    .in('media_type', ['selfie', 'activity'])
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((r: any) => r.image_url).filter(Boolean);
}

export function useCompanionDailyImage(userId: string | null, memberId: string | undefined) {
  const { data: images = [] } = useQuery({
    queryKey: ['companion-daily-image', userId, memberId],
    queryFn: () => fetchPortraitImages(userId!, memberId!),
    enabled: !!userId && !!memberId,
    staleTime: 5 * 60_000,
  });

  if (images.length === 0) return null;

  const todaySeed = new Date().toDateString();
  const idx = dayHash(todaySeed) % images.length;
  return images[idx];
}
