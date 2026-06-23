import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Returns the user's beta serial number by reading from beta_serial_numbers.
 * Does NOT attempt to claim — use this for display purposes only.
 * Returns null if not logged in or no serial assigned.
 */
export function useBetaSerial() {
  const [serial, setSerial] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from('beta_serial_numbers')
        .select('serial_number')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!error && data && !cancelled) {
        setSerial(data.serial_number);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return serial;
}
