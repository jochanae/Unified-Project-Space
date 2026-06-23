import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useAdminSetting(key: string) {
  const [value, setValue] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('admin_settings' as any)
      .select('value')
      .eq('key', key)
      .single()
      .then(({ data }) => {
        if (data) setValue((data as any).value === true);
        setLoading(false);
      });
  }, [key]);

  const toggle = useCallback(async () => {
    const newVal = !value;
    setValue(newVal);
    await supabase
      .from('admin_settings' as any)
      .update({ value: newVal, updated_at: new Date().toISOString() } as any)
      .eq('key', key);
    return newVal;
  }, [key, value]);

  return { value, loading, toggle };
}

export function useAdminSettingText(key: string) {
  const [value, setValue] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('admin_settings' as any)
      .select('value')
      .eq('key', key)
      .single()
      .then(({ data }) => {
        if (data) {
          const raw = (data as any).value;
          setValue(typeof raw === 'string' ? raw : '');
        }
        setLoading(false);
      });
  }, [key]);

  const update = useCallback(async (newVal: string) => {
    setValue(newVal);
    await supabase
      .from('admin_settings' as any)
      .update({ value: newVal, updated_at: new Date().toISOString() } as any)
      .eq('key', key);
  }, [key]);

  return { value, loading, update };
}

export function useAdminSettingJSON<T = unknown>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    supabase
      .from('admin_settings' as any)
      .select('value')
      .eq('key', key)
      .maybeSingle()
      .then(({ data }) => {
        if (!isMounted) return;
        if (data && (data as any).value != null) {
          setValue((data as any).value as T);
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [key]);

  const save = useCallback(async (newVal: T) => {
    let previousValue: T = undefined as unknown as T;
    setValue(prev => { previousValue = prev; return newVal; });

    const { error } = await supabase
      .from('admin_settings')
      .upsert(
        { key, value: newVal as any, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('admin_settings upsert failed:', error);
      setValue(previousValue);
      throw error;
    }

    return newVal;
  }, [key]);

  return { value, loading, save };
}
