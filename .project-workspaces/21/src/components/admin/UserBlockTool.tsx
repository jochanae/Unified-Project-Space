import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Loader2, Users, ShieldOff, Shield, AlertTriangle, Search } from 'lucide-react';
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
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
}

export default function UserBlockTool({ currentUserId }: { currentUserId?: string }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Profile | null>(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);
  const [search, setSearch] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, user_name, username, created_at, is_blocked, blocked_reason, blocked_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const filtered = (data || []).filter(p => p.user_id !== currentUserId);
      setProfiles(filtered as Profile[]);
      setLoaded(true);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!confirmTarget) return;
    setActing(true);
    const isBlocking = !confirmTarget.is_blocked;

    try {
      const updates: Record<string, unknown> = {
        is_blocked: isBlocking,
        blocked_reason: isBlocking ? (reason.trim() || null) : null,
        blocked_at: isBlocking ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates as any)
        .eq('user_id', confirmTarget.user_id);

      if (error) throw error;

      setProfiles(prev => prev.map(p =>
        p.user_id === confirmTarget.user_id
          ? { ...p, is_blocked: isBlocking, blocked_reason: updates.blocked_reason as string | null, blocked_at: updates.blocked_at as string | null }
          : p
      ));

      toast.success(isBlocking
        ? `${confirmTarget.user_name} has been blocked`
        : `${confirmTarget.user_name} has been unblocked`
      );
    } catch (e) {
      console.error('Block/unblock failed:', e);
      toast.error('Action failed — check console');
    } finally {
      setActing(false);
      setConfirmTarget(null);
      setReason('');
    }
  };

  if (!loaded) {
    return (
      <Button onClick={loadUsers} disabled={loading} variant="outline" className="gap-1.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
        Load Users
      </Button>
    );
  }

  const blockedCount = profiles.filter(p => p.is_blocked).length;

  const filtered = profiles.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.user_name.toLowerCase().includes(q) ||
      (p.username || '').toLowerCase().includes(q) ||
      (p.blocked_reason || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{profiles.length} users</span>
          {blockedCount > 0 && (
            <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
              {blockedCount} blocked
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={loadUsers} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter by name or username…"
          className="pl-9 h-9"
        />
      </div>

      <div className="max-h-96 overflow-auto rounded border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-28">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(p => (
              <TableRow key={p.user_id} className={p.is_blocked ? 'bg-destructive/5' : undefined}>
                <TableCell className="font-medium">{p.user_name}</TableCell>
                <TableCell className="text-muted-foreground">@{p.username || '—'}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(p.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {p.is_blocked ? (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-xs text-destructive font-semibold">Blocked</span>
                      {p.blocked_reason && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[100px]" title={p.blocked_reason}>
                          · {p.blocked_reason}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Active</span>
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={p.is_blocked ? 'outline' : 'destructive'}
                    className="h-7 text-xs gap-1"
                    onClick={() => { setConfirmTarget(p); setReason(''); }}
                  >
                    {p.is_blocked
                      ? <><Shield className="h-3 w-3" /> Unblock</>
                      : <><ShieldOff className="h-3 w-3" /> Block</>
                    }
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmTarget} onOpenChange={(open) => { if (!open) { setConfirmTarget(null); setReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmTarget?.is_blocked
                ? `Unblock ${confirmTarget?.user_name}?`
                : `Block ${confirmTarget?.user_name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmTarget?.is_blocked
                ? 'This will restore full access to their account immediately.'
                : 'This will immediately prevent them from accessing the app. They will see a suspension notice.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {!confirmTarget?.is_blocked && (
            <div className="px-1 pb-2">
              <label className="text-xs font-medium text-foreground block mb-1.5">
                Reason (optional — visible to you only)
              </label>
              <input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Repeated safety violations, fraudulent activity..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleBlock}
              disabled={acting}
              className={confirmTarget?.is_blocked ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {acting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {confirmTarget?.is_blocked ? 'Yes, unblock' : 'Yes, block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
