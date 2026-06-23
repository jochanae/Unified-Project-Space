import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, History, RotateCcw, Trash2, Sparkles, Palette, Megaphone, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export interface BlueprintSnapshot {
  outputs: { oneLiner: string; elevatorPitch: string; socialBio: string };
  style?: any;
  hooks?: any;
  persona?: any;
}

interface VersionRow {
  id: string;
  created_at: string;
  source: string;
  version_label: string | null;
  blueprint_data: BlueprintSnapshot;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId?: string;
  onRestore: (snapshot: BlueprintSnapshot) => void;
}

export default function BlueprintVersionsDialog({ open, onOpenChange, projectId, onRestore }: Props) {
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from('blueprint_versions' as any)
      .select('id, created_at, source, version_label, blueprint_data')
      .order('created_at', { ascending: false })
      .limit(50);
    if (projectId) query = query.eq('project_id', projectId);
    const { data, error } = await query;
    if (error) toast.error('Failed to load versions');
    else setVersions((data || []) as unknown as VersionRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, projectId]);

  const handleRestore = (v: VersionRow) => {
    onRestore(v.blueprint_data);
    toast.success('Blueprint restored from snapshot');
    onOpenChange(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('blueprint_versions' as any).delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    setVersions(prev => prev.filter(v => v.id !== id));
    if (selectedId === id) setSelectedId(null);
    toast.success('Version deleted');
  };

  const selected = versions.find(v => v.id === selectedId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}>
            <History className="h-4 w-4 text-primary" />
            Blueprint Versions
          </DialogTitle>
          <DialogDescription>
            Each export creates a snapshot. Browse or restore any prior version.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden flex-1">
          {/* List */}
          <div className="border border-border/20 rounded-xl overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No snapshots yet. Export your blueprint to create the first version.
              </div>
            ) : (
              <ul className="divide-y divide-border/10">
                {versions.map((v, idx) => (
                  <li
                    key={v.id}
                    className={`p-3 cursor-pointer transition-colors ${selectedId === v.id ? 'bg-primary/5' : 'hover:bg-muted/40'}`}
                    onClick={() => setSelectedId(v.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {v.version_label || `Version ${versions.length - idx}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(v.created_at), { addSuffix: true })} • {v.source}
                        </p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(v.id); }}
                        className="text-muted-foreground hover:text-destructive p-1 rounded"
                        aria-label="Delete version"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Preview */}
          <div className="border border-border/20 rounded-xl p-4 overflow-y-auto max-h-[60vh] space-y-3">
            {!selected ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                Select a version to preview.
              </div>
            ) : (
              <>
                <PreviewSection icon={<Sparkles className="h-3.5 w-3.5" />} title="Core Message">
                  <PreviewField label="One-Liner" value={selected.blueprint_data.outputs?.oneLiner} />
                  <PreviewField label="Elevator Pitch" value={selected.blueprint_data.outputs?.elevatorPitch} />
                  <PreviewField label="Social Bio" value={selected.blueprint_data.outputs?.socialBio} />
                </PreviewSection>

                {selected.blueprint_data.style && (
                  <PreviewSection icon={<Palette className="h-3.5 w-3.5" />} title="Style">
                    {selected.blueprint_data.style.palette && (
                      <div className="flex gap-1.5 mt-1">
                        {selected.blueprint_data.style.palette.map((c: string, i: number) => (
                          <div key={i} className="h-5 w-5 rounded border border-border/20" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    )}
                    {selected.blueprint_data.style.mood && (
                      <p className="text-xs text-muted-foreground mt-1">Mood: {selected.blueprint_data.style.mood}</p>
                    )}
                  </PreviewSection>
                )}

                {selected.blueprint_data.hooks && (
                  <PreviewSection icon={<Megaphone className="h-3.5 w-3.5" />} title="Hooks">
                    <p className="text-xs text-muted-foreground">
                      {(selected.blueprint_data.hooks.instagram?.length || 0) +
                        (selected.blueprint_data.hooks.linkedin?.length || 0) +
                        (selected.blueprint_data.hooks.emailSubjects?.length || 0) +
                        (selected.blueprint_data.hooks.adHeadlines?.length || 0)}{' '}
                      hooks across channels
                    </p>
                  </PreviewSection>
                )}

                {selected.blueprint_data.persona && (
                  <PreviewSection icon={<Users className="h-3.5 w-3.5" />} title="Persona">
                    <p className="text-xs text-foreground">
                      {selected.blueprint_data.persona.name} — {selected.blueprint_data.persona.role}
                    </p>
                  </PreviewSection>
                )}

                <Button onClick={() => handleRestore(selected)} size="sm" className="w-full gap-1.5 mt-2">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restore this version
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PreviewSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border/10 first:border-0 pt-2 first:pt-0">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-primary">{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground/80">{title}</span>
      </div>
      {children}
    </div>
  );
}

function PreviewField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="mt-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">{label}</span>
      <p className="text-xs text-foreground mt-0.5">{value}</p>
    </div>
  );
}
