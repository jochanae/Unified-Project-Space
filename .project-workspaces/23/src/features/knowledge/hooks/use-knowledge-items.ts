import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KnowledgeItem } from '../types';

export function useKnowledgeItems(opts: { publishedOnly?: boolean } = {}) {
  const { publishedOnly = true } = opts;
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('knowledge_items')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('order_index', { ascending: true })
      .order('created_at', { ascending: false });

    if (publishedOnly) query = query.eq('is_published', true);

    const { data, error } = await query;
    if (error) {
      setError(error.message);
      setItems([]);
    } else {
      setItems((data as KnowledgeItem[]) || []);
    }
    setLoading(false);
  }, [publishedOnly]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, reload: load };
}
