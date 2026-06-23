import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Undo2, ChevronDown, ChevronRight } from 'lucide-react';
import { fetchDeletedProjects, restoreProject, purgeProject } from '@/services/supabase-data';
import { useCurrentUser } from '@/hooks/use-current-user';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function ProjectsTrashSection() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [purgeTarget, setPurgeTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: deleted = [] } = useQuery({
    queryKey: ['projects-trash', user?.orgId],
    queryFn: () => fetchDeletedProjects(user!.orgId),
    enabled: !!user?.orgId,
  });

  if (deleted.length === 0) return null;

  const daysLeft = (deletedAt: string) => {
    const ms = new Date(deletedAt).getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now();
    return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
  };

  const handleRestore = async (id: string, name: string) => {
    try {
      const ok = await restoreProject(id);
      if (!ok) throw new Error('expired');
      qc.invalidateQueries({ queryKey: ['projects', user?.orgId] });
      qc.invalidateQueries({ queryKey: ['projects-trash', user?.orgId] });
      toast.success(`Restored "${name}"`);
    } catch {
      toast.error('Could not restore — recovery window may have expired.');
    }
  };

  const confirmPurge = async () => {
    if (!purgeTarget) return;
    try {
      await purgeProject(purgeTarget.id);
      qc.invalidateQueries({ queryKey: ['projects-trash', user?.orgId] });
      toast.success(`"${purgeTarget.name}" permanently deleted`);
    } catch {
      toast.error('Failed to delete permanently');
    }
    setPurgeTarget(null);
  };

  return (
    <div className="glass rounded-2xl border border-border/30 mb-4 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3 text-sm hover:bg-muted/10 transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Trash2 className="h-4 w-4" />
          Trash · {deleted.length} project{deleted.length !== 1 ? 's' : ''}
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 ml-1">30-day recovery</span>
        </span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border/15 divide-y divide-border/10">
          {deleted.map(p => {
            const days = daysLeft(p.deleted_at as string);
            return (
              <div key={p.id} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm truncate">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {days > 0 ? `${days} day${days !== 1 ? 's' : ''} left to restore` : 'Expires today'}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleRestore(p.id, p.name)}>
                  <Undo2 className="h-3.5 w-3.5 mr-1" /> Restore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive"
                  onClick={() => setPurgeTarget({ id: p.id, name: p.name })}
                >
                  Delete forever
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!purgeTarget} onOpenChange={(o) => !o && setPurgeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete "{purgeTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. All funnels, pages, contacts and data for this project will be erased.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurge} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
