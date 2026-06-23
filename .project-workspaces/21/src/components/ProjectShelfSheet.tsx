import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pin, PinOff, Trash2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import BlueprintCard, { type BlueprintMode } from '@/components/cards/BlueprintCard';
import { buildInAxiom } from '@/lib/axiomHandoff';
import type { UserProject } from './ProjectSwitcherChip';

interface ProjectBlueprint {
  id: string;
  mode: BlueprintMode;
  title: string;
  callout: string | null;
  sections: { heading: string; points: string[] }[];
  pinned: boolean;
  created_at: string;
}

interface ProjectShelfSheetProps {
  open: boolean;
  onClose: () => void;
  project: UserProject;
  userId: string;
  onSwitchProject?: () => void;
  onClearProject?: () => void;
  onDeleteProject?: (projectId: string) => void;
}

const MODE_GLOW: Record<BlueprintMode, string> = {
  auditor: 'rgba(212,175,55,0.35)',
  visionary: 'rgba(180,160,255,0.35)',
  strategist: 'rgba(100,220,180,0.35)',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ProjectShelfSheet({
  open,
  onClose,
  project,
  userId,
  onSwitchProject,
  onClearProject,
  onDeleteProject,
}: ProjectShelfSheetProps) {
  const [items, setItems] = useState<ProjectBlueprint[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchItems = useCallback(async () => {
    if (!userId || !project?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from('project_blueprints')
      .select('id, mode, title, callout, sections, pinned, created_at')
      .eq('user_id', userId)
      .eq('project_id', project.id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60);
    if (data) setItems(data as ProjectBlueprint[]);
    setLoading(false);
  }, [userId, project?.id]);

  useEffect(() => {
    if (open) fetchItems();
  }, [open, fetchItems]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.projectId === project.id && open) fetchItems();
    };
    window.addEventListener('project-blueprint-saved', handler);
    return () => window.removeEventListener('project-blueprint-saved', handler);
  }, [project.id, open, fetchItems]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const togglePin = async (id: string, currentlyPinned: boolean) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, pinned: !currentlyPinned } : i));
    await supabase.from('project_blueprints').update({ pinned: !currentlyPinned }).eq('id', id);
    fetchItems();
  };

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('project_blueprints').delete().eq('id', id);
  };

  const deleteProject = async () => {
    if (!project?.id || deletingProject) return;
    const confirmed = window.confirm(`Delete ${project.name}? This removes the project and its saved blueprints.`);
    if (!confirmed) return;

    setDeletingProject(true);
    const { error } = await supabase
      .from('user_projects')
      .delete()
      .eq('id', project.id)
      .eq('user_id', userId);

    setDeletingProject(false);

    if (error) {
      window.alert(`Couldn't delete ${project.name}. Please try again.`);
      return;
    }

    onDeleteProject?.(project.id);
    onClearProject?.();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col rounded-t-3xl border-t border-[rgba(212,175,55,0.25)] bg-[hsl(230_22%_5%/0.96)] backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.7)]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-2.5 pb-1.5">
              <div className="h-1 w-10 rounded-full bg-white/15" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl leading-none">{project.emoji}</span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-semibold text-white/90 truncate">{project.name}</p>
                  <p className="text-[10.5px] tracking-wider text-[rgba(212,175,55,0.65)] uppercase">
                    Blueprint Shelf
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-white/[0.06] transition-colors"
                aria-label="Close shelf"
              >
                <X className="h-4 w-4 text-white/50" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {loading && items.length === 0 && (
                <div className="py-10 text-center text-[12px] text-white/35">Loading shelf…</div>
              )}

              {!loading && items.length === 0 && (
                <div className="py-12 px-6 text-center">
                  <Sparkles className="h-5 w-5 text-[rgba(212,175,55,0.5)] mx-auto mb-3" />
                  <p className="text-[13.5px] text-white/65 leading-relaxed mb-1.5">
                    No blueprints saved yet
                  </p>
                  <p className="text-[12px] text-white/35 leading-relaxed max-w-[280px] mx-auto">
                    Generate a Blueprint card in chat — when you tap "Save to {project.name}" it lands here.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {items.map(item => {
                  const isExpanded = expanded[item.id] ?? false;
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border-[0.5px] border-white/[0.07] bg-[rgba(10,10,18,0.55)] overflow-hidden"
                      style={{ boxShadow: item.pinned ? `0 0 18px ${MODE_GLOW[item.mode]}` : undefined }}
                    >
                      <button
                        onClick={() => setExpanded(p => ({ ...p, [item.id]: !isExpanded }))}
                        className="w-full text-left px-4 py-3 flex items-start gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9.5px] font-semibold tracking-[0.16em] uppercase" style={{ color: MODE_GLOW[item.mode].replace('0.35', '0.95') }}>
                              {item.mode}
                            </span>
                            <span className="text-[10px] text-white/30">·</span>
                            <span className="text-[10px] text-white/40">{formatDate(item.created_at)}</span>
                            {item.pinned && (
                              <Pin className="h-2.5 w-2.5 text-[rgba(212,175,55,0.7)] ml-0.5" />
                            )}
                          </div>
                          <p className="text-[13.5px] font-medium text-white/90 leading-snug line-clamp-2">
                            {item.title}
                          </p>
                          {item.callout && !isExpanded && (
                            <p className="text-[11.5px] text-white/50 italic mt-1 line-clamp-1">
                              → {item.callout}
                            </p>
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1">
                          <BlueprintCard
                            mode={item.mode}
                            title={item.title}
                            callout={item.callout ?? undefined}
                            sections={item.sections ?? []}
                            onBuildInAxiom={() => buildInAxiom({
                              title: item.title,
                              callout: item.callout,
                              sections: item.sections,
                            })}
                          />
                          <div className="flex items-center justify-end gap-1 mt-2 px-1">
                            <button
                              onClick={() => togglePin(item.id, item.pinned)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] text-white/45 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
                            >
                              {item.pinned
                                ? <><PinOff className="h-3 w-3" />Unpin</>
                                : <><Pin className="h-3 w-3" />Pin</>}
                            </button>
                            <button
                              onClick={() => remove(item.id)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] text-white/35 hover:text-red-300/80 hover:bg-white/[0.04] transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-3">
                {onSwitchProject ? (
                  <button
                    onClick={onSwitchProject}
                    className="text-[11.5px] text-white/45 hover:text-white/75 transition-colors"
                  >
                    ↔ Switch project
                  </button>
                ) : null}
                <button
                  onClick={deleteProject}
                  disabled={deletingProject}
                  className="text-[11.5px] text-red-300/65 hover:text-red-200 disabled:opacity-50 transition-colors"
                >
                  {deletingProject ? 'Deleting project…' : 'Delete project'}
                </button>
              </div>
              {onClearProject && (
                <button
                  onClick={() => { onClearProject(); onClose(); }}
                  className="text-[11.5px] text-white/35 hover:text-white/60 transition-colors"
                >
                  Clear active project
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
