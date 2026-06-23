import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { setUserTimezone } from '@/lib/user-timezone';

/**
 * Loads the signed-in user's saved timezone preference and syncs it into the
 * global timezone helper so all date/time formatting across the app respects
 * the user's choice. Mount once at the top of the authenticated app shell.
 */
export function useUserTimezoneSync() {
  const { data } = useQuery({
    queryKey: ['user-timezone'],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data: row } = await supabase
        .from('users')
        .select('timezone')
        .eq('id', auth.user.id)
        .single();
      return (row as { timezone: string | null } | null)?.timezone ?? null;
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    setUserTimezone(data ?? null);
  }, [data]);
}
