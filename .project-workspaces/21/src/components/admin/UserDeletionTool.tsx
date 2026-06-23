import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Profile {
  user_id: string;
  user_name: string;
  username: string | null;
  created_at: string;
}

export default function UserDeletionTool({ currentUserId }: { currentUserId?: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, user_name, username, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const filtered = (data || []).filter(p => p.user_id !== currentUserId);
      setProfiles(filtered);
      setSelected(new Set());
      setLoaded(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === profiles.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(profiles.map(p => p.user_id)));
    }
  };

  const handleDelete = async () => {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      const ids = Array.from(selected);
      toast.info(`Deleting ${ids.length} account(s)…`);
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userIds: ids },
      });
      if (error) throw error;
      const succeeded = (data?.results || []).filter((r: any) => r.success).length;
      const failed = (data?.results || []).filter((r: any) => !r.success).length;
      toast.success(`${succeeded} deleted${failed > 0 ? `, ${failed} failed` : ''}`);
      // Remove deleted from list
      setProfiles(prev => prev.filter(p => !selected.has(p.user_id) || !(data?.results || []).find((r: any) => r.id === p.user_id && r.success)));
      setSelected(new Set());
    } catch (e) {
      console.error('Delete failed:', e);
      toast.error('Deletion failed — check console');
    } finally {
      setDeleting(false);
    }
  };

  if (!loaded) {
    return (
      <Button onClick={loadUsers} disabled={loading} variant="outline" className="gap-1.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
        Load All Users
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{profiles.length} user(s) found</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={loadUsers} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={selected.size === 0 || deleting}
            onClick={() => setConfirmOpen(true)}
            className="gap-1"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Selected ({selected.size})
          </Button>
        </div>
      </div>

      <div className="max-h-72 overflow-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={profiles.length > 0 && selected.size === profiles.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map(p => (
              <TableRow key={p.user_id} data-state={selected.has(p.user_id) ? 'selected' : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(p.user_id)}
                    onCheckedChange={() => toggleSelect(p.user_id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{p.user_name}</TableCell>
                <TableCell className="text-muted-foreground">@{p.username || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selected.size} account(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all data for the selected users. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
