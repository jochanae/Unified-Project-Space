import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FeatureFlag {
  feature_key: string;
  feature_name: string;
  description: string | null;
  is_enabled: boolean;
  category: string | null;
}

let cachedFlags: FeatureFlag[] | null = null;
let fetchPromise: Promise<FeatureFlag[]> | null = null;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

async function loadFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase
    .from('feature_flags')
    .select('feature_key, feature_name, description, is_enabled, category');
  
  if (error) {
    console.error('Error loading feature flags:', error);
    return cachedFlags || [];
  }
  
  cachedFlags = (data as FeatureFlag[]) || [];
  notifyListeners();
  return cachedFlags;
}

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>(cachedFlags || []);
  const [loading, setLoading] = useState(!cachedFlags);

  useEffect(() => {
    const update = () => {
      if (cachedFlags) setFlags([...cachedFlags]);
    };
    listeners.add(update);

    if (!cachedFlags && !fetchPromise) {
      fetchPromise = loadFlags().finally(() => {
        fetchPromise = null;
        setLoading(false);
      });
    } else if (fetchPromise) {
      fetchPromise.then(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => { listeners.delete(update); };
  }, []);

  const isFeatureEnabled = useCallback((key: string): boolean => {
    const flag = (cachedFlags || flags).find(f => f.feature_key === key);
    return flag ? flag.is_enabled : true; // Default to enabled if not found
  }, [flags]);

  const refreshFlags = useCallback(async () => {
    cachedFlags = null;
    fetchPromise = null;
    const result = await loadFlags();
    setFlags(result);
    return result;
  }, []);

  const toggleFlag = useCallback(async (key: string, enabled: boolean) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ is_enabled: enabled })
      .eq('feature_key', key);
    
    if (error) {
      console.error('Error toggling feature flag:', error);
      return false;
    }
    
    await refreshFlags();
    return true;
  }, [refreshFlags]);

  return { flags, loading, isFeatureEnabled, refreshFlags, toggleFlag };
}

// Map feature_key to route paths
export const FEATURE_ROUTE_MAP: Record<string, string[]> = {
  kids: ['/kids'],
  kids_chat: ['/kids/chat'],
  vision_board: ['/vision-board'],
  credit: ['/credit'],
  professionals: ['/professionals'],
  refer_business: ['/refer-business'],
  coach: ['/coach'],
};

// Reverse lookup: path -> feature_key
export function getFeatureKeyForPath(path: string): string | undefined {
  for (const [key, paths] of Object.entries(FEATURE_ROUTE_MAP)) {
    if (paths.some(p => path === p || path.startsWith(p + '/'))) {
      return key;
    }
  }
  return undefined;
}
