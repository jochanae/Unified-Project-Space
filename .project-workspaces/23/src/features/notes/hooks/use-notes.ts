import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotes, createNote, updateNote as updateNoteApi, deleteNote as deleteNoteApi } from '@/services/supabase-data';

export function useNotes(projectId: string | null, orgId: string | undefined) {
  const qc = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', projectId],
    queryFn: () => fetchNotes(projectId!),
    enabled: !!projectId,
  });

  const addNote = useMutation({
    mutationFn: (note: { type: string; title: string; body: string; links: string[] }) =>
      createNote(orgId!, projectId!, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', projectId] }),
  });

  const updateNote = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { type?: string; title?: string; body?: string; links?: string[]; done?: boolean } }) =>
      updateNoteApi(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', projectId] }),
  });

  const removeNote = useMutation({
    mutationFn: (id: string) => deleteNoteApi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes', projectId] }),
  });

  return { notes, isLoading, addNote, updateNote, removeNote };
}
