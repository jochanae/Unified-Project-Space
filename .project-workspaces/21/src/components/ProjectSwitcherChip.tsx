import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, ChevronDown, FolderOpen, Check, BookOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProjectShelfSheet from './ProjectShelfSheet';

export interface UserProject {
  id: string;
  name: string;
  emoji: string;
  description?: string | null;
  default_mode: 'auditor' | 'visionary' | 'strategist';
  color_hex: string;
}

const MODE_LABELS: Record<string, string> = {
  auditor: 'Auditor',
  visionary: 'Visionary',
  strategist: 'Strategist',
};

const MODE_COLORS: Record<string, string> = {
  auditor: 'rgba(212,175,55,0.8)',
  visionary: 'rgba(180,160,255,0.8)',
  strategist: 'rgba(100,220,180,0.8)',
};

interface ProjectSwitcherChipProps {
  userId: string;
  activeProject: UserProject | null;
  onProjectChange: (project: UserProject | null) => void;
  onModeChange?: (mode: 'auditor' | 'visionary' | 'strategist') => void;
}

export default function ProjectSwitcherChip({
  userId,
  activeProject,
  onProjectChange,
  onModeChange,
}: ProjectSwitcherChipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shelfOpen, setShelfOpen] = useState(false);
  const [projects, setProjects] = useState<UserProject[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('📁');
  const [newMode, setNewMode] = useState<'auditor' | 'visionary' | 'strategist'>('strategist');
  const [saving, setSaving] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('user_projects')
      .select('id, name, emoji, description, default_mode, color_hex')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) setProjects(data as UserProject[]);
      });
  }, [userId]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsAdding(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleSelect = (project: UserProject | null) => {
    onProjectChange(project);
    if (project) onModeChange?.(project.default_mode);
    setIsOpen(false);
    setIsAdding(false);
  };

  const handleAddCustom = async () => {
    if (!newName.trim() || !userId) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('user_projects')
      .insert({
        user_id: userId,
        name: newName.trim(),
        emoji: newEmoji,
        default_mode: newMode,
        color_hex: '#D4AF37',
      })
      .select()
      .single();
    if (!error && data) {
      setProjects(prev => [data as UserProject, ...prev]);
      handleSelect(data as UserProject);
      setNewName('');
      setNewEmoji('📁');
      setNewMode('strategist');
      setIsAdding(false);
    }
    setSaving(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute bottom-full left-0 mb-2 w-[min(15rem,calc(100vw-2rem))] rounded-2xl border border-white/[0.1] bg-[hsl(230_20%_7%/0.95)] backdrop-blur-2xl shadow-[0_-4px_32px_rgba(0,0,0,0.5)] overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-white/[0.06]">
              <span className="text-[10px] font-bold tracking-widest text-[rgba(212,175,55,0.7)]">
                ACTIVE PROJECT
              </span>
              <button onClick={() => setIsOpen(false)} className="text-white/30 hover:text-white/60">
                <X size={12} />
              </button>
            </div>

            {/* Clear selection */}
            {activeProject && (
              <button
                onClick={() => handleSelect(null)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-white/20 text-sm">✕</span>
                <span className="text-[12px] text-white/40">No project</span>
              </button>
            )}

            {/* Existing projects */}
            {projects.map(project => (
              <button
                key={project.id}
                onClick={() => handleSelect(project)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/[0.06] transition-colors ${
                  activeProject?.id === project.id ? 'bg-white/[0.04]' : ''
                }`}
              >
                <span className="text-base shrink-0">{project.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white/85 truncate">{project.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: MODE_COLORS[project.default_mode] }}>
                    {MODE_LABELS[project.default_mode]} lens
                  </p>
                </div>
                {activeProject?.id === project.id && (
                  <Check size={12} className="text-[rgba(212,175,55,0.7)] shrink-0" />
                )}
              </button>
            ))}

            {/* Empty state */}
            {projects.length === 0 && !isAdding && (
              <div className="px-4 py-5 text-center">
                <p className="text-[12px] leading-relaxed text-white/45 italic">
                  What are you working on? Add a project to give your companion context.
                </p>
              </div>
            )}

            {/* Custom add form */}
            <div className="border-t border-white/[0.06]">
              {!isAdding ? (
                <button
                  onClick={() => setIsAdding(true)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-white/[0.05] transition-colors"
                >
                  <Plus size={12} className="text-white/30" />
                  <span className="text-[12px] text-white/30">Custom project</span>
                </button>
              ) : (
                <div className="p-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEmoji}
                      onChange={e => setNewEmoji(e.target.value.slice(-2) || '📁')}
                      className="w-10 text-center bg-white/[0.06] border border-white/[0.1] rounded-lg text-sm focus:outline-none focus:border-[rgba(212,175,55,0.4)] px-1"
                      maxLength={2}
                    />
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="Project name"
                      className="flex-1 bg-white/[0.06] border border-white/[0.1] rounded-lg text-sm text-white/80 px-2.5 py-1.5 focus:outline-none focus:border-[rgba(212,175,55,0.4)] placeholder:text-white/20"
                    />
                  </div>
                  <div className="flex gap-1">
                    {(['strategist', 'auditor', 'visionary'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setNewMode(mode)}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
                          newMode === mode
                            ? 'border'
                            : 'bg-white/[0.04] text-white/30 border border-transparent hover:bg-white/[0.07]'
                        }`}
                        style={newMode === mode ? {
                          color: MODE_COLORS[mode],
                          borderColor: MODE_COLORS[mode].replace('0.8', '0.35'),
                          background: MODE_COLORS[mode].replace('0.8', '0.1'),
                        } : undefined}
                      >
                        {MODE_LABELS[mode]}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => { setIsAdding(false); setNewName(''); }}
                      className="flex-1 py-1.5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCustom}
                      disabled={!newName.trim() || saving}
                      className="flex-1 py-1.5 text-[11px] font-medium rounded-lg bg-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.8)] border border-[rgba(212,175,55,0.25)] disabled:opacity-30 hover:bg-[rgba(212,175,55,0.22)] transition-colors"
                    >
                      {saving ? '…' : 'Add'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trigger pill ── */}
      {activeProject ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center rounded-full border backdrop-blur-lg transition-all duration-300"
          style={{
            color: MODE_COLORS[activeProject.default_mode],
            borderColor: MODE_COLORS[activeProject.default_mode].replace('0.8', '0.35'),
            background: MODE_COLORS[activeProject.default_mode].replace('0.8', '0.1'),
            boxShadow: `0 0 14px ${MODE_COLORS[activeProject.default_mode].replace('0.8', '0.2')}`,
          }}
        >
          {/* Tap pill body → open shelf */}
          <button
            onClick={() => setShelfOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium active:scale-95 transition-transform"
            aria-label={`Open ${activeProject.name} blueprint shelf`}
          >
            <BookOpen className="h-3 w-3 opacity-80" />
            <span className="text-xs leading-none">{activeProject.emoji}</span>
            <span className="max-w-[80px] truncate">{activeProject.name}</span>
          </button>
          {/* Switcher handle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-1.5 py-1 opacity-60 hover:opacity-100 border-l border-current/10"
            aria-label="Switch project"
          >
            <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Clear */}
          <button
            onClick={() => handleSelect(null)}
            className="pr-2 pl-0.5 py-1 opacity-50 hover:opacity-100"
            aria-label="Clear project"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </motion.div>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.2)] bg-white/[0.04] backdrop-blur-lg px-2.5 py-1 text-[11px] font-medium text-white/35 hover:text-white/55 hover:border-[rgba(212,175,55,0.35)] hover:bg-white/[0.07] transition-all duration-300 active:scale-95"
        >
          <FolderOpen className="h-3 w-3 text-[rgba(212,175,55,0.4)]" />
          Project
          <ChevronDown className={`h-2.5 w-2.5 text-[rgba(212,175,55,0.3)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* ── Blueprint shelf sheet ── */}
      {activeProject && (
        <ProjectShelfSheet
          open={shelfOpen}
          onClose={() => setShelfOpen(false)}
          project={activeProject}
          userId={userId}
          onSwitchProject={() => { setShelfOpen(false); setIsOpen(true); }}
          onClearProject={() => handleSelect(null)}
          onDeleteProject={(projectId) => {
            setProjects(prev => prev.filter(project => project.id !== projectId));
            handleSelect(null);
          }}
        />
      )}
    </div>
  );
}
