import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { History, GitBranch, RotateCcw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/**
 * StrategyEvolutionPanel
 * ----------------------
 * Lists every signal_lab snapshot stored in `project_context` for the active
 * project (newest first), with diff highlights vs. the previous version and
 * one-click revert/fork (which inserts the chosen snapshot as a new newest row).
 */

interface Props {
  projectId: string | null;
  orgId: string | null | undefined;
}

type SnapshotRow = {
  id: string;
  directive: string;
  created_at: string;
  parsed: any;
};

function safeParse(s: string): any {
  try { return JSON.parse(s); } catch { return null; }
}

function fieldsToCompare(bp: any): Record<string, string> {
  if (!bp) return {};
  const persona = bp.persona || {};
  const join = (v: any) => (Array.isArray(v) ? v.join(' · ') : (v ?? ''));
  return {
    'One-liner': bp.oneLiner || '',
    'Elevator pitch': bp.elevatorPitch || '',
    'Persona role': persona.role || '',
    'Frustrations': join(persona.frustrations),
    'Desires': join(persona.desires),
    'Top IG hook': bp.hooks?.instagram?.[0] || '',
    'Top LinkedIn hook': bp.hooks?.linkedin?.[0] || '',
  };
}

function diffSummary(curr: any, prev: any): { changed: string[]; total: number } {
  const a = fieldsToCompare(curr);
  const b = fieldsToCompare(prev);
  const keys = Object.keys(a);
  const changed = keys.filter((k) => (a[k] || '') !== (b[k] || ''));
  return { changed, total: keys.length };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function StrategyEvolutionPanel({ projectId, orgId }: Props) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['signal-lab-snapshots', projectId],
    enabled: !!projectId,
    queryFn: async (): Promise<SnapshotRow[]> => {
      const { data } = await supabase
        .from('project_context')
        .select('id, directive, created_at')
        .eq('project_id', projectId!)
        .eq('context_type', 'signal_lab')
        .order('created_at', { ascending: false });
      return (data || []).map((row) => ({
        id: row.id,
        directive: row.directive,
        created_at: row.created_at,
        parsed: safeParse(row.directive),
      }));
    },
  });

  const enriched = useMemo(() => {
    const total = snapshots.length;
    return snapshots.map((s, idx) => {
      const next = snapshots[idx + 1]; // older
      const diff = next ? diffSummary(s.parsed, next.parsed) : { changed: [], total: 0 };
      // Newest = highest version. Use simple v{N}.0 labelling.
      const version = `v${total - idx}.0`;
      return { ...s, version, diff, isLatest: idx === 0 };
    });
  }, [snapshots]);

  if (!projectId) return null;

  const handleRevert = async (snap: SnapshotRow) => {
    if (!orgId) return;
    const { error } = await supabase.from('project_context').insert({
      project_id: projectId,
      org_id: orgId,
      context_type: 'signal_lab',
      directive: snap.directive,
    });
    if (error) {
      toast.error('Could not restore that version');
      return;
    }
    toast.success('Strategy reverted — Identity Lock updated.');
    queryClient.invalidateQueries({ queryKey: ['signal-lab-snapshots', projectId] });
    queryClient.invalidateQueries({ queryKey: ['blueprint-signal'] });
    queryClient.invalidateQueries({ queryKey: ['signal-lock-for-feed', projectId] });
  };

  if (!isLoading && enriched.length === 0) return null;

  return (
    <div className="rounded-3xl border border-border/40 bg-card/30 backdrop-blur-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between gap-3 p-5 text-left hover:bg-muted/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/15 border border-primary/25">
            <History className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-primary font-bold">
              Strategy Evolution
            </p>
            <p className="text-xs text-muted-foreground">
              {enriched.length} snapshot{enriched.length === 1 ? '' : 's'} · revert or fork
            </p>
          </div>
        </div>
        {collapsed ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="border-t border-border/20 max-h-[420px] overflow-y-auto divide-y divide-border/10">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
              Loading evolution…
            </div>
          ) : (
            enriched.map((snap) => {
              const isOpen = expandedId === snap.id;
              return (
                <div key={snap.id} className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-foreground font-bold">
                          {snap.version}
                        </span>
                        {snap.isLatest && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-black text-emerald-400 uppercase tracking-tight">
                            Active
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/70">
                          {timeAgo(snap.created_at)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm text-foreground/90 line-clamp-2">
                        {snap.parsed?.oneLiner || 'Identity snapshot'}
                      </p>
                      {snap.diff.changed.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-primary/80">
                          <GitBranch className="w-3 h-3" />
                          <span className="font-mono">
                            {snap.diff.changed.length} field{snap.diff.changed.length === 1 ? '' : 's'} changed
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setExpandedId(isOpen ? null : snap.id)}
                      >
                        {isOpen ? 'Hide' : 'Diff'}
                      </Button>
                      {!snap.isLatest && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5"
                          onClick={() => handleRevert(snap)}
                        >
                          <RotateCcw className="w-3 h-3" />
                          Revert
                        </Button>
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 rounded-xl border border-border/30 bg-background/60 p-3 sm:p-4 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {snap.diff.changed.length === 0 ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                          <Sparkles className="w-3 h-3" />
                          No tracked changes vs. previous snapshot.
                        </p>
                      ) : (
                        snap.diff.changed.map((field) => {
                          const curr = fieldsToCompare(snap.parsed)[field];
                          // Find the previous snapshot in the enriched list
                          const idx = enriched.findIndex((s) => s.id === snap.id);
                          const prev = enriched[idx + 1];
                          const prevVal = prev ? fieldsToCompare(prev.parsed)[field] : '';
                          return (
                            <div key={field} className="text-xs">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                {field}
                              </p>
                              {prevVal && (
                                <p className="text-rose-400/80 line-through line-clamp-2">
                                  {prevVal}
                                </p>
                              )}
                              <p className="text-emerald-400 line-clamp-2">{curr || '—'}</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
