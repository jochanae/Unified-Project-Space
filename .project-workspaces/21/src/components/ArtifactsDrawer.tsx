/**
 * The Workbench — code/letters/long-form pieces from chat.
 * Section header: "Artifacts" with auto-categorization filter chips.
 * Per artifact tabs: Code · Preview · Edit. Multi-select → Export ZIP.
 * Cinematic Luxury aesthetic: obsidian background, whisper-gold accents.
 */

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import JSZip from 'jszip';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import {
  Bookmark, Code2, FileText, Mail, Pin, PinOff, Copy, Trash2, Check, Download, Maximize2,
  X, WrapText, AlignLeft, Eye, Pencil, Save, Sparkles, Archive, CheckSquare, Square, Plus,
  Image as ImageIcon, Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import CodeViewer from './CodeViewer';
import LivePreview from './LivePreview';
import PlanOutlineEditor from './PlanOutlineEditor';
import BlueprintCard, { type BlueprintMode } from './cards/BlueprintCard';
import { buildInAxiom } from '@/lib/axiomHandoff';
import { supabase } from '@/integrations/supabase/client';
import type { ChatArtifact } from '@/hooks/useChatArtifacts';

interface ArtifactsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artifacts: ChatArtifact[];
  onTogglePin: (id: string, pinned: boolean) => void;
  onUpdate?: (id: string, content: string, title?: string) => void | Promise<void>;
  onRemove: (id: string) => void;
  onCreate?: (kind?: 'code' | 'plan' | 'letter' | 'document' | 'work_image' | 'other', language?: string | null) => Promise<string | null>;
  /** When set, the drawer also surfaces saved blueprints for this project. */
  projectId?: string | null;
  userId?: string | null;
  /** Optional: open the work-image generation prompt. */
  onGenerateWorkImage?: () => void;
}

interface BlueprintRow {
  id: string;
  mode: BlueprintMode;
  title: string;
  callout: string | null;
  sections: { heading: string; points: string[] }[];
  pinned: boolean;
  created_at: string;
}

const KIND_ICON = {
  code: Code2,
  plan: FileText,
  letter: Mail,
  document: FileText,
  work_image: ImageIcon,
  other: FileText,
} as const;

const KIND_TAG: Record<string, { label: string; className: string }> = {
  code:       { label: 'Code',    className: 'border-[hsl(200_70%_55%/0.4)] bg-[hsl(200_70%_55%/0.10)] text-[hsl(200_75%_72%)]' },
  plan:       { label: 'Plan',    className: 'border-[hsl(45_60%_52%/0.45)] bg-[hsl(45_60%_52%/0.10)] text-[hsl(45_70%_70%)]' },
  letter:     { label: 'Letter',  className: 'border-[hsl(330_50%_60%/0.4)] bg-[hsl(330_50%_60%/0.10)] text-[hsl(330_60%_78%)]' },
  document:   { label: 'Doc',     className: 'border-white/15 bg-white/[0.04] text-foreground/70' },
  work_image: { label: 'Visual',  className: 'border-[hsl(280_60%_60%/0.4)] bg-[hsl(280_60%_60%/0.10)] text-[hsl(280_70%_78%)]' },
  other:      { label: 'Note',    className: 'border-white/10 bg-white/[0.03] text-muted-foreground' },
};

const LANG_TO_EXT: Record<string, string> = {
  tsx: 'tsx', ts: 'ts', typescript: 'ts',
  jsx: 'jsx', js: 'js', javascript: 'js',
  py: 'py', python: 'py',
  sql: 'sql', json: 'json', yaml: 'yaml', yml: 'yml',
  css: 'css', html: 'html', sh: 'sh', bash: 'sh',
  md: 'md', markdown: 'md',
};

const PREVIEWABLE = new Set(['tsx', 'jsx', 'ts', 'typescript', 'js', 'javascript', 'html', 'css']);
const FORMATTABLE = new Set(['tsx', 'jsx', 'ts', 'typescript', 'js', 'javascript', 'json', 'css', 'html']);

type Mode = 'code' | 'preview' | 'edit';
type Filter = 'all' | 'code' | 'plan' | 'letter' | 'document' | 'work_image' | 'blueprint';

const FILTERS: { id: Filter; label: string; icon: typeof Code2 }[] = [
  { id: 'all', label: 'All', icon: Bookmark },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'letter', label: 'Letters', icon: Mail },
  { id: 'plan', label: 'Plans', icon: FileText },
  { id: 'document', label: 'Docs', icon: FileText },
  { id: 'work_image', label: 'Visuals', icon: ImageIcon },
  { id: 'blueprint', label: 'Blueprints', icon: Sparkles },
];

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

function filenameFor(a: ChatArtifact): string {
  let filename = a.title || 'artifact.txt';
  if (!/\.[a-z0-9]{1,6}$/i.test(filename)) {
    const ext = a.language ? (LANG_TO_EXT[a.language.toLowerCase()] || a.language) : (a.kind === 'letter' ? 'txt' : 'md');
    filename = `${filename}.${ext}`;
  }
  // Sanitize for filesystem
  return filename.replace(/[\/\\:*?"<>|]+/g, '_');
}

function downloadArtifact(a: ChatArtifact) {
  const filename = filenameFor(a);
  const blob = new Blob([a.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success(`Downloaded ${filename}`);
}

async function exportZip(items: ChatArtifact[]) {
  if (items.length === 0) return;
  const zip = new JSZip();
  const seen = new Map<string, number>();
  for (const a of items) {
    let name = filenameFor(a);
    const count = seen.get(name) ?? 0;
    if (count > 0) {
      const dot = name.lastIndexOf('.');
      name = dot > 0 ? `${name.slice(0, dot)}-${count}${name.slice(dot)}` : `${name}-${count}`;
    }
    seen.set(filenameFor(a), count + 1);
    zip.file(name, a.content);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = (items[0]?.title || 'workbench')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'workbench';
  const suffix = items.length > 1 ? `-+${items.length - 1}` : '';
  link.href = url;
  link.download = `${slug}${suffix}-${stamp}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success(`Exported ${items.length} item${items.length > 1 ? 's' : ''}`);
}

/** Lightweight format using prettier-standalone loaded on demand from esm.sh. */
async function formatCode(source: string, language: string): Promise<string> {
  const lang = language.toLowerCase();
  // Map language → prettier parser + plugin
  const config: { parser: string; plugin: string } | null =
    ['tsx', 'jsx', 'ts', 'typescript'].includes(lang) ? { parser: 'typescript', plugin: 'typescript' } :
    ['js', 'javascript'].includes(lang) ? { parser: 'babel', plugin: 'babel' } :
    lang === 'json' ? { parser: 'json', plugin: 'babel' } :
    lang === 'css' ? { parser: 'css', plugin: 'postcss' } :
    lang === 'html' ? { parser: 'html', plugin: 'html' } :
    null;
  if (!config) throw new Error('Unsupported language');

  // @ts-expect-error dynamic ESM CDN import
  const prettier: any = await import(/* @vite-ignore */ 'https://esm.sh/prettier@3.3.3/standalone');
  const plugin: any = await import(/* @vite-ignore */ `https://esm.sh/prettier@3.3.3/plugins/${config.plugin}`);
  // estree plugin needed for js/ts/json
  const plugins: unknown[] = [plugin.default ?? plugin];
  if (['typescript', 'babel'].includes(config.plugin)) {
    // @ts-expect-error dynamic ESM CDN import
    const estree: any = await import(/* @vite-ignore */ 'https://esm.sh/prettier@3.3.3/plugins/estree');
    plugins.push(estree.default ?? estree);
  }
  return prettier.format(source, { parser: config.parser, plugins, semi: true, singleQuote: true });
}

/** Renders the body of an artifact in code/preview/edit mode. */
function ArtifactBody({
  artifact, mode, wrap, draft, onDraftChange, compact,
}: {
  artifact: ChatArtifact; mode: Mode; wrap: boolean;
  draft: string; onDraftChange: (v: string) => void; compact?: boolean;
}) {
  const isCode = artifact.kind === 'code';
  const isImage = artifact.kind === 'work_image';
  const langKey = (artifact.language || '').toLowerCase();
  const canPreview = isCode && PREVIEWABLE.has(langKey);
  const heightClass = compact ? 'max-h-64 min-h-[12rem]' : 'min-h-[60vh]';

  if (isImage) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg bg-black/40 p-2', heightClass)}>
        <img
          src={artifact.content}
          alt={artifact.title}
          className="max-h-full max-w-full rounded-md object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  if (mode === 'edit') {
    if (artifact.kind === 'plan') {
      return (
        <PlanOutlineEditor
          value={draft}
          onChange={onDraftChange}
          className={compact ? 'max-h-[60vh] overflow-y-auto' : ''}
        />
      );
    }
    return (
      <textarea
        value={draft}
        onChange={e => onDraftChange(e.target.value)}
        spellCheck={false}
        className={cn(
          'w-full rounded-lg border border-[hsl(45_60%_52%/0.25)] bg-[#0a0a0a] p-3 font-mono text-[12px] leading-relaxed text-foreground/90',
          'focus:outline-none focus:border-[hsl(45_60%_52%/0.6)] focus:ring-1 focus:ring-[hsl(45_60%_52%/0.3)]',
          'resize-none whitespace-pre',
          heightClass,
        )}
      />
    );
  }

  if (mode === 'preview' && canPreview) {
    return <LivePreview code={artifact.content} language={artifact.language ?? 'tsx'} className={heightClass} />;
  }

  if (isCode) {
    return (
      <CodeViewer
        code={artifact.content}
        language={artifact.language ?? undefined}
        wrap={wrap}
        showLineNumbers
        className={heightClass}
      />
    );
  }

  return (
    <pre className={cn('overflow-auto rounded-lg bg-black/40 p-3 text-[12px] leading-relaxed text-foreground/90 whitespace-pre-wrap', heightClass)}>
      <code>{artifact.content}</code>
    </pre>
  );
}

function ModeTabs({ mode, setMode, canPreview }: { mode: Mode; setMode: (m: Mode) => void; canPreview: boolean }) {
  const tabs: { id: Mode; label: string; icon: typeof Code2 }[] = [
    { id: 'code', label: 'Code', icon: Code2 },
    ...(canPreview ? [{ id: 'preview' as Mode, label: 'Preview', icon: Eye }] : []),
    { id: 'edit', label: 'Edit', icon: Pencil },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-[hsl(45_60%_52%/0.18)] bg-black/40 p-0.5">
      {tabs.map(t => {
        const Icon = t.icon;
        const active = mode === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setMode(t.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] tracking-wide transition-colors',
              active ? 'bg-[hsl(45_60%_52%/0.15)] text-[hsl(45_70%_70%)]' : 'text-muted-foreground/70 hover:text-foreground',
            )}
          >
            <Icon className="h-3 w-3" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ArtifactsDrawer({ open, onOpenChange, artifacts, onTogglePin, onUpdate, onRemove, onCreate, projectId, userId, onGenerateWorkImage }: ArtifactsDrawerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fullscreenArtifact, setFullscreenArtifact] = useState<ChatArtifact | null>(null);
  const [wrap, setWrap] = useState(true);
  const [mode, setMode] = useState<Mode>('code');
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [formatting, setFormatting] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [blueprints, setBlueprints] = useState<BlueprintRow[]>([]);
  const [expandedBlueprintId, setExpandedBlueprintId] = useState<string | null>(null);
  const [formatOnSave, setFormatOnSave] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('workbench:formatOnSave') === '1';
  });
  useEffect(() => {
    try { localStorage.setItem('workbench:formatOnSave', formatOnSave ? '1' : '0'); } catch { /* noop */ }
  }, [formatOnSave]);

  // Load blueprints for the active project when drawer opens
  useEffect(() => {
    if (!open || !projectId || !userId) { setBlueprints([]); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('project_blueprints')
        .select('id, mode, title, callout, sections, pinned, created_at')
        .eq('user_id', userId)
        .eq('project_id', projectId)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(60);
      if (!cancelled && data) setBlueprints(data as BlueprintRow[]);
    })();
    return () => { cancelled = true; };
  }, [open, projectId, userId]);

  const activeArtifact =
    fullscreenArtifact ??
    (expandedId ? artifacts.find(a => a.id === expandedId) ?? null : null);

  useEffect(() => {
    if (activeArtifact) {
      setDraft(activeArtifact.content);
      setMode(prev => (prev === 'edit' ? 'code' : prev));
    }
  }, [activeArtifact?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset transient UI state when drawer closes
  useEffect(() => {
    if (!open) {
      setSelectMode(false);
      setSelectedIds(new Set());
      setExpandedId(null);
      setExpandedBlueprintId(null);
    }
  }, [open]);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = {
      all: artifacts.length + blueprints.length,
      code: 0, plan: 0, letter: 0, document: 0, work_image: 0,
      blueprint: blueprints.length,
    };
    for (const a of artifacts) {
      if (a.kind in c) c[a.kind as Filter] += 1;
    }
    return c;
  }, [artifacts, blueprints]);

  const visible = useMemo(
    () => {
      if (filter === 'blueprint') return [];
      if (filter === 'all') return artifacts;
      return artifacts.filter(a => a.kind === filter);
    },
    [artifacts, filter],
  );
  const visibleBlueprints = useMemo(
    () => (filter === 'all' || filter === 'blueprint') ? blueprints : [],
    [blueprints, filter],
  );

  const handleCopy = async (a: ChatArtifact) => {
    try {
      await navigator.clipboard.writeText(a.content);
      setCopiedId(a.id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleSave = async (a: ChatArtifact) => {
    if (!onUpdate || draft === a.content) {
      setMode('code');
      return;
    }
    setSaving(true);
    try {
      let toSave = draft;
      const lang = (a.language || '').toLowerCase();
      if (formatOnSave && FORMATTABLE.has(lang)) {
        try { toSave = await formatCode(draft, lang); } catch { /* keep raw on format failure */ }
      }
      await onUpdate(a.id, toSave);
      if (toSave !== draft) setDraft(toSave);
      toast.success(formatOnSave && toSave !== draft ? 'Formatted & saved' : 'Saved');
      setMode('code');
    } catch {
      toast.error('Could not save');
    } finally {
      setSaving(false);
    }
  };

  const handleFormat = async (a: ChatArtifact) => {
    const lang = (a.language || '').toLowerCase();
    if (!FORMATTABLE.has(lang)) {
      toast.error('Format not supported for this language');
      return;
    }
    setFormatting(true);
    try {
      const source = mode === 'edit' ? draft : a.content;
      const formatted = await formatCode(source, lang);
      setDraft(formatted);
      setMode('edit');
      toast.success('Formatted — click Save to keep changes');
    } catch (err) {
      toast.error((err as Error).message || 'Could not format');
    } finally {
      setFormatting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(s => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExportZip = async () => {
    const items = selectedIds.size > 0
      ? artifacts.filter(a => selectedIds.has(a.id))
      : visible;
    if (items.length === 0) {
      toast.error('Nothing to export');
      return;
    }
    await exportZip(items);
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  return (
    <>
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        className="dark border-[hsl(45_60%_52%/0.18)] bg-[#080808]/95 backdrop-blur-2xl max-h-[88dvh]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <DrawerHeader className="border-b border-[hsl(45_60%_52%/0.12)]">
          <DrawerTitle className="flex items-center gap-2.5 text-foreground">
            <Bookmark className="h-4 w-4 text-[hsl(45_70%_60%)]" />
            <span className="text-base font-light tracking-[0.18em] uppercase text-foreground/95">
              The Workbench
            </span>
          </DrawerTitle>
          <DrawerDescription className="text-[12px] text-muted-foreground/60 tracking-wide">
            Where your ideas turn into plans, and your plans turn into progress.
          </DrawerDescription>
        </DrawerHeader>

        {/* Artifacts section header + filter chips + bulk actions */}
        <div className="px-4 pt-3 pb-2 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[11px] font-light tracking-[0.22em] uppercase text-foreground/80">
              Artifacts <span className="text-muted-foreground/50">· {counts.all}</span>
            </h3>
            <div className="flex items-center gap-1">
              {onCreate && (
                <div className="relative">
                  <button
                    onClick={() => setNewMenuOpen(o => !o)}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] tracking-wide text-muted-foreground/70 hover:text-foreground"
                    title="Create new artifact"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                  {newMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setNewMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-[hsl(45_60%_52%/0.25)] bg-[#0a0a0a]/98 backdrop-blur-xl shadow-xl py-1">
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                          New blank artifact
                        </div>
                        {([
                          { kind: 'code', lang: 'tsx', label: 'Code snippet (TSX)', icon: Code2 },
                          { kind: 'code', lang: 'jsx', label: 'Code snippet (JSX)', icon: Code2 },
                          { kind: 'code', lang: 'js', label: 'JavaScript', icon: Code2 },
                          { kind: 'code', lang: 'html', label: 'HTML', icon: Code2 },
                          { kind: 'code', lang: 'css', label: 'CSS', icon: Code2 },
                          { kind: 'code', lang: 'sql', label: 'SQL', icon: Code2 },
                          { kind: 'code', lang: 'md', label: 'Markdown note', icon: FileText },
                          { kind: 'plan', lang: null, label: 'Plan / Blueprint', icon: FileText },
                          { kind: 'letter', lang: null, label: 'Letter', icon: Mail },
                          { kind: 'document', lang: null, label: 'Document', icon: FileText },
                          ...(onGenerateWorkImage ? [{ kind: 'work_image' as const, lang: null, label: 'Generate Visual (diagram, mockup…)', icon: Wand2 }] : []),
                        ] as const).map(opt => {
                          const Icon = opt.icon;
                          return (
                            <button
                              key={`${opt.kind}-${opt.lang ?? 'none'}`}
                              onClick={async () => {
                                setNewMenuOpen(false);
                                if (opt.kind === 'work_image') {
                                  onGenerateWorkImage?.();
                                  return;
                                }
                                const id = await onCreate(opt.kind, opt.lang);
                                if (id) {
                                  setExpandedId(id);
                                  setMode('edit');
                                  toast.success(`New ${opt.label.toLowerCase()} — start typing`);
                                } else {
                                  toast.error('Could not create');
                                }
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-foreground/85 hover:bg-[hsl(45_60%_52%/0.10)] hover:text-[hsl(45_70%_70%)]"
                            >
                              <Icon className="h-3.5 w-3.5 opacity-70" />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
              <button
                onClick={() => { setSelectMode(s => !s); setSelectedIds(new Set()); }}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] tracking-wide transition-colors',
                  selectMode ? 'bg-[hsl(45_60%_52%/0.15)] text-[hsl(45_70%_70%)]' : 'text-muted-foreground/70 hover:text-foreground',
                )}
              >
                <CheckSquare className="h-3 w-3" />
                {selectMode ? 'Cancel' : 'Select'}
              </button>
              <button
                onClick={handleExportZip}
                disabled={visible.length === 0}
                className="flex items-center gap-1 rounded-md border border-[hsl(45_60%_52%/0.25)] bg-[hsl(45_60%_52%/0.06)] px-2 py-1 text-[11px] tracking-wide text-[hsl(45_70%_70%)] hover:bg-[hsl(45_60%_52%/0.12)] disabled:opacity-40"
                title={selectedIds.size > 0 ? `Export ${selectedIds.size} selected` : 'Export visible as ZIP'}
              >
                <Archive className="h-3 w-3" />
                ZIP {selectedIds.size > 0 ? `(${selectedIds.size})` : ''}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {FILTERS.map(f => {
              const Icon = f.icon;
              const active = filter === f.id;
              const n = counts[f.id];
              if (f.id !== 'all' && n === 0) return null;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] tracking-wide transition-colors',
                    active
                      ? 'border-[hsl(45_60%_52%/0.45)] bg-[hsl(45_60%_52%/0.12)] text-[hsl(45_70%_70%)]'
                      : 'border-white/[0.06] text-muted-foreground/70 hover:text-foreground hover:border-white/15',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {f.label}
                  <span className="text-muted-foreground/50">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-y-auto px-4 pb-8 pt-3 space-y-4">
          {visible.length === 0 && visibleBlueprints.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground/60">
              {artifacts.length === 0 && blueprints.length === 0
                ? 'Nothing here yet. Long-form replies and saved blueprints will land here automatically.'
                : `No ${filter} items yet.`}
            </div>
          ) : (
            <>
            {visible.length > 0 && (
            <ul className="space-y-2">
              {visible.map(a => {
                const Icon = KIND_ICON[a.kind] ?? FileText;
                const expanded = expandedId === a.id;
                const isCode = a.kind === 'code';
                const langKey = (a.language || '').toLowerCase();
                const canPreview = isCode && PREVIEWABLE.has(langKey);
                const canFormat = FORMATTABLE.has(langKey);
                const checked = selectedIds.has(a.id);
                return (
                  <li
                    key={a.id}
                    className={cn(
                      'rounded-xl border bg-white/[0.015] transition-colors',
                      a.pinned ? 'border-[hsl(45_60%_52%/0.45)]' : 'border-white/[0.06]',
                      checked && 'border-[hsl(45_60%_52%/0.6)] bg-[hsl(45_60%_52%/0.04)]',
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      {selectMode && (
                        <button
                          onClick={() => toggleSelect(a.id)}
                          className="text-muted-foreground hover:text-[hsl(45_70%_70%)]"
                        >
                          {checked ? <CheckSquare className="h-4 w-4 text-[hsl(45_70%_60%)]" /> : <Square className="h-4 w-4" />}
                        </button>
                      )}
                      <button
                        onClick={() => selectMode ? toggleSelect(a.id) : setExpandedId(expanded ? null : a.id)}
                        className="flex flex-1 items-center gap-3 text-left min-w-0"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const tag = KIND_TAG[a.kind] ?? KIND_TAG.other;
                              return (
                                <span className={cn(
                                  'shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.14em]',
                                  tag.className,
                                )}>
                                  {tag.label}
                                </span>
                              );
                            })()}
                            <span className="truncate text-sm text-foreground">{a.title}</span>
                            {a.pinned && <Pin className="h-3 w-3 shrink-0 text-[hsl(45_70%_60%)]" />}
                          </div>
                          <div className="text-[11px] text-muted-foreground/60 tracking-wide">
                            {a.language ? `${a.language} · ` : ''}{timeAgo(a.created_at)}
                          </div>
                        </div>
                      </button>
                    </div>

                    {expanded && !selectMode && (
                      <div className="border-t border-white/[0.06] px-3 pb-3 pt-3">
                        {(isCode || a.kind === 'plan') && (
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            {isCode ? (
                              <ModeTabs mode={mode} setMode={setMode} canPreview={canPreview} />
                            ) : (
                              <div className="inline-flex items-center gap-0.5 rounded-full border border-[hsl(45_60%_52%/0.18)] bg-black/40 p-0.5">
                                <button
                                  onClick={() => setMode('code')}
                                  className={cn(
                                    'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] tracking-wide transition-colors',
                                    mode !== 'edit' ? 'bg-[hsl(45_60%_52%/0.15)] text-[hsl(45_70%_70%)]' : 'text-muted-foreground/70 hover:text-foreground',
                                  )}
                                >
                                  <Eye className="h-3 w-3" /> View
                                </button>
                                <button
                                  onClick={() => setMode('edit')}
                                  className={cn(
                                    'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] tracking-wide transition-colors',
                                    mode === 'edit' ? 'bg-[hsl(45_60%_52%/0.15)] text-[hsl(45_70%_70%)]' : 'text-muted-foreground/70 hover:text-foreground',
                                  )}
                                >
                                  <Pencil className="h-3 w-3" /> Edit
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              {isCode && canFormat && (
                                <button
                                  onClick={() => handleFormat(a)}
                                  disabled={formatting}
                                  className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] tracking-wide text-muted-foreground hover:text-foreground disabled:opacity-40"
                                  title="Format with Prettier"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  {formatting ? 'Formatting…' : 'Format'}
                                </button>
                              )}
                              {mode === 'edit' && (
                                <>
                                  {isCode && canFormat && (
                                    <label
                                      className="flex select-none items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] tracking-wide text-muted-foreground hover:text-foreground"
                                      title="Run Prettier automatically when you save"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={formatOnSave}
                                        onChange={e => setFormatOnSave(e.target.checked)}
                                        className="h-3 w-3 accent-[hsl(45_70%_55%)]"
                                      />
                                      Format on save
                                    </label>
                                  )}
                                  <button
                                    onClick={() => handleSave(a)}
                                    disabled={saving || draft === a.content}
                                    className="flex items-center gap-1.5 rounded-md border border-[hsl(45_60%_52%/0.35)] bg-[hsl(45_60%_52%/0.08)] px-2.5 py-1 text-[11px] tracking-wide text-[hsl(45_70%_70%)] hover:bg-[hsl(45_60%_52%/0.15)] disabled:opacity-40"
                                  >
                                    <Save className="h-3 w-3" />
                                    {saving ? 'Saving…' : 'Save'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="mb-3">
                          <ArtifactBody
                            artifact={a}
                            mode={(isCode || a.kind === 'plan') ? mode : 'code'}
                            wrap={wrap}
                            draft={draft}
                            onDraftChange={setDraft}
                            compact
                          />
                        </div>

                        <div className="flex flex-wrap items-center justify-end gap-1">
                          {isCode && mode === 'code' && (
                            <button
                              onClick={() => setWrap(w => !w)}
                              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
                              title={wrap ? 'Disable word wrap' : 'Enable word wrap'}
                            >
                              {wrap ? <AlignLeft className="h-3.5 w-3.5" /> : <WrapText className="h-3.5 w-3.5" />}
                              {wrap ? 'No wrap' : 'Wrap'}
                            </button>
                          )}
                          <button
                            onClick={() => setFullscreenArtifact(a)}
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                            Expand
                          </button>
                          <button
                            onClick={() => downloadArtifact(a)}
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </button>
                          <button
                            onClick={() => onTogglePin(a.id, a.pinned)}
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          >
                            {a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                            {a.pinned ? 'Unpin' : 'Pin'}
                          </button>
                          <button
                            onClick={() => handleCopy(a)}
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
                          >
                            {copiedId === a.id ? <Check className="h-3.5 w-3.5 text-[hsl(45_70%_60%)]" /> : <Copy className="h-3.5 w-3.5" />}
                            Copy
                          </button>
                          <button
                            onClick={() => { onRemove(a.id); setExpandedId(null); }}
                            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            )}

            {visibleBlueprints.length > 0 && (
              <div>
                {filter === 'all' && (
                  <h4 className="px-1 mb-2 text-[10px] font-light tracking-[0.22em] uppercase text-foreground/60">
                    Blueprints <span className="text-muted-foreground/40">· {visibleBlueprints.length}</span>
                  </h4>
                )}
                <ul className="space-y-2">
                  {visibleBlueprints.map(b => {
                    const expanded = expandedBlueprintId === b.id;
                    return (
                      <li
                        key={b.id}
                        className={cn(
                          'rounded-xl border bg-white/[0.015] transition-colors overflow-hidden',
                          b.pinned ? 'border-[hsl(45_60%_52%/0.45)]' : 'border-white/[0.06]',
                        )}
                      >
                        <button
                          onClick={() => setExpandedBlueprintId(expanded ? null : b.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left min-w-0"
                        >
                          <Sparkles className="h-4 w-4 shrink-0 text-[hsl(45_70%_60%)]" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm text-foreground">{b.title}</span>
                              {b.pinned && <Pin className="h-3 w-3 shrink-0 text-[hsl(45_70%_60%)]" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground/60 tracking-wide uppercase">
                              {b.mode} · {timeAgo(b.created_at)}
                            </div>
                          </div>
                        </button>
                        {expanded && (
                          <div className="border-t border-white/[0.06] px-3 pb-3 pt-3">
                            <BlueprintCard
                              mode={b.mode}
                              title={b.title}
                              callout={b.callout ?? undefined}
                              sections={b.sections ?? []}
                              onBuildInAxiom={() => buildInAxiom({
                                title: b.title,
                                callout: b.callout,
                                sections: b.sections,
                              })}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>

    {fullscreenArtifact && (() => {
      const fa = fullscreenArtifact;
      const isCode = fa.kind === 'code';
      const langKey = (fa.language || '').toLowerCase();
      const canPreview = isCode && PREVIEWABLE.has(langKey);
      const canFormat = FORMATTABLE.has(langKey);
      return createPortal(
        <div
          className="fixed inset-0 bg-[#050505]/98 backdrop-blur-2xl flex flex-col"
          style={{ zIndex: 200, paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[hsl(45_60%_52%/0.15)]">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {(() => { const I = KIND_ICON[fa.kind] ?? FileText; return <I className="h-4 w-4 text-[hsl(45_70%_60%)] shrink-0" />; })()}
                <span className="truncate text-sm text-foreground tracking-wide">{fa.title}</span>
              </div>
              {fa.language && (
                <div className="text-[11px] text-muted-foreground/60 mt-0.5 tracking-wide">{fa.language}</div>
              )}
            </div>
            <div className="flex items-center gap-1">
              {isCode && <ModeTabs mode={mode} setMode={setMode} canPreview={canPreview} />}
              {isCode && canFormat && (
                <button
                  onClick={() => handleFormat(fa)}
                  disabled={formatting}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground disabled:opacity-40"
                  title="Format with Prettier"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
              )}
              {isCode && mode === 'edit' && (
                <button
                  onClick={() => handleSave(fa)}
                  disabled={saving || draft === fa.content}
                  className="flex items-center gap-1.5 rounded-md border border-[hsl(45_60%_52%/0.35)] bg-[hsl(45_60%_52%/0.08)] px-2.5 py-1 text-[11px] tracking-wide text-[hsl(45_70%_70%)] hover:bg-[hsl(45_60%_52%/0.15)] disabled:opacity-40"
                >
                  <Save className="h-3 w-3" />
                  {saving ? 'Saving…' : 'Save'}
                </button>
              )}
              {isCode && mode === 'code' && (
                <button
                  onClick={() => setWrap(w => !w)}
                  className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  {wrap ? <AlignLeft className="h-3.5 w-3.5" /> : <WrapText className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                onClick={() => downloadArtifact(fa)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => handleCopy(fa)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                {copiedId === fa.id ? <Check className="h-3.5 w-3.5 text-[hsl(45_70%_60%)]" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                onClick={() => setFullscreenArtifact(null)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3">
            <ArtifactBody
              artifact={fa}
              mode={isCode ? mode : 'code'}
              wrap={wrap}
              draft={draft}
              onDraftChange={setDraft}
            />
          </div>
        </div>,
        document.body
      );
    })()}
    </>
  );
}
