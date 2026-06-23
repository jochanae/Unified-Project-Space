import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface BlueprintTemplate {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  emoji: string;
  mode: string;
  category: string;
  kickoff_prompt: string;
  suggested_steps: string[];
  tier_required: string;
  sort_order: number;
}

export function useBlueprintTemplates(mode: string = 'strategist') {
  const [templates, setTemplates] = useState<BlueprintTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('blueprint_templates' as any)
        .select('*')
        .eq('mode', mode)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (!cancelled) {
        if (!error && data) {
          setTemplates(data as unknown as BlueprintTemplate[]);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  return { templates, loading };
}
