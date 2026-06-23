import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectInfo {
  name: string;
  goal: string | null;
}

interface ProjectDirective {
  directive: string;
  context_type: string;
}

export interface LogoProjectContext {
  project: ProjectInfo | null;
  directives: ProjectDirective[];
  loading: boolean;
}

export function useLogoProjectContext(projectId: string | null): LogoProjectContext {
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [directives, setDirectives] = useState<ProjectDirective[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setDirectives([]);
      return;
    }

    setLoading(true);

    Promise.all([
      supabase.from('projects').select('name, goal').eq('id', projectId).single(),
      supabase.from('project_context').select('directive, context_type').eq('project_id', projectId).order('created_at', { ascending: true }),
    ]).then(([projRes, ctxRes]) => {
      if (projRes.data) setProject(projRes.data);
      if (ctxRes.data) setDirectives(ctxRes.data);
      setLoading(false);
    });
  }, [projectId]);

  return { project, directives, loading };
}
