import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SanctuaryKey {
  id: string;
  key_code: string;
  gifter_name: string;
  gifter_serial: number | null;
  recipient_user_id: string | null;
  recipient_note: string | null;
  claimed_at: string | null;
  expires_at: string;
  created_at: string;
}

export function useSanctuaryKeys() {
  const [keys, setKeys] = useState<SanctuaryKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [minting, setMinting] = useState(false);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('sanctuary_keys' as any)
      .select('*')
      .eq('gifter_user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) {
      setKeys(data as unknown as SanctuaryKey[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const mint = useCallback(async (note?: string): Promise<{ success: boolean; error?: string; key_code?: string }> => {
    setMinting(true);
    try {
      const { data, error } = await supabase.rpc('mint_sanctuary_key' as any, { p_recipient_note: note ?? null });
      if (error) {
        return { success: false, error: error.message };
      }
      const result = data as any;
      if (result?.success) {
        await refresh();
        return { success: true, key_code: result.key_code };
      }
      return { success: false, error: result?.error || 'unknown' };
    } finally {
      setMinting(false);
    }
  }, [refresh]);

  return { keys, loading, minting, mint, refresh, remaining: Math.max(0, 3 - keys.length) };
}
