import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectDirective {
  id: string;
  directive: string;
  context_type: string;
  created_at: string;
}

export function useProjectContext(projectId: string | null, orgId: string | null) {
  const [directives, setDirectives] = useState<ProjectDirective[]>([]);

  useEffect(() => {
    if (!projectId || !orgId) {
      setDirectives([]);
      return;
    }

    supabase
      .from('project_context')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          console.error('Failed to load context:', error);
          return;
        }
        setDirectives((data || []) as ProjectDirective[]);
      });
  }, [projectId, orgId]);

  const addDirective = useCallback(async (directive: string, contextType = 'identity') => {
    if (!projectId || !orgId) return;

    const { data, error } = await supabase
      .from('project_context')
      .insert({ project_id: projectId, org_id: orgId, directive, context_type: contextType })
      .select()
      .single();

    if (error) {
      toast.error('Failed to save context');
      return;
    }

    setDirectives(prev => [...prev, data as ProjectDirective]);
    toast.success('Context saved — MarQ will remember this.');
  }, [projectId, orgId]);

  const removeDirective = useCallback(async (id: string) => {
    await supabase.from('project_context').delete().eq('id', id);
    setDirectives(prev => prev.filter(d => d.id !== id));
  }, []);

  const updateDirective = useCallback(async (id: string, directive: string) => {
    const { error } = await supabase
      .from('project_context')
      .update({ directive })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update');
      return;
    }

    setDirectives(prev => prev.map(d => d.id === id ? { ...d, directive } : d));
  }, []);

  return { directives, addDirective, removeDirective, updateDirective };
}
