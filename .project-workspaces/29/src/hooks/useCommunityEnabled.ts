import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCommunityEnabled() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSetting = async () => {
    const { data } = await supabase
      .from('community_settings')
      .select('value')
      .eq('key', 'community_enabled')
      .single();
    
    setEnabled(data?.value === 'true');
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSetting();
  }, []);

  const toggle = async () => {
    const newValue = !enabled;
    await supabase
      .from('community_settings')
      .update({ value: String(newValue), updated_at: new Date().toISOString() })
      .eq('key', 'community_enabled');
    setEnabled(newValue);
    return newValue;
  };

  return { enabled, isLoading, toggle, refetch: fetchSetting };
}
