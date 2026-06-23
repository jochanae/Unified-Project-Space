import { supabase } from '@/integrations/supabase/client';

// ─── Projects ───────────────────────────────────────────
export async function fetchProjects(orgId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function fetchDeletedProjects(orgId: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createProject(orgId: string, name: string, description: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const { data, error } = await supabase
    .from('projects')
    .insert({ name, goal: description, org_id: orgId, slug, status: 'active' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProject(id: string, updates: { name?: string; goal?: string; status?: string }) {
  const { error } = await supabase.from('projects').update(updates).eq('id', id);
  if (error) throw error;
}

// Soft-delete: marks the project as deleted; recoverable for 30 days.
export async function deleteProject(id: string) {
  const { error } = await supabase
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreProject(id: string) {
  const { data, error } = await supabase.rpc('restore_project' as any, { _project_id: id });
  if (error) throw error;
  return data as boolean;
}

export async function purgeProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw error;
}


// ─── Funnel Steps ───────────────────────────────────────
export async function fetchFunnelSteps(projectId: string) {
  const { data, error } = await supabase
    .from('funnel_steps')
    .select('*')
    .eq('project_id', projectId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createFunnelStep(
  orgId: string,
  projectId: string,
  title: string,
  stepType: string,
  orderIndex: number
) {
  const { data, error } = await supabase
    .from('funnel_steps')
    .insert({ title, step_type: stepType, order_index: orderIndex, project_id: projectId, org_id: orgId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFunnelStep(id: string, updates: { title?: string; step_type?: string; order_index?: number }) {
  const { error } = await supabase.from('funnel_steps').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteFunnelStep(id: string) {
  const { error } = await supabase.from('funnel_steps').delete().eq('id', id);
  if (error) throw error;
}

export async function reorderFunnelSteps(stepIds: string[]) {
  const updates = stepIds.map((id, i) =>
    supabase.from('funnel_steps').update({ order_index: i + 1 }).eq('id', id)
  );
  await Promise.all(updates);
}

// ─── Notes ──────────────────────────────────────────────
export async function fetchNotes(projectId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createNote(
  orgId: string,
  projectId: string,
  note: { type: string; title: string; body: string; links: string[] }
) {
  const { data, error } = await supabase
    .from('notes')
    .insert({
      org_id: orgId,
      project_id: projectId,
      type: note.type,
      title: note.title,
      body: note.body,
      links: note.links,
      done: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(id: string, updates: { type?: string; title?: string; body?: string; links?: string[]; done?: boolean }) {
  const { error } = await supabase.from('notes').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}

// ─── Links ──────────────────────────────────────────────
export async function fetchLinks(projectId: string) {
  const { data, error } = await supabase
    .from('links')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createLink(
  orgId: string,
  projectId: string,
  link: { title: string; url: string; category: string }
) {
  const { data, error } = await supabase
    .from('links')
    .insert({
      org_id: orgId,
      project_id: projectId,
      title: link.title,
      url: link.url,
      category: link.category,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLink(id: string, updates: { title?: string; url?: string; category?: string }) {
  const { error } = await supabase.from('links').update(updates).eq('id', id);
  if (error) throw error;
}

export async function deleteLink(id: string) {
  const { error } = await supabase.from('links').delete().eq('id', id);
  if (error) throw error;
}
