import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjects, createProject, updateProject as updateProjectApi, deleteProject as deleteProjectApi } from '@/services/supabase-data';
import { useCurrentUser } from '@/hooks/use-current-user';

export function useProjects() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const orgId = user?.orgId;

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', orgId],
    queryFn: () => fetchProjects(orgId!),
    enabled: !!orgId,
  });

  const addProject = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => {
      const project = await createProject(orgId!, name, description);
      // Auto-create default "Main Funnel" so projects are never empty containers
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const slug = 'main-funnel-' + crypto.randomUUID().slice(0, 8);
        await supabase.from('funnels' as any).insert({
          project_id: project.id,
          org_id: orgId!,
          name: 'Main Funnel',
          funnel_type: 'lead_gen',
          slug,
        });
      } catch (e) {
        console.warn('Default funnel creation failed', e);
      }
      return project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', orgId] });
      qc.invalidateQueries({ queryKey: ['funnels', orgId] });
    },
  });

  const updateProject = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { name?: string; goal?: string } }) =>
      updateProjectApi(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', orgId] }),
  });

  const removeProject = useMutation({
    mutationFn: (id: string) => deleteProjectApi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects', orgId] }),
  });

  return { projects, isLoading, addProject, updateProject, removeProject, orgId };
}
