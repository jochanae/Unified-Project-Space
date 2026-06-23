import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSiteSetting(key: string) {
  const [value, setValue] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle()
      .then(({ data }) => {
        setValue(data?.value === true);
        setLoading(false);
      });
  }, [key]);

  const toggle = useCallback(async () => {
    const next = !value;
    setValue(next);
    await supabase
      .from('site_settings')
      .update({ value: next as any, updated_at: new Date().toISOString() })
      .eq('key', key);
  }, [key, value]);

  return { value, loading, toggle };
}
