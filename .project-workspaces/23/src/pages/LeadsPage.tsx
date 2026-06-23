import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Download, Users, Search, ChevronLeft, ChevronRight, ArrowUpDown,
  SlidersHorizontal, BookmarkPlus, Bookmark, Trash2, Tag as TagIcon, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Contact, ContactDetailSheet, PIPELINE_STAGES, useContacts,
} from '@/features/contacts';
import { useProjects } from '@/features/projects';
import { useCurrentUser } from '@/hooks/use-current-user';
import { exportAnalyticsCsv } from '@/lib/quick-actions';
import { toast } from 'sonner';

type FilterChip = 'all' | 'today' | 'hot';
type SortKey = 'newest' | 'oldest' | 'score_desc' | 'score_asc' | 'name';
const PAGE_SIZE = 25;

interface SavedView {
  name: string;
  projectId: string;
  search: string;
  chip: FilterChip;
  sort: SortKey;
  stages: string[];
  tags: string[];
  fromDays: number | null; // last N days
}

const VIEWS_KEY = 'intoiq.leads.savedViews';

function loadViews(): SavedView[] {
  try { return JSON.parse(localStorage.getItem(VIEWS_KEY) || '[]'); } catch { return []; }
}
function saveViews(v: SavedView[]) {
  localStorage.setItem(VIEWS_KEY, JSON.stringify(v));
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const escape = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  return [columns.join(','), ...rows.map(r => columns.map(c => escape(r[c])).join(','))].join('\n');
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const { user } = useCurrentUser();
  const { projects } = useProjects();
  const [projectId, setProjectId] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<FilterChip>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [fromDays, setFromDays] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openContact, setOpenContact] = useState<Contact | null>(null);
  const [views, setViews] = useState<SavedView[]>(() => loadViews());
  const [bulkTag, setBulkTag] = useState('');

  const scopedId = projectId === 'all' ? null : projectId;
  const { contacts, updateContact, deleteContact, addTag, removeTag } = useContacts(scopedId);

  const projectName = useMemo(
    () => projects.find(p => p.id === scopedId)?.name,
    [projects, scopedId]
  );

  // All tags across visible contacts (for advanced filter chips)
  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach(c => (c.tags || []).forEach(t => s.add(t)));
    return Array.from(s).sort();
  }, [contacts]);

  const filtered = useMemo(() => {
    const today = new Date().toDateString();
    const q = search.trim().toLowerCase();
    const fromMs = fromDays ? Date.now() - fromDays * 86400_000 : null;
    let list = contacts.filter(c => {
      if (chip === 'today' && (!c.created_at || new Date(c.created_at).toDateString() !== today)) return false;
      if (chip === 'hot' && (c.score ?? 0) < 70) return false;
      if (stageFilter.length && !stageFilter.includes(c.pipeline_stage)) return false;
      if (tagFilter.length && !tagFilter.every(t => (c.tags || []).includes(t))) return false;
      if (fromMs && (!c.created_at || new Date(c.created_at).getTime() < fromMs)) return false;
      if (q) {
        const hay = `${c.email} ${c.first_name ?? ''} ${c.last_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      switch (sort) {
        case 'newest': return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'oldest': return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'score_desc': return (b.score ?? 0) - (a.score ?? 0);
        case 'score_asc': return (a.score ?? 0) - (b.score ?? 0);
        case 'name': return (a.first_name || a.email).localeCompare(b.first_name || b.email);
      }
    });
    return list;
  }, [contacts, search, chip, sort, stageFilter, tagFilter, fromDays]);

  const filterKey = `${projectId}|${chip}|${search}|${sort}|${stageFilter.join(',')}|${tagFilter.join(',')}|${fromDays}`;
  useEffect(() => { setPage(1); setSelected(new Set()); }, [filterKey]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const allOnPageSelected = pageItems.length > 0 && pageItems.every(c => selected.has(c.id));
  const togglePageAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      if (allOnPageSelected) pageItems.forEach(c => next.delete(c.id));
      else pageItems.forEach(c => next.add(c.id));
      return next;
    });
  };
  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    if (!user?.orgId) return;
    if (projectId === 'all' && !search && chip === 'all' && !stageFilter.length && !tagFilter.length && !fromDays) {
      exportAnalyticsCsv(user.orgId);
      return;
    }
    if (!filtered.length) { toast.warning('No leads to export with current filters'); return; }
    const csv = toCsv(
      filtered as unknown as Array<Record<string, unknown>>,
      ['email', 'first_name', 'last_name', 'phone', 'pipeline_stage', 'score', 'tags', 'created_at']
    );
    const stamp = new Date().toISOString().split('T')[0];
    const slug = projectName ? projectName.toLowerCase().replace(/\s+/g, '-') : 'all';
    downloadCsv(`intoiq-leads-${slug}-${stamp}.csv`, csv);
    toast.success(`Exported ${filtered.length} leads`);
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    if (!confirm(`Delete ${selected.size} leads? This cannot be undone.`)) return;
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      try { await deleteContact(id); ok++; } catch { /* ignore */ }
    }
    toast.success(`Deleted ${ok} of ${ids.length}`);
    setSelected(new Set());
  };

  const bulkSetStage = async (stage: string) => {
    if (!selected.size) return;
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      try { await updateContact(id, { pipeline_stage: stage } as Partial<Contact>); ok++; } catch { /* ignore */ }
    }
    toast.success(`Moved ${ok} to ${stage}`);
  };

  const bulkAddTag = async () => {
    const t = bulkTag.trim().toLowerCase();
    if (!t || !selected.size) return;
    const ids = Array.from(selected);
    let ok = 0;
    for (const id of ids) {
      try { await addTag(id, t); ok++; } catch { /* ignore */ }
    }
    toast.success(`Tagged ${ok} leads with "${t}"`);
    setBulkTag('');
  };

  const saveCurrentView = () => {
    const name = window.prompt('Name this view:');
    if (!name) return;
    const view: SavedView = { name, projectId, search, chip, sort, stages: stageFilter, tags: tagFilter, fromDays };
    const next = [...views.filter(v => v.name !== name), view];
    setViews(next); saveViews(next);
    toast.success(`Saved view "${name}"`);
  };
  const applyView = (v: SavedView) => {
    setProjectId(v.projectId); setSearch(v.search); setChip(v.chip);
    setSort(v.sort); setStageFilter(v.stages); setTagFilter(v.tags); setFromDays(v.fromDays);
  };
  const deleteView = (name: string) => {
    const next = views.filter(v => v.name !== name);
    setViews(next); saveViews(next);
  };

  const todayCount = contacts.filter(c => c.created_at && new Date(c.created_at).toDateString() === new Date().toDateString()).length;
  const hotCount = contacts.filter(c => (c.score ?? 0) >= 70).length;
  const advancedCount = stageFilter.length + tagFilter.length + (fromDays ? 1 : 0);

  return (
    <>
      <Helmet>
        <title>Leads · IntoIQ</title>
        <meta name="description" content="Your captured leads across every funnel — triage, tag, and export." />
      </Helmet>
      <main className="min-h-screen pb-40">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
                <p className="text-xs text-muted-foreground truncate">
                  {filtered.length} of {contacts.length}
                  {projectName ? ` · ${projectName}` : ' · all projects'}
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5 shrink-0">
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </header>

          {/* Project + search + sort */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-9 sm:w-[200px] text-sm">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="h-9 sm:w-[160px] text-sm gap-1">
                <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="score_desc">Score: high → low</SelectItem>
                <SelectItem value="score_asc">Score: low → high</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter chips + advanced + saved views */}
          <div className="flex items-center gap-2 flex-wrap">
            <FilterChipBtn active={chip === 'all'} onClick={() => setChip('all')} label="All" count={contacts.length} />
            <FilterChipBtn active={chip === 'today'} onClick={() => setChip('today')} label="Today" count={todayCount} />
            <FilterChipBtn active={chip === 'hot'} onClick={() => setChip('hot')} label="Hot" count={hotCount} />

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'h-7 px-3 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5',
                    advancedCount > 0
                      ? 'bg-primary/10 text-primary border-primary/40'
                      : 'bg-card/30 text-muted-foreground border-border/30 hover:text-foreground'
                  )}
                >
                  <SlidersHorizontal className="h-3 w-3" />
                  Filters {advancedCount > 0 && <span className="opacity-80">· {advancedCount}</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Pipeline stage</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PIPELINE_STAGES.map(s => {
                      const on = stageFilter.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStageFilter(prev => on ? prev.filter(x => x !== s) : [...prev, s])}
                          className={cn(
                            'h-6 px-2 rounded-full text-[11px] capitalize border',
                            on ? 'bg-primary text-primary-foreground border-primary' : 'border-border/40 text-muted-foreground hover:text-foreground'
                          )}
                        >{s}</button>
                      );
                    })}
                  </div>
                </div>
                {allTags.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-auto">
                      {allTags.map(t => {
                        const on = tagFilter.includes(t);
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setTagFilter(prev => on ? prev.filter(x => x !== t) : [...prev, t])}
                            className={cn(
                              'h-6 px-2 rounded-full text-[11px] border',
                              on ? 'bg-primary text-primary-foreground border-primary' : 'border-border/40 text-muted-foreground hover:text-foreground'
                            )}
                          >{t}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Created within</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { l: 'Any', v: null }, { l: '24h', v: 1 }, { l: '7d', v: 7 }, { l: '30d', v: 30 }, { l: '90d', v: 90 },
                    ].map(o => (
                      <button
                        key={o.l}
                        type="button"
                        onClick={() => setFromDays(o.v)}
                        className={cn(
                          'h-6 px-2 rounded-full text-[11px] border',
                          fromDays === o.v ? 'bg-primary text-primary-foreground border-primary' : 'border-border/40 text-muted-foreground hover:text-foreground'
                        )}
                      >{o.l}</button>
                    ))}
                  </div>
                </div>
                {advancedCount > 0 && (
                  <Button size="sm" variant="ghost" className="w-full h-7 text-xs"
                    onClick={() => { setStageFilter([]); setTagFilter([]); setFromDays(null); }}>
                    Clear advanced filters
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-3 rounded-full text-xs font-medium border bg-card/30 text-muted-foreground border-border/30 hover:text-foreground flex items-center gap-1.5"
                >
                  <Bookmark className="h-3 w-3" />
                  Views {views.length > 0 && <span className="opacity-80">· {views.length}</span>}
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 space-y-2">
                <Button size="sm" variant="outline" className="w-full h-8 gap-1.5 text-xs" onClick={saveCurrentView}>
                  <BookmarkPlus className="h-3.5 w-3.5" /> Save current as view
                </Button>
                {views.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground text-center py-2">No saved views yet.</p>
                ) : (
                  <div className="space-y-1">
                    {views.map(v => (
                      <div key={v.name} className="flex items-center gap-1">
                        <button
                          onClick={() => applyView(v)}
                          className="flex-1 text-left text-xs px-2 py-1.5 rounded hover:bg-muted/50 truncate"
                        >{v.name}</button>
                        <button
                          onClick={() => deleteView(v.name)}
                          className="h-6 w-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center"
                          aria-label="Delete view"
                        ><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="glass rounded-xl border border-primary/30 px-3 py-2 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium">{selected.size} selected</span>
              <div className="flex-1" />
              <Select onValueChange={bulkSetStage}>
                <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue placeholder="Move to stage…" /></SelectTrigger>
                <SelectContent>
                  {PIPELINE_STAGES.map(s => (<SelectItem key={s} value={s} className="capitalize text-xs">{s}</SelectItem>))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input
                  value={bulkTag}
                  onChange={e => setBulkTag(e.target.value)}
                  placeholder="Add tag…"
                  className="h-7 w-[110px] text-xs"
                  onKeyDown={e => e.key === 'Enter' && bulkAddTag()}
                />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={bulkAddTag}>
                  <TagIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive hover:text-destructive" onClick={bulkDelete}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(new Set())}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* List */}
          <div className="glass rounded-2xl border border-border/50 p-3 sm:p-5">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {contacts.length === 0
                  ? 'No leads captured yet. Deploy a funnel to start collecting contacts.'
                  : 'No leads match your filters.'}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-2 px-2 pb-2 border-b border-border/20">
                  <Checkbox
                    checked={allOnPageSelected}
                    onCheckedChange={togglePageAll}
                    aria-label="Select all on page"
                  />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Lead
                  </span>
                  <div className="flex-1" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:inline">
                    Stage · Score · Created
                  </span>
                </div>
                <div className="divide-y divide-border/10">
                  {pageItems.map(c => {
                    const checked = selected.has(c.id);
                    return (
                      <div
                        key={c.id}
                        className={cn(
                          'px-2 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-muted/20 rounded transition-colors',
                          checked && 'bg-primary/5'
                        )}
                        onClick={() => setOpenContact(c)}
                      >
                        <div onClick={e => { e.stopPropagation(); toggleOne(c.id); }}>
                          <Checkbox checked={checked} aria-label="Select lead" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">
                            {c.first_name || c.email.split('@')[0]}
                            {c.last_name ? ` ${c.last_name}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                          {(c.tags || []).length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {(c.tags || []).slice(0, 3).map(t => (
                                <span key={t} className="text-[9px] bg-muted/40 text-muted-foreground px-1.5 py-0.5 rounded-full">{t}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
                          <span className="text-[10px] capitalize text-muted-foreground">{c.pipeline_stage}</span>
                          <div className="flex items-center gap-1.5">
                            {(c.score ?? 0) >= 70 && (
                              <span className="text-[9px] text-primary/90 bg-primary/10 px-1.5 py-0.5 rounded-full">Hot</span>
                            )}
                            <span className="text-[10px] text-muted-foreground">{c.score ?? 0}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground/70">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/20">
                    <p className="text-[11px] text-muted-foreground">Page {pageSafe} of {totalPages}</p>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" disabled={pageSafe <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" disabled={pageSafe >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <ContactDetailSheet
        contact={openContact}
        open={!!openContact}
        onClose={() => setOpenContact(null)}
        onUpdate={updateContact}
        onDelete={deleteContact}
        onAddTag={addTag}
        onRemoveTag={removeTag}
      />
    </>
  );
}

function FilterChipBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-7 px-3 rounded-full text-xs font-medium border transition-colors',
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card/30 text-muted-foreground border-border/30 hover:text-foreground hover:border-border/60'
      )}
    >
      {label} <span className={cn('ml-1', active ? 'opacity-80' : 'opacity-60')}>{count}</span>
    </button>
  );
}
