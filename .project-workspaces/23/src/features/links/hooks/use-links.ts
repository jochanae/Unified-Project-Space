import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchLinks, createLink, updateLink as updateLinkApi, deleteLink as deleteLinkApi } from '@/services/supabase-data';

export function useLinks(projectId: string | null, orgId: string | undefined) {
  const qc = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['links', projectId],
    queryFn: () => fetchLinks(projectId!),
    enabled: !!projectId,
  });

  const addLink = useMutation({
    mutationFn: (link: { title: string; url: string; category: string }) =>
      createLink(orgId!, projectId!, link),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', projectId] }),
  });

  const updateLink = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { title?: string; url?: string; category?: string } }) =>
      updateLinkApi(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', projectId] }),
  });

  const removeLink = useMutation({
    mutationFn: (id: string) => deleteLinkApi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['links', projectId] }),
  });

  return { links, isLoading, addLink, updateLink, removeLink };
}
