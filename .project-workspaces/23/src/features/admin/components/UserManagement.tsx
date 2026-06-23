import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Search, Crown, ShieldCheck, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UserRow {
  id: string;
  email: string;
  org_id: string;
  created_at: string | null;
  display_name: string | null;
  org_name?: string;
  plan?: string;
  is_admin?: boolean;
}

export default function UserManagement({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const [usersRes, orgsRes, subsRes, rolesRes] = await Promise.all([
      supabase.from('users').select('id, email, org_id, created_at, display_name').order('created_at', { ascending: false }),
      supabase.from('organizations').select('id, name, plan'),
      supabase.from('subscriptions').select('user_id, status, product_id'),
      supabase.from('user_roles').select('user_id, role'),
    ]);

    const orgMap = new Map((orgsRes.data || []).map(o => [o.id, o]));
    const subMap = new Map((subsRes.data || []).filter(s => s.status === 'active').map(s => [s.user_id, s.product_id]));
    const adminSet = new Set((rolesRes.data || []).filter(r => r.role === 'admin').map(r => r.user_id));

    const enriched: UserRow[] = (usersRes.data || []).map(u => {
      const org = orgMap.get(u.org_id);
      return {
        ...u,
        org_name: org?.name || 'Unknown',
        plan: subMap.has(u.id) ? 'premium' : (org?.plan || 'free'),
        is_admin: adminSet.has(u.id),
      };
    });

    setUsers(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const togglePremium = async (userId: string, currentPlan: string) => {
    const newStatus = currentPlan === 'premium' ? 'canceled' : 'active';
    const productId = 'operator_monthly';

    // Check for existing subscription
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from('subscriptions')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', existing.id));
    } else if (newStatus === 'active') {
      // Insert new subscription for admin grant
      ({ error } = await supabase.from('subscriptions').insert({
        user_id: userId,
        product_id: productId,
        status: 'active',
        stripe_customer_id: `admin_granted_${userId}`,
      } as any));
    }

    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan: currentPlan === 'premium' ? 'free' : 'premium' } : u));
    toast.success(`User set to ${currentPlan === 'premium' ? 'free' : 'premium'}`);
  };

  const toggleAdmin = async (userId: string, isCurrentlyAdmin: boolean) => {
    if (userId === currentUserId) {
      toast.error("Can't modify your own admin role");
      return;
    }

    let error;
    if (isCurrentlyAdmin) {
      ({ error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin'));
    } else {
      ({ error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' as any }));
    }

    if (error) {
      toast.error(`Failed: ${error.message}`);
      return;
    }

    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !isCurrentlyAdmin } : u));
    toast.success(isCurrentlyAdmin ? 'Admin role removed' : 'Admin role granted');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Delete org (cascades to projects, etc.)
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', deleteTarget.id)
        .single();

      if (userData?.org_id) {
        await supabase.from('organizations').delete().eq('id', userData.org_id);
      }

      // Remove user roles
      await supabase.from('user_roles').delete().eq('user_id', deleteTarget.id);

      setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
      toast.success(`Deleted ${deleteTarget.email}`);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.display_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.org_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />;
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search users by email, name, or org…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} users</p>

      <div className="space-y-2">
        {filtered.map(u => (
          <Card key={u.id} className="border-border/30">
            <CardContent className="flex items-center justify-between py-3 px-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {u.display_name || u.email}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {u.display_name && (
                    <span className="text-xs text-muted-foreground truncate">{u.email}</span>
                  )}
                  <span className="text-xs text-muted-foreground/60">{u.org_name}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-2">
                {/* Admin toggle */}
                {u.id !== currentUserId && (
                  <button
                    onClick={() => toggleAdmin(u.id, !!u.is_admin)}
                    className={`p-1.5 rounded-lg transition-colors ${u.is_admin ? 'text-amber-400 bg-amber-500/10' : 'text-muted-foreground/40 hover:text-muted-foreground'}`}
                    title={u.is_admin ? 'Remove admin' : 'Grant admin'}
                  >
                    <ShieldCheck className="h-4 w-4" />
                  </button>
                )}

                {/* Premium toggle */}
                <Badge variant={u.plan === 'premium' ? 'default' : 'secondary'} className="text-xs shrink-0">
                  {u.plan === 'premium' ? (
                    <><Crown className="h-3 w-3 mr-0.5" /> Premium</>
                  ) : 'Free'}
                </Badge>
                <Switch
                  checked={u.plan === 'premium'}
                  onCheckedChange={() => togglePremium(u.id, u.plan || 'free')}
                />

                {/* Delete */}
                {u.id !== currentUserId && (
                  <button
                    onClick={() => setDeleteTarget(u)}
                    className="p-1.5 rounded-lg text-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteTarget?.email}</strong>, their organization, and all associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
