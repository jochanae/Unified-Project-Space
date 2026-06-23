import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProjects } from './use-projects';
import { useFunnelSteps } from '@/features/funnel-steps';
import { useNotes } from '@/features/notes';
import { useLinks } from '@/features/links';
import { NoteCard, NoteType, LinkItem, LinkCategory, FunnelPage, PageBlock, BlockType, Theme } from '@/types/funnelhub';

import { supabase } from '@/integrations/supabase/client';

const THEME_KEY = 'intoiq_theme';
const ACTIVE_PROJECT_KEY = 'intoiq_active_project_id';

const uid = () => crypto.randomUUID();

// Module-level shared store for activeProjectId. Previously each useFunnelHub()
// call had its own useState, so creating a project in AppShell only switched
// AppShell's local copy and the Dashboard stayed on the old project.
const activeProjectStore = (() => {
  let value: string | null = (typeof localStorage !== 'undefined' && localStorage.getItem(ACTIVE_PROJECT_KEY)) || null;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: string | null) => {
      if (value === next) return;
      value = next;
      try {
        if (next) localStorage.setItem(ACTIVE_PROJECT_KEY, next);
        else localStorage.removeItem(ACTIVE_PROJECT_KEY);
      } catch {}
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => { listeners.delete(l); };
    },
  };
})();

function getSavedTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) || 'cinematic';
}

function applyThemeClass(t: Theme) {
  const root = document.documentElement;
  root.classList.remove('theme-cinematic', 'theme-editorial', 'theme-minimal');
  root.classList.add(`theme-${t}`);
}

export function useFunnelHub() {
  const { projects: dbProjects, isLoading: projectsLoading, addProject: addProjectMut, updateProject: updateProjectMut, removeProject: removeProjectMut, orgId } = useProjects();
  const activeProjectId = useSyncExternalStore(activeProjectStore.subscribe, activeProjectStore.get, activeProjectStore.get);
  const [isSwitching, setIsSwitching] = useState(false);
  const [theme, setThemeState] = useState<Theme>(getSavedTheme);

  const queryClient = useQueryClient();

  // Wrap setter to clear stale per-project caches before switching, preventing content bleed-through.
  const setActiveProjectId = useCallback((id: string | null) => {
    const prev = activeProjectStore.get();
    if (prev === id) return;
    if (prev) {
      queryClient.removeQueries({ queryKey: ['funnel_steps', prev] });
      queryClient.removeQueries({ queryKey: ['notes', prev] });
      queryClient.removeQueries({ queryKey: ['links', prev] });
      queryClient.removeQueries({ queryKey: ['pages', prev] });
    }
    setIsSwitching(true);
    setTimeout(() => setIsSwitching(false), 0);
    activeProjectStore.set(id);
  }, [queryClient]);

  // Auto-select first project (only when none persisted or the saved one no longer exists)
  useEffect(() => {
    if (dbProjects.length === 0) return;
    const current = activeProjectStore.get();
    if (!current || !dbProjects.some(p => p.id === current)) {
      setActiveProjectId(dbProjects[0].id);
    }
  }, [dbProjects, setActiveProjectId]);


  // DB-backed hooks
  const { steps: dbSteps, isLoading: stepsLoading, addStep: addStepMut, updateStep: updateStepMut, removeStep: removeStepMut, reorder: reorderMut } = useFunnelSteps(activeProjectId, orgId);
  const { notes: dbNotes, isLoading: notesLoading, addNote: addNoteMut, updateNote: updateNoteMut, removeNote: removeNoteMut } = useNotes(activeProjectId, orgId);
  const { links: dbLinks, isLoading: linksLoading, addLink: addLinkMut, updateLink: updateLinkMut, removeLink: removeLinkMut } = useLinks(activeProjectId, orgId);

  // Fetch pages from Supabase for active project
  const { data: dbPages = [], isLoading: pagesLoading } = useQuery({
    queryKey: ['pages', activeProjectId, orgId],
    queryFn: async () => {
      if (!activeProjectId || !orgId) return [];
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('project_id', activeProjectId)
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeProjectId && !!orgId,
  });

  // Map DB projects
  const projects = dbProjects.map(p => {
    const isActive = p.id === activeProjectId;
    return {
      id: p.id,
      name: p.name,
      description: p.goal || '',
      notes: isActive ? dbNotes.map(n => ({
        id: n.id,
        type: (n.type || 'Note') as NoteType,
        title: n.title || '',
        body: n.body || '',
        links: (n.links as string[]) || [],
        done: n.done ?? false,
        createdAt: n.created_at || '',
      })) : [],
      funnelSteps: isActive ? dbSteps.map(s => ({
        id: s.id,
        order: s.order_index,
        title: s.title,
        description: '',
        link: '',
        completed: false,
      })) : [],
      links: isActive ? dbLinks.map(l => ({
        id: l.id,
        title: l.title || '',
        url: l.url || '',
        category: (l.category || 'Other') as LinkCategory,
      })) : [],
      pages: isActive ? dbPages.map(pg => ({
        id: pg.id,
        title: pg.title || '',
        blocks: (Array.isArray(pg.content_blocks) ? pg.content_blocks : []) as unknown as PageBlock[],
      })) : [],
      createdAt: p.created_at || '',
    };
  });

  const activeProject = projects.find(p => p.id === activeProjectId) ?? null;

  // Apply theme on mount
  useEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  // Theme
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_KEY, t);
    applyThemeClass(t);
  }, []);

  // Projects (DB-backed)
  const addProject = useCallback((name: string, description: string) => {
    addProjectMut.mutate({ name, description }, {
      onSuccess: (data) => setActiveProjectId(data.id),
    });
    return { id: 'pending', name, description, notes: [], funnelSteps: [], links: [], pages: [], createdAt: '' };
  }, [addProjectMut]);

  const updateProject = useCallback((id: string, updates: { name?: string; description?: string }) => {
    updateProjectMut.mutate({ id, updates: { name: updates.name, goal: updates.description } });
  }, [updateProjectMut]);

  const deleteProject = useCallback((id: string) => {
    removeProjectMut.mutate(id);
    if (activeProjectId === id) {
      const remaining = dbProjects.filter(p => p.id !== id);
      setActiveProjectId(remaining[0]?.id ?? null);
    }
  }, [removeProjectMut, activeProjectId, dbProjects]);

  // Funnel Steps (DB-backed)
  const addStep = useCallback((projectId: string, step: { title: string; description?: string; link?: string }) => {
    addStepMut.mutate({ title: step.title, stepType: 'page' });
  }, [addStepMut]);

  const updateStep = useCallback((projectId: string, stepId: string, updates: any) => {
    const mapped: any = {};
    if (updates.title) mapped.title = updates.title;
    if (updates.order !== undefined) mapped.order_index = updates.order;
    updateStepMut.mutate({ id: stepId, updates: mapped });
  }, [updateStepMut]);

  const deleteStep = useCallback((projectId: string, stepId: string) => {
    removeStepMut.mutate(stepId);
  }, [removeStepMut]);

  const reorderSteps = useCallback((projectId: string, stepIds: string[]) => {
    reorderMut.mutate(stepIds);
  }, [reorderMut]);

  // Notes (DB-backed)
  const addNote = useCallback((projectId: string, note: Omit<NoteCard, 'id' | 'createdAt' | 'done'>) => {
    addNoteMut.mutate({ type: note.type, title: note.title, body: note.body, links: note.links });
  }, [addNoteMut]);

  const updateNote = useCallback((projectId: string, noteId: string, updates: Partial<NoteCard>) => {
    const mapped: any = {};
    if (updates.type !== undefined) mapped.type = updates.type;
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.body !== undefined) mapped.body = updates.body;
    if (updates.links !== undefined) mapped.links = updates.links;
    if (updates.done !== undefined) mapped.done = updates.done;
    updateNoteMut.mutate({ id: noteId, updates: mapped });
  }, [updateNoteMut]);

  const deleteNote = useCallback((projectId: string, noteId: string) => {
    removeNoteMut.mutate(noteId);
  }, [removeNoteMut]);

  // Links (DB-backed)
  const addLink = useCallback((projectId: string, link: Omit<LinkItem, 'id'>) => {
    addLinkMut.mutate({ title: link.title, url: link.url, category: link.category });
  }, [addLinkMut]);

  const updateLink = useCallback((projectId: string, linkId: string, updates: Partial<LinkItem>) => {
    const mapped: any = {};
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.url !== undefined) mapped.url = updates.url;
    if (updates.category !== undefined) mapped.category = updates.category;
    updateLinkMut.mutate({ id: linkId, updates: mapped });
  }, [updateLinkMut]);

  const deleteLink = useCallback((projectId: string, linkId: string) => {
    removeLinkMut.mutate(linkId);
  }, [removeLinkMut]);

  // Pages (Supabase-backed)
  const invalidatePages = () => queryClient.invalidateQueries({ queryKey: ['pages', activeProjectId, orgId] });

  const addPage = useCallback(async (projectId: string, title: string) => {
    const tempId = uid();
    const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + tempId.slice(0, 8);
    const { data, error } = await supabase
      .from('pages')
      .insert({ title, slug, project_id: projectId, org_id: orgId!, content_blocks: [] })
      .select()
      .single();
    if (error) throw error;
    invalidatePages();
    return { id: data.id, title: data.title || '', blocks: [] as PageBlock[] };
  }, [orgId, activeProjectId]);

  const updatePage = useCallback(async (projectId: string, pageId: string, updates: Partial<FunnelPage>) => {
    const mapped: Record<string, unknown> = {};
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.blocks !== undefined) mapped.content_blocks = JSON.parse(JSON.stringify(updates.blocks));
    await supabase.from('pages').update(mapped as any).eq('id', pageId);
    invalidatePages();
  }, [orgId, activeProjectId]);

  const deletePage = useCallback(async (projectId: string, pageId: string) => {
    await supabase.from('pages').delete().eq('id', pageId);
    invalidatePages();
  }, [orgId, activeProjectId]);

  const addBlock = useCallback(async (projectId: string, pageId: string, block: Omit<PageBlock, 'id'>) => {
    const b: PageBlock = { ...block, id: uid() };
    const page = dbPages.find(pg => pg.id === pageId);
    if (!page) return;
    const blocks = [...(Array.isArray(page.content_blocks) ? page.content_blocks : []) as unknown as PageBlock[], b];
    await supabase.from('pages').update({ content_blocks: JSON.parse(JSON.stringify(blocks)) } as any).eq('id', pageId);
    invalidatePages();
  }, [dbPages, orgId, activeProjectId]);

  const updateBlock = useCallback(async (projectId: string, pageId: string, blockId: string, content: Record<string, string>) => {
    const page = dbPages.find(pg => pg.id === pageId);
    if (!page) return;
    const blocks = (Array.isArray(page.content_blocks) ? page.content_blocks : []) as unknown as PageBlock[];
    const updated = blocks.map(b => b.id === blockId ? { ...b, content } : b);
    await supabase.from('pages').update({ content_blocks: JSON.parse(JSON.stringify(updated)) } as any).eq('id', pageId);
    invalidatePages();
  }, [dbPages, orgId, activeProjectId]);

  const deleteBlock = useCallback(async (projectId: string, pageId: string, blockId: string) => {
    const page = dbPages.find(pg => pg.id === pageId);
    if (!page) return;
    const blocks = (Array.isArray(page.content_blocks) ? page.content_blocks : []) as unknown as PageBlock[];
    const filtered = blocks.filter(b => b.id !== blockId);
    await supabase.from('pages').update({ content_blocks: JSON.parse(JSON.stringify(filtered)) } as any).eq('id', pageId);
    invalidatePages();
  }, [dbPages, orgId, activeProjectId]);

  const exportJSON = useCallback(() => JSON.stringify({ theme }, null, 2), [theme]);
  const importJSON = useCallback((_json: string) => false, []);

  return {
    projects,
    activeProjectId,
    activeProject,
    theme,
    isLoading: projectsLoading || stepsLoading || notesLoading || linksLoading || pagesLoading,
    setTheme,
    setActiveProject: setActiveProjectId,
    addProject,
    updateProject,
    deleteProject,
    addNote,
    updateNote,
    deleteNote,
    addStep,
    updateStep,
    deleteStep,
    reorderSteps,
    addLink,
    updateLink,
    deleteLink,
    addPage,
    updatePage,
    deletePage,
    addBlock,
    updateBlock,
    deleteBlock,
    exportJSON,
    importJSON,
  };
}
