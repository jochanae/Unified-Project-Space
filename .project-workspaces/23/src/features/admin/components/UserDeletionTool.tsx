import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface User { id: string; email: string; created_at: string | null; }

export default function UserDeletionTool({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch_ = async () => {
    setLoading(true);
    const { data } = await supabase.from('users').select('id, email, created_at').order('created_at', { ascending: true });
    setUsers((data || []) as User[]);
    setLoading(false);
  };

  useEffect(() => { fetch_(); }, []);

  const deleteUser = async (id: string) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('User deleted');
    fetch_();
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" />;

  return (
    <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
      <CardContent className="p-4 space-y-2">
        <p className="text-sm font-semibold text-foreground mb-2">User Deletion</p>
        {users.map(u => {
          const isSelf = u.id === currentUserId;
          return (
            <div key={u.id} className={`flex items-center justify-between rounded-md border border-border/20 bg-background/40 px-3 py-2 ${isSelf ? 'opacity-50' : ''}`}>
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" disabled={isSelf}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete user?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete this user and all their data.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteUser(u.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
